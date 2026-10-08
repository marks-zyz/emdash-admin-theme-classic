// Cartao de login com `emdash-admin-login-classic` (bloco [24] de src/skin.css).
//
// O cartao do EmDash 1.1.0 e uma coluna: chave de acesso (primario) com a frase de ajuda, "Ou
// continue com", uma grade com um <div> por provedor e o link de e-mail como botao ghost. Com o
// plugin instalado o botao de senha carrega `data-auth-provider="password"` e o cartao vira:
// senha primeiro e cheia, divisor, chave de acesso e link de e-mail como botoes outline iguais.
//
// O que esta fixture protege:
// - com o marcador: ordem senha, divisor, chave, link; senha cheia com texto branco; chave e
//   link no mesmo outline (36px, mesmo contorno); frase de ajuda escondida; ritmo de 24px entre
//   senha, divisor e metodos e 12px entre os dois outlines;
// - guarda: SEM o marcador o cartao e o do EmDash, byte a byte no que importa (chave primeiro,
//   frase visivel, link sem contorno);
// - 320px: nada sai do cartao e a pagina nao rola de lado;
// - dois mutantes: o marcador renomeado (o cartao volta ao original) e o reset de margem do
//   botao da chave (o espaco entre os outlines vira 28px).
//
// Markup copiado do DOM real do admin 1.1.0 em astro dev (/_emdash/admin/login), com as classes do
// Kumo 2.6.0 como o bundle escreve, sem os SVGs.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, FULL_CSS } = await import("./stylesheet.mjs");

const BASE_BTN =
  "group flex shrink-0 items-center font-medium select-none border-0 focus:outline-none focus:ring-kumo-focus/50 focus-visible:ring-2 focus-visible:ring-kumo-brand cursor-pointer disabled:cursor-not-allowed disabled:text-kumo-subtle h-9 gap-1.5 rounded-lg px-3 text-base";
const PRIMARY = `${BASE_BTN} shadow-xs relative overflow-hidden bg-(--kumo-button-emphasis-bg) !text-white ring ring-(--kumo-button-emphasis-ring) disabled:opacity-50 w-full justify-center`;
const OUTLINE = `${BASE_BTN} shadow-xs bg-transparent text-kumo-default ring ring-kumo-line transition-colors not-disabled:hover:text-kumo-strong not-disabled:hover:ring-kumo-focus/25 w-full justify-center`;
const GHOST = `${BASE_BTN} text-kumo-default hover:bg-kumo-tint shadow-none bg-inherit w-full justify-center`;

const card = (marker) => `
<div class="min-h-screen flex items-center justify-center bg-kumo-base p-4"><div class="w-full max-w-md">
<div data-t="card" class="bg-kumo-base border rounded-lg shadow-sm p-6"><div data-t="column" class="space-y-6">
  <div class="space-y-4"><button data-t="passkey" data-kumo-component="Button" class="${PRIMARY}" type="button"><span aria-hidden="true" class="absolute inset-0 rounded-[inherit] bg-linear-to-b from-(--kumo-button-emphasis-gradient-start) to-(--kumo-button-emphasis-gradient-end) translate-y-px group-hover:from-(--kumo-button-emphasis-bg)"></span><span class="relative flex items-center gap-1.5"><span class="contents">Entre com chave de acesso</span></span></button><p data-t="help" class="text-xs text-kumo-subtle text-center">Use a autenticação biométrica, chave de segurança ou PIN do seu dispositivo para entrar</p></div>
  <div data-t="divider" class="relative"><div class="absolute inset-0 flex items-center"><span class="w-full border-t"></span></div><div class="relative flex justify-center text-xs uppercase"><span class="bg-kumo-base px-2 text-kumo-subtle">Ou continue com</span></div></div>
  <div class="grid gap-3 grid-cols-1"><div><button data-t="password" ${marker} data-kumo-component="Button" class="${OUTLINE}" type="button"><span class="contents">Entre com e-mail e senha</span></button></div></div>
  <button data-t="link" data-kumo-component="Button" class="${GHOST}" type="button"><span class="contents">Entre com link de e-mail</span></button>
</div></div></div></div>`;

const page = (marker, skin) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head><meta charset="utf-8"><link rel="stylesheet" href="/admin.css"><link rel="stylesheet" href="${skin}"></head>
  <body>${card(marker)}</body>
</html>`;

const MARKER = 'data-auth-provider="password"';

const MUTANTS = {
  // o plugin deixa de ser reconhecido: o cartao tem que ficar o original
  "/m-marker.css": FULL_CSS.replaceAll('[data-auth-provider="password"]', '[data-auth-provider="nope"]'),
  // o botao da chave herda a margem do `space-y-4` pensada para a frase que sumiu
  "/m-margin.css": FULL_CSS.replace("  margin-block: 0;\n  background-color: transparent;\n  --color-white", "  background-color: transparent;\n  --color-white"),
};
for (const [route, css] of Object.entries(MUTANTS)) assert.notEqual(css, FULL_CSS, `o trecho do mutante ${route} sumiu do skin.css`);

function reply(res, type, body) {
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function fixtureServer() {
  const sheets = { "/skin.css": FULL_CSS, ...MUTANTS };
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://fixture");
    if (url.pathname === "/admin.css") return reply(res, "text/css; charset=utf-8", ADMIN_CSS);
    if (sheets[url.pathname]) return reply(res, "text/css; charset=utf-8", sheets[url.pathname]);
    const marked = url.searchParams.get("marker") !== "0";
    return reply(res, "text/html; charset=utf-8", page(marked ? MARKER : "", url.searchParams.get("skin") || "/skin.css"));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function measure(page, base, { marker = true, skin = "/skin.css" } = {}) {
  await page.goto(`${base}/?marker=${marker ? 1 : 0}&skin=${encodeURIComponent(skin)}`, { waitUntil: "networkidle" });
  return page.evaluate(() => {
    const out = { overflowX: document.documentElement.scrollWidth - window.innerWidth };
    for (const el of document.querySelectorAll("[data-t]")) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      out[el.dataset.t] = {
        top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width,
        display: s.display, bg: s.backgroundColor, color: s.color, shadow: s.boxShadow,
        gradient: !!el.querySelector(':scope > span[aria-hidden="true"]') && getComputedStyle(el.querySelector(':scope > span[aria-hidden="true"]')).display !== "none",
      };
    }
    return out;
  });
}

const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 0.75, `${msg}: ${a.toFixed(1)} != ${b}`);
const RING = "rgb(220, 220, 222)";

function assertFlipped(m) {
  assert.ok(m.password.top < m.divider.top && m.divider.top < m.passkey.top && m.passkey.top < m.link.top,
    `ordem esperada senha, divisor, chave, link; veio password=${m.password.top} divider=${m.divider.top} passkey=${m.passkey.top} link=${m.link.top}`);
  assert.equal(m.password.color, "rgb(255, 255, 255)", "texto do botao de senha");
  assert.notEqual(m.password.bg, "rgba(0, 0, 0, 0)", "botao de senha cheio");
  for (const k of ["passkey", "link"]) {
    near(m[k].height, 36, `altura de ${k}`);
    assert.ok(m[k].shadow.includes(RING), `contorno outline de ${k}: ${m[k].shadow}`);
    assert.equal(m[k].color, "rgb(29, 35, 39)", `texto de ${k}`);
  }
  assert.equal(m.passkey.gradient, false, "gradiente do primario some na chave de acesso");
  assert.equal(m.help.display, "none", "frase de ajuda escondida");
  near(m.passkey.width, m.link.width, "mesma largura de chave e link");
  near(m.divider.top - m.password.bottom, 24, "senha ate o divisor");
  near(m.passkey.top - m.divider.bottom, 24, "divisor ate a chave");
  near(m.link.top - m.passkey.bottom, 12, "chave ate o link");
}

function assertStock(m) {
  assert.ok(m.passkey.top < m.divider.top && m.divider.top < m.password.top && m.password.top < m.link.top,
    "sem o marcador a ordem e a do EmDash: chave, divisor, senha, link");
  assert.notEqual(m.help.display, "none", "frase de ajuda visivel");
  assert.equal(m.passkey.gradient, true, "chave de acesso segue primaria");
  assert.ok(!m.link.shadow.includes(RING), `link segue ghost, sem contorno: ${m.link.shadow}`);
}

async function withBrowser(t, viewport) {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  return { base, page: await browser.newPage({ viewport }) };
}

test("login com senha: senha primeiro, chave e link como outlines iguais", async (t) => {
  const { base, page } = await withBrowser(t, { width: 1280, height: 900 });
  assertFlipped(await measure(page, base));
});

test("login sem o marcador do plugin: o cartao e o do EmDash", async (t) => {
  const { base, page } = await withBrowser(t, { width: 1280, height: 900 });
  assertStock(await measure(page, base, { marker: false }));
});

test("login com senha em 320px: nada sai do cartao e a pagina nao rola de lado", async (t) => {
  const { base, page } = await withBrowser(t, { width: 320, height: 640 });
  const m = await measure(page, base);
  assertFlipped(m);
  assert.ok(m.overflowX <= 0, `rolagem horizontal de ${m.overflowX}px`);
  for (const k of ["password", "passkey", "link"]) {
    assert.ok(m[k].left >= m.card.left && m[k].right <= m.card.right, `${k} dentro do cartao`);
  }
});

test("login com senha: os dois mutantes reprovam", async (t) => {
  const { base, page } = await withBrowser(t, { width: 1280, height: 900 });
  const noMarker = await measure(page, base, { skin: "/m-marker.css" });
  assert.throws(() => assertFlipped(noMarker), /ordem esperada/);
  assertStock(noMarker);
  const noMargin = await measure(page, base, { skin: "/m-margin.css" });
  assert.throws(() => assertFlipped(noMargin), /chave ate o link/);
});
