# Applicable website cases

Select cases from the ticket and the site contracts. Record each omitted case and the reason.
One ticket item can need several checks. A check count is not an item count.

## Copy, prices, and locales

- Each changed string in each locale that the ticket names.
- A negative check for each old string, price, or phone number that must disappear.
- Each currency that changes a displayed price. The same amount in a different currency format.
- Values that the page composes from placeholders: no raw `{placeholder}`, no raw `key.path`, no `undefined`, no `NaN`.
- Plural and singular forms when a count changes.
- Locale overrides: a locale with its own file can keep the old text.
- Source of truth: lang file, seeded database row, or CMS. A seeder that does not overwrite can keep the old row.

## Navigation and links

- Each changed route with a full page load and with a client navigation.
- Each new or changed link: the `href`, the target page, and the locale prefix.
- Header, footer, and member-area links, after login when they depend on the session.
- A direct visit to a deep step without the earlier steps.
- Back and forward after a modal, a step change, or a redirect.

## Forms and flows

- The complete happy path up to the last step before payment or submission.
- Required fields, invalid values, and the visible error text.
- Formatted fields: plate numbers, phone numbers, dates, and date pickers.
- A choice that changes the total, such as an option or an add-on. Check the total before and after.
- The acceptance text, the consent checkboxes, and each link in them.
- Duplicate clicks on a submit button.

## Session and state

- Logged out and logged in.
- A new session after `clearStorage`. A cart or a selected locale that stays in storage can hide a defect.
- Locale and currency switchers: the page, the URL, and the stored preference.

## Layout and access

- Desktop and phone viewports for each changed section.
- Equal card heights, wrapped text, and horizontal scroll at phone width.
- Visible focus and a keyboard path for each new control.
- Alt text for new images. Labels for new fields.

## Diagnostics

- Same-origin exceptions and console errors on each changed page. Compare them with a run before the change.
- Failed requests and HTTP 4xx or 5xx responses.
- Missing translation warnings.

## Browser cautions

Bind the origin, the locale, the account, and the dev server process.
Prefer visible text and roles over coordinates and generated class names.
Inspect cookie banners and modals before a click. They can cover the target.
Distinguish page reload, client navigation, browser restart, and storage reset.
A dev server rebuild during a run can reload the page. Run the unit again before you report a defect.
