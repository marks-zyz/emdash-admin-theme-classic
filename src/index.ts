import type { AstroIntegration } from "astro";
import { CSS_ROUTE, type SkinTokens } from "./inject.js";

const VIRTUAL_ID = "virtual:emdash-classic-theme/config";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

export interface ClassicThemeOptions {
	/**
	 * Overrides for the skin's own custom properties, written without the `--wp-` prefix
	 * (`{ accent: "#2271b1" }` sets `--wp-accent`). Names are listed in block [0] of skin.css.
	 */
	tokens?: SkinTokens;
	/** Where the stylesheet is served from. Change only on a path collision. */
	cssRoute?: string;
}

export default function classicTheme(options: ClassicThemeOptions = {}): AstroIntegration {
	const cssRoute = options.cssRoute ?? CSS_ROUTE;
	const tokens = options.tokens ?? {};

	return {
		name: "emdash-classic-theme",
		hooks: {
			"astro:config:setup": ({ addMiddleware, updateConfig }) => {
				updateConfig({
					vite: {
						plugins: [
							{
								name: "emdash-classic-theme:config",
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
					entrypoint: "emdash-classic-theme/middleware-configured",
					order: "pre",
				});
			},
		},
	};
}

export { CSS_ROUTE };
export type { SkinTokens };
