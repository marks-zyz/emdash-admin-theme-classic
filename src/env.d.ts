declare module "*.css?raw" {
	const content: string;
	export default content;
}

declare module "virtual:emdash-skin-wp/config" {
	export const tokens: Record<string, string>;
	export const cssRoute: string;
}
