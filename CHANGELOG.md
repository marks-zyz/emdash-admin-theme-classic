# Changelog

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
