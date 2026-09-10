import skin from "./skin.css?raw";
import tokens from "./tokens.css?raw";

/**
 * Which half of the theme goes out. `tokens` is the supported surface on its own
 * (palette and type scale, no generated class names); `full` adds the geometry.
 */
export type Layers = "tokens" | "full";

/** tokens always comes first: every value in skin.css reads a --wp-* declared there. */
export function buildStylesheet(layers: Layers = "full"): string {
	return layers === "tokens" ? tokens : `${tokens}\n${skin}`;
}

// FNV-1a over the stylesheet: a new build of the theme invalidates the cached copy on its own,
// so the href never needs a version query string.
function fingerprint(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return `"${(hash >>> 0).toString(36)}"`;
}

const SHEETS: Record<Layers, { css: string; tag: string }> = {
	tokens: { css: buildStylesheet("tokens"), tag: "" },
	full: { css: buildStylesheet("full"), tag: "" },
};
for (const sheet of Object.values(SHEETS)) sheet.tag = fingerprint(sheet.css);

/** Returns the stylesheet when the request is for it, and null when it is not ours to answer. */
export function serveSkin(request: Request, route: string, layers: Layers = "full"): Response | null {
	if (request.method !== "GET") return null;
	if (new URL(request.url).pathname !== route) return null;

	const { css, tag } = SHEETS[layers] ?? SHEETS.full;

	if (request.headers.get("if-none-match") === tag) {
		return new Response(null, { status: 304, headers: { etag: tag } });
	}

	return new Response(css, {
		headers: {
			"content-type": "text/css; charset=utf-8",
			"cache-control": "public, max-age=300",
			etag: tag,
		},
	});
}
