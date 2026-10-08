// applySkin em astro dev: o CSS do SITE nao pode entrar no <head> do admin.
//
// Causa (withastro/astro#18060, emdash-cms/emdash#3714): o grafo de modulos da rota do
// admin alcanca todas as paginas do site (emdash -> astro:config/server ->
// virtual:astro:pages), e o Astro dev escreve cada folha do site DUAS vezes no admin:
// <style data-vite-dev-id="<raiz>/src/..."> e <script type="module" src="/src/...">,
// que faz o cliente do Vite injetar a folha de novo. Medido em 0.2.2 num site real:
// 14 folhas do site no DOM do admin, h1 em Georgia. Tirar so o <style> nao basta: com
// o <script> no HTML, o DOM voltava a ter as 14 (medido).
//
// Markup copiado do HTML real do admin em astro dev (Astro 7.3.5, EmDash 1.1.0): o id
// do <style> vem com `&amp;` e o src do <script> com `&` cru, por isso o terceiro
// mutante.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "inject.ts"), "utf8");

// transpila em vez de importar o .ts: o CI roda o node do runner, que pode nao ter
// type stripping.
async function load(source) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

function mutate(from, to) {
  assert.ok(SOURCE.includes(from), `o trecho do mutante sumiu de src/inject.ts: ${from}`);
  const mutant = SOURCE.replace(from, to);
  assert.notEqual(mutant, SOURCE, "a mutacao anti-placebo precisa alcancar o inject.ts real");
  return mutant;
}

// Mutante 1: o <script type=module> do site fica (so o <style> sai), o "segundo canal".
const KEEPS_SCRIPT = mutate(
  "return withoutStyles.replace(SITE_MODULE_SCRIPT,",
  "return withoutStyles; void withoutStyles.replace(SITE_MODULE_SCRIPT,",
);
// Mutante 2: o pareamento com /src/ deixa de ser a unica porta, e o <style> de
// node_modules (o styles.css do proprio admin) sai junto.
const DROPS_ADMIN = mutate(
  "if (file.endsWith(src)) {",
  'if (file.endsWith(src) || file.includes("/node_modules/")) {',
);
// Mutante 3: sem desfazer o `&amp;`, a folha de componente .astro do site nao pareia.
const IGNORES_AMP = mutate('value.replaceAll("&amp;", "&")', "value");
// Mutante 4: sem a ordem do mais longo para o mais curto, `<raiz>/src/lib/src/a.css` pareia
// com `/src/a.css` (sufixo) e o <script> dela fica.
const SHORTEST_WINS = mutate("const sources = [...siteModules].sort((a, b) => b.length - a.length);", "const sources = [...siteModules].sort((a, b) => a.length - b.length);");

const ROOT = "/home/dev/meu-site";
const SITE_GLOBAL = "/src/styles/global.css";
const SITE_COMPONENT = "/src/components/Header.astro?astro&type=style&index=0&lang.css";
const ADMIN_SHEET = "/node_modules/@emdash-cms/admin/dist/styles.css?url";
const EMDASH_COMPONENT = "/node_modules/emdash/src/components/Image.astro?astro&type=style&index=0&lang.css";
// uma pasta `src` dentro da src do site, com o mesmo nome de arquivo de outra folha
const SITE_SHORT = "/src/a.css";
const SITE_NESTED = "/src/lib/src/a.css";
const HEAD = '<link rel="stylesheet" href="/_emdash-admin-theme-classic/skin.css">';

const script = (src) => `<script type="module" src="${src}"></script>`;
const style = (url, css) =>
  `<style data-vite-dev-id="${ROOT}${url.replaceAll("&", "&amp;")}">${css}</style>`;

const DEV_HTML = [
  '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">',
  script("/@vite/client"),
  script(ADMIN_SHEET),
  script(SITE_GLOBAL),
  script(SITE_COMPONENT),
  script(EMDASH_COMPONENT),
  script(SITE_SHORT),
  script(SITE_NESTED),
  "<title>EmDash Admin</title>",
  style(ADMIN_SHEET, ".admin-sheet{color:red}"),
  style(SITE_GLOBAL, "h1{font-family:Georgia,serif}"),
  style(SITE_COMPONENT, "h2[data-astro-cid-x]{margin:0}"),
  style(EMDASH_COMPONENT, "img[data-astro-cid-y]{display:block}"),
  style(SITE_NESTED, ".nested{color:blue}"),
  style(SITE_SHORT, ".short{color:green}"),
  '</head><body><div id="admin-root"></div></body></html>',
].join("");

const PROD_HTML =
  '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
  '<link rel="stylesheet" href="/_astro/styles.CBsjMQwD.css">' +
  "<style>#emdash-boot-loader{position:fixed}</style><title>EmDash Admin</title>" +
  '<script type="module" src="/_astro/admin.js"></script></head><body><div id="admin-root"></div></body></html>';

async function render(mod, html) {
  const response = new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  const out = await mod.applySkin(response, new Request("http://localhost:4321/_emdash/admin/menus"), HEAD);
  return out.text();
}

function validateDev(out) {
  assert.ok(!out.includes("Georgia"), "folha global do site continua no <head> do admin");
  assert.ok(!out.includes(`src="${SITE_GLOBAL}"`), "segundo canal: o <script type=module> da folha do site continua no HTML");
  assert.ok(!out.includes("data-astro-cid-x"), "folha de componente .astro do site (id com &amp;) continua no HTML");
  assert.ok(!out.includes(`src="${SITE_COMPONENT}"`), "segundo canal: o <script> da folha de componente do site continua no HTML");
  assert.ok(out.includes(".admin-sheet{color:red}"), "o styles.css do proprio admin (node_modules) sumiu");
  assert.ok(out.includes(`src="${ADMIN_SHEET}"`), "o <script> do styles.css do admin sumiu");
  assert.ok(out.includes("img[data-astro-cid-y]"), "folha de componente do emdash (node_modules) sumiu");
  assert.ok(out.includes(`src="/@vite/client"`), "o cliente do Vite sumiu");
  assert.ok(!out.includes(".nested{") && !out.includes(".short{"), "folha aninhada (src dentro de src) continua no <head>");
  assert.ok(!out.includes(`src="${SITE_NESTED}"`) && !out.includes(`src="${SITE_SHORT}"`), "pareamento por sufixo: o <script> da folha aninhada ficou");
  assert.ok(out.includes(`${HEAD}</head>`), "o <link> do tema nao entrou antes do </head>");
}

test("astro dev: as folhas do site saem nos dois canais e as do admin ficam", async () => {
  validateDev(await render(await load(SOURCE), DEV_HTML));
});

test("producao: HTML sem data-vite-dev-id sai byte a byte igual, so com o <link> do tema", async () => {
  const out = await render(await load(SOURCE), PROD_HTML);
  const at = PROD_HTML.indexOf("</head>");
  assert.equal(out, PROD_HTML.slice(0, at) + HEAD + PROD_HTML.slice(at));
});

test("anti-placebo: os quatro mutantes do inject.ts reprovam", async () => {
  await assert.rejects(async () => validateDev(await render(await load(KEEPS_SCRIPT), DEV_HTML)), /segundo canal/);
  await assert.rejects(async () => validateDev(await render(await load(DROPS_ADMIN), DEV_HTML)), /admin/);
  await assert.rejects(async () => validateDev(await render(await load(IGNORES_AMP), DEV_HTML)), /componente \.astro/);
  await assert.rejects(async () => validateDev(await render(await load(SHORTEST_WINS), DEV_HTML)), /pareamento por sufixo/);
});
