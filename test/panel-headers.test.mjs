// Cabecalho dos painieis do editor (aside[data-side=right]).
//
// O que esta fixture protege: o discriminador `.flex` em `div.flex:has(> h3)`.
// Dois painieis embrulham o titulo E o conteudo no mesmo <div> (Taxonomias e
// Traducoes) e um embrulha so o titulo mais o botao de ajuda (Creditos). Sem a
// classe no seletor, as regras dos blocos [10] e [21] alcancam os tres, e os dois
// primeiros viram uma linha flex: titulo a esquerda, lista inteira a direita.
//
// O markup abaixo copia o que o bundle emite (medido em @emdash-cms/admin 0.37.0,
// ContentSettingsPanel.tsx e TaxonomySidebar.tsx, identico em 0.36.0).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_CSS = readFileSync(fileURLToPath(import.meta.resolve("@emdash-cms/admin/styles.css")), "utf8");
const SKIN_CSS = readFileSync(join(ROOT, "src", "skin.css"), "utf8");
// Mutacao anti-placebo: e exatamente a troca do commit 39ae114, que quebrou os dois painieis.
const MUTANT_CSS = SKIN_CSS.replaceAll("> div.flex:has(> h3)", "> div:has(> h3)");

assert.notEqual(MUTANT_CSS, SKIN_CSS, "a mutacao anti-placebo precisa alcancar o discriminador .flex");

const section = (id, inner) => `
<section data-testid="${id}" data-sorting="false" data-disclosure="false" style="inline-size:100%"
  class="relative min-w-0 border-t bg-kumo-base first:border-t-0">${inner}
  <button type="button" data-sortable-handle data-sorting="false" class="absolute z-10 grid size-7 end-5 top-3">h</button>
</section>`;

// Publicar e Propriedade: h3 solto, filho direto do div.p-4.
const PUBLISH = section(
  "publish",
  `<div class="p-4">
    <h3 data-h3 class="mb-4 font-bold">Publicar</h3>
    <div data-content class="space-y-4"><input class="w-full" value="slug"></div>
  </div>`,
);

// Creditos: linha flex com o titulo e o botao de ajuda; o conteudo fica FORA dela.
const BYLINES = section(
  "bylines",
  `<div class="p-4">
    <div data-wrap class="mb-4 flex items-center gap-1.5 pe-24">
      <h3 data-h3 class="font-bold">Cr&eacute;ditos</h3>
      <button type="button" data-help class="size-4">i</button>
    </div>
    <div data-content><div class="rounded-lg border p-3">Ra&iacute;ssa de Souza Sim&atilde;o</div></div>
    <button type="button" class="absolute end-14 top-2">+</button>
  </div>`,
);

// Traducoes e Taxonomias: um <div> sem classe embrulha o titulo E a lista.
const TRANSLATIONS = section(
  "translations",
  `<div class="p-4">
    <div data-wrap>
      <h3 data-h3 class="mb-4 font-bold">Tradu&ccedil;&otilde;es</h3>
      <div data-content class="space-y-2"><div class="rounded border p-2">pt-BR</div></div>
    </div>
  </div>`,
);

const TAXONOMIES = section(
  "taxonomies",
  `<div class="p-4">
    <div data-wrap>
      <h3 data-h3 class="mb-4 font-bold">Taxonomias</h3>
      <div data-content class="space-y-4">
        <div class="space-y-2"><label>Categories</label>
        <div class="border rounded-lg p-2 max-h-64 overflow-y-auto">Direitos do Consumidor</div></div>
      </div>
    </div>
  </div>`,
);

const html = (skinRoute) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${skinRoute}">
  </head>
  <body>
    <aside data-side="right" style="width:368px">
      <div data-sidebar="content-container">
        <div class="overflow-y-auto">
          <div>${PUBLISH}${BYLINES}${TRANSLATIONS}${TAXONOMIES}</div>
        </div>
      </div>
    </aside>
  </body>
</html>`;

function reply(res, type, body) {
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function fixtureServer() {
  const server = createServer((req, res) => {
    if (req.url === "/admin.css") return reply(res, "text/css; charset=utf-8", ADMIN_CSS);
    if (req.url === "/skin.css") return reply(res, "text/css; charset=utf-8", SKIN_CSS);
    if (req.url === "/skin-mutant.css") return reply(res, "text/css; charset=utf-8", MUTANT_CSS);
    const skin = new URL(req.url, "http://fixture").searchParams.get("skin") || "/skin.css";
    return reply(res, "text/html; charset=utf-8", html(skin));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function measure(page, base, skinRoute) {
  await page.goto(`${base}/?skin=${encodeURIComponent(skinRoute)}`, { waitUntil: "networkidle" });
  return page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height), right: round(r.right), bottom: round(r.bottom) };
    };
    const panels = {};
    for (const el of document.querySelectorAll("section[data-testid]")) {
      const wrap = el.querySelector("[data-wrap]");
      panels[el.dataset.testid] = {
        section: box(el),
        wrap: box(wrap),
        wrapDisplay: wrap ? getComputedStyle(wrap).display : null,
        h3: box(el.querySelector("[data-h3]")),
        content: box(el.querySelector("[data-content]")),
      };
    }
    return {
      panels,
      // O seletor do bloco [21] tem que alcancar exatamente uma linha: a do Creditos.
      flexRows: document.querySelectorAll("section[data-sorting] > div > div.flex:has(> h3)").length,
      loosePanelWrappers: document.querySelectorAll("section[data-sorting] > div > div:has(> h3)").length,
    };
  });
}

function validate({ panels, flexRows, loosePanelWrappers }) {
  assert.equal(flexRows, 1, `a linha flex de titulo e unica (Creditos), vieram ${flexRows}`);
  assert.equal(loosePanelWrappers, 3, `a fixture precisa ter 3 wrappers com h3 filho, veio ${loosePanelWrappers}`);

  // Banda de borda a borda nos painieis cujo titulo manda sozinho.
  for (const id of ["publish", "translations", "taxonomies"]) {
    const { section: sec, h3, content } = panels[id];
    assert.ok(
      Math.abs(h3.width - sec.width) <= 1,
      `${id}: a banda do titulo tem que ocupar a section inteira (${h3.width}px de ${sec.width}px)`,
    );
    assert.ok(Math.abs(h3.height - 36) <= 0.5, `${id}: banda de 36px, veio ${h3.height}px`);
    assert.ok(
      content.y >= h3.bottom - 0.5,
      `${id}: o conteudo tem que comecar ABAIXO do titulo (titulo termina em ${h3.bottom}, conteudo comeca em ${content.y})`,
    );
    assert.ok(
      content.x < h3.right,
      `${id}: o conteudo nao pode ficar ao lado do titulo (x=${content.x}, titulo termina em ${h3.right})`,
    );
  }

  // Creditos: a banda e a linha inteira, o h3 volta a ser texto e o conteudo fica abaixo.
  const bylines = panels.bylines;
  assert.equal(bylines.wrapDisplay, "flex", "Creditos: a linha do titulo continua flex");
  assert.ok(
    Math.abs(bylines.wrap.width - bylines.section.width) <= 1,
    `Creditos: a banda ocupa a section inteira (${bylines.wrap.width}px de ${bylines.section.width}px)`,
  );
  // 37px e nao 36: o botao de ajuda ja ocupa os 36px de content-box (28 + 4 + 4) e a
  // borda inferior soma o pixel que falta. Nos titulos soltos o texto cabe no min-height.
  assert.ok(
    bylines.wrap.height >= 36 && bylines.wrap.height <= 37.5,
    `Creditos: banda entre 36 e 37px, veio ${bylines.wrap.height}px`,
  );
  assert.ok(bylines.h3.width < 200, `Creditos: o h3 e so o texto do titulo, veio ${bylines.h3.width}px`);
  assert.ok(
    bylines.content.y >= bylines.wrap.bottom - 0.5,
    `Creditos: o conteudo comeca abaixo da banda (banda termina em ${bylines.wrap.bottom}, conteudo em ${bylines.content.y})`,
  );
}

test("os painieis do editor mantem o titulo em banda, com o conteudo abaixo", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

  validate(await measure(page, base, "/skin.css"));

  // Sem o discriminador, Taxonomias e Traducoes viram linha flex e a fixture reprova.
  const mutant = await measure(page, base, "/skin-mutant.css");
  assert.equal(mutant.panels.taxonomies.wrapDisplay, "flex", "a mutacao precisa reproduzir o bug medido");
  assert.throws(() => validate(mutant), /ABAIXO do titulo|banda do titulo/, "a mutacao tem que reprovar a fixture");
});
