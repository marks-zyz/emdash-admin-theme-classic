# emdash-admin-theme-classic

![The EmDash admin panel wearing the wp-admin look: dashboard, collection list, entry editor, media library, sections, content types and a modal](https://raw.githubusercontent.com/marks-zyz/emdash-admin-theme-classic/main/docs/demo.gif)

An admin theme for EmDash: it gives the CMS panel the look of wp-admin. One stylesheet, injected
into the `<head>` of `/_emdash/admin` by a middleware. Nothing in `node_modules` is patched, no
core file is copied, and no JavaScript runs inside the panel.

Dark sidebar `#1d2327`, active item `#2271b1`, canvas `#f0f0f1`, square corners, metabox-style
sections in the editor. If you have used wp-admin, your eyes already know where things are.

## Admin theme, not theme

In EmDash a theme is a whole Astro site with a seed file, listed under Themes in the sidebar and
sold through a marketplace. This package touches none of that. It dresses the admin panel, which
is why the name carries `admin` in front and why `theme` is not among its npm keywords: a bare
`theme` would put it in front of people looking for something else entirely.

`classic` is not a new word either. EmDash already ships the WordPress palette and already calls
it `classic`. Open the compiled `@emdash-cms/admin` stylesheet and you will find `#1d2327`,
`#50575e`, `#646970`, `#f0f0f1`, `#2271b1` and `#d63638` declared under `[data-theme="classic"]`.
That decision is made and the code is in your `node_modules` right now.

It just stops halfway. The `classic` block covers 20 of the 38 color tokens and 8 of the 16 text
tokens, with nothing for typography and nothing for radii, so the panel keeps its rounded, airy
geometry no matter what. And you cannot select it anyway: `admin.astro` hardcodes the attribute
and the `ThemeProvider` rewrites it on mount without reading any config. There is also no dark
variant, so the selector is written `[data-theme=classic]:not([data-mode=dark])` and all 28 tokens
stop matching the moment a visitor's system is set to dark.

This package finishes that theme from the outside: the missing tokens, the typography, the square
corners, the sidebar, the metaboxes. The goal is for it to become unnecessary, and there is an
open request upstream to make it so (see below).

## Why you might want it

EmDash calls itself the spiritual successor to WordPress, and the migration path is genuinely
good: there are guides for porting themes, porting plugins and importing content. The one place
the migration does not help is the panel, which is exactly where a WordPress user's habits live.
The default admin is clean and modern, and that is the problem on the day you hand the keys to a
client who has been editing wp-admin since 2011.

## Install

```sh
npm install emdash-admin-theme-classic
```

Then pick one of the two ways to wire it. Both were exercised against emdash 0.36.0 and 0.37.0 on
the Cloudflare adapter.

### As an Astro integration (recommended)

```js
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import classicAdminTheme from "emdash-admin-theme-classic";

export default defineConfig({
  integrations: [classicAdminTheme(), emdash({ /* your config */ })],
});
```

Put `classicAdminTheme()` before `emdash()` so its middleware wraps the panel's response.

### Through EmDash's `middleware.outer` slot

```js
emdash({
  middleware: { outer: "emdash-admin-theme-classic/middleware" },
});
```

Use this if you prefer the documented hook. Note that `outer` is a single slot: if your site
already uses it for something else, take the integration above, or compose by hand with
`applySkin` and `buildHead` from `emdash-admin-theme-classic/inject`.

The stylesheet is answered by that same middleware, at
`/_emdash-admin-theme-classic/skin.css`, with an ETag derived from its own bytes. Astro's
`injectRoute` is deliberately not used: a route injected at that path never matched under the
Cloudflare dev runner, and answering from the middleware also keeps the two install paths behaving
identically.

In `astro dev` only, the same middleware also takes your site's own stylesheets back out of the
admin `<head>`. Astro dev currently writes the CSS of every page of the project into the admin
(emdash-cms/emdash#3714, withastro/astro#18060), so a site whose layout styles `h1` or `.ring`
repaints the panel in dev and nowhere else. Production HTML carries no `data-vite-dev-id` and goes
through untouched.

## Two layers, and you can stop at the first

```js
classicAdminTheme({ layers: "tokens" });   // palette and type scale only
classicAdminTheme();                       // default: "full", adds the geometry
```

`src/tokens.css` redeclares EmDash's and Kumo's own design tokens. Token names are documented and
stable, so this layer cannot break silently: worst case a new token appears and goes unpainted.
`src/skin.css` is the other half, the geometry that tokens cannot express, and it has to aim at
class names the build generates.

Where the line falls, measured with `npm run surface` on this release:

| | selectors | what it rides on |
| --- | --- | --- |
| named anchors | 356 | `data-*` attributes, tags, `.emdash-*`, `.kumo-*` |
| generated classes | 109 | Tailwind utilities, no promise attached |

There are 457 `!important` declarations, nearly all of them in the second layer, most fighting
inline styles EmDash writes onto the sidebar wrapper. The count is a measurement of where the
supported surface ends, not a style choice. `npm run surface -- --check` fails the build when
either number grows, so reanchoring work only ever moves one way.

Worth knowing if you are theming EmDash yourself: corners and spacing are more themeable than they
look. In `@emdash-cms/admin` 0.37.0, `.rounded-md` compiles to `border-radius: var(--radius-md)`
and `.p-4` to `padding: calc(var(--spacing) * 4)`, so redeclaring `--radius-*` retunes every
corner in the panel and `--spacing` retunes the whole density, with no `!important` and no class
name involved. This package already does the radii in layer 1. What genuinely has no token is
per-element layout: the metabox bands, the dark menu, the 32px toolbar, the collapsed menu tabs.

## Changing the colors

Every color, radius and dimension lives in a custom property named `--wp-*`, all of them declared
in block `[0]` at the top of `tokens.css`. Override them by name, without the prefix:

```js
classicAdminTheme({
  tokens: {
    accent: "#7f54b3",
    "accent-hover": "#6b46a0",
    ink: "#2c2c2c",
  },
});
```

The overrides are written into a `<style>` after the stylesheet, at the same specificity, so the
later declaration wins. About a dozen of the 32 tokens are worth touching for branding. The rest
are geometry you probably want to leave alone.

## Sign-in with a password plugin

With [`emdash-admin-login-classic`](https://github.com/marks-zyz/emdash-admin-login-classic) 0.5.0 or newer
installed, the sign-in card flips: password first and filled, then "Or continue with" and the
passkey and email link as outline buttons of the same weight. The theme detects the plugin by its
button (`data-auth-provider="password"`), so nothing to configure; without it the card is
EmDash's own. Tab order stays EmDash's (the change is visual).

## What it does not do

It is a skin, not a reproduction. Icons stay Phosphor, the typeface stays EmDash's, and the page
structure is untouched. Someone who knows wp-admin well will spot the difference immediately. The
point is recognition, not disguise.

Dark mode is switched off on purpose (`color-scheme: light` in block `[0]`). This is not laziness.
Because the core rule is scoped `:not([data-mode=dark])`, a visitor whose system is dark loses all
28 WordPress-palette tokens at once and lands on light surfaces under light text: a success notice
measured 1.28:1 that way. WordPress has no dark mode either, so forcing light is consistent. The
consequence you are accepting is that the theme toggle in the panel header stops doing anything.

## Compatibility, honestly

| theme | tested against |
| --- | --- |
| 0.1.x, 0.2.0, 0.2.1 | emdash 0.36.0 and 0.37.0, `@emdash-cms/admin` same |
| 0.2.2 | emdash 0.36.0 to 1.1.0, `@emdash-cms/admin` same (fixtures run against 1.1.0) |
| 0.2.3 | emdash 0.36.0 to 1.1.0; the new header and type-scale rules were measured on 1.1.0 |
| 0.3.0, 0.3.1 | emdash 0.36.0 to 1.1.0; the sign-in card was measured on 1.1.0 |

On 0.37 every anchor this stylesheet uses is still emitted by the admin bundle (`data-sidebar`,
`.emdash-sidebar`, `.bg-kumo-elevated`, `.ring-kumo-hairline`, `data-sorting`,
`data-testid="dashboard-metric"`), and three production sites run it there.

The stylesheet anchors on `data-sidebar="content-container"`, `data-sidebar="menu-button"`,
`.emdash-sidebar` and the `#field-<slug>` ids. None of that is a public contract. It is the
internal DOM of Kumo, Cloudflare's design system, and it can change in any release with no warning
and no error: the failure mode is silent and visual.

So pin your EmDash version, and open the panel and look at it after every bump. If the stylesheet
fails to load or the CSP changes, the panel falls back to its normal appearance without an error.
The risk you are taking is cosmetic, never functional. If that risk is more than you want, install
with `layers: "tokens"`: nothing in that layer depends on a generated name.

## Contributing

One thing to know before you start, because it will otherwise cost you an afternoon: do not test
your changes through `npm link` or `bun link`. The Cloudflare dev runner refuses to read files
outside the project root, and a symlink puts the stylesheet there, so the panel answers 500 with
`Denied ID .../skin.css?raw` and nothing in that message points at the symlink. Run `npm pack` and
install the tarball instead. That is also closer to what a user gets.

Pull requests are welcome, with one condition that exists to protect everybody's panel: a visual
change has to arrive with measurements, not opinions. The numbers that matter are popup widths,
card heights, contrast ratios and focus ring visibility, measured against the real
`admin/dist/styles.css` served next to the theme. A PR that moves one of them should say why.

`npm test` runs the fixtures in `test/`, which serve that same admin stylesheet next to this one
and measure the result in headless Chromium. Each fixture carries a mutant of the stylesheet that
has to fail, so a fixture that stops discriminating gets caught instead of going green forever.

One warning about measuring on a running panel, learned the expensive way in 0.1.2: a selector
that matches the same elements today can still be wrong. That release swapped `div.flex:has(> h3)`
for `div:has(> h3)` after checking the match count in a live panel, but the entry open on screen
had no taxonomies and no translations, so the two panels that the wider selector also caught were
not in the DOM to be counted. Those two rendered in two columns until 0.1.4. If you widen a
selector, open the panel state the old one excluded, or add that state to a fixture.

Two contrast decisions are already logged and were taken with eyes open. `--wp-line` and
`--wp-field-line` are both `#dcdcde`, which measures 1.36:1 on white and therefore sits under the
3:1 that WCAG 1.4.11 asks of a border. What carries accessibility instead is the `#8c8f94` hover
state and the 2px focus ring, which is the part the standard actually needs you to see. The four
status text colors were moved off the `classic` values for the opposite reason: those fail AA
outright, with `#00a32a` measuring 3.35:1.

## Upstream

The right long-term fix is two additive lines in EmDash itself: a way to pick the admin theme, and
a way to set its default light or dark. The attribute and the CSS layer both exist already, so
this is a switch, not a feature. It is being asked for in
[discussion #1493](https://github.com/emdash-cms/emdash/discussions/1493).

The narrower half of that, and the one this package would benefit from tomorrow, is naming the
parts of the admin markup so a stylesheet has something to hold on to:
[discussion #2987](https://github.com/emdash-cms/emdash/discussions/2987). Every one of the 109
generated-class selectors above exists because the element it paints has no name.

If you want this package to become obsolete, those two threads are where to say so.

## License

MIT.

## Trademark

WordPress is a registered trademark of the WordPress Foundation. This project is not affiliated
with, endorsed by, or sponsored by them. The name is used here only to describe what the
stylesheet does.
