export const CSS_ROUTE = "/_emdash-classic-theme/skin.css";

export type SkinTokens = Record<string, string>;

/** Same specificity as the skin's own token block, but later in the document, so it wins. */
export function buildHead(tokens: SkinTokens = {}, href: string = CSS_ROUTE): string {
	const link = `<link rel="stylesheet" href="${href}">`;
	const declarations = Object.entries(tokens)
		.map(([name, value]) => `--wp-${name}:${value}`)
		.join(";");
	return declarations ? `${link}<style>html:root[data-mode]{${declarations}}</style>` : link;
}

export async function applySkin(response: Response, request: Request, head: string): Promise<Response> {
	if (request.method !== "GET") return response;
	if (!new URL(request.url).pathname.startsWith("/_emdash/admin")) return response;
	if (response.status !== 200) return response;
	if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

	const html = await response.text();
	const closingHead = html.indexOf("</head>");
	if (closingHead < 0) {
		return new Response(html, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	}

	const headers = new Headers(response.headers);
	headers.delete("content-length"); // body grew

	return new Response(html.slice(0, closingHead) + head + html.slice(closingHead), {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
