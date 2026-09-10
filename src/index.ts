import type { AstroIntegration } from "astro";
import { CSS_ROUTE, type SkinTokens } from "./inject.js";
import type { Layers } from "./serve.js";

const VIRTUAL_ID = "virtual:emdash-admin-theme-classic/config";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

export interface ClassicAdminThemeOptions {
	/**
	 * Overrides for the theme's own custom properties, written without the `--wp-` prefix
	 * (`{ accent: "#2271b1" }` sets `--wp-accent`). Names are listed in block [0] of tokens.css.
	 */
	tokens?: SkinTokens;
	/**
	 * `full` (default) is palette plus geometry. `tokens` ships only the layer that
	 * rides on documented token names, leaving EmDash's corners and spacing in place.
	 */
	layers?: Layers;
	/** Where the stylesheet is served from. Change only on a path collision. */
	cssRoute?: string;
}

export default function classicAdminTheme(options: ClassicAdminThemeOptions = {}): AstroIntegration {
	const cssRoute = options.cssRoute ?? CSS_ROUTE;
	const tokens = options.tokens ?? {};
	const layers: Layers = options.layers ?? "full";

	return {
		name: "emdash-admin-theme-classic",
		hooks: {
			"astro:config:setup": ({ addMiddleware, updateConfig }) => {
				updateConfig({
					vite: {
						plugins: [
							{
								name: "emdash-admin-theme-classic:config",
								resolveId: (id: string) =>
									id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : null,
								load: (id: string) =>
									id === RESOLVED_VIRTUAL_ID
										? `export const tokens = ${JSON.stringify(tokens)};\nexport const cssRoute = ${JSON.stringify(cssRoute)};\nexport const layers = ${JSON.stringify(layers)};`
										: null,
							},
						],
					},
				});


				addMiddleware({
					entrypoint: "emdash-admin-theme-classic/middleware-configured",
					order: "pre",
				});
			},
		},
	};
}

export { CSS_ROUTE };
export type { Layers, SkinTokens };
