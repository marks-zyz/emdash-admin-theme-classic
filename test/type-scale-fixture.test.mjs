// Escala de texto da 0.2.3 (src/tokens.css), medida contra o styles.css real do admin.
//
// O que esta fixture protege:
// - --text-3xl: 23px. Pagina de plugin (Forms, AI Search) titula com `text-3xl font-bold`
//   e saia com 30px ao lado dos 23px de toda tela nativa (medido no EmDash 1.1.0).
// - body com font-size var(--text-base): texto sem classe de tamanho (subtitulo de plugin,
//   descricao do import do WordPress, listagem em <div> de Categorias) herdava os 16px do
//   navegador.
// - @layer base `main :is(h2, h3)` 14px: titulo de caixa sem classe de tamanho fica no
//   tamanho de titulo de metabox do wp-admin, e um h2 COM classe de tamanho (text-xl do
//   cabecalho Block Kit) continua com a dele, porque utilities vence base. O mutante que
//   tira a regra da camada prova que a camada e o que segura isso.
// - --text-xs: 12px, o piso do wp-admin (a 0.2.2 descia filtro e contador a 11px).
//
// Markup: classes reais lidas no codigo do plugin-forms 0.2.9 (admin.tsx:266, h1
// `text-3xl font-bold`) e do admin 1.1.0 (contador `text-xs`).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, FULL_CSS } = await import("./stylesheet.mjs");

function mutate(from, to) {
  assert.ok(FULL_CSS.includes(from), `o trecho do mutante sumiu do tokens.css: ${from}`);
  const out = FULL_CSS.replace(from, to);
  assert.notEqual(out, FULL_CSS);
  return out;
}

const MUTANTS = {
  // sem o token, o h1 de plugin volta aos 30px do Tailwind
  "/no-3xl.css": [mutate("  --text-3xl:  23px;\n", ""), /h1 de plugin/],
  // sem o tamanho no body, texto sem classe volta aos 16px do navegador
  "/no-body.css": [mutate("  font-size: var(--text-base);\n}", "}"), /texto sem classe/],
  // fora da camada base, a regra passa a vencer o text-xl do Block Kit
  "/unlayered.css": [mutate("@layer base {\n  html[data-mode] main :is(h2, h3) {", "@media all {\n  html[data-mode] main :is(h2, h3) {"), /text-xl/],
  // piso antigo
  "/xs-11.css": [mutate("  --text-xs:   12px;", "  --text-xs:   11px;"), /text-xs/],
};

const html = (skin) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${skin}">
  </head>
  <body>
    <main class="flex-1 overflow-y-auto bg-kumo-elevated p-6">
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 id="plugin-h1" class="text-3xl font-bold">Forms</h1>
            <p id="plugin-sub" class="text-kumo-subtle">Create and manage forms</p>
          </div>
        </div>
        <div class="space-y-4">
          <h2 id="bare-h2">Configuracoes</h2>
          <h3 id="bare-h3">Campos</h3>
          <h2 id="sized-h2" class="text-xl font-bold text-kumo-default">Entrega de e-mail</h2>
          <p id="bare-p">Cole sua chave de migracao</p>
          <p class="text-sm leading-snug text-kumo-subtle"><span id="xs" class="text-xs tabular-nums">26 of 90 characters</span></p>
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
    if (req.url === "/skin.css") return reply(res, "text/css; charset=utf-8", FULL_CSS);
    if (MUTANTS[req.url]) return reply(res, "text/css; charset=utf-8", MUTANTS[req.url][0]);
    const skin = new URL(req.url, "http://fixture").searchParams.get("skin") || "/skin.css";
    return reply(res, "text/html; charset=utf-8", html(skin));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function measure(page, base, skin) {
  await page.goto(`${base}/?skin=${encodeURIComponent(skin)}`, { waitUntil: "networkidle" });
  return page.evaluate(() => {
    const get = (id) => {
      const s = getComputedStyle(document.getElementById(id));
      return { size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight };
    };
    return Object.fromEntries(["plugin-h1", "plugin-sub", "bare-h2", "bare-h3", "sized-h2", "bare-p", "xs"].map((id) => [id, get(id)]));
  });
}

function validate(m) {
  assert.equal(m["plugin-h1"].size, "23px", `h1 de plugin (text-3xl): 23px esperado, veio ${m["plugin-h1"].size}`);
  assert.equal(m["plugin-h1"].weight, "400", `h1 de plugin: peso 400 esperado, veio ${m["plugin-h1"].weight}`);
  assert.equal(m["plugin-h1"].lineHeight, "29.9px", `h1 de plugin: altura de linha 1.3 esperada, veio ${m["plugin-h1"].lineHeight}`);
  assert.equal(m["plugin-sub"].size, "13px", `texto sem classe (subtitulo de plugin): 13px esperado, veio ${m["plugin-sub"].size}`);
  assert.equal(m["bare-p"].size, "13px", `texto sem classe (descricao): 13px esperado, veio ${m["bare-p"].size}`);
  assert.equal(m["bare-h2"].size, "14px", `h2 sem classe de tamanho: 14px esperado, veio ${m["bare-h2"].size}`);
  assert.equal(m["bare-h3"].size, "14px", `h3 sem classe de tamanho: 14px esperado, veio ${m["bare-h3"].size}`);
  assert.equal(m["sized-h2"].size, "20px", `h2 com classe de tamanho (text-xl) tem que manter os 20px dela, veio ${m["sized-h2"].size}`);
  assert.equal(m.xs.size, "12px", `text-xs: piso de 12px esperado, veio ${m.xs.size}`);
}

test("escala de texto: h1 de plugin, texto sem classe, titulo de caixa e piso de 12px", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  validate(await measure(page, base, "/skin.css"));

  for (const [route, [, expected]] of Object.entries(MUTANTS)) {
    const m = await measure(page, base, route);
    assert.throws(() => validate(m), expected, `o mutante ${route} tinha que reprovar a fixture`);
  }
});
