// A folha do jeito que o middleware serve: tokens primeiro, skin depois.
// Mesma ordem de src/serve.ts, num lugar so, para fixture e runtime nao divergirem.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

export const TOKENS_CSS = readFileSync(join(SRC, "tokens.css"), "utf8");
export const SKIN_CSS = readFileSync(join(SRC, "skin.css"), "utf8");
export const FULL_CSS = `${TOKENS_CSS}\n${SKIN_CSS}`;
export const ADMIN_CSS = readFileSync(
  fileURLToPath(import.meta.resolve("@emdash-cms/admin/styles.css")),
  "utf8",
);
