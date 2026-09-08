import { defineMiddleware } from "astro:middleware";
// Provided by the integration's Vite plugin. Only reachable when classicTheme() is registered.
import { cssRoute, tokens } from "virtual:emdash-classic-theme/config";
import { applySkin, buildHead } from "./inject.js";
import { serveSkin } from "./serve.js";

const HEAD = buildHead(tokens, cssRoute);

export const onRequest = defineMiddleware(async (context, next) => {
	const stylesheet = serveSkin(context.request, cssRoute);
	if (stylesheet) return stylesheet;
	return applySkin(await next(), context.request, HEAD);
});
