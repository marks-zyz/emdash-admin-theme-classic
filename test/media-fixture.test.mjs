// Biblioteca de midia: a grade de itens (MediaBrowserItem, layout="grid"), o mesmo
// LayerCard "layered" que o dashboard usa, so que aqui e um <button> clicavel.
//
// O que esta fixture protege (src/skin.css, bloco [7] SHADOW AND MOTION):
// - o cartao (.bg-kumo-elevated.ring-kumo-hairline) ganha o contorno de 1px mais a
//   sombra em quatro camadas, igual as outras listagens (comentario do bloco [7]:
//   "metric cards, Dashboard widgets, listing tables and settings blocks").
// - "so o cartao sobe no hover" (comentario da linha 790): UNICO entre os alvos do
//   bloco [7], o cartao de midia e de fato clicavel (button real, LayerCard com
//   render=<button>), entao e o caso que mais precisa do lift no :hover.
//
// NAO protegido aqui (deixado de fora, checado na extracao do bundle): nao existe
// bloco numerado dedicado a midia em skin.css (sem "[Media]" ou equivalente); o
// que alcanca a grade e o bloco [7], generico para qualquer cartao elevado, e essa
// e a lacuna que esta fixture cobre, medindo o bloco [7] contra o markup REAL do
// componente de midia em vez de so contra o dashboard.
//
// Markup copiado do bundle real (medido em @emdash-cms/admin 0.37.0):
//   media/MediaBrowserItems.tsx:133-168 (MediaBrowserItem, layout grid). Usa o
//   estado sem preview visual (hasVisualPreview=false), o mesmo ramo real para um
//   arquivo sem imagem/proxy, pra nao depender de carregar uma imagem de verdade.
//   layer-card.tsx (chunk layer-card-*.js do @cloudflare/kumo): mesmas classes
//   reais do dashboard-fixture (raiz "layered", Secondary, Primary).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, FULL_CSS: SKIN_CSS } = await import("./stylesheet.mjs");

// Mutante: o lift exclusivo do cartao no :hover (comentario "only the card lifts on
// hover") perde o translateY. E o unico lugar do bloco [7] que aplica transform, e
// so alcanca .bg-kumo-elevated.ring-kumo-hairline (nunca a tabela nem o bloco de
// configuracao), exatamente o cartao de midia desta fixture.
const HOVER_LIFT_FROM = `html[data-mode] main .bg-kumo-elevated.ring-kumo-hairline:hover {
  -webkit-transform: translateY(-1px);
  transform: translateY(-1px);
}`;
const HOVER_LIFT_TO = HOVER_LIFT_FROM.replaceAll("translateY(-1px)", "translateY(0px)");
assert.notEqual(HOVER_LIFT_TO, HOVER_LIFT_FROM, "a mutacao anti-placebo precisa alcancar o lift exclusivo do cartao");
const MUTANT_CSS = SKIN_CSS.replace(HOVER_LIFT_FROM, HOVER_LIFT_TO);
assert.notEqual(MUTANT_CSS, SKIN_CSS, "a mutacao anti-placebo precisa alcancar o skin.css real");

// --- Classes reais do LayerCard "layered", lidas de layer-card.tsx (mesmas do
// dashboard-fixture: a estrutura root/Secondary/Primary nao muda por tela) ---
const ROOT_CLASSES = "flex w-full flex-col overflow-hidden rounded-lg bg-kumo-elevated text-base ring ring-kumo-hairline";
const PRIMARY_CLASSES = "relative flex flex-col gap-2 overflow-hidden rounded-lg bg-kumo-base p-4 pr-3 text-inherit no-underline ring ring-kumo-fill";
const SECONDARY_CLASSES = "-my-2 flex items-center gap-2 bg-kumo-elevated p-4 text-base font-medium text-kumo-subtle";

// MediaBrowserItem, layout grid (MediaBrowserItems.tsx:133-168), item nao selecionado,
// sem preview visual (o ramo do "document" generico: div.flex com o icone do tipo).
function mediaCard(filename, ext) {
  return `
  <button type="button" data-testid="media-card" data-media-layout="grid"
    class="group relative w-full min-w-0 text-start focus-visible:ring-2 focus-visible:ring-kumo-brand hover:ring-kumo-brand/50 ${ROOT_CLASSES}">
    <div class="${PRIMARY_CLASSES} aspect-video p-0">
      <div class="flex h-full w-full items-center justify-center bg-kumo-tint">
        <span class="text-4xl" aria-hidden="true">&#128196;</span>
      </div>
    </div>
    <div class="${SECONDARY_CLASSES} my-0 min-w-0 justify-between px-3 py-2.5 text-sm text-kumo-default">
      <span dir="auto" title="${filename}" class="min-w-0 flex-1 truncate font-medium leading-5">${filename}</span>
      <span class="h-5 min-w-11 justify-center rounded-md px-2 py-0 inline-flex items-center">
        <span class="text-[11px] leading-none text-kumo-default/75">${ext}</span>
      </span>
    </div>
  </button>`;
}

// O "div.space-y-6" e o mesmo nivel que MediaLibrary/Dashboard usam pra embrulhar a
// pagina inteira (Dashboard.tsx:54): sem ele o cartao vira filho DIRETO de "main > div"
// e ganha a animacao de entrada do bloco [7] ("content: title, then cards, then
// widgets", linha ~848), que prende o transform no estado final da keyframe e mascara
// o lift do hover. Com o nivel extra, quem recebe a entrada e o wrapper do grid, igual
// no bundle real.
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
        <div class="grid grid-cols-4 gap-4" style="width:900px">
          ${mediaCard("relatorio-anual.pdf", "PDF")}
          ${mediaCard("planilha-custos.xlsx", "XLSX")}
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
  // o mouse do Playwright nao volta pro canto quando a pagina troca: sem isso, a
  // segunda medicao (mutante) reaproveita a posicao do hover anterior e "before" ja
  // vem hovered, mascarando a comparacao.
  await page.mouse.move(0, 0);
  const card = page.locator('[data-testid="media-card"]').first();
  const before = await card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { boxShadow: s.boxShadow, borderColor: s.borderColor, transform: s.transform };
  });
  await card.hover();
  // bloco [7] transiciona transform/box-shadow em --wp-normal (280ms); espera acabar
  // antes de medir, senao pega um valor intermediario da animacao.
  await page.waitForTimeout(400);
  const after = await card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { boxShadow: s.boxShadow, transform: s.transform };
  });
  return { before, after };
}

// extrai o deslocamento vertical (componente "f") de um transform resolvido como
// matrix(a, b, c, d, e, f), ou 0 quando o navegador devolve "none".
function translateY(transform) {
  if (transform === "none") return 0;
  const m = transform.match(/matrix\(([^)]+)\)/);
  assert.ok(m, `transform inesperado, nao e matrix nem "none": "${transform}"`);
  return Number(m[1].split(",")[5]);
}

function validate({ before, after }) {
  // bloco [7]: contorno de --wp-line na sombra, borda transparente, em repouso.
  assert.match(before.boxShadow, /rgb\(220, 220, 222\)/, "cartao de midia: falta o contorno 1px de --wp-line na sombra em repouso");
  assert.equal(before.borderColor, "rgba(0, 0, 0, 0)", "cartao de midia: a borda tem que ficar transparente");
  assert.equal(translateY(before.transform), 0, `cartao de midia: sem hover nao pode estar deslocado, veio transform "${before.transform}"`);
  // no :hover, a sombra cresce (camadas mais distantes) e o cartao sobe 1px.
  assert.notEqual(after.boxShadow, before.boxShadow, "cartao de midia: a sombra nao mudou no hover");
  assert.equal(translateY(after.transform), -1, `cartao de midia: esperado subir 1px no hover, veio transform "${after.transform}"`);
}

test("biblioteca de midia: o item da grade ganha o cartao do bloco [7] e sobe no hover", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  validate(await measure(page, base, "/skin.css"));

  // Sem o lift exclusivo do bloco [7], o cartao continua com sombra maior no hover
  // (a lista compartilhada ainda casa) mas para de subir: so essa parte reprova.
  const mutant = await measure(page, base, "/skin-mutant.css");
  assert.throws(() => validate(mutant), /subir 1px/, "a mutacao do lift do bloco [7] tem que reprovar a fixture");
});
