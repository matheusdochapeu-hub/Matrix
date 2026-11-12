# AGENTS.md — Matrix Finance 360

> Contexto para agentes de IA (Antigravity, Claude Code, DSH). Escopo: **esta pasta**.
> Regras de negócio detalhadas ficam em [`GEMINI.md`](GEMINI.md) e o histórico em [`MEMORY.md`](MEMORY.md).

## O que é

Torre de controle financeira do casal (Matheus + Scarlet): fluxo de caixa mensal 2026/2027,
simulador de cenários "E se?", leitura de holerites, financiamento Caixa, investimentos 360,
simulador de aposentadoria 2055 e conciliação com os apps satélites.

## Stack

- **Front-end:** PWA em HTML/CSS/vanilla JS. **Não usa bundler nem npm packages.**
  - `index.html` (~3.000 linhas) + `css/matrix.css` + `js/*.js` como **scripts clássicos**
    (sem `import`/`export`), carregados em ordem no fim do `index.html`.
- **Back-end:** Google Apps Script (`apps_script.gs`) + Google Sheets como banco.
- **Persistência local:** `localStorage` (chave `matrix_*`). A planilha é a fonte da verdade
  quando há sincronização.

## Rodar localmente

```powershell
# dentro desta pasta
python -m http.server 8000
# abra http://localhost:8000
```
Abrir `index.html` direto por `file://` quebra o Service Worker e o fetch do Apps Script.

## Testes e verificação

```powershell
npm run check      # sintaxe de todos os js/ + sw.js + apps_script.gs
npm test           # 26 testes: sintaxe, integridade do HTML, manifest, Service Worker, faturas/nuvem e regressões de dados
npm run verify     # os dois acima em sequência (é o que a CI roda)
```
O Node local do workspace fica em `..\node-bin\PFiles64\nodejs\node.exe`
(a suíte exige Node >= 22 por causa do glob do `node --test`).

## Deploy

- GitHub Pages servido **direto da branch `main`** (sem workflow de deploy):
  <https://matheusdochapeu-hub.github.io/Matrix/>
- CI (`.github/workflows/ci.yml`) roda sintaxe + testes em todo push.

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `js/app.js` | Núcleo da aplicação (~555 KB). Renderização, modais, cálculos |
| `js/db.js` | `MatrixDB`: persistência local, backups e auto-recuperação |
| `js/sync-engine.js` | Sincronização com o Google Sheets |
| `js/satellite-connectors.js` | Puxa dados de maracaju88, faturas e do app Atendimentos da Scarlet (chave interna: `fisioflow`) |
| `js/seed-data.js` | Dados iniciais e baseline |
| `sw.js` | Service Worker; `CACHE_NAME` versiona o cache |
| `apps_script.gs` | Backend/API do Google Apps Script |

## Regras críticas (o que NÃO fazer)

1. **Ao alterar qualquer asset, subir DUAS versões:** `CACHE_NAME` em `sw.js`
   (`matrix-finance-vN`) **e** o `?v=N` de todos os `<script>`/`<link>` no `index.html`.
   O teste `HTML: versionamento ?v= é uniforme` reprova se os assets divergirem entre
   si, e `HTML: ?v= dos assets casa com o CACHE_NAME` reprova se o HTML e o `sw.js`
   ficarem em versões diferentes (foi exatamente o que aconteceu até a v111: HTML em
   `?v=98` e cache em `v111`).
2. **Nunca reaproveitar `id` no HTML.** `getElementById` devolve só o primeiro.
   O teste de IDs duplicados reprova qualquer repetição (sem lista de exceções).
3. **Não remover os `stopPropagation`/`popstate` dos modais** — foram adicionados para
   impedir fechamento acidental ao arrastar/rolar no celular.
4. **Nunca apagar `diarios` em massa** na sincronização: o merge é por `id` e por
   `(nome, valor, dataHora)` de propósito.
5. **Não expor dados pessoais** em arquivos que vão para o repositório público.
6. **UX: informação nunca é cortada.** Rótulos/valores informativos quebram linha em vez de
   usar `ellipsis`; e **nunca** atribua `className` inteiro em botões que têm classe
   estrutural (foi assim que `.sim2055-meta-btn` se perdia na v112).
7. **Confira sempre desktop e celular** (1440, 768, 390 e 360px): sem overflow horizontal,
   sem rótulo truncado, alvos de toque ≥ 40px e o FAB "Gasto Diário" não pode cobrir campos.
8. **Saldo VA/VR: uma compra, uma soma.** Diários com conta `cartao_va`/`cartao_vr` são
   **espelho** do Casa Maracaju. Eles entram no saldo só por `matrixDiarios` e são ignorados
   quando já existe compra do satélite com o mesmo `data|valor|método` (v116); itens
   `fromMatrix` nunca voltam como `comprasRegistros` (v115). Sem essas duas travas o gasto
   dobra e o saldo fica abaixo do real.
9. **O saldo de VA/VR é do Casa Maracaju.** Nunca sobrescreva `satellites.maracaju` por diferença
   de valor ou de mês: o estado só é semeado quando faltam `vaTotal`/`vrTotal`/`saldoVaRestante`/
   `saldoVrRestante` (v117). Comparar float com `!==` ou fixar `'2026-11'` apagava o saldo real
   do app a cada carregamento. Desde a v122 o conector usa `settings.matrixBenefits` /
   `benefitsSummary` (inclusive o `cycleKey`) como autoridade — o ciclo de benefícios não é o
   mês do calendário. Também respeita `deletedIds` do Maracaju e nunca devolve compra apagada.
10. **Nunca renderize valor de exemplo como se fosse real.** Enquanto o satélite não sincronizou,
    o KPI mostra `—` (os seeds levam `semente: true` e o HTML nasce neutro — v120). Foi assim que
    o chip exibia `1.988,78 / 805,41` antes de fixar os números do Casa Maracaju.
11. **FisioFlow só entra por JSONP.** O `doGet` de `../matheus-app-fisioterapia/Code.gs` precisa
    manter o bloco `callback` (v121); sem ele o navegador bloqueia a leitura por CORS. Nunca fixe
    os ganhos da Scarlet por mês (`3.700/1.140/995`): o caixa M+1 vem de
    `satellites.fisioflow.ganhosPorMes[prevYm]`.
12. **Receitas: id é sagrado.** Nunca reescreva ids de receita no `compactStateForCloud` e nunca
    faça merge de receita só por id. O par seed (`rec_sal_...`) × cópia antiga (`r0`, `r1`...) é
    duplicata e deve ser limpo por `MatrixDB.dedupeReceitasInState` (v121).
13. **Boot sem piscar.** `scrapeAll` tem trava de concorrência; `focus` só coleta a cada 2 min com
    a aba visível; renders assíncronos usam `scheduleRenderAll` e o fade fica desligado nos
    primeiros 5 s (v121). Não reintroduza `renderAll()` direto nesses caminhos.
14. **Calendário de 7 colunas** exige `grid-template-columns: repeat(7, minmax(0, 1fr))` e
    `min-width: 0` nas células; sem isso o `min-content` dos textos desalinha os dias do
    cabeçalho no celular (v121).
15. **Backup já vem configurado** (`DEFAULT_CLOUD_URL` em `sync-engine.js`). Não remova o fallback:
    sem ele o app abre em modo offline e mostra apenas o cache local, sem puxar o estado da planilha.
16. **`touch-action: pan-x` só em faixa horizontal.** Em contêiner de conteúdo (`.tab-content`,
    `.tabs-carousel-viewport`, corpo) ele **mata a rolagem vertical** no celular — foi o que travava
    o app na parte de baixo (v127). Use `pan-y pinch-zoom`; o swipe de abas é JS.
17. **Dado de satélite velho não é atual.** Com `atualizadoEm` > 6 h e sem resposta na sessão, o chip
    mostra `—` e só troca pelo valor quando o `maracaju` responde (ou após o fallback de 8 s).
18. **Salário é 4º dia útil bancário.** O contador do calendário (v128) usa
    `CalendarEngine.getSalaryPayday(mês + 1)` e conta dias corridos até a data. Não troque por dias
    úteis “civis” nem esqueça o `+1` (o salário que fecha o ciclo cai no mês seguinte).
19. **KPIs do calendário: tamanho por classe, não por posição.** `div:last-child` pegava o
    sub-rótulo e o deixava com 15px no celular (v128). Use `.cal-kpi-label` / `.cal-kpi-val` / `.cal-kpi-sub`.
20. **Cotação de ação vem do Apps Script, não do Yahoo direto.** `query1.finance.yahoo.com` não manda
    `Access-Control-Allow-Origin` e o navegador bloqueia; a ação `quotes` do `apps_script.gs` resolve
    (a `/exec` devolve ACAO `*`). Não troque por proxy público nem por API com token embutido.
21. **Mexeu em `apps_script.gs`? Avise para reimplantar.** Implantar → Gerenciar implantações → Editar →
    Versão: "Nova versão". Sem isso o app recebe "Ação inválida" e a feature nova não funciona.
22. **Previews do simulador são calculados, não fixos.** Os três cards de meta do Renda+ 2055 reagem a
    `matrix_simulador_2055_params` via `atualizarCardsMetas2055()` (v130). Se voltarem a ser texto fixo,
    salvar parâmetros deixa de refletir na tela — que foi exatamente o bug relatado.
23. **UrlFetchApp pede escopo próprio.** Se a ação `quotes` responder "sem permissão para chamar
    UrlFetchApp", rode `testarCotacoes()` no editor (aceite a permissão) antes de publicar nova versão.
    O `appsscript.json` do repo já traz `script.external_request`.
24. **A lista de faturas é gerada, não digitada.** `js/faturas-data.js` vem de
    `nexo/scripts/drift.mjs --gerar`, a partir da `BASE_ITEMS` do app Faturas + os
    metadados `cat`/`tag` daqui. Não edite o arquivo à mão: rode o gerador no repo `Nexo`.
    O array em `js/satellite-connectors.js` é **fallback** (se o gerado não carregar,
    o app funciona igual). O script precisa estar no precache do `sw.js` — há teste para isso.
25. **Faturas: vale o retrato mais recente, nunca o baseline embutido.** `compactStateForCloud`
    precisa levar `satellites.faturas` (só `total`/`status` por mês) e `expandStateFromCloud`
    **não** pode recriar faturas. Até a v139 ele injetava `processFaturasData({})`, carimbava
    `atualizadoEm = agora` e descartava o scrape a cada sincronização — foi assim que Dez/2026
    em diante ficou congelado (Jan/2027 voltava +R$ 350/mês, com a 1/6 do Studio Rocha reexibida).
    Quem decide o vencedor é `SatelliteConnectors.mergeFaturasSnapshots` (`fonte: 'baseline'`
    tem carimbo 0 e nunca ganha). Coleta que falha mantém o último retrato bom e mostra o badge
    **DESSINC.** — `success: true` só com payload do app Faturas na mão (v140).

## Dívida técnica conhecida

- **Resolvida na v112:** o quadro de resultados do simulador 2055 estava duplicado no
  `index.html` (bloco dentro do modal + cópia órfã no fim do `<body>` com valores fixos
  `R$ 1.053.372` / `2.259,5 títulos`, que nunca era atualizada). O bloco órfão foi
  removido e o teste de IDs duplicados voltou a ser estrito.
- **Acoplamento temporal (parcialmente resolvido na v114):** as *regras* que dependiam de
  `'2026-11'` (saldo do Casa Maracaju no topo, drilldown de folga de caixa, preservação do
  consumo local no sync e diários de VA/VR no scraping) passaram a usar a data real
  (`isMesVigenteReal` / comparação de `cicloVigente`). Ainda há literais `'2026'`/`'2026-11'`
  **de dados** (seed de meses, fallbacks de demonstração da Scarlet/FisioFlow) — esses são
  históricos e devem ser substituídos por dados reais, não por cálculo dinâmico.
- **Persistência de botões rápidos é só local:** `MatrixDB.saveCustomQuickButtons`
  grava em `localStorage` (`matrix_custom_quick_buttons`) e não entra no estado
  sincronizado com o Google Sheets — cada dispositivo tem seus próprios atalhos.
- **Token do Casa Maracaju (resolvido no código na v114):** o token estava fixo em
  `js/satellite-connectors.js` (default dos endpoints, fallback do POST de backup e no
  baseline de faturas) num repositório público. Na v114 os três pontos foram removidos:
  o token agora vem apenas de `localStorage` (`matrix_maracaju_token`, editável em
  **Backup & Conexões**) e o conector avisa quando ele não está configurado.
  **Ainda é necessário rotacionar o token no Apps Script do Casa Maracaju**, porque o
  valor antigo continua no histórico do Git — tirar do código não o torna secreto.

## Vizinhança (ecossistema)

Este app é o **centro**. Os satélites alimentam dados para cá:

- `../maracaju88` — VA/VR e contas da casa (saldo de benefícios).
- `../parcelado-a-vista` — faturas dos cartões (Nubank/BB).
- `../matheus-app-fisioterapia` — **Atendimentos da Scarlet** (app pessoal). É a fonte real do
  conector com chave interna `fisioflow` (ganho possível/recebido). **Não confundir** com
  `../fisioflow`, que é o produto comercial multi-tenant e não alimenta o Matrix.

Ao mexer em contratos de dados entre apps, ajuste também `js/satellite-connectors.js`.
