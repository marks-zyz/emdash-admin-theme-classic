// As duas camadas fazem o que prometem, e so isso.
//
// tokens.css sozinho: paleta, tipografia e a escala de raio do Kumo, tudo por nome de
// token. skin.css em cima: a geometria que nao existe como token (canto zerado nos
// lugares certos, metabox, menu escuro). O teste separa uma coisa da outra porque a
// camada de token e o que o pacote pode prometer que nao quebra numa release do admin.
//
// Medido no styles.css real do @emdash-cms/admin 0.37.0:
//   .rounded-md -> border-radius: var(--radius-md), e --radius-md vale .375rem (6px)
//   tokens.css redeclara --radius-md: 3px, entao o canto responde a token, sem !important
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, TOKENS_CSS, FULL_CSS } = await import("./stylesheet.mjs");

const html = (sheet) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${sheet}">
  </head>
  <body>
    <main><p id="prose">Texto</p></main>
    <div data-base-ui-portal>
      <div id="popup" role="dialog" data-side="bottom" class="kumo-popover-popup w-56 p-2">
        <div class="grid">
          <a id="probe" class="rounded-md" href="/_emdash/admin/settings/security">Seguran&ccedil;a</a>
        </div>
      </div>
    </div>
  </body>
</html>`;

function reply(res, type, body) {
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function fixtureServer() {
  const server = createServer((req, res) => {
    if (req.url === "/admin.css") return reply(res, "text/css; charset=utf-8", ADMIN_CSS);
    if (req.url === "/tokens.css") return reply(res, "text/css; charset=utf-8", TOKENS_CSS);
    if (req.url === "/full.css") return reply(res, "text/css; charset=utf-8", FULL_CSS);
    const sheet = new URL(req.url, "http://fixture").searchParams.get("sheet") || "/full.css";
    return reply(res, "text/html; charset=utf-8", html(sheet));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function measure(page, base, sheet) {
  await page.goto(`${base}/?sheet=${encodeURIComponent(sheet)}`, { waitUntil: "networkidle" });
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      probeRadius: getComputedStyle(document.querySelector("#probe")).borderRadius,
      radiusToken: root.getPropertyValue("--radius-md").trim(),
      surface: root.getPropertyValue("--color-kumo-base").trim(),
      textBase: root.getPropertyValue("--text-base").trim(),
      bodyFont: getComputedStyle(document.body).fontFamily,
      proseSize: getComputedStyle(document.querySelector("#prose")).fontSize,
    };
  });
}

test("a camada de token pinta o painel sem tocar na geometria", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const tokens = await measure(page, base, "/tokens.css");
  const full = await measure(page, base, "/full.css");

  // Paleta e tipografia: as duas camadas entregam o mesmo, porque quem faz isso e a de baixo.
  for (const [name, sheet] of [["tokens", tokens], ["full", full]]) {
    assert.equal(sheet.surface, "#ffffff", `${name}: a superficie do Kumo vira branco por token`);
    assert.equal(sheet.textBase, "13px", `${name}: escala de texto do wp-admin (13px), veio ${sheet.textBase}`);
    assert.match(sheet.bodyFont, /-apple-system|BlinkMacSystemFont/, `${name}: a fonte do sistema entra no body`);
  }

  // Raio: token redeclarado, e nada mais. 3px e o valor do bloco [1], nao zero.
  assert.equal(tokens.radiusToken, "3px", `so tokens: --radius-md redeclarado, veio ${tokens.radiusToken}`);
  assert.equal(
    tokens.probeRadius,
    "3px",
    `so tokens: o canto segue o token, sem a geometria da camada 2 (veio ${tokens.probeRadius})`,
  );

  // A camada 2 e o que zera o canto onde o Kumo nao expoe token, e ai precisa de !important.
  assert.equal(full.probeRadius, "0px", `folha inteira: o canto do menu vai a zero, veio ${full.probeRadius}`);
});
