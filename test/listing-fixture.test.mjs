// Listagens do painel: a tabela de conteudo (Artigos e colecoes) e a listagem que o
// EmDash constroi com <div> em vez de <table> (Taxonomias, Redirecionamentos).
//
// O que esta fixture protege:
// - bloco [11] (src/skin.css): a celula de estado (vazio/carregando/erro) de uma
//   tabela ganha respiro (py-8/py-12) e a linha sai do zebra/hover.
// - bloco [12] (src/skin.css): a listagem em <div> (sem <table>) ganha o mesmo
//   cartao com sombra das outras listagens, e a banda do cabecalho vira "thead".
//
// Markup copiado do bundle real (medido em @emdash-cms/admin 0.37.0):
//   ContentList.tsx:578-654 (wrapper + thead + celula de estado, tabela real)
//   TaxonomyManager.tsx:1052-1078 (wrapper + banda de cabecalho, listagem em div)
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, FULL_CSS: SKIN_CSS } = await import("./stylesheet.mjs");

// Mutante 1: tira ".py-8" do discriminador da celula de estado (bloco [11]).
// Alcanca as 3 ocorrencias do fragmento, que pertencem todas ao mesmo bloco.
const MUTANT_STATE_CSS = SKIN_CSS.replaceAll(":is(.py-8, .py-12)", ":is(.py-9, .py-12)");
assert.notEqual(MUTANT_STATE_CSS, SKIN_CSS, "a mutacao anti-placebo precisa alcancar o discriminador .py-8");

// Mutante 2: a banda de cabecalho da listagem em <div> (bloco [12]) perde a cor
// da borda inferior (era var(--wp-line), vira transparent).
const DIV_HEADER_FROM = `html[data-mode] main div.border.rounded-lg:has(> .border-b.bg-kumo-tint\\/50) > .border-b.bg-kumo-tint\\/50 {
  border-bottom: 1px solid var(--wp-line) !important;`;
const DIV_HEADER_TO = DIV_HEADER_FROM.replace(
  "border-bottom: 1px solid var(--wp-line) !important;",
  "border-bottom: 1px solid transparent !important;",
);
const MUTANT_DIV_CSS = SKIN_CSS.replace(DIV_HEADER_FROM, DIV_HEADER_TO);
assert.notEqual(MUTANT_DIV_CSS, SKIN_CSS, "a mutacao anti-placebo precisa alcancar a banda do bloco [12]");

// --- Tabela real (ContentList.tsx): thead + celula de estado ---
const TABLE_HTML = `
<div data-testid="table-wrap" class="rounded-md border bg-kumo-base overflow-x-auto">
  <table class="w-full">
    <thead>
      <tr class="border-b bg-kumo-tint/50">
        <th scope="col" class="px-4 py-3 text-start text-sm font-medium">Titulo</th>
        <th scope="col" class="px-4 py-3 text-start text-sm font-medium">Status</th>
        <th scope="col" class="px-4 py-3 text-end text-sm font-medium">Acoes</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-kumo-line">
      <tr data-testid="data-row" class="hover:bg-kumo-tint/25">
        <td class="px-4 py-3"><a class="font-medium hover:text-kumo-link">Artigo de teste</a></td>
        <td class="px-4 py-3">Publicado</td>
        <td class="px-4 py-3 text-end">-</td>
      </tr>
    </tbody>
  </table>
</div>`;

const STATE_HTML = `
<div data-testid="table-wrap-empty" class="rounded-md border bg-kumo-base overflow-x-auto">
  <table class="w-full">
    <thead>
      <tr class="border-b bg-kumo-tint/50">
        <th scope="col" class="px-4 py-3 text-start text-sm font-medium">Titulo</th>
        <th scope="col" class="px-4 py-3 text-start text-sm font-medium">Status</th>
        <th scope="col" class="px-4 py-3 text-end text-sm font-medium">Acoes</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-kumo-line">
      <tr data-testid="state-row">
        <td colspan="3" data-testid="state-cell" class="px-4 py-8 text-center text-kumo-subtle">
          Nenhum item ainda.
        </td>
      </tr>
    </tbody>
  </table>
</div>`;

// --- Listagem em <div> real (TaxonomyManager.tsx:1052-1078) ---
const DIV_LISTING_HTML = `
<div data-testid="div-wrap" class="border rounded-lg">
  <div data-testid="div-header" class="flex items-center gap-4 py-2 px-4 border-b bg-kumo-tint/50 font-medium">
    <div class="flex-1">Nome</div>
    <div class="w-16 text-center">Contagem</div>
    <div class="w-24 text-center">Acoes</div>
  </div>
  <div class="divide-y divide-kumo-line">
    <div class="flex items-center gap-4 py-2 px-4 hover:bg-kumo-tint/50">
      <div class="flex-1"><span class="font-medium">Direito do Consumidor</span></div>
      <div class="text-sm text-kumo-subtle">3</div>
      <div class="flex gap-2"></div>
    </div>
  </div>
</div>`;

const html = (skinRoute) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${skinRoute}">
  </head>
  <body>
    <main>
      ${TABLE_HTML}
      ${STATE_HTML}
      ${DIV_LISTING_HTML}
    </main>
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
    if (req.url === "/skin-mutant-state.css") return reply(res, "text/css; charset=utf-8", MUTANT_STATE_CSS);
    if (req.url === "/skin-mutant-div.css") return reply(res, "text/css; charset=utf-8", MUTANT_DIV_CSS);
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
      const r = el.getBoundingClientRect();
      return { height: round(r.height), width: round(r.width) };
    };
    const stateCell = document.querySelector('[data-testid="state-cell"]');
    const stateRow = document.querySelector('[data-testid="state-row"]');
    const dataRow = document.querySelector('[data-testid="data-row"]');
    const divWrap = document.querySelector('[data-testid="div-wrap"]');
    const divHeader = document.querySelector('[data-testid="div-header"]');
    return {
      stateCell: { ...box(stateCell), padding: getComputedStyle(stateCell).padding },
      stateRowBg: getComputedStyle(stateRow).backgroundColor,
      dataRowBg: getComputedStyle(dataRow).backgroundColor,
      divWrapBoxShadow: getComputedStyle(divWrap).boxShadow,
      divWrapBorderColor: getComputedStyle(divWrap).borderColor,
      divHeaderBorderBottomColor: getComputedStyle(divHeader).borderBottomColor,
      divHeaderBg: getComputedStyle(divHeader).backgroundColor,
    };
  });
}

function validateState(metrics) {
  // bloco [11]: altura minima ~96px (24px + 24px de padding + as ~3 linhas de texto ficam dentro).
  assert.ok(metrics.stateCell.height >= 95, `celula de estado: esperado >=95px de altura, veio ${metrics.stateCell.height}px`);
  assert.match(metrics.stateCell.padding, /^24px/, `celula de estado: padding-block 24px esperado, veio "${metrics.stateCell.padding}"`);
  // a linha de estado sai do zebra: fica var(--wp-surface) = branco, igual ao fundo do cartao.
  assert.equal(metrics.stateRowBg, "rgb(255, 255, 255)", `linha de estado: esperado branco (fora do zebra), veio ${metrics.stateRowBg}`);
  // a linha de dado comum continua recebendo o zebra (nao pode ser branca como a de estado).
  assert.notEqual(metrics.dataRowBg, "rgb(255, 255, 255)", "linha de dado comum: o zebra sumiu, ficou igual a linha de estado");
}

function validateDivListing(metrics) {
  // bloco [12]: o wrapper em <div> ganha o mesmo cartao com sombra que as tabelas (bloco [7]).
  assert.match(metrics.divWrapBoxShadow, /rgb\(220, 220, 222\)/, "listagem em <div>: falta o contorno 1px de --wp-line na sombra do cartao");
  assert.equal(metrics.divWrapBorderColor, "rgba(0, 0, 0, 0)", "listagem em <div>: a borda tem que ficar transparente (a sombra desenha o contorno)");
  // a banda do cabecalho vira "thead": borda inferior na cor de --wp-line, fundo --wp-surface.
  assert.equal(metrics.divHeaderBorderBottomColor, "rgb(220, 220, 222)", `banda do cabecalho: borda inferior esperada rgb(220, 220, 222), veio ${metrics.divHeaderBorderBottomColor}`);
  assert.equal(metrics.divHeaderBg, "rgb(255, 255, 255)", `banda do cabecalho: fundo esperado branco, veio ${metrics.divHeaderBg}`);
}

test("tabela de conteudo: a celula de estado ganha respiro e sai do zebra", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

  validateState(await measure(page, base, "/skin.css"));

  const mutant = await measure(page, base, "/skin-mutant-state.css");
  assert.throws(() => validateState(mutant), /celula de estado/, "a mutacao do .py-8 tem que reprovar a fixture");
});

test("listagem em <div> (Taxonomias/Redirecionamentos) ganha o cartao e o cabecalho da tabela", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

  validateDivListing(await measure(page, base, "/skin.css"));

  const mutant = await measure(page, base, "/skin-mutant-div.css");
  assert.throws(() => validateDivListing(mutant), /banda do cabecalho/, "a mutacao da banda do bloco [12] tem que reprovar a fixture");
});
