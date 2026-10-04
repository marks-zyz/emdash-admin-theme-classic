export const CSS_ROUTE = "/_emdash-admin-theme-classic/skin.css";

export type SkinTokens = Record<string, string>;

/** Same specificity as the skin's own token block, but later in the document, so it wins. */
export function buildHead(tokens: SkinTokens = {}, href: string = CSS_ROUTE): string {
	const link = `<link rel="stylesheet" href="${href}">`;
	const declarations = Object.entries(tokens)
		.map(([name, value]) => `--wp-${name}:${value}`)
		.join(";");
	return declarations ? `${link}<style>html:root[data-mode]{${declarations}}</style>` : link;
}

const DEV_STYLE = /<style\b[^>]*\sdata-vite-dev-id="([^"]*)"[^>]*>[\s\S]*?<\/style>/g;
const SITE_MODULE_SCRIPT = /<script\b[^>]*\ssrc="(\/src\/[^"]*)"[^>]*><\/script>/g;

// Astro escapes `&` in the style's id attribute but not in the script's src, so an
// Astro component style (`Header.astro?astro&type=style&index=0&lang.css`) only pairs
// up once both sides are read the same way.
const unescapeAmp = (value: string) => value.replaceAll("&amp;", "&");

/**
 * astro dev only (withastro/astro#18060, emdash-cms/emdash#3714): the admin route's module
 * graph reaches every page of the site (emdash -> astro:config/server -> virtual:astro:pages),
 * so Astro writes the site's CSS into the admin <head>, once as <style data-vite-dev-id> and
 * once as <script type="module" src="/src/..."> that has the Vite client inject it again.
 * Both halves of a pair go, and only for modules under the site's /src/: the admin's own CSS
 * (node_modules, or a linked package outside /src/) stays. Production HTML has no
 * data-vite-dev-id and comes back untouched.
 */
function dropSiteDevCss(html: string): string {
	if (!html.includes("data-vite-dev-id=")) return html;

	const siteModules = new Set<string>();
	for (const [, src] of html.matchAll(SITE_MODULE_SCRIPT)) siteModules.add(unescapeAmp(src));
	if (siteModules.size === 0) return html;
	// longest first: `<root>/src/lib/src/a.css` must pair with `/src/lib/src/a.css`, not `/src/a.css`
	const sources = [...siteModules].sort((a, b) => b.length - a.length);

	const dropped = new Set<string>();
	const withoutStyles = html.replace(DEV_STYLE, (tag, id: string) => {
		const file = unescapeAmp(id);
		for (const src of sources) {
			if (file.endsWith(src)) {
				dropped.add(src);
				return "";
			}
		}
		return tag;
	});

	return withoutStyles.replace(SITE_MODULE_SCRIPT, (tag, src: string) =>
		dropped.has(unescapeAmp(src)) ? "" : tag,
	);
}

export async function applySkin(response: Response, request: Request, head: string): Promise<Response> {
	if (request.method !== "GET") return response;
	if (!new URL(request.url).pathname.startsWith("/_emdash/admin")) return response;
	if (response.status !== 200) return response;
	if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

	const original = await response.text();
	const html = dropSiteDevCss(original);
	const headers = new Headers(response.headers);
	headers.delete("content-length"); // body changed size

	const closingHead = html.indexOf("</head>");
	if (closingHead < 0) {
		return new Response(html, {
			status: response.status,
			statusText: response.statusText,
			headers: html === original ? response.headers : headers,
		});
	}

	return new Response(html.slice(0, closingHead) + head + html.slice(closingHead), {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
