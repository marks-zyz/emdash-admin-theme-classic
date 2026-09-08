# emdash-classic-theme

![The EmDash admin panel wearing the wp-admin look: dashboard, collection list, entry editor, media library, sections, content types and a modal](https://raw.githubusercontent.com/marks-zyz/emdash-classic-theme/main/docs/demo.gif)

Gives the EmDash admin panel the look of wp-admin. It is one stylesheet, injected into the
`<head>` of `/_emdash/admin` by a middleware. Nothing in `node_modules` is patched, no core file
is copied, and no JavaScript runs inside the panel.

Dark sidebar `#1d2327`, active item `#2271b1`, canvas `#f0f0f1`, square corners, metabox-style
sections in the editor. If you have used wp-admin, your eyes already know where things are.

## Why the name

EmDash already ships the WordPress palette, and it already calls it `classic`. Open the compiled
`@emdash-cms/admin` stylesheet and you will find `#1d2327`, `#50575e`, `#646970`, `#f0f0f1`,
`#2271b1` and `#d63638` declared under `[data-theme="classic"]`. That decision is made and the
code is in your `node_modules` right now.

It just stops halfway. The `classic` block covers 20 of the 38 color tokens and 8 of the 16 text
tokens, with nothing for typography and nothing for radii, so the panel keeps its rounded, airy
geometry no matter what. And you cannot select it anyway: `admin.astro` hardcodes the attribute
and the `ThemeProvider` rewrites it on mount without reading any config. There is also no dark
variant, so the selector is written `[data-theme=classic]:not([data-mode=dark])` and all 28 tokens
stop matching the moment a visitor's system is set to dark.

This package finishes that theme from the outside: the missing tokens, the typography, the square
corners, the sidebar, the metaboxes. Hence `classic`, not some new name. The goal is for this to
become unnecessary, and there is an open request upstream to make it so (see below).

## Why you might want it

EmDash calls itself the spiritual successor to WordPress, and the migration path is genuinely
good: there are guides for porting themes, porting plugins and importing content. The one place
the migration does not help is the panel, which is exactly where a WordPress user's habits live.
The default admin is clean and modern, and that is the problem on the day you hand the keys to a
client who has been editing wp-admin since 2011.

## Install

```sh
npm install emdash-classic-theme
```

Then pick one of the two ways to wire it. Both were exercised against emdash 0.36.0 on the
Cloudflare adapter.

### As an Astro integration (recommended)

```js
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import classicTheme from "emdash-classic-theme";

export default defineConfig({
  integrations: [classicTheme(), emdash({ /* your config */ })],
});
```

Put `classicTheme()` before `emdash()` so its middleware wraps the panel's response.

### Through EmDash's `middleware.outer` slot

```js
emdash({
  middleware: { outer: "emdash-classic-theme/middleware" },
});
```

Use this if you prefer the documented hook. Note that `outer` is a single slot: if your site
already uses it for something else, take the integration above, or compose by hand with
`applySkin` and `buildHead` from `emdash-classic-theme/inject`.

The stylesheet is answered by that same middleware, at `/_emdash-classic-theme/skin.css`, with an
ETag derived from its own bytes. Astro's `injectRoute` is deliberately not used: a route injected
at that path never matched under the Cloudflare dev runner, and answering from the middleware also
keeps the two install paths behaving identically.

## Changing the colors

Every color, radius and dimension lives in a custom property named `--wp-*`, all of them declared
in block `[0]` at the top of `skin.css`. Override them by name, without the prefix:

```js
classicTheme({
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
| 0.1.x | emdash 0.36.0, `@emdash-cms/admin` 0.36.0 |

The stylesheet anchors on `data-sidebar="content-container"`, `data-sidebar="menu-button"`,
`.emdash-sidebar` and the `#field-<slug>` ids. None of that is a public contract. It is the
internal DOM of Kumo, Cloudflare's design system, and it can change in any release with no warning
and no error: the failure mode is silent and visual. There are 457 `!important` declarations in
here for the same reason, most of them fighting inline styles that EmDash writes onto the sidebar
wrapper.

So pin your EmDash version, and open the panel and look at it after every bump. If the stylesheet
fails to load or the CSP changes, the panel falls back to its normal appearance without an error.
The risk you are taking is cosmetic, never functional.

## Contributing

One thing to know before you start, because it will otherwise cost you an afternoon: do not test
your changes through `npm link` or `bun link`. The Cloudflare dev runner refuses to read files
outside the project root, and a symlink puts the stylesheet there, so the panel answers 500 with
`Denied ID .../skin.css?raw` and nothing in that message points at the symlink. Run `npm pack` and
install the tarball instead. That is also closer to what a user gets.

Pull requests are welcome, with one condition that exists to protect everybody's panel: a visual
change has to arrive with measurements, not opinions. The numbers that matter are popup widths,
card heights, contrast ratios and focus ring visibility, measured against the real
`admin/dist/styles.css` served next to `skin.css`. A PR that moves one of them should say why.

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
[discussion #1493](https://github.com/emdash-cms/emdash/discussions/1493). If you want this
package to become obsolete, that thread is where to say so.

## License

MIT.

## Trademark

WordPress is a registered trademark of the WordPress Foundation. This project is not affiliated
with, endorsed by, or sponsored by them. The name is used here only to describe what the
stylesheet does.
