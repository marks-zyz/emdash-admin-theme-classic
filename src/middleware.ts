import { defineMiddleware } from "astro:middleware";
import { applySkin, buildHead, CSS_ROUTE } from "./inject.js";
import { serveSkin } from "./serve.js";

const HEAD = buildHead();

export const onRequest = defineMiddleware(async (context, next) => {
	const stylesheet = serveSkin(context.request, CSS_ROUTE);
	if (stylesheet) return stylesheet;
	return applySkin(await next(), context.request, HEAD);
});

export { CSS_ROUTE };
