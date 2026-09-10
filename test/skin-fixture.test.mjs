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
const MUTATION_FROM = `html[data-mode] [role="dialog"].kumo-popover-popup:has(a[href*="/settings/security"])
  :is(a, button) {
  border-radius: 0 !important;`;
const MUTATION_TO = MUTATION_FROM.replace("border-radius: 0", "border-radius: 4px");
const MUTANT_CSS = SKIN_CSS.replace(MUTATION_FROM, MUTATION_TO);
const COMMENT_CSS = SKIN_CSS.replace("skin.css  (v4)", "skin.css  (v4, comment-only probe)");

assert.notEqual(MUTANT_CSS, SKIN_CSS, "a mutação anti-placebo precisa alcançar a regra de raio");
assert.notEqual(COMMENT_CSS, SKIN_CSS, "a variante de comentário precisa alterar somente o texto do comentário");

const radiusProbes = [
  '<a data-radius-probe class="rounded-md" href="/_emdash/admin/settings/security">Segurança</a>',
  ...Array.from({ length: 20 }, (_, i) => `<button data-radius-probe class="rounded-md">Ação ${i + 1}</button>`),
].join("\n");

const html = (skinRoute) => `<!doctype html>
<html data-theme="classic" data-mode="light">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/admin.css">
    <link rel="stylesheet" href="${skinRoute}">
  </head>
  <body>
    <main>
      <table><tbody><tr><td id="state-card" colspan="2" class="py-8">Nenhum item</td></tr></tbody></table>
      <input id="focus-probe" class="ring" aria-label="Campo de teste">
    </main>
    <div data-base-ui-portal>
      <div id="popup" role="dialog" data-side="bottom" class="kumo-popover-popup w-56 p-2">
        <div class="grid">${radiusProbes}</div>
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
    if (req.url === "/skin.css") return reply(res, "text/css; charset=utf-8", SKIN_CSS);
    if (req.url === "/skin-mutant.css") return reply(res, "text/css; charset=utf-8", MUTANT_CSS);
    if (req.url === "/skin-comment.css") {
      return reply(res, "text/css; charset=utf-8", COMMENT_CSS);
    }
    const skin = new URL(req.url, "http://fixture").searchParams.get("skin") || "/skin.css";
    return reply(res, "text/html; charset=utf-8", html(skin));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

function channel(hex) {
  const raw = hex.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(raw.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  return channel(hex)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

async function measure(page, base, skinRoute) {
  const runtimeErrors = [];
  const onPageError = (error) => runtimeErrors.push(error.message);
  page.on("pageerror", onPageError);
  await page.goto(`${base}/?skin=${encodeURIComponent(skinRoute)}`, { waitUntil: "networkidle" });
  await page.locator("#focus-probe").focus();
  const metrics = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const focus = getComputedStyle(document.querySelector("#focus-probe"));
    const radii = [...document.querySelectorAll("[data-radius-probe]")].map((el) => getComputedStyle(el).borderRadius);
    return {
      popupWidth: document.querySelector("#popup").getBoundingClientRect().width,
      cardHeight: document.querySelector("#state-card").getBoundingClientRect().height,
      line: root.getPropertyValue("--wp-line").trim(),
      surface: root.getPropertyValue("--wp-surface").trim(),
      focusShadow: focus.boxShadow,
      radiusCount: radii.length,
      nonZeroRadii: radii.filter((radius) => radius !== "0px").length,
    };
  });
  page.off("pageerror", onPageError);
  return { ...metrics, runtimeErrors, borderContrast: contrast(metrics.line, metrics.surface) };
}

function validate(metrics) {
  assert.deepEqual(metrics.runtimeErrors, [], "a fixture não pode ter exceção de runtime");
  assert.ok(Math.abs(metrics.popupWidth - 224) <= 0.5, `popup: esperado 224px, veio ${metrics.popupWidth}px`);
  assert.ok(Math.abs(metrics.cardHeight - 96) <= 0.5, `cartão: esperado 96px, veio ${metrics.cardHeight}px`);
  assert.ok(Math.abs(metrics.borderContrast - 1.36) <= 0.02, `borda: esperado contraste 1.36:1, veio ${metrics.borderContrast.toFixed(2)}:1`);
  assert.match(metrics.focusShadow, /rgb\(34, 113, 177\).*4px/, "anel de foco azul de 4px ausente");
  assert.equal(metrics.radiusCount, 21, "a fixture precisa medir exatamente 21 raios");
  assert.equal(metrics.nonZeroRadii, 0, "os 21 raios medidos precisam continuar zerados");
}

test("skin preserva as medidas visuais contra o CSS real do admin", async (t) => {
  const { server, base } = await fixtureServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const baseline = await measure(page, base, "/skin.css");
  validate(baseline);

  const commentOnly = await measure(page, base, "/skin-comment.css");
  validate(commentOnly);
  assert.deepEqual(commentOnly, baseline, "alterar só comentário não pode mudar as medidas");

  const mutant = await measure(page, base, "/skin-mutant.css");
  assert.throws(() => validate(mutant), /21 raios/, "a mutação de border-radius precisa reprovar a fixture");
});
