// Acoes do cabecalho de pagina no EmDash 1.1.0 (blocos [5], [13] e [23] de src/skin.css).
//
// O 1.1.0 refez varios cabecalhos e a mesma acao ("Novo/Criar/Adicionar") aparecia com tres
// caras na 0.2.2: contorno azul de 30px onde a skin alcancava, botao neutro de 36px onde nao
// alcancava (Menus, Usuarios, Tipos de conteudo) e azul cheio com texto branco na variante
// `primary` (Novo redirecionamento, New section, New byline), porque o `!text-white` e o
// gradiente do Kumo moram em @layer utilities e o !important de camada vence o da skin.
//
// O que esta fixture protege:
// - as cinco formas de cabecalho do 1.1.0 vestem a .page-title-action (30px, borda e texto
//   na cor de destaque, 13px/400) e o gradiente da variante primary some;
// - guarda: botao primary FORA de cabecalho (dentro de um cartao) continua primary, e o link
//   de voltar do editor (h1 irmao de um <a>, mas dentro de <form>) nao vira acao;
// - 390px: o h1 do PageHeader nao fica por baixo do botao, as acoes de Categorias e de
//   Tipos de conteudo quebram linha em vez de sair do main, e a tabela vazia do Esquema de
//   creditos cabe no seu wrapper.
//
// Markup copiado do DOM real do admin 1.1.0 em astro dev (Seções, Menus, Créditos,
// Usuários, Tipos de conteúdo, Redirecionamentos, Categorias, Esquema de créditos), com as
// classes do Kumo 2.6.0 como o bundle escreve; o editor vem de ContentEditor (h1 truncate).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const { ADMIN_CSS, FULL_CSS } = await import("./stylesheet.mjs");

const SECTIONS = "main > div > header > div:has(> div > h1) > :is(a, button)";
const MENUS = "main > div > header > div:has(> h1) + div > :is(a, button)";
const USERS = "main > div > div:has(> h1) > :is(a, button)";
const CONTENT_TYPES = "main > div > div > div:has(> div > h1) > div:not(:has(h1)) > :is(a, button)";

function mutateAll(from, to) {
  assert.ok(FULL_CSS.includes(from), `o trecho do mutante sumiu do skin.css: ${from}`);
  const out = FULL_CSS.replaceAll(from, to);
  assert.notEqual(out, FULL_CSS);
  return out;
}

// [rota]: [css, regex que a falha tem que citar]
const DESKTOP_MUTANTS = {
  "/m-sections.css": [mutateAll(SECTIONS, SECTIONS.replace("h1", "h6")), /act-sections/],
  "/m-menus.css": [mutateAll(MENUS, MENUS.replace("h1", "h6")), /act-menus/],
  "/m-users.css": [mutateAll(USERS, USERS.replace("h1", "h6")), /act-users/],
  "/m-content-types.css": [mutateAll(CONTENT_TYPES, CONTENT_TYPES.replace("> div > h1", "> div > h6")), /act-ct-/],
  // sem a variavel, o !text-white de @layer utilities volta a pintar o texto
  "/m-white.css": [mutateAll("  --color-white: var(--wp-accent);\n", ""), /cor do texto/],
  // o gradiente do primary volta por cima do fundo da skin
  "/m-gradient.css": [mutateAll('> span[aria-hidden="true"] {\n  display: none;\n}', '> span[aria-hidden="true"] {\n  display: block;\n}'), /gradiente/],
  // seletor frouxo (sem `main > div >`): a guarda tem que pegar o link de voltar do editor
  "/m-loose.css": [mutateAll(USERS, "main div:has(> h1) > :is(a, button)"), /guarda/],
};

const NARROW_MUTANTS = {
  // o PageHeader deixa de empilhar: o botao volta para o lado do h1
  "/m-grid.css": [mutateAll("main > div > header > div:has(> h1 + div > :is(a, button))", "main > div > header > div:has(> h6 + div > :is(a, button))"), /redirects/],
  // a linha de acoes deixa de quebrar
  "/m-wrap.css": [mutateAll("    flex-wrap: wrap;\n    row-gap: 8px;", "    flex-wrap: nowrap;\n    row-gap: 8px;"), /390: acoes/],
  // a tabela vazia volta a manter a largura minima das colunas
  "/m-table.css": [mutateAll("@media (max-width: 640px) {\n  html[data-mode] main table:has(", "@media (max-width: 64px) {\n  html[data-mode] main table:has("), /tabela vazia/],
};

const BTN_BASE =
  "group flex w-max shrink-0 items-center font-medium select-none border-0 shadow-xs focus:outline-none focus:ring-kumo-focus/50 focus-visible:ring-2 focus-visible:ring-kumo-brand cursor-pointer disabled:cursor-not-allowed disabled:text-kumo-subtle h-9 gap-1.5 rounded-lg px-3 text-base";
const SECONDARY = `${BTN_BASE} bg-kumo-base !text-kumo-default ring not-disabled:hover:bg-kumo-tint disabled:bg-kumo-base/50 disabled:!text-kumo-default/70 ring-kumo-line data-[state=open]:bg-kumo-base`;
const LINK_BASE = BTN_BASE.replace("group flex w-max shrink-0 items-center", "group w-max shrink-0");
const SECONDARY_LINK = `${LINK_BASE} bg-kumo-base !text-kumo-default ring not-disabled:hover:bg-kumo-tint disabled:bg-kumo-base/50 disabled:!text-kumo-default/70 ring-kumo-line data-[state=open]:bg-kumo-base flex items-center no-underline!`;
const OUTLINE_LINK = `${LINK_BASE} bg-transparent text-kumo-default ring ring-kumo-line transition-colors not-disabled:hover:text-kumo-strong not-disabled:hover:ring-kumo-focus/25 flex items-center no-underline!`;
const PRIMARY = `${BTN_BASE} relative overflow-hidden bg-(--kumo-button-emphasis-bg) !text-white ring ring-(--kumo-button-emphasis-ring) disabled:opacity-50`;
const EMPHASIS =
  "--kumo-button-emphasis-ring: color-mix(in oklch, var(--color-kumo-brand), black 10%); --kumo-button-emphasis-bg: color-mix(in oklch, var(--color-kumo-brand), white 30%); --kumo-button-emphasis-gradient-start: color-mix(in oklch, var(--color-kumo-brand), white 15%); --kumo-button-emphasis-gradient-end: var(--color-kumo-brand);";
const GRADIENT =
  '<span aria-hidden="true" class="absolute inset-0 rounded-[inherit] bg-linear-to-b from-(--kumo-button-emphasis-gradient-start) to-(--kumo-button-emphasis-gradient-end) translate-y-px group-hover:from-(--kumo-button-emphasis-bg)"></span>';
const ICON = '<svg width="16" height="16" viewBox="0 0 256 256"><rect width="256" height="256"/></svg>';

const primary = (id, label, kumo = "Button") =>
  `<button data-kumo-component="${kumo}" data-t="${id}" class="${PRIMARY}" type="button" style="${EMPHASIS}">${GRADIENT}<span class="relative flex items-center gap-1.5">${ICON}<span class="contents">${label}</span></span></button>`;
const secondary = (id, label, kumo = "Button") =>
  `<button data-kumo-component="${kumo}" data-t="${id}" class="${SECONDARY}" type="button">${ICON}<span class="contents">${label}</span></button>`;
const link = (id, label, cls) => `<a href="#" data-t="${id}" class="${cls}">${ICON}${label}</a>`;
const subtitle = (text) => `<p class="mt-1 text-sm leading-5 text-pretty text-kumo-subtle">${text}</p>`;
const MAIN = '<main class="flex-1 overflow-y-auto bg-kumo-elevated p-6">';

// PageHeader (Redirecionamentos): admin dist/index.js PageHeader
const pageHeader = (title, action) => `${MAIN}<div class="space-y-6"><header class="grid min-w-0 gap-4 border-b border-kumo-line pb-4"><div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1"><h1 data-t="h1-redirects" class="flex min-h-9 min-w-0 items-center text-2xl font-semibold leading-tight">${title}</h1><div class="flex shrink-0 justify-end gap-2">${action}</div><p class="col-span-2 text-sm leading-5 text-pretty text-kumo-subtle">Gerencie redirecionamentos de URL e visualize erros 404.</p></div></header></div></main>`;

const DESKTOP = [
  // Seções: header > div > [div > h1, button]
  `${MAIN}<div class="space-y-6"><header class="grid min-w-0 gap-4 border-b border-kumo-line pb-4"><div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0"><h1 class="text-2xl font-semibold leading-tight">Seções</h1>${subtitle("Blocos de conteúdo reutilizáveis")}</div>${primary("act-sections", "New section", "Dialog")}</div></header></div></main>`,
  // Menus: header > [div > h1, div > button]
  `${MAIN}<div class="space-y-6"><header class="flex flex-col gap-4 border-b border-kumo-line pb-4 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><h1 class="text-2xl font-semibold leading-tight">Menus</h1>${subtitle("Gerencie os menus de navegação do seu site")}</div><div class="flex flex-wrap items-center gap-2">${secondary("act-menus", "Criar menu", "Dialog")}</div></header></div></main>`,
  // Créditos: header > [div > h1, div > (a, button primary)]
  `${MAIN}<div class="space-y-6"><header class="flex flex-wrap items-center justify-between gap-4"><div class="space-y-1"><h1 class="text-2xl font-semibold leading-tight">Créditos</h1><p class="text-sm text-kumo-subtle">Manage the people and teams credited on your content.</p></div><div class="flex flex-wrap items-center gap-2">${link("act-bylines-link", "Esquema de créditos", SECONDARY_LINK)}${primary("act-bylines-primary", "New byline")}</div></header></div></main>`,
  // Usuários: div > div > [h1, button]
  `${MAIN}<div class="space-y-4"><div class="flex items-center justify-between"><h1 class="text-2xl font-semibold leading-tight">Usuários</h1>${secondary("act-users", "Convidar usuário")}</div></div></main>`,
  // Tipos de conteúdo: um div a mais em volta da pagina inteira
  `${MAIN}<div class="space-y-6"><div class="space-y-4"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-semibold leading-tight">Tipos de conteúdo</h1>${subtitle("Defina a estrutura do seu conteúdo")}</div><div class="flex items-center gap-2">${link("act-ct-relations", "Relations", OUTLINE_LINK)}${link("act-ct-new", "Novo tipo de conteúdo", SECONDARY_LINK)}</div></div></div></div></main>`,
  // Redirecionamentos: PageHeader com a variante primary
  pageHeader("Redirecionamentos", primary("act-redirects", "Novo redirecionamento")),
  // guarda 1: primary dentro de um cartao, longe de cabecalho
  `${MAIN}<div class="space-y-6"><div class="rounded-lg border border-kumo-line p-4"><p>Configurações de envio</p>${primary("guard-primary", "Salvar")}</div></div></main>`,
  // guarda 2: cabecalho do editor, h1 irmao do link de voltar, dentro de <form>
  `${MAIN}<form class="flex h-full"><div class="flex-1 min-w-0 p-6"><div class="flex flex-wrap items-center justify-between gap-y-2"><div class="flex min-w-0 items-center gap-3"><a href="#" data-t="guard-back" class="group shrink-0 font-medium select-none border-0 gap-1.5 rounded-lg text-base justify-center p-0 size-9 text-kumo-default hover:bg-kumo-tint shadow-none bg-inherit flex items-center no-underline!">${ICON}</a><h1 class="min-w-0 truncate text-lg font-semibold">Editar Artigo</h1></div></div></div></form></main>`,
].join("\n");

const NARROW = [
  pageHeader("Redirecionamentos", primary("act-redirects", "Novo redirecionamento")),
  // Categorias: quatro acoes num wrapper que nao quebra linha
  `${MAIN}<div class="space-y-6"><div class="flex items-center justify-between gap-4 flex-wrap"><div><h1 class="text-2xl font-semibold leading-tight">Categories</h1>${subtitle("Gerenciar categories para posts")}</div><div data-t="row-category" class="flex items-center gap-2">${secondary("cat-1", "Nova taxonomia")}${secondary("cat-2", "Adicionar Category")}${secondary("cat-3", "Add to posts")}${secondary("cat-4", "")}</div></div></div></main>`,
  `${MAIN}<div class="space-y-6"><div class="space-y-4"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-semibold leading-tight">Tipos de conteúdo</h1>${subtitle("Defina a estrutura do seu conteúdo")}</div><div data-t="row-ct" class="flex items-center gap-2">${link("ct-1", "Relations", OUTLINE_LINK)}${link("ct-2", "Novo tipo de conteúdo", SECONDARY_LINK)}</div></div></div></div></main>`,
  // Esquema de créditos sem campo: a unica linha e a celula de estado
  `${MAIN}<div class="space-y-4"><div data-t="table-wrap" class="rounded-md border bg-kumo-base overflow-x-auto"><table class="w-full"><thead><tr class="border-b bg-kumo-tint/50">${["Rótulo", "Slug", "Tipo", "Traduzível", "Obrigatório"].map((h) => `<th scope="col" class="px-4 py-3 text-start text-sm font-medium">${h}</th>`).join("")}<th scope="col" class="px-4 py-3 text-end text-sm font-medium">Ações</th></tr></thead><tbody class="divide-y divide-kumo-line"><tr><td colspan="6" class="px-4 py-12 text-center text-kumo-subtle">${ICON}<p>Nenhum campo de crédito ainda.</p><p data-t="empty-hint" class="text-xs mt-1">Adicione campos como "Cargo" ou "Pronomes" para enriquecer cada crédito.</p></td></tr></tbody></table></div></div></main>`,
].join("\n");

const page = (body, skin) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${skin}">
  </head>
  <body>
${body}
  </body>
</html>`;

function reply(res, type, body) {
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function fixtureServer() {
  const sheets = { "/skin.css": FULL_CSS };
  for (const [route, [css]] of Object.entries({ ...DESKTOP_MUTANTS, ...NARROW_MUTANTS })) sheets[route] = css;
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://fixture");
    if (url.pathname === "/admin.css") return reply(res, "text/css; charset=utf-8", ADMIN_CSS);
    if (sheets[url.pathname]) return reply(res, "text/css; charset=utf-8", sheets[url.pathname]);
    const skin = url.searchParams.get("skin") || "/skin.css";
    return reply(res, "text/html; charset=utf-8", page(url.pathname === "/narrow" ? NARROW : DESKTOP, skin));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function measureDesktop(page, base, skin) {
  await page.goto(`${base}/?skin=${encodeURIComponent(skin)}`, { waitUntil: "networkidle" });
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-t]")].map((el) => {
        const s = getComputedStyle(el);
        const gradient = el.querySelector(':scope > span[aria-hidden="true"]');
        return [
          el.dataset.t,
          {
            height: Math.round(el.getBoundingClientRect().height),
            border: `${s.borderTopWidth} ${s.borderTopColor}`,
            color: s.color,
            font: `${s.fontSize}/${s.fontWeight}`,
            gradient: gradient ? getComputedStyle(gradient).display : null,
          },
        ];
      }),
    ),
  );
}

const ACCENT = "rgb(34, 113, 177)";
const ACTIONS = ["act-sections", "act-menus", "act-bylines-link", "act-bylines-primary", "act-users", "act-ct-relations", "act-ct-new", "act-redirects"];

function validateDesktop(m) {
  for (const id of ACTIONS) {
    const b = m[id];
    assert.equal(b.height, 30, `${id}: altura 30px esperada, veio ${b.height}`);
    assert.equal(b.border, `1px ${ACCENT}`, `${id}: borda 1px na cor de destaque esperada, veio ${b.border}`);
    assert.equal(b.color, ACCENT, `${id}: cor do texto ${ACCENT} esperada, veio ${b.color}`);
    assert.equal(b.font, "13px/400", `${id}: 13px/400 esperado, veio ${b.font}`);
    if (b.gradient !== null) assert.equal(b.gradient, "none", `${id}: o gradiente do primary tinha que sumir, veio display ${b.gradient}`);
  }
  const g = m["guard-primary"];
  assert.equal(g.color, "rgb(255, 255, 255)", `guarda: primary fora de cabecalho perdeu o texto branco (${g.color})`);
  assert.notEqual(g.gradient, "none", "guarda: primary fora de cabecalho perdeu o gradiente");
  assert.equal(g.height, 36, `guarda: primary fora de cabecalho mudou de altura (${g.height})`);
  const back = m["guard-back"];
  assert.equal(back.height, 36, `guarda: o link de voltar do editor virou acao de cabecalho (altura ${back.height})`);
  assert.equal(back.border.split(" ")[0], "0px", `guarda: o link de voltar do editor ganhou borda (${back.border})`);
}

async function measureNarrow(page, base, skin) {
  await page.goto(`${base}/narrow?skin=${encodeURIComponent(skin)}`, { waitUntil: "networkidle" });
  return page.evaluate(() => {
    const q = (t) => document.querySelector(`[data-t="${t}"]`);
    const mainRight = (el) => {
      const main = el.closest("main");
      const r = main.getBoundingClientRect();
      return r.left + main.clientWidth - parseFloat(getComputedStyle(main).paddingRight);
    };
    const h1 = q("h1-redirects");
    const range = document.createRange();
    range.selectNodeContents(h1);
    const text = range.getBoundingClientRect();
    const btn = q("act-redirects").getBoundingClientRect();
    const overlap =
      Math.max(0, Math.min(text.right, btn.right) - Math.max(text.left, btn.left)) *
      Math.max(0, Math.min(text.bottom, btn.bottom) - Math.max(text.top, btn.top));
    const rowRight = (t) => Math.max(...[...q(t).children].map((c) => c.getBoundingClientRect().right));
    const wrap = q("table-wrap");
    return {
      overlap: Math.round(overlap),
      redirectsRight: btn.right,
      redirectsLimit: mainRight(h1),
      categoryRight: rowRight("row-category"),
      categoryLimit: mainRight(q("row-category")),
      ctRight: rowRight("row-ct"),
      ctLimit: mainRight(q("row-ct")),
      hintRight: q("empty-hint").getBoundingClientRect().right,
      wrapRight: wrap.getBoundingClientRect().right,
      wrapScroll: [wrap.scrollWidth, wrap.clientWidth],
    };
  });
}

function validateNarrow(m) {
  assert.equal(m.overlap, 0, `390: o h1 de redirects fica por baixo do botao (${m.overlap}px2)`);
  assert.ok(m.redirectsRight <= m.redirectsLimit + 0.5, `390: o botao de redirects sai do main (${m.redirectsRight} > ${m.redirectsLimit})`);
  assert.ok(m.categoryRight <= m.categoryLimit + 0.5, `390: acoes de Categorias saem do main (${m.categoryRight} > ${m.categoryLimit})`);
  assert.ok(m.ctRight <= m.ctLimit + 0.5, `390: acoes de Tipos de conteudo saem do main (${m.ctRight} > ${m.ctLimit})`);
  assert.ok(m.hintRight <= m.wrapRight + 0.5, `390: tabela vazia corta a dica do estado (${m.hintRight} > ${m.wrapRight})`);
  assert.ok(m.wrapScroll[0] <= m.wrapScroll[1], `390: tabela vazia rola na horizontal (${m.wrapScroll.join(" > ")})`);
}

test("cabecalho 1.1.0: as cinco formas vestem a .page-title-action, e so elas", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

  validateDesktop(await measureDesktop(page, base, "/skin.css"));
  for (const [route, [, expected]] of Object.entries(DESKTOP_MUTANTS)) {
    const m = await measureDesktop(page, base, route);
    assert.throws(() => validateDesktop(m), expected, `o mutante ${route} tinha que reprovar a fixture`);
  }
});

test("cabecalho 1.1.0 em 390px: nada por baixo do h1 e nada fora do main", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  validateNarrow(await measureNarrow(page, base, "/skin.css"));
  for (const [route, [, expected]] of Object.entries(NARROW_MUTANTS)) {
    const m = await measureNarrow(page, base, route);
    assert.throws(() => validateNarrow(m), expected, `o mutante ${route} tinha que reprovar a fixture`);
  }
});
