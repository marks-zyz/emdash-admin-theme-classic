# Changelog

## 0.2.3

Measured on a site generated from scratch with EmDash 1.1.0, in `astro dev`, at 1440 and 390
pixels wide, on 32 admin screens, with the 0.2.2 stylesheet and this one served to the same
copy. Nothing got wider, nothing new overlaps, and the screens without a finding kept their
measurements except for the type scale changes listed below.

Fix: in `astro dev`, the site's own CSS no longer reaches the admin. Astro dev writes the CSS of
every page in the project into the admin `<head>` (emdash-cms/emdash#3714, withastro/astro#18060),
each stylesheet twice: a `<style data-vite-dev-id>` and a `<script type="module" src="/src/...">`
that has the Vite client inject it again. On a real site that put 14 of its stylesheets in the
admin DOM and set the page titles in Georgia. `applySkin` now removes both halves of each pair
whose module lives under the site's `/src/`. The admin's own CSS, under `node_modules`, stays, and
production HTML, which carries no `data-vite-dev-id`, passes through byte for byte. Removing only
the `<style>` is not enough: with the script left in, the DOM went back to 14. Covered by
`test/inject.test.mjs` with four mutants, one per way the pairing can go wrong (the script kept,
the admin sheet dropped, the `&amp;` in Astro's style id left unescaped, and a nested `src/lib/src/`
sheet paired by suffix with a shorter `/src/` one).

Fix: one look for the page header action. EmDash 1.1.0 rebuilt the page headers, and the same
"New/Create/Add" action came out three ways: the WordPress outline button where the skin reached
it, a neutral 36px button where it did not (Menus, Users, Content types, the Bylines schema link),
and solid blue with white text on Kumo's `primary` variant (New redirect, New section, New byline).
The four new header shapes join the `.page-title-action` rules in blocks [5] and [13]. The primary
variant needed two more things, because Kumo paints it from inside `@layer utilities` and an
`!important` inside a layer beats one outside: `--color-white` is redeclared on the button, the
same way out the skin already takes for `!text-kumo-default`, and its gradient
`<span aria-hidden="true">` is hidden. After: every header action on those screens is 30px tall,
1px `#2271b1` border, `#2271b1` text, 13px/400.

Fix: below 640px the page header stacks instead of squeezing. On Redirects the title no longer
runs under the button (837 square pixels of overlap before), and the actions of Categories and
Content types wrap instead of running out of `main` (to x=493 and x=409 in a 390 viewport). A table
whose only row is the state cell takes its wrapper's width, so the empty Byline schema message is
no longer cut on the right (363px of content in a 340px wrapper before).

Type scale, in `tokens.css`:

- `--text-3xl` is 23px. Plugin pages (Forms, AI Search) title with `text-3xl` and came out at 30px
  next to 23px on every native screen. The class is also on the Dashboard metric number, which
  block [5] sizes on its own and stays 24px.
- `body` takes `--text-base` (13px). Text with no size class of its own, like a plugin's subtitle,
  the WordPress import descriptions, the Categories listing and the field names of a content type,
  was 16px.
- A box title with no size class (`main h2`, `main h3`) is 14px, the wp-admin metabox title. It
  sits in `@layer base`, so any size class EmDash puts on a heading still wins over it (the Block
  Kit `text-xl` header keeps its 20px).
- `--text-xs` goes from 11px to 12px. List filters, the editor panel buttons, calendar days and
  empty-state hints were one point below EmDash's own default. In the editor's side panel two long
  buttons ("Despublicar Pergunta frequente") now take a row each, as they do in the stock admin.

Fix: the Dashboard metric number lines up with its card title again. It kept the `px-3` that the
title lost in block [5] (title text at x=267, number at x=279).

Not changed, on purpose: the Media empty-state button and the action buttons inside cards
(dressing them as header actions is a design call this release does not make), the Block Kit `h2`
of plugin status pages (20px/700, the admin's own class), and the 390px cuts that also happen with
the stylesheet off (Plugins cards, the WordPress import URL row, list tables), which belong
upstream.

New fixtures, each with mutants that have to fail: `test/header-actions-fixture.test.mjs` (the five
header shapes, two guards that must not change, and the three 390px rules) and
`test/type-scale-fixture.test.mjs`. `test/dashboard-fixture.test.mjs` gains the metric alignment.
`npm run surface`: 109 generated-class selectors and 457 `!important`, both unchanged; every new
selector rides on tags and attributes, so named anchors go from 281 to 344.

## 0.2.2

Compatibility: peer range widened to `emdash >=0.36.0 <1.2.0`. Measured against
`@emdash-cms/admin` 1.1.0 (`@cloudflare/kumo` still 2.6.0): the 8 headless-Chromium fixtures
pass against the real 1.1.0 stylesheet, `typecheck` passes, and every anchor the skin uses
(`.emdash-sidebar` className, `data-sidebar`, `data-sorting`, `data-disclosure`,
`data-testid="content-trash-actions"`, `data-emdash-inline-bubble-menu`) is still emitted.
The new Calendar sidebar item and the `footerLabel` default ("EmDash") need no rule. No CSS
change.

## 0.2.1

Fix: the Media Library grid thumbnail rendered narrower than its card (measured live on
rkadvogadosimo.com.br, 206px of image inside a 230px card). The "widgets = .postbox" block
in `skin.css` targets any `.bg-kumo-elevated.ring-kumo-hairline` element in `main` and gives
its first child `padding: 0 12px !important`, meant for a widget's header bar. The Media
Library grid card shares that exact class pair for an unrelated reason (it is the same
elevated-surface token combo), and its first child is the `aspect-video p-0` image frame the
admin itself ships edge-to-edge on purpose. The postbox rule now excludes `.group` cards
(`:not(.group)`), because no real Dashboard widget is clickable or carries that class, only
the media card does. Covered by a new fixture test with its own anti-placebo mutant.

## 0.2.0

Renamed from `emdash-classic-theme` to `emdash-admin-theme-classic`. In EmDash a theme is a
whole Astro site with a seed file and a marketplace behind it, so the old name pointed at the
wrong thing. `admin` now leads the name, `theme` and `astro` are gone from the keywords, and
`emdash-admin-theme` was added as one for tooling to filter on. The old package is deprecated on
npm and points here.

To upgrade: change the dependency name, the import, and the integration call
(`classicTheme()` becomes `classicAdminTheme()`). The `middleware.outer` string becomes
`emdash-admin-theme-classic/middleware`. The stylesheet route moves to
`/_emdash-admin-theme-classic/skin.css`, which matters only if you hardcoded it.

Split into two layers, and the first one can ship alone:

- `src/tokens.css` redeclares EmDash and Kumo design tokens. Documented names, no generated class
  anywhere, so it cannot break silently.
- `src/skin.css` is the geometry that has no token behind it.
- `classicAdminTheme({ layers: "tokens" })` serves only the first. Default stays `full`.
- New export `emdash-admin-theme-classic/tokens.css` for direct use.

New `npm run surface`: it classifies every selector in the stylesheet and reports how much of it
rides on generated class names. This release stands at 281 selectors on named anchors, 109 on
generated classes, and 457 `!important`. `npm run surface -- --check` fails when either number
grows, and the CI runs it, so reanchoring work can only move in one direction.

Measured while splitting the layers, and useful to anyone theming EmDash: in
`@emdash-cms/admin` 0.37.0 `.rounded-md` compiles to `border-radius: var(--radius-md)` and `.p-4`
to `padding: calc(var(--spacing) * 4)`. Corners and density are reachable by token after all,
without touching a class name. The radii are already retuned in layer 1.

Also new: `test/layers.test.mjs` measures that the token layer paints the panel (surface `#ffffff`,
`--text-base` 13px, radius 3px) without pulling in the geometry, and that the full sheet is what
takes the menu corner to zero.

## 0.1.4

Fixed the Taxonomies and Translations panels in the entry editor. Their title had jumped
to the left of the panel with the term list beside it, and the header band was gone.

The cause was in this stylesheet, not in EmDash. Version 0.1.2 removed the `.flex`
discriminator from ten selectors that read `div.flex:has(> h3)`. That class is what tells
the Bylines header row (title plus help button) apart from the Taxonomies and Translations
roots, which wrap the title and the whole content in one bare `div`. Block [21] puts
`display: flex` on the match, so those two panels turned into two columns. Measured on a
368px panel: the taxonomy title sat at x=17 with 76.1px of width and the checkbox list
started at x=93.1 next to it, instead of a 367 by 36px band with the list below it.

Nothing changed in the admin bundle between 0.36.0 and 0.37.0 here. `TaxonomySidebar.tsx`
is byte identical in both, and so is the block of `ContentSettingsPanel.tsx` that renders
these three sections. What did change in 0.37.0 is the publishing panel, which does not use
these selectors.

Also added `test/panel-headers.test.mjs`: the four panel shapes measured against the real
`@emdash-cms/admin` stylesheet, with a mutant that removes `.flex` again and has to fail.
`npm test` now runs every file in `test/`.

## 0.1.3

`peerDependencies` accepts EmDash 0.37.

## 0.1.2

Replaced 17 Tailwind utility anchors with structural selectors, seven of them
`.overflow-x-auto.border` to `div:has(> table)` and ten `div.flex:has(> h3)` to
`div:has(> h3)`. The second batch is the regression fixed in 0.1.4. Publishing moved to
GitHub Actions with npm trusted publishing.

## 0.1.1

README demo GIF, so npm shows it.

## 0.1.0

First release. One stylesheet, injected by middleware, no core patching.
