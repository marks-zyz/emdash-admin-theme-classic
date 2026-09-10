# Changelog

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
