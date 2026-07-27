---
name: writing-c
description: >
  Write clean, well-structured C code following patterns distilled from SQLite,
  Redis, kilo, linenoise, and curl. Use when writing or reviewing C — data structures,
  error handling, testing, module design, memory management, or general C style.
  Use when the user asks to "write C", "create a C library", "C project",
  "clean C code", or "review this C code".
---

# Writing C — Patterns from the Masters

Write C that is modular, testable, and survivable. Every rule below is drawn from
real, battle-tested codebases: SQLite, Redis, kilo, linenoise, and curl. When in
doubt, do what Redis does.

---

## 1. Module Architecture

Every module is one `.c` + one `.h`. The header is the **public contract**; the
`.c` file is the implementation. Nothing leaks out.

```c
// module.h
#ifndef __MODULE_H
#define __MODULE_H

// Public types
typedef struct module module;

// Public API — documented with what it does, what it returns, and error conditions
module *moduleCreate(void);           // returns NULL on error
void moduleRelease(module *m);       // NULL-safe
int moduleDoWork(module *m, int x);  // returns 0 on success, -1 on error

#endif
```

```c
// module.c
#include "module.h"
#include <stdlib.h>
#include <string.h>

struct module {
    int state;
    char *name;
};

// --- private helpers (all static) ---
static int validate(module *m) { ... }

// --- public API ---
module *moduleCreate(void) {
    module *m = malloc(sizeof(*m));
    if (!m) return NULL;
    m->state = 0;
    m->name = NULL;
    return m;
}
```

**Rules:**

- **One responsibility per module.** If you're writing a hash table, don't also
  implement a network layer in the same file. Redis has `dict.c` for hash tables,
  `ae.c` for the event loop, `anet.c` for networking — each self-contained.
- **Public functions get a module prefix.** `dictAdd()`, `dictFind()`, `sdsCat()`.
  Never a bare `add()` or `find()`.
- **All internal functions are `static`.** The compiler can inline and optimize;
  the reader knows what's private.
- **Headers include only what they need.** No `#include "everything.h"`. Forward-declare
  structs when possible (`typedef struct foo foo;`), include the real header only
  in the `.c` file.
- **Include guard style:** `#ifndef __MODULE_H` / `#define __MODULE_H` — same as
  Redis and linenoise. Not `#pragma once`.

---

## 2. Data Structures

Design data structures for **locality, ownership clarity, and zero-surprise**. Study
how Redis and kilo do it.

### 2.1 The Struct Is the Module

A module's state lives in a heap-allocated struct returned by `moduleCreate()`:

```c
typedef struct {
    int cx, cy;       // cursor position
    int screenrows;   // terminal dimensions
    int numrows;      // file rows
    erow *row;        // dynamic array of rows
    int dirty;        // modified since last save
    char *filename;   // currently open file
} editorConfig;
```

**Pattern:** `Create` allocates and zeroes, `Release` frees everything including
nested resources. All mutation happens through the struct pointer.

### 2.2 Embedded Metadata Pattern (SDS-style)

When you need variable-length data with metadata, prepend a header:

```c
// sds.h — the public type is just char *
typedef char *sds;

// sds.c — the real struct is hidden
struct sdshdr {
    size_t len;   // used bytes
    size_t alloc; // allocated bytes excluding header and null terminator
    char buf[];   // flexible array member
};

static inline struct sdshdr *sdsHdr(sds s) {
    return (struct sdshdr *)(s - sizeof(struct sdshdr));
}
```

The user sees a plain `char *`; the library sees the metadata. Zero overhead,
clean API.

### 2.3 Type-Erased Containers (Redis adlist/dict style)

Generic containers use `void *` with function pointers for type-specific ops:

```c
typedef struct list {
    listNode *head, *tail;
    void *(*dup)(void *ptr);
    void (*free)(void *ptr);
    int (*match)(void *ptr, void *key);
    size_t len;
} list;

list *listCreate(void);
list *listAddNodeTail(list *l, void *value);  // copies value if dup is set
```

The container owns the memory when `free` is set; the caller owns it otherwise.
Document the ownership contract per function.

### 2.4 Compile-Time Assertions

Redis uses `static_assert` to catch struct layout bugs at compile time:

```c
static_assert(offsetof(dictEntry, next) == offsetof(dictEntryNoValue, next),
    "dictEntry & dictEntryNoValue next not aligned");
```

Use `static_assert` whenever two structs must have compatible layouts, or when
a constant must fit in a specific type.

---

## 3. Error Handling

### 3.1 The `goto err` Pattern (Redis)

Clean up resources in reverse order on error:

```c
int doSomething(void) {
    foo *f = fooCreate();
    bar *b = NULL;
    int rc = -1;

    if (!f) goto err;

    b = barCreate();
    if (!b) goto err;

    if (dangerousOperation(f, b) == -1) goto err;

    rc = 0;  // success
err:
    barRelease(b);
    fooRelease(f);
    return rc;
}
```

**Rules:**
- `goto` only jumps **forward** to a single `err` label at the bottom.
- Resources are released in **reverse allocation order**.
- Release functions are **NULL-safe** (`if (!x) return;`).
- `rc` starts at -1 (error), set to 0 only when everything succeeds.
- Never `goto` from inside a loop that allocates — restructure so the allocation
  is outside the loop, or use a nested cleanup block.

### 3.2 Return Convention

- Functions that can fail return `int`: 0 for success, -1 for error.
- Functions that return a pointer return `NULL` on error.
- Document error conditions in the comment above the function.

### 3.3 Assertions for the Impossible

```c
#include <assert.h>
// or Redis-style:
#define redisAssert(_e) ((_e) ? (void)0 : (_serverAssert(#_e,__FILE__,__LINE__),_exit(1)))
```

Use assertions for conditions that **cannot happen unless there's a bug in your
own code**. Never use assertions to validate user input or runtime errors — those
must be handled with proper error returns.

---

## 4. Memory Management

### 4.1 Allocation Patterns

```c
// sizeof(*ptr) — never sizeof(type). This survives type changes.
list *l = zmalloc(sizeof(*l));

// Zero-initialization is explicit, not assumed
l->head = l->tail = NULL;
l->len = 0;
```

### 4.2 The Two-Pass Pattern (kilo `editorRowsToString`)

When you need to build a buffer but don't know its final size:

```c
char *rowsToString(int *outlen) {
    // Pass 1: compute total size
    int totlen = 0;
    for (int j = 0; j < numrows; j++)
        totlen += rows[j].size + 1;  // +1 for newline

    // Pass 2: allocate and fill
    char *buf = malloc(totlen + 1);  // +1 for null terminator
    char *p = buf;
    for (int j = 0; j < numrows; j++) {
        memcpy(p, rows[j].chars, rows[j].size);
        p += rows[j].size;
        *p++ = '\n';
    }
    *p = '\0';
    *outlen = totlen;
    return buf;
}
```

### 4.3 The Append Buffer (kilo/linenoise `abuf`)

For building strings incrementally to avoid repeated reallocs:

```c
struct abuf {
    char *b;
    int len;
};

void abAppend(struct abuf *ab, const char *s, int len) {
    char *new = realloc(ab->b, ab->len + len);
    if (!new) return;              // original buffer untouched on failure
    memcpy(new + ab->len, s, len);
    ab->b = new;
    ab->len += len;
}

void abFree(struct abuf *ab) {
    free(ab->b);
}
```

### 4.4 Dynamic Arrays (kilo `E.row`)

```c
// Grow by realloc + memmove for insertions
E.row = realloc(E.row, sizeof(erow) * (E.numrows + 1));
// Shift everything after insertion point
memmove(E.row + at + 1, E.row + at, sizeof(E.row[0]) * (E.numrows - at));
```

---

## 5. Abstraction with Function Pointers

Redis is built on this. Define a vtable struct for swappable implementations:

```c
typedef struct ConnectionType {
    const char *(*get_type)(struct connection *conn);
    void (*init)(void);
    void (*cleanup)(void);
    int (*configure)(void *priv, int reconfigure);
    void (*ae_handler)(struct aeEventLoop *el, int fd, void *data, int mask);
    int (*addr)(connection *conn, char *ip, size_t len, int *port, int remote);
    int (*connect)(connection *conn, const char *addr, int port, ...);
    // ...
} ConnectionType;
```

Register implementations at startup:

```c
// In connection.c
ConnectionType *connTypes[CONN_TYPE_MAX];

int connTypeRegister(ConnectionType *ct) {
    for (int i = 0; i < CONN_TYPE_MAX; i++) {
        if (!connTypes[i]) {
            connTypes[i] = ct;
            return i;
        }
    }
    return -1;
}
```

This gives you TCP, TLS, and Unix sockets through one interface.

**Pattern for callbacks in smaller projects** (linenoise style):

```c
typedef void(completionCallback)(const char *input, completions *lc);
static completionCallback *cb = NULL;

void setCompletionCallback(completionCallback *fn) { cb = fn; }
```

When you have exactly one implementation, a function pointer is enough. When you
have multiple interchangeable ones, use a vtable.

---

## 6. Testing

### 6.1 Test File Organization

Redis tests live in `tests/unit/*.tcl` — one test file per feature. Mirror this:

```
project/
  src/
    module.c
    module.h
  tests/
    test_module.c    # or test_module.tcl, test_module.py
```

### 6.2 Test Helpers

Provide helpers that set up and tear down state:

```c
// test_module.c
#include "module.h"
#include <assert.h>
#include <stdio.h>

static void test_create_release(void) {
    module *m = moduleCreate();
    assert(m != NULL);
    moduleRelease(m);
    printf("PASS: test_create_release\n");
}

static void test_do_work(void) {
    module *m = moduleCreate();
    assert(moduleDoWork(m, 42) == 0);
    moduleRelease(m);
    printf("PASS: test_do_work\n");
}

int main(void) {
    test_create_release();
    test_do_work();
    printf("All tests passed.\n");
    return 0;
}
```

### 6.3 Testing for C Libraries

- **Unit test every public function** — create, release, success path, error path.
- **Test NULL handling:** does every release function survive `NULL`? Does every
  function check for NULL inputs where documented?
- **Test edge cases:** empty input, maximum values, zero-length strings.
- **Use valgrind** in CI: `valgrind --leak-check=full --error-exitcode=1 ./test_module`
- **Provide a `make test` target** that builds and runs.

---

## 7. Style & Naming

### 7.1 Section Headers (kilo style)

In larger `.c` files, separate concerns with visible section markers:

```c
/* ======================== Data structures ============================= */

typedef struct { ... } myStruct;

/* ======================== Low-level helpers =========================== */

static int helper(void) { ... }

/* ======================== Public API ================================== */

int myModuleInit(void) { ... }
```

### 7.2 Naming Conventions

| Thing | Style | Example |
|-------|-------|---------|
| Types (struct/typedef/enum) | `lowercase` or `camelCase` | `erow`, `editorConfig`, `ConnectionType` |
| Public functions | `modulePrefix_verbNoun` or `modulePrefixVerbNoun` | `dictAdd()`, `sdsCat()`, `listCreate()` |
| Static functions | `lowercase_underscores` or `lowercase` | `editorUpdateSyntax()`, `slist_get_last()` |
| Macros | `UPPERCASE` | `AE_READABLE`, `HL_COMMENT` |
| Constants | `UPPERCASE` or `kPrefix` | `LINENOISE_MAX_LINE` |

### 7.3 Brace Style

Consistent with Redis/kilo/linenoise/curl: **opening brace on its own line for
functions, same line for control flow:**

```c
void myFunction(void)
{
    if (condition) {
        doSomething();
    } else {
        doOther();
    }
}
```

### 7.4 Comments

- Every public function gets a comment block describing **what it does, what
  it returns, and what happens on error**.
- Comment the **why**, not the what. The code says what.
- Use `/* */` for all comments. Not `//` (for C89 compatibility and consistency
  with Redis/SQLite style).

---

## 8. Project Structure

For a new C library or tool:

```
myproject/
  Makefile           # all, clean, test, install targets
  src/
    myproject.h      # public header (one #include for users)
    myproject.c      # implementation
    internal.h       # shared internals if multiple .c files
  tests/
    test_main.c      # test runner
    test_foo.c
  examples/
    example.c        # minimal usage example
  README.md
```

The `Makefile` should at minimum provide:

```makefile
CFLAGS ?= -O2 -Wall -Wextra -pedantic -std=c99
PREFIX ?= /usr/local

all: libmyproject.a

libmyproject.a: src/myproject.o
	ar rcs $@ $^

test: all
	$(CC) $(CFLAGS) -o tests/runner tests/*.c -L. -lmyproject
	./tests/runner

clean:
	rm -f src/*.o libmyproject.a tests/runner

.PHONY: all test clean
```

---

## 9. What Not to Do

These are the anti-patterns that the reference codebases avoid:

- **No `typedef` hiding pointers.** `typedef char *sds` is the rare exception
  because SDS is specifically designed to be used as a `char *`. Don't do
  `typedef struct foo *FooPtr`.
- **No magic numbers.** `#define` every constant.
- **No `malloc()` without a NULL check.** Yes, even if you think it can't fail.
- **No unspecified behavior reliance.** No signed integer overflow, no out-of-bounds
  pointer arithmetic, no use-after-free.
- **No `strcpy`, `strcat`, `sprintf`.** Use `snprintf`, `memcpy` with explicit
  bounds, or a length-tracked string library (SDS).
- **No `//` comments in library code.** Use `/* */`.
- **No leaving dead code commented out.** Delete it. Git remembers.
- **No multi-purpose variables.** `int retval` reused for five different things
  in one function is a bug waiting to happen.

---

## 10. Reference Checklist

Before committing C code, verify:

- [ ] Every `.h` has an include guard.
- [ ] Every public function has a comment explaining return values and errors.
- [ ] All internal functions are `static`.
- [ ] Every `malloc`/`realloc` has a NULL check.
- [ ] Every `free`-style function is NULL-safe.
- [ ] The `Makefile` has `all`, `test`, `clean` targets.
- [ ] Tests exist and pass under valgrind with no leaks.
- [ ] No compiler warnings with `-Wall -Wextra -pedantic`.
- [ ] Structs use `sizeof(*ptr)` not `sizeof(type)` in allocations.
- [ ] Error paths clean up all resources (use `goto err` pattern).
