import css from "./skin.css?raw";

// FNV-1a over the stylesheet: a new build of the skin invalidates the cached copy on its own,
// so the href never needs a version query string.
function fingerprint(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return `"${(hash >>> 0).toString(36)}"`;
}

const TAG = fingerprint(css);

/** Returns the stylesheet when the request is for it, and null when it is not ours to answer. */
export function serveSkin(request: Request, route: string): Response | null {
	if (request.method !== "GET") return null;
	if (new URL(request.url).pathname !== route) return null;

	if (request.headers.get("if-none-match") === TAG) {
		return new Response(null, { status: 304, headers: { etag: TAG } });
	}

	return new Response(css, {
		headers: {
			"content-type": "text/css; charset=utf-8",
			"cache-control": "public, max-age=300",
			etag: TAG,
		},
	});
}
