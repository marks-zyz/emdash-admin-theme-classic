import type { AstroIntegration } from "astro";
import { CSS_ROUTE, type SkinTokens } from "./inject.js";

const VIRTUAL_ID = "virtual:emdash-skin-wp/config";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

export interface SkinWPOptions {
	/**
	 * Overrides for the skin's own custom properties, written without the `--wp-` prefix
	 * (`{ accent: "#2271b1" }` sets `--wp-accent`). Names are listed in block [0] of skin.css.
	 */
	tokens?: SkinTokens;
	/** Where the stylesheet is served from. Change only on a path collision. */
	cssRoute?: string;
}

export default function skinWP(options: SkinWPOptions = {}): AstroIntegration {
	const cssRoute = options.cssRoute ?? CSS_ROUTE;
	const tokens = options.tokens ?? {};

	return {
		name: "emdash-skin-wp",
		hooks: {
			"astro:config:setup": ({ addMiddleware, updateConfig }) => {
				updateConfig({
					vite: {
						plugins: [
							{
								name: "emdash-skin-wp:config",
								resolveId: (id: string) =>
									id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : null,
								load: (id: string) =>
									id === RESOLVED_VIRTUAL_ID
										? `export const tokens = ${JSON.stringify(tokens)};\nexport const cssRoute = ${JSON.stringify(cssRoute)};`
										: null,
							},
						],
					},
				});


				addMiddleware({
					entrypoint: "emdash-skin-wp/middleware-configured",
					order: "pre",
				});
			},
		},
	};
}

export { CSS_ROUTE };
export type { SkinTokens };
