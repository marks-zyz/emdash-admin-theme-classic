// Dashboard: os cartoes de metrica (data-testid="dashboard-metric", ancora estavel
// citada no README ate a 0.37.0) e o salto de layout entre o esqueleto de
// carregamento e o numero carregado.
//
// O que esta fixture protege (src/skin.css):
// - bloco sem numero, logo antes do [6] ("widgets = .postbox"): a banda do cabecalho
//   (LayerCard.Secondary) ganha min-height 36px, borda inferior e fundo --wp-surface;
//   o corpo (.text-3xl) ganha font-size 24px / font-weight 600 / line-height 1.2.
// - bloco [7] (SHADOW AND MOTION): o cartao (.bg-kumo-elevated.ring-kumo-hairline)
//   ganha o contorno de 1px mais a sombra em camadas.
// - bloco [20b] (ANTI-CLS NOS CARTOES DE METRICA): min-height calc(1.2em + 24px) no
//   corpo, para o esqueleto (8px) e o numero (28.8px de line-height) baterem a MESMA
//   altura e o cartao nao pular quando o dado chega.
//
// Markup copiado do bundle real (medido em @emdash-cms/admin 0.37.0):
//   Dashboard.tsx:171-242 (SummaryMetrics, os estados loading e carregado)
//   layer-card.tsx (chunk layer-card-*.js do @cloudflare/kumo): classes reais de
//   LayerCard / LayerCard.Secondary / LayerCard.Primary, quando o card tem as duas
//   secoes (estrutura "layered"), que e o caso do dashboard-metric.
//   skeleton-line.tsx (chunk skeleton-line-*.js do @cloudflare/kumo): a <div
//   class="skeleton-line"> mede 8px de altura (.skeleton-line{height:.5rem}).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, FULL_CSS: SKIN_CSS } = await import("./stylesheet.mjs");

// data-testid="dashboard-metric" e ancora estavel: o README garante que ela sobrevive
// a 0.36 e a 0.37. Se sumir do bundle, esta fixture para de ter o que proteger.
const README = await (await import("node:fs")).promises.readFile(
  new URL("../README.md", import.meta.url),
  "utf8",
);
assert.match(README, /data-testid="dashboard-metric"/, "o README parou de citar dashboard-metric como ancora estavel");

// Mutante: o anti-CLS do bloco [20b] perde o +24px do padding do corpo. O numero
// (28.8px de altura de linha) volta a ficar mais alto que o esqueleto (8px), o
// mesmo salto de 21px medido no comentario do bloco.
const CLS_FROM = `html[data-mode] main .bg-kumo-elevated.ring-kumo-hairline > .ring-kumo-fill.text-3xl {
  min-height: calc(1.2em + 24px);
}`;
const CLS_TO = CLS_FROM.replace("calc(1.2em + 24px)", "calc(1.2em)");
assert.notEqual(CLS_TO, CLS_FROM, "a mutacao anti-placebo precisa alcancar o min-height do bloco [20b]");
const MUTANT_CSS = SKIN_CSS.replace(CLS_FROM, CLS_TO);
assert.notEqual(MUTANT_CSS, SKIN_CSS, "a mutacao anti-placebo precisa alcancar o skin.css real");

// Mutante 2 (0.2.3, bloco [23d]): o numero volta a ter o px-3 do Tailwind enquanto o titulo
// do cartao ja nao tem padding, os 12px de recuo medidos no Painel (titulo x=267, numero x=279).
const ALIGN_FROM = `html[data-mode] main [data-testid="dashboard-metric-value"] {
  padding-inline: 0;
}`;
const MUTANT_ALIGN_CSS = SKIN_CSS.replace(ALIGN_FROM, "");
assert.notEqual(MUTANT_ALIGN_CSS, SKIN_CSS, "a mutacao anti-placebo precisa alcancar o bloco [23d]");

// --- Classes reais do LayerCard "layered" (Secondary + Primary), lidas do
// código-fonte do @cloudflare/kumo (layer-card.tsx) ---
const ROOT_CLASSES = "flex w-full flex-col overflow-hidden rounded-lg bg-kumo-elevated text-base ring ring-kumo-hairline";
const SECONDARY_CLASSES = "-my-2 flex items-center gap-2 bg-kumo-elevated p-4 text-base font-medium text-kumo-subtle";
const PRIMARY_CLASSES = "relative flex flex-col gap-2 overflow-hidden rounded-lg bg-kumo-base p-4 pr-3 text-inherit no-underline ring ring-kumo-fill";

// Cartao carregado: Dashboard.tsx:230-238 (SummaryMetrics, metrics.map).
function loadedCard(label, value) {
  return `
  <div data-testid="dashboard-metric" class="${ROOT_CLASSES}">
    <div class="${SECONDARY_CLASSES}"><h2 class="px-3">${label}</h2></div>
    <div class="${PRIMARY_CLASSES} text-3xl font-semibold leading-none tabular-nums">
      <div class="px-3" data-testid="dashboard-metric-value">${value}</div>
    </div>
  </div>`;
}

// Cartao em carregamento: Dashboard.tsx:176-187 (SummaryMetrics, ramo loading).
// Sem data-testid: o bundle so escreve "dashboard-metric" no cartao ja carregado.
function loadingCard(labelWidth, valueWidth) {
  return `
  <div data-testid="dashboard-metric-loading" class="${ROOT_CLASSES}">
    <div class="${SECONDARY_CLASSES}"><div class="px-3"><div class="skeleton-line" style="--skeleton-width:${labelWidth}%"></div></div></div>
    <div class="${PRIMARY_CLASSES} text-3xl font-semibold leading-none">
      <div class="px-3"><div class="skeleton-line" style="--skeleton-width:${valueWidth}%"></div></div>
    </div>
  </div>`;
}

// O "div.space-y-6" e a raiz real do Dashboard (Dashboard.tsx:54): sem ele os
// cartoes viram filho DIRETO de "main > div" e herdam a animacao de entrada do
// bloco [7] (linha ~848), que so deveria alcancar o wrapper do grid.
const html = (skinRoute) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${skinRoute}">
  </head>
  <body>
    <main>
      <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-3" style="width:900px">
          ${loadedCard("Rascunhos", 7)}
          ${loadedCard("Arquivos de midia", 214)}
          ${loadedCard("Usuarios", 3)}
        </div>
        <div class="grid gap-4 sm:grid-cols-3" style="width:900px">
          ${loadingCard(55, 28)}
        </div>
      </div>
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
    if (req.url === "/skin-mutant.css") return reply(res, "text/css; charset=utf-8", MUTANT_CSS);
    if (req.url === "/skin-mutant-align.css") return reply(res, "text/css; charset=utf-8", MUTANT_ALIGN_CSS);
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
    const textX = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().x;
    };
    const card = document.querySelector('[data-testid="dashboard-metric"]');
    const secondary = card.firstElementChild;
    const primary = card.lastElementChild;
    const loadingCard = document.querySelector('[data-testid="dashboard-metric-loading"]');
    const loadingPrimary = loadingCard.lastElementChild;
    return {
      cardBoxShadow: getComputedStyle(card).boxShadow,
      cardBorderColor: getComputedStyle(card).borderColor,
      secondaryMinHeight: getComputedStyle(secondary).minHeight,
      secondaryBorderBottomColor: getComputedStyle(secondary).borderBottomColor,
      primaryFontSize: getComputedStyle(primary).fontSize,
      primaryFontWeight: getComputedStyle(primary).fontWeight,
      loadedPrimaryHeight: round(primary.getBoundingClientRect().height),
      loadingPrimaryHeight: round(loadingPrimary.getBoundingClientRect().height),
      // x do TEXTO (Range), nao da caixa: o recuo vem do padding dentro da caixa
      titleX: round(textX(secondary.querySelector("h2"))),
      valueX: round(textX(card.querySelector('[data-testid="dashboard-metric-value"]'))),
    };
  });
}

function validate(metrics) {
  // bloco [7]: contorno de --wp-line na sombra, borda transparente.
  assert.match(metrics.cardBoxShadow, /rgb\(220, 220, 222\)/, "cartao de metrica: falta o contorno 1px de --wp-line na sombra");
  assert.equal(metrics.cardBorderColor, "rgba(0, 0, 0, 0)", "cartao de metrica: a borda tem que ficar transparente");
  // banda do cabecalho (LayerCard.Secondary): min-height 36px e borda inferior --wp-line.
  assert.equal(metrics.secondaryMinHeight, "36px", `banda do cabecalho: min-height 36px esperado, veio ${metrics.secondaryMinHeight}`);
  assert.equal(metrics.secondaryBorderBottomColor, "rgb(220, 220, 222)", "banda do cabecalho: borda inferior --wp-line ausente");
  // corpo (.text-3xl): 24px / 600 / vem do bloco antes do [6].
  assert.equal(metrics.primaryFontSize, "24px", `numero: font-size 24px esperado, veio ${metrics.primaryFontSize}`);
  assert.equal(metrics.primaryFontWeight, "600", `numero: font-weight 600 esperado, veio ${metrics.primaryFontWeight}`);
  // bloco [20b]: anti-CLS. O corpo carregado (numero) e o corpo em skeleton tem
  // que bater a MESMA altura minima, senao o cartao pula quando o dado chega.
  assert.ok(
    Math.abs(metrics.loadedPrimaryHeight - metrics.loadingPrimaryHeight) <= 0.5,
    `anti-CLS: o corpo carregado (${metrics.loadedPrimaryHeight}px) e o do esqueleto (${metrics.loadingPrimaryHeight}px) tem que bater a mesma altura`,
  );
  // bloco [23d]: numero alinhado com o titulo do cartao.
  assert.ok(
    Math.abs(metrics.titleX - metrics.valueX) <= 0.5,
    `numero alinhado: titulo em x=${metrics.titleX}, numero em x=${metrics.valueX}`,
  );
}

test("dashboard: cartoes de metrica com sombra, banda de cabecalho e anti-CLS", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  validate(await measure(page, base, "/skin.css"));

  // Sem o +24px do bloco [20b], o corpo carregado volta a ser mais alto que o do
  // esqueleto: e exatamente o salto de layout medido no comentario do bloco.
  const mutant = await measure(page, base, "/skin-mutant.css");
  assert.throws(() => validate(mutant), /anti-CLS/, "a mutacao do min-height do bloco [20b] tem que reprovar a fixture");

  const misaligned = await measure(page, base, "/skin-mutant-align.css");
  assert.throws(() => validate(misaligned), /numero alinhado/, "sem o bloco [23d] o numero tem que sair do alinhamento");
});
