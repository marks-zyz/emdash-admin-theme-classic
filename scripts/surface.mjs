#!/usr/bin/env node
// Mede onde este tema pisa em terreno firme e onde nao pisa.
//
// EmDash e o Kumo nomeiam tokens e alguns componentes; nao nomeiam as partes do
// markup do painel (discussao emdash-cms/emdash#2987). Toda regra que precisa de
// uma classe utilitaria do Tailwind esta apostando num nome gerado, que muda sem
// aviso e falha em silencio. O numero abaixo e o tamanho dessa aposta.
//
// `node scripts/surface.mjs` imprime a conta. Com --check compara com
// scripts/surface.json e sai 1 se a aposta cresceu, que e o que o CI roda.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(ROOT, "scripts", "surface.json");

// Classe que o EmDash ou o Kumo escreveu a mao, com nome estavel. Uma utilitaria do
// Tailwind (p-4, flex, bg-kumo-elevated, hover:bg-kumo-tint/50) nao entra aqui.
const NAMED_CLASS = /^(?:emdash|kumo)-[a-z0-9-]+$/;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Cada regra do arquivo, ja achatada: at-rules com bloco entram recursivamente. */
function* rules(css) {
  let depth = 0;
  let start = 0;
  let prelude = "";
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === "{") {
      if (depth === 0) {
        prelude = css.slice(start, i).trim();
        start = i + 1;
      }
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        const body = css.slice(start, i);
        if (prelude.startsWith("@")) {
          yield* rules(body);
        } else if (prelude) {
          yield { prelude, body };
        }
        start = i + 1;
      }
    }
  }
}

/** Uma regra que so declara custom properties e a superficie suportada, seja qual for o seletor. */
function declaresOnlyTokens(body) {
  const declarations = body
    .split(";")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"));
  return declarations.length > 0 && declarations.every((line) => line.startsWith("--"));
}

function classesOf(selector) {
  return [...selector.matchAll(/\.(-?[_a-zA-Z\\][^\s.,:>+~()[\]{}#]*)/g)].map(([, name]) =>
    name.replace(/\\/g, ""),
  );
}

function measure(file) {
  const css = stripComments(readFileSync(join(ROOT, "src", file), "utf8"));
  const counts = { file, rules: 0, tokenRules: 0, named: 0, generated: 0, important: 0 };
  counts.important = (readFileSync(join(ROOT, "src", file), "utf8").match(/!important/g) ?? []).length;
  for (const { prelude, body } of rules(css)) {
    counts.rules++;
    if (declaresOnlyTokens(body)) {
      counts.tokenRules++;
      continue;
    }
    for (const selector of prelude.split(",")) {
      const utility = classesOf(selector).filter((name) => !NAMED_CLASS.test(name));
      if (utility.length > 0) counts.generated++;
      else counts.named++;
    }
  }
  return counts;
}

const tokens = measure("tokens.css");
const skin = measure("skin.css");
const total = {
  generated: tokens.generated + skin.generated,
  named: tokens.named + skin.named,
  tokenRules: tokens.tokenRules + skin.tokenRules,
  important: tokens.important + skin.important,
};

const report = [
  "superficie do tema",
  "",
  `  tokens.css  ${tokens.rules} regras, ${tokens.tokenRules} so de token, ${tokens.important} !important`,
  `  skin.css    ${skin.rules} regras, ${skin.tokenRules} so de token, ${skin.important} !important`,
  "",
  `  seletores em ancora nomeada   ${total.named}   (atributo, tag, .emdash-*, .kumo-*)`,
  `  seletores em classe gerada    ${total.generated}   <- aposta: nome que ninguem prometeu`,
  "",
].join("\n");

console.log(report);

if (process.argv.includes("--write")) {
  writeFileSync(BASELINE, `${JSON.stringify({ generated: total.generated, important: total.important }, null, 2)}\n`);
  console.log(`baseline gravado em ${BASELINE}`);
} else if (process.argv.includes("--check")) {
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  const failures = [];
  if (total.generated > baseline.generated) {
    failures.push(`classe gerada: ${baseline.generated} -> ${total.generated}`);
  }
  if (total.important > baseline.important) {
    failures.push(`!important: ${baseline.important} -> ${total.important}`);
  }
  if (failures.length > 0) {
    console.error(
      `a superficie nao suportada cresceu:\n  ${failures.join("\n  ")}\n` +
        "Reancore em atributo ou token, ou grave o novo teto com `npm run surface -- --write` dizendo por que.",
    );
    process.exit(1);
  }
  const slack = baseline.generated - total.generated;
  console.log(slack > 0 ? `abaixo do teto por ${slack} seletores. Rode --write para baixar o teto.` : "no teto.");
}
