declare module "*.css?raw" {
	const content: string;
	export default content;
}

declare module "virtual:emdash-admin-theme-classic/config" {
	export const tokens: Record<string, string>;
	export const cssRoute: string;
	export const layers: "tokens" | "full";
}
