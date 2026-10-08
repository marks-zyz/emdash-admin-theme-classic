# Armadilhas e resolucoes

Log de pitfall e solucao deste pacote. Uma entrada por problema, com o numero medido.

## Taxonomias e Traducoes em duas colunas no editor (0.1.2 a 0.1.3)

- Sintoma: no editor de post, o titulo "Taxonomias" aparece a esquerda e a lista de
  categorias e tags a direita, sem banda de cabecalho. Mesmo efeito em "Traducoes".
- Causa: commit 39ae114 (0.1.2) trocou `div.flex:has(> h3)` por `div:has(> h3)` em 10
  seletores dos blocos [10] e [21] do `skin.css`. O `.flex` era o unico discriminador
  entre a linha de cabecalho do painel Creditos (h3 mais botao de ajuda) e os roots de
  Taxonomias e Traducoes, que embrulham o h3 E o conteudo no mesmo `<div>` sem classe.
  O bloco [21] aplica `display: flex` no que casa, entao esses dois viraram duas colunas.
- Nao e regressao do EmDash: `TaxonomySidebar.tsx` e byte identico em `@emdash-cms/admin`
  0.36.0 e 0.37.0, e o trecho de `ContentSettingsPanel.tsx` que renderiza bylines,
  translations e taxonomies tambem. O que mudou no 0.37 foi o painel de publicacao
  (agendamento, `PublishingVersionRelationship`), que nao usa esses seletores.
- Medida (fixture de 368px, `@emdash-cms/admin@0.37.0` styles.css servido ao lado):
  - quebrado: titulo em x=17 com 76.1px, lista comecando em x=93.1 ao lado dele
  - correto: titulo em x=1 com 367 por 36px, lista abaixo em y=376
  - skin 0.1.1 (antes do 39ae114) media o correto, o que fecha a datacao
- Resolucao (0.1.4): `.flex` de volta nos 10 seletores, mais
  `test/panel-headers.test.mjs` com os quatro formatos de painel e um mutante que remove
  o `.flex` e precisa reprovar.
- Licao: contagem de match em painel rodando so vale para o estado que esta na tela. O
  post aberto na conferencia do 0.1.2 nao tinha taxonomia nem traducao.

## Nao testar o pacote por `npm link` ou `bun link`

- Sintoma: o painel responde 500 com `Denied ID .../skin.css?raw`.
- Causa: o dev runner da Cloudflare recusa ler arquivo fora da raiz do projeto, e o
  symlink coloca a folha la fora. A mensagem nao cita o symlink.
- Resolucao: `npm pack` e instalar o tarball.

## CSS do site dentro do admin, so em astro dev (0.2.3)

- Sintoma: em `astro dev` o h1 do painel sai em Georgia, h2 com 38px e h3 com 28px (regras
  `h1, h2, h3` do `global.css` do site); no build de producao o painel fica certo.
- Causa: o grafo do admin alcanca todas as paginas do site (`d1.mjs:4` importa o barrel
  `emdash`, que chega em `resolve.ts` -> `astro:config/server` -> `virtual:astro:pages`), e o
  Astro dev escreve cada folha DUAS vezes no `<head>`: `<style data-vite-dev-id>` e
  `<script type="module" src="/src/...css">` (`vite-plugin-app/environment.js:156-157`).
  Upstream: emdash-cms/emdash#3714 e withastro/astro#18060 (PR #18061 aberto).
- Medida: 14 folhas do site no DOM do admin. Tirar so o `<style>` do HTML deixou o DOM com as
  mesmas 14, porque o cliente do Vite roda o `<script>` e injeta de novo.
- Resolucao (0.2.3): `applySkin` remove os dois lados de cada par cujo modulo esta em `/src/`.
  O id do `<style>` vem com `&amp;` e o src do `<script>` com `&` cru, entao o pareamento
  desfaz o escape antes de comparar, e o caminho mais longo pareia primeiro (uma `src/lib/src/a.css`
  nao pode casar por sufixo com `/src/a.css`). `test/inject.test.mjs` tem 4 mutantes.
- Pegadinha ao testar numa copia: o middleware e pre-empacotado em
  `node_modules/.vite/deps_ssr`. Trocar o tema em `node_modules` sem mover `node_modules/.vite`
  antes de subir o dev nao surte efeito.
