# emdash-skin-wp

A WordPress-looking skin for the EmDash admin panel. It is one stylesheet, injected into the
`<head>` of `/_emdash/admin` by a middleware. Nothing in `node_modules` is patched, no core file
is copied, and no JavaScript runs inside the panel.

Dark sidebar `#1d2327`, active item `#2271b1`, canvas `#f0f0f1`, square corners, metabox-style
sections in the editor. If you have ever used wp-admin, your eyes already know where things are.

## Why this exists

EmDash calls itself the spiritual successor to WordPress, and its migration path is already
excellent: there are guides for porting themes, porting plugins, and importing content. The one
place the migration does not help is the panel itself, which is where a WordPress user's muscle
memory lives. The default admin is clean and modern, and that is exactly the problem when you are
handing the keys to a client who has been editing wp-admin since 2011.

There is a second reason, and it is a happy one. The panel already ships the wp-admin palette:
the compiled `@emdash-cms/admin` stylesheet defines `#1d2327`, `#50575e`, `#646970`, `#f0f0f1`,
`#2271b1`, `#d63638` under `[data-theme="classic"]`. That work is done and it is in your
`node_modules` right now. It is just incomplete (it covers about half the color tokens, none of
the typography and none of the radii) and there is no way to select it, because `admin.astro`
hardcodes the attribute and the `ThemeProvider` rewrites it on mount. This package finishes the
job from the outside while that gets sorted out upstream.

## Install

```sh
npm install emdash-skin-wp
```

Then pick one of the two ways to wire it.

### As an Astro integration (recommended)

```js
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import skinWP from "emdash-skin-wp";

export default defineConfig({
  integrations: [skinWP(), emdash({ /* your config */ })],
});
```

Put `skinWP()` before `emdash()` so its middleware wraps the panel's response.

### Through EmDash's `middleware.outer` slot

```js
emdash({
  middleware: { outer: "emdash-skin-wp/middleware" },
});
```

Use this one if you prefer the documented hook. Be aware that `outer` is a single slot: if your
site already uses it for something else, the integration above is the way, or compose by hand
with `applySkin` and `buildHead` from `emdash-skin-wp/inject`.

Both paths were exercised against emdash 0.36.0 on the Cloudflare adapter: panel returns 200 with
the tag in place, the stylesheet answers 200 `text/css` and 304 on revalidation, and the sidebar
computes to `rgb(29, 35, 39)` in the browser.

The stylesheet is answered by the same middleware, at `/_emdash-skin-wp/skin.css`, with an ETag
derived from its own bytes. Astro's `injectRoute` is deliberately not used: a route injected at
that path never matched under the Cloudflare dev runner, and answering from the middleware also
means the two install paths behave identically.

## Changing the colors

Every color, radius and dimension lives in a custom property named `--wp-*`, all of them declared
in block `[0]` at the top of `skin.css`. Override them by name, without the prefix:

```js
skinWP({
  tokens: {
    accent: "#7f54b3",
    "accent-hover": "#6b46a0",
    ink: "#2c2c2c",
  },
});
```

The overrides are written into a `<style>` after the stylesheet, at the same specificity, so the
later declaration wins. Twelve of the thirty-two tokens are worth touching for branding; the rest
are geometry you probably want to leave alone.

## What it does not do

It is a skin, not a reproduction. Icons stay Phosphor, the typeface stays EmDash's, and the page
structure is untouched. Someone who knows wp-admin well will spot the difference in a second. The
point is recognition, not deception.

Dark mode is deliberately switched off (`color-scheme: light` in block `[0]`). This is not
laziness. The panel's `classic` block is written as `[data-theme=classic]:not([data-mode=dark])`,
so the moment a visitor's OS is set to dark, all twenty-eight WordPress-palette tokens stop
matching at once and the panel falls back to the Kumo defaults, leaving light surfaces under light
text (a success notice measured 1.28:1). WordPress has no dark mode either, so forcing light is
consistent. The consequence you are accepting: the theme toggle in the panel header becomes inert.

## Compatibility, honestly

| skin | tested against |
| --- | --- |
| 0.1.x | emdash 0.36.0, `@emdash-cms/admin` 0.36.0 |

The stylesheet anchors on `data-sidebar="content-container"`, `data-sidebar="menu-button"`,
`.emdash-sidebar` and the `#field-<slug>` ids. None of that is a public contract. It is the
internal DOM of Kumo, Cloudflare's design system, and it can change in any release with no
warning and no error: the failure mode is silent and visual. There are 457 `!important`
declarations in here for the same reason, most of them fighting inline styles that EmDash writes
onto the sidebar wrapper.

So: pin your EmDash version, and open the panel and look at it after every bump. If the skin file
disappears or the CSP changes, the panel falls back to its normal appearance without an error.
The risk you are taking is cosmetic, never functional.

## Contributing

One thing to know before you start, because it will cost you an afternoon otherwise: do not test
your changes through `npm link` or `bun link`. The Cloudflare dev runner refuses to read files
outside the project root, and the symlink puts the stylesheet there, so the panel answers 500 with
`Denied ID .../skin.css?raw` and nothing about the message points at the symlink. Run `npm pack`
and install the tarball instead. That is also closer to what a user gets.

Pull requests are welcome, with one condition that exists to protect everyone's panel: a visual
change has to come with measurements, not opinions. The repository carries a fixture that serves
the real `admin/dist/styles.css` alongside `skin.css`, and the numbers that matter (popup widths,
card heights, contrast ratios, focus ring visibility) are asserted there. A PR that moves one of
those numbers has to say why.

Two known contrast decisions are already logged and were taken with eyes open: `--wp-line` and
`--wp-field-line` are both `#dcdcde`, which measures 1.36:1 against white and therefore sits below
the 3:1 that WCAG 1.4.11 asks for on a border. What carries accessibility instead is the `#8c8f94`
hover state and the 2px focus ring, which is the thing the standard actually needs you to see.
The four status text colors were moved off the `classic` values precisely because those fail AA
(`#00a32a` measures 3.35:1).

## License

MIT.
