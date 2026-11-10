# Memória Persistente do Projeto — Matrix Finance 360

Este arquivo consolida decisões arquiteturais, regras de negócio, auditorias e histórico de correções do **Matrix Finance 360** (app central) e dos apps satélites conectados.

---

## [2026-11-08 14:20] - Matrix Finance v91: Inclusão da Fatura Nubank da Scarlet no Fechamento Consolidado

### 🔍 Motivação & Solução
1. **Fatura Nubank da Scarlet como Dívida Consolidada**:
   - No bloco **Fechamento Consolidado do Mês**, o widget exibia apenas Receitas, Gastos Fixos e Gastos Variáveis, gerando um Saldo Líquido artificialmente inflado que desconsiderava a fatura do cartão Nubank Black da Scarlet (ex.: R$ 4.568,57 em Nov/2026).
   - Adicionada a 4ª stat-box roxa dedicada: `(-) Cartão Nubank` com valor da fatura, link direto para drilldown detalhado (`abrirDrilldown('fatura')`) e botão de alternância de status (`[✅ PAGO]` / `[⏳ PEND.]`).
   - O `(=) Saldo Líquido Consolidado` foi reposicionado em largura total (`grid-column: 1 / -1`) com badge de status (`SUPERÁVIT` / `DÉFICIT`) e cálculo matemático consolidado:
     $$\text{Saldo Líquido Consolidado} = \text{Receitas Pecuniárias} - \text{Fixos Externos} - \text{Variáveis Externos} - \text{Diários} - \text{Fatura Nubank} - \text{Gastos Scarlet}$$
2. **Eliminação de Duplicidade de Repasses Internos**:
   - Ao consolidar as despesas da família com a Fatura Nubank, transferências internas do Matheus para a Scarlet (ex.: `Scarlet (Fatura Nubank)` de R$ 1.600,00) não são contadas em duplicidade com a fatura integral do cartão.
3. **Termômetro de Execução Unificado**:
   - `Total Já Pago no Mês` e `Falta Pagar` agora incluem o status real da Fatura Nubank Black (se pendente, vai para Falta Pagar; se paga, vai para Já Pago).
4. **Modal Editar Saldos**:
   - Adicionado checkbox `Fatura já paga no mês` e método `toggleFaturaNubankPaga(ano, mes)` com sincronização imediata do fechamento.
5. **PWA & Cache**:
   - `sw.js` atualizado para a versão de cache `matrix-finance-v91`.

---

## [2026-11-08 14:35] - Matrix Finance v92: MEI nos Fixos do Matheus e Acessibilidade do Modal Editar

### 🔍 Motivação & Solução
1. **MEI Reatribuído aos Gastos Fixos do Matheus (Salário USP / Conta BB)**:
   - A conta `MEI` (DAS MEI da Scarlet) é paga pelo salário do Matheus. Ela estava sendo capturada na coluna da Scarlet devido à categoria antiga `Fisio Scarlet`.
   - Adicionada regra de ouro em `isGastoDaScarlet`: itens `n === 'mei'` ou `n.startsWith('mei ')` retornam estritamente `false`.
   - Na higienização de inicialização e em `saveItemFromModal`, qualquer item MEI é normalizado para: `titular: 'matheus'`, `conta: 'salario_bb'`, `renda: 'salario_usp'` e categoria `'Contas'`.
   - O MEI agora é descontado da conta corrente do Matheus e não subtrai recursos da Sobra Líquida da Scarlet.
2. **Correção de Usabilidade & Toque no Modal de Edição (Mobile & Desktop)**:
   - Causa raiz: no CSS mobile de `.data-table`, `.action-col .btn-icon` possuía `min-width: 16px !important; font-size: 11px !important;`, tornando o toque no lápis `✏️` extremamente impreciso em telas touch.
   - Aumentada a área de toque dos botões de ação para `min-width: 30px; min-height: 30px; font-size: 15px;` com padding confortável e borda sutil.
   - Adicionado evento de clique direto em toda a célula de descrição (`<td class="desc-col" onclick="...">`) em todas as tabelas (Fixos, Variáveis, Scarlet, Diários e Receitas), permitindo abrir o modal de edição tocando diretamente no nome/descrição da despesa.
3. **PWA & Cache**:
   - Incrementado `sw.js` para `matrix-finance-v92`.

---

## [2026-11-08 14:50] - Matrix Finance v93: Opção 1 — Provisão com Consumo Automático de Caronas

### 🔍 Motivação & Solução
1. **Regra de Negócio de Caronas USP**:
   - O app calcula no Calendário a previsão de caronas baseada nos dias presenciais na USP no ciclo salarial (ex.: 19 dias úteis $\times$ R\$ 60 = R\$ 1.140,00).
   - Ao longo do mês, o usuário realiza viagens reais e lança despesas individuais em `+ Gasto Diário` (ex.: R\$ 50, R\$ 60, R\$ 70).
   - Sem o consumo automático, somar os Gastos Fixos (R\$ 1.140,00) com os Gastos Diários duplicaria o transporte no fluxo de caixa e distorceria a sobra do mês.
2. **Implementação da Opção 1 (Provisão com Consumo Automático)**:
   - Criada a função unificada `getCaronasProvisionSummary(yearStr, monthName, monthData)`:
     - Detecta o valor da provisão orçamentária em `monthData.fixos` (`isCaronaItem(f)`).
     - Soma dinamicamente todos os lançamentos diários de carona do mês em `monthData.diarios` (`isCaronaItem(d)`).
     - Calcula o saldo residual pendente: $\text{saldoRestante} = \max(0, \text{provisao} - \text{consumido})$.
     - Se o valor gasto em diários atingir ou ultrapassar a provisão, o saldo pendente nos fixos zera ($\text{saldoRestante} = 0$).
3. **Consistência Matemática em Todo o Ecossistema**:
   - `calcSobraMatheus`: a parcela pendente dos fixos para caronas passa a ser $\text{saldoRestante}$. O valor já pago nos diários é computado em `diarios`. Resultado: total previsto de caronas = $\text{consumido} + \text{saldoRestante} = \text{provisao}$, com zero duplicidade e sobra prevista exata.
   - `renderKPIs`, `renderMonthlyHorizonCards`, `renderCashflowTrace`, `renderRevisaoAnualDezembro`: todos adotam o motor central sem divergências.
4. **Experiência Visual & Interativa**:
   - Na tabela de **Gastos Fixos**:
     - Exibe badges contextuais: `🚗 Previsão USP (dias no ciclo)`, `⚡ Consumido: R$ X (Nx)` e `⏳ Saldo da Provisão: R$ Y`.
     - Quando 100% consumida, a linha exibe `✔ 100% CONSUMIDO` com estilo pago verde.
     - A coluna de valor exibe o saldo restante pendente em destaque com o valor total original em subtexto.
     - Adicionado botão de ação rápida `⚡` para lançar carona do dia em 1 clique.
   - No modal **+ Gasto Diário**:
     - Adicionados botões de atalho rápido (chips): `[🚗 Carona USP (R$ 60)]`, `[🍽️ Almoço VR (R$ 25)]` e `[☕ Café USP (R$ 8)]`.
     - Ao digitar ou selecionar carona, um aviso em verde confirma: *"🚗 Abate da Provisão de Caronas USP!"*.
5. **PWA & Cache**:
   - `sw.js` atualizado para `matrix-finance-v93`.

---

## [2026-11-08 15:40] - Roadmap & Proposta de Reformulação: Aba "E se?" (Simulador de Meses Futuros)

### 💡 Diretrizes e Ideias Aprovadas para Implementação Futura
Propostas estruturadas e validadas para modernização da aba de simulações e projeções financeiras:

1. **Linha D'Água do Caixa & Stress Test (Detecção de "Mês de Aperto")**:
   - Plotar a curva de **Saldo Acumulado de Caixa** ao longo dos meses futuros (2026-2027+), em vez de apenas avaliar meses isolados.
   - Detecção proativa e alertas visuais de risco: identificar com antecedência meses de menor liquidez ou vulnerabilidade a imprevistos (ex.: despesas de início de ano como IPVA, IPTU e matrículas).

2. **Comparador Lado a Lado (Cenário Base Realista vs. Cenário Simulado)**:
   - Seletor rápido de comparação direta:
     - *Cenário Base*: Projeção realista atual com base nos lançamentos e saldos vigentes.
     - *Cenário "E Se"*: Projeção com as hipóteses testadas ativas.
   - Painel resumo de impacto líquido consolidado (ex.: *"+ R$ 8.400 economizados no ano"* ou *"- R$ 350 na sobra mensal média"*).

3. **Presets Rápidos de 1 Clique (Hipóteses Recorrentes do Casal)**:
   - Botões pré-configurados para simulação instantânea de decisões frequentes:
     - 🚗 **Regime USP**: Alternar entre 100% presencial, híbrido ou remoto (recalculando transporte e VR).
     - 🩺 **Expansão FisioFlow**: Simular crescimento de 20%, 40% ou 60% nos atendimentos da Scarlet e capacidade de aporte pessoal.
     - 🏠 **Amortização Extraordinária Caixa**: Simular aporte mensal fixo (ex.: R$ 1.000 ou R$ 1.500) e calcular prazo e juros poupados em tempo real.
     - ✈️ **Projetos & Parcelamentos**: Lançar despesa em N vezes (ex.: viagem, reforma ou curso) e verificar em quais meses há folga orçamentária.

4. **Curva de Patrimônio & Poupança Acumulada (12 e 24 Meses)**:
   - Gráfico de visualização da evolução do patrimônio líquido conjunto (Reserva de Emergência + Renda+ + Tesouro + Ações/FIIs + Previdência) projetado até o final de 2027.

5. **Organização por Três Alavancas de Decisão**:
   - **Alavanca de Entrada**: Ganhos adicionais, aumentos, novos clientes.
   - **Alavanca de Corte**: Renegociação de contas, cancelamentos de assinaturas, redução de variáveis.
   - **Alavanca de Compromisso**: Aquisição de bens, financiamentos, parcelas no cartão de crédito.

---

## [2026-11-08 15:55] - Matrix Finance v94: Vínculo Explícito e Direto com Carteira de Investimentos

### 🔍 Motivação & Solução
1. **Fim dos Aportes Fantasmas e Investimentos Criados Sem Querer**:
   - Anteriormente, o modal de despesas possuía uma lógica implícita (`isAutoInvest`) que tentava deduzir vínculos a partir de nomes como *"renda+"* ou da categoria *"Aportes"*. Isso gerava novos ativos duplicados com IDs `inv_...` e inflacionava saldos a cada edição da mesma despesa.
   - `populateModalInvestAtivos` inseria nomes genéricos estáticos (como CSNA3, MGLU3, etc.), desvinculados do ID real do ativo na carteira do usuário.
2. **Nova Interface de Vínculo com 3 Modos Explícitos**:
   - `🔘 Não vincular (Apenas fluxo de caixa)`: Opção padrão. Nenhuma alteração é feita na carteira de investimentos.
   - `🔘 🔗 Vincular a Investimento Existente`:
     - Exibe lista suspensa alimentada diretamente pelos ativos reais cadastrados em `state.investimentos`.
     - Cada opção detalha com clareza: `Nome do Ativo • Corretora [Titular] (Saldo Atual: R$ X.XXX,XX)`.
     - Caixa de pré-visualização em tempo real: exibe o saldo antes e o novo saldo projetado após o aporte ou resgate (ex.: `R$ 466,07 ➔ Novo Saldo: R$ 666,07`).
   - `🔘 ➕ Criar Novo Investimento`:
     - Formulário explícito com campos dedicados: Nome do Ativo, Corretora/Banco, Categoria e Titular. Só é criado se o usuário preencher e salvar deliberadamente.
3. **Mecanismo Antiduplicidade e Reversão Automática em Edição e Exclusão**:
   - O item armazena metadados do vínculo: `investLinkedId`, `investLinkedOp` e `investLinkedVal`.
   - Ao editar uma despesa com aporte, o sistema estorna previamente o valor antigo do investimento antes de aplicar o novo, evitando a multiplicação do saldo.
   - Ao excluir um lançamento vinculado via `removeItemByIndex`, o valor aportado é subtraído automaticamente do saldo do investimento.
4. **PWA & Cache**:
   - `sw.js` atualizado para `matrix-finance-v94`.

---

## [2026-11-10 14:35] - Matrix Finance v112: Revisão Técnica, Remoção de Bloco Órfão do Simulador 2055 e Alinhamento de Versões

### 🔍 Motivação & Solução
1. **Fim da Duplicação Visível no Simulador 2055 (dívida técnica da v111)**:
   - O `index.html` mantinha, depois do fechamento do `#simulador2055ModalBackdrop`, um **bloco órfão** com o quadro de resultados do simulador (grid de 4 cards) e outra barra de ações.
   - Como o bloco era filho direto do `<body>`, ele era renderizado sempre, com valores fixos antigos (`R$ 1.015,78`, `2.259,5 títulos`, `R$ 1.053.372`), enquanto o bloco real dentro do modal exibia os valores calculados (`R$ 1.014.106,20`, `2.175,9 cotas`).
   - Pior: os 5 ids (`simResAporteMensal`, `simResTitulosMes`, `simResTotalTitulos`, `simResMontanteFinal`, `sim2055LabelMeta`) apareciam duas vezes; `getElementById` sempre devolvia o nó do modal, então a cópia órfã nunca era atualizada.
   - Correção: bloco órfão removido (57 linhas). Verificado em Chromium headless (desktop 1440px e mobile 390px): cada id passou a existir uma única vez, sem valores fixos na tela e sem overflow horizontal.
2. **Alinhamento do Cache-Busting com o Service Worker**:
   - Os `<script>`/`<link>` do `index.html` estavam em `?v=98` enquanto o `sw.js` já estava em `matrix-finance-v111` — exatamente o descompasso que a regra de publicação proíbe.
   - `?v=` e `CACHE_NAME` foram unificados na v112 (`matrix-finance-v112`), e um novo teste (`HTML: ?v= dos assets casa com o CACHE_NAME`) passou a reprovar qualquer desalinhamento futuro.
3. **Higiene de Codificação**:
   - BOMs UTF-8 residuais removidos de `js/satellite-connectors.js`, `js/scenario-simulator.js`, `js/seed-data.js` e `MEMORY.md` (a limpeza anterior os havia deixado para trás e ainda reintroduziu um BOM no `MEMORY.md`).
   - Texto duplamente codificado corrigido em `js/satellite-connectors.js`: `"ZÃ© Delivery - NuPay"` → `"Zé Delivery - NuPay"` (apareceria corrompido no drilldown de faturas) e comentário `requisiÃ§Ã£o` → `requisição`.
4. **Suíte de Testes Mais Estrita e Portátil**:
   - O teste de IDs duplicados perdeu a lista de exceções: agora **qualquer** id repetido reprova.
   - `package.json`: `test` passou a usar glob entre aspas (`node --test "test/*.test.js"`) e `engines.node` subiu para `>=22` (o runner de testes precisa expandir o glob; a CI já usava Node 22).
   - CI (`.github/workflows/ci.yml`) passou a rodar `npm run verify` (uma única fonte de verdade para sintaxe + testes).
   - `.gitignore` ganhou `node_modules/` e artefatos locais, já que o projeto passou a ter `package.json`.
5. **PWA & Cache**:
   - `sw.js` e `?v=` atualizados para `matrix-finance-v112`.

### 🧪 Validação Executada
- `node scripts/check-syntax.js`: 11/11 arquivos sem erro.
- `node --test "test/*.test.js"`: 15/15 testes aprovados.
- Chromium headless (CDP): 0 exceções/erros de console; 12 modais abrindo e fechando; 7 abas sem overflow (desktop e mobile); Service Worker registrado; fluxo completo dos botões rápidos (fixar, editar, reordenar, excluir, restaurar) e lançamento de gasto diário persistindo após reload.

### ⚠️ Pendências Identificadas (não alteradas nesta versão)
1. **Segredo em repositório público**: `js/satellite-connectors.js` expunha o token do Casa Maracaju em três pontos (default dos endpoints, fallback do POST de backup e baseline de faturas), junto da URL do Apps Script do Casa Maracaju. **Resolvido na v114**: os três pontos foram removidos e o token passou a vir só de `localStorage` (`matrix_maracaju_token`). Ainda é necessário **rotacionar o token** no Apps Script, pois o valor antigo permanece no histórico do Git.
2. **Acoplamento temporal a Nov/2026**: comparações `'2026-11'` em `sync-engine.js` (preservação do consumo local do Casa Maracaju) e em `app.js` deixam de valer quando o mês virar.
3. **Botões rápidos não sincronizam**: ficam apenas no `localStorage` do dispositivo (decisão consciente, mas vale registrar).

---

## [2026-11-10 15:15] - Matrix Finance v113: Revisão de UX Desktop + Celular (truncamentos, FAB e alvos de toque)

### 🔍 Motivação
Auditoria de interface com screenshots reais em 1440×900, 768×1024, 390×844 e 360×740 (Chromium headless),
medindo truncamento de texto, alvos de toque, fontes mínimas, overflow horizontal e sobreposição de elementos.

### 🛠️ Correções
1. **Truncamento sistêmico eliminado (10 elementos no desktop, 4 no celular → 0)**:
   - Títulos e subtítulos dos cards do painel (`1. FIXOS + VARIÁVEIS + DIÁR…`, `Pago: R$ 7.161,38 • ⏳ … a pagar`) passaram a quebrar linha em vez de usar `text-overflow: ellipsis`;
   - `.unified-card-title` (ex.: `👩‍⚕️ Sobra Scarlet`, que ficava com 14px de largura), `.cal-header-title`, `.cal-kpi-label`, `.cal-kpi-sub`, `.cal-banner-inline` e o banner de equações (`.eq-label`, que estava em **7,2px**) também foram ajustados;
   - `.unified-row`: quando o valor é longo, ele desce para a linha de baixo em vez de esmagar o rótulo.
2. **Bug de classe no simulador 2055 (`setSim2055Meta`)**: a função fazia `btn.className = 'btn-matrix'`, apagando a classe estrutural `.sim2055-meta-btn`. Resultado: os 4 cartões de meta viravam botões comuns, com texto cortado e sem o layout de card. A classe agora é preservada; o grid passou a `auto-fit/minmax(128px, 1fr)` e os valores dos resultados (`R$ 1.014.106,20`) não são mais cortados.
3. **FAB "Gasto Diário"**:
   - Em telas ≤480px vira um FAB circular de 52px (só o ícone, com `aria-label`), reduzindo a área que cobria valores de tabelas;
   - Fica oculto nas abas **Holerites** e **Backup**, onde cobria campos de formulário;
   - `.tab-content.active` ganhou `padding-bottom` para o conteúdo poder rolar além do FAB.
4. **Barra de chips satélites e legenda do calendário**: ganharam máscara de *fade* na borda direita (sinalizando rolagem horizontal) e o rótulo dos chips subiu de 8,5px para 9,5px.
5. **Alvos de toque no celular**: a regra `.month-nav-btn` apontava para uma classe que **não existe no HTML** — as setas ◀/▶ seguiam com 32×31px. Agora `#prevMonthBtn`/`#nextMonthBtn` têm 42×38px e os controles do cabeçalho têm `min-height: 40px`.
6. **Modal de gasto diário**: o campo `datetime-local` esmagava o campo **Valor** para ~115px; no celular os dois passam a ocupar a linha inteira (e `minmax(0,1fr)` no desktop).
7. **Duplicidade no mobile**: dois botões `+ Novo Investimento` empilhados — o secundário (cabeçalho da carteira) fica oculto em telas ≤768px.
8. **Holerites (13º)**: o valor quebrava no meio (`~R$` / `1.280,00`); agora fica em `nowrap` com o rótulo podendo quebrar.
9. **Rodapé dos cards de horizonte**: valores colados no rótulo (`Ganhos Totais (+ VA/VR):R$ …`) — adicionado `gap` e `flex-wrap`.

### 🧪 Validação
- `node --test "test/*.test.js"`: **15/15**; `check-syntax`: 11/11.
- Chromium headless: **0 erros/ exceções de console**, `horizontalOverflow = 0` e **`clipped = 0`** nas três viewports (1440, 390 e 360).
- `sw.js` e `?v=` em **v113**.

---

## [2026-11-10 15:40] - Matrix Finance v114: Fim do Token no Código, Regras por Data Real e KPI de VR do Calendário

### 🔍 Motivação
Tratar as três pendências abertas na revisão da v112: segredo exposto no repositório público,
regras presas ao literal `2026-11` e o KPI `#calVRTotal` que exibia `R$ 1.170,00` como se
fosse o VR do mês.

### 🛠️ Correções
1. **Token do Casa Maracaju fora do código**:
   - Removido dos **três** pontos: `DEFAULT_ENDPOINTS.maracajuToken` (default), o fallback do
     `POST action:'backup'` e o `profile.gasToken` do `BASELINE_FATURAS_RAW`.
   - O token agora vem apenas de `localStorage` (`matrix_maracaju_token`, campo `cfgMaracajuToken`
     em **Backup & Conexões**). Sem token, o conector não tenta o GET/POST e registra
     `statusResults.maracaju.error = 'Token do Casa Maracaju não configurado (Backup & Conexões).'`
   - **Ação externa pendente:** rotacionar o token no Apps Script do Casa Maracaju (o valor
     antigo continua no histórico do Git).
2. **Regras de mês vigente sem literal**:
   - `app.js`: novo `isMesVigenteReal(ano, mes)` (compara com `new Date()`), usado no chip de
     VA/VR do topo e no drilldown de folga de caixa (antes `currentYear === '2026' && currentMonth === 'Novembro'`);
   - `satellite-connectors.js`: `getDiariosMesVigente(state)` substitui a busca fixa em
     `anos['2026']['Novembro']` (usada em `syncMaracajuFromLocal` e no `scrapeAll`);
   - `sync-engine.js`: a preservação do consumo local do Casa Maracaju compara
     `localMaracajuSat.cicloVigente` com o do snapshot, em vez de exigir `'2026-11'`.
3. **KPI `#calVRTotal` sem ambiguidade**:
   - O card passou a se chamar **“VR Consumido (R$ 65/dia)”** e o subtítulo mostra
     `18 dias x R$ 65 • crédito R$ 1.105,16` (crédito contratual vindo de `satellites.maracaju.vrTotal`
     ou `totais['VR']`).
   - Quando o consumo estimado passa do crédito, o valor fica em âmbar com `title` explicando —
     sem nunca sobrescrever o VR contratual.

### 🧪 Validação
- `check-syntax` 11/11 e suíte **15/15**.
- Chromium headless: calendário renderiza “VR Consumido … 18 dias x R$ 65 • crédito R$ 1.105,16”,
  chip do Casa Maracaju continua exibindo saldo restante, sem erros de console e sem overflow.
- `sw.js` e `?v=` em **v114**.

---

## [2026-11-10 16:05] - Matrix Finance v115: Correção da Contagem Dupla no Saldo VA/VR (Chip Casa Maracaju)

### 🐞 Bug
O chip **Casa Maracaju** exibia saldos menores que os reais (ex.: `VA R$ 1.614,98` / `VR R$ 343,26` em vez de
`1.988,78` / `805,41` no cenário base). Causa: **cada diário do Matrix com conta `cartao_va`/`cartao_vr` era
somado duas vezes** no gasto do ciclo:

1. `processMaracajuData` grava os diários no ciclo com `fromMatrix: true` (`comprasCicloAtual`);
2. no sync seguinte, `syncMaracajuFromLocal` realimentava `existing.comprasCicloAtual` como `comprasRegistros`
   — a deduplicação dos "registros" usa `id`/`nfeKey`, enquanto a dos diários usa `data_valor_nome`, então a
   mesma compra não era reconhecida como duplicada;
3. o bloco 3 voltava a somar os mesmos diários → gasto dobrado e, via regra de "máximo", o valor inflado ficava
   preso no estado (não se curava sozinho).

### 🛠️ Correção
- `existingSynthetic.comprasRegistros` agora **filtra `fromMatrix`** (diários são reaplicados pelo parâmetro).
- `processMaracajuData` **ignora `fromMatrix`** dentro de `comprasRegistros` (defensivo para qualquer origem).
- As guardas de "máximo" (`existing.gasto > computed.gasto`) só valem quando **não** há derivados de diários
  (`temDerivadosDeDiarios`), permitindo a auto-cura de estados já inflados.

### 🧪 Validação (Chromium headless, dados injetados)
- Antes: diários de VA R$ 100 + VR R$ 50 → `gastoVa` 271,06 e `gastoVr` 399,75 (dobrado).
- Depois: `gastoVa` 171,06 e `gastoVr` 349,75, **estáveis** em três sincronizações seguidas.
- Estado inflado artificialmente (`gastoVa = 999` + compra `fromMatrix` legada) volta para 171,06 no sync.
- Chip renderiza `VA R$ 1.888,78` / `VR R$ 755,41` (1.988,78 − 100 e 805,41 − 50).
- `check-syntax` 11/11 e suíte **15/15**; `sw.js` e `?v=` em **v115**.

---

## [2026-11-10 16:20] - Matrix Finance v116: Lançamentos VA/VR do Matrix Reconhecidos como Espelho do Casa Maracaju

### 🔍 Contexto
O modal de gasto diário do Matrix é **espelho** do app Casa Maracaju: a mesma compra de VA/VR
costuma existir nos dois lados. A correção da v115 impedia a contagem dupla *do mesmo diário*,
mas uma compra espelhada (mesma data/valor, **nome diferente** no Matrix) ainda entrava duas
vezes: uma pelo registro vindo do Casa Maracaju e outra pelo diário do Matrix.

### 🛠️ Correção
- `processMaracajuData` passou a montar `seenSateliteDateValue` com a assinatura
  `data|valor|método` de cada compra/refeição vinda do satélite.
- Ao percorrer `matrixDiarios`, se a assinatura já existe, o diário é **ignorado** (é espelho);
  se não existe, entra **uma única vez** (compra exclusiva do Matrix).
- Leitura da data do diário passou a considerar `dataHora` (os diários reais gravam `dataHora`,
  não `data`) — antes a data saía vazia e a assinatura nunca casaria.
- Corrigido também o *write-back* do espelho em `app.js` (`salvarSaldoAtualMaracajuInline`):
  `monthlyEndingBalances` era gravado na chave fixa `'2026-11'`; agora usa `sat.cicloVigente`
  (ou o mês real), para o saldo editado cair no ciclo certo na virada do mês.

### 🧪 Validação (Chromium headless)
- Compra do satélite: `2026-11-07 • R$ 71,06 • VA`. Diário espelho com a mesma data/valor e nome
  diferente → **não somou** (gasto VA permaneceu 71,06).
- Diário exclusivo do Matrix (`R$ 33,33`) → somou **uma vez** (gasto VA 104,39; saldo 1.955,45).
- Chip renderizou `VA R$ 1.955,45` / `VR R$ 805,41`; sem erros de console.
- `check-syntax` 11/11, suíte **15/15**, `sw.js` e `?v=` em **v116**.

---

## [2026-11-10 16:40] - Matrix Finance v117: Saldo do Casa Maracaju Não é Mais Zerado ao Carregar

### 🐞 Bug (o "bug pequeno ao carregar")
O saldo correto do VA/VR vem do app Casa Maracaju (aba **Mercado**) e estava sendo **sobrescrito
pelos valores de exemplo** durante o carregamento:

- `db.js` (`sanitizeState`) recriava `satellites.maracaju` sempre que
  `vaTotal !== 2059.84` **ou** `vrTotal !== 1105.16` **ou** `cicloVigente !== '2026-11'`;
- `app.js` (`init`) fazia o mesmo quando `cicloVigente !== '2026-11'`.

Comparações estritas (`!==`) de float/string e o mês fixo faziam o estado real (ex.: VA 1.614,98 /
VR 343,26, gasto 444,86 / 761,90) ser substituído pelo seed (1.988,78 / 805,41) a cada carga — e o
chip só voltava ao valor certo se a ponte/sincronização recompusesse em seguida. Quando `vaTotal`
chegava da planilha como **string** (`"2059.84"`), o reset acontecia sempre.

### 🛠️ Correção
- Ambos os pontos agora só semeiam o estado quando **faltam os campos essenciais**
  (`vaTotal`, `vrTotal`, `saldoVaRestante`, `saldoVrRestante`); nunca por diferença de valor.
- `cicloVigente`/`creditDate` do seed deixaram de ser `'2026-11'`/`'2026-11-06'` fixos: o ciclo é
  calculado com a data real e `creditDate` é `null` (o conector preenche no primeiro sync).

### 🧪 Validação (Chromium headless, com reload real)
- Caso 1 — estado do app (`saldoVa 1614.98`, `saldoVr 343.26`, `vaTotal` como string,
  `cicloVigente '2026-12'`): após **reload**, chip continua `VA R$ 1.614,98` / `VR R$ 343,26`.
- Caso 2 — estado legado sem saldos: seed aplicado (`1.988,78` / `805,41`), como esperado.
- `check-syntax` 11/11, suíte **15/15**, `sw.js` e `?v=` em **v117**.

---

## [2026-11-10 16:40] - Matrix Finance v118: Novos Ícones do PWA (maskable) e Consistência do Manifest

### 🔍 Contexto
O `git status` apareceu com ícones novos (`matrix-icon-192/512/1024/svg/jpg` regenerados) e o
`manifest.json` alterado, mais um arquivo **não rastreado** `icons/matrix-icon-maskable-512.png`.
As alterações não vieram desta sessão — foram verificadas antes de publicar: todos os arquivos são
imagens válidas (192×192, 512×512, 1024×1024 RGBA) e o maskable tem a arte dentro da *safe zone*
(recorte circular do Android).

### 🛠️ O que foi feito
- `icons/matrix-icon-maskable-512.png` **adicionado ao `ASSETS_TO_CACHE`** do `sw.js` (antes ficaria
  fora do cache offline e só existiria se o manifest fosse commitado sozinho — 404 na instalação).
- `manifest.json` mantido com a separação `purpose: "any"` (full-bleed) × `purpose: "maskable"`
  (arte com margem), que é o padrão correto do Android.
- Versões subidas para **v118** (`?v=` em todos os assets e `CACHE_NAME`).
- Novo teste `Manifest: todos os ícones existem e há um maskable` na suíte — impede exatamente o
  cenário de manifest apontando para arquivo não versionado. Suíte agora com **16 testes**.

### ⚠️ Observações
- `icons/matrix-icon.svg` tem **~2,1 MB** porque é um raster embutido em base64 (`<image href="data:...">`);
  ele é usado como favicon (`<link rel="icon" type="image/svg+xml">`) e está no precache. Vale otimizar
  (reencodar o bitmap ou remover o favicon SVG) para não baixar/cachear 2 MB à toa.
- `icons/matrix-icon.jpg` não é referenciado por nenhum arquivo (295 KB) e `oracle-cookie.jpg` só aparece
  no precache — candidatos a limpeza.





