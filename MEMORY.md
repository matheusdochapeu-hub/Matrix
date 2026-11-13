# Memória Persistente do Projeto — Matrix Finance 360

Este arquivo consolida decisões arquiteturais, regras de negócio, auditorias e histórico de correções do **Matrix Finance 360** (app central) e dos apps satélites conectados.

---

## [2026-11-12 11:05] - Matrix Finance v145: série de faturas vai até o último mês ativo (Dez/2027 incluso)

### 🐞 Problema
Depois da v142 os valores batiam mês a mês com o app Faturas, mas a série do Matrix **parava em
Nov/2027**: `MNS_MAP` era um literal de 0 a 14 e o `for` ia até 14. O app Faturas mostra
**Dez/2027 = R$ 330,00** (Nutri 12/12), que simplesmente não existia no Matrix — selecionar
Dez/2027 caía no fallback e aparecia zerado/errado.

### 🛠️ Correção
- `processFaturasData` gera a chave do mês a partir da âncora (Set/2026 = 0) em vez do mapa fixo,
  e calcula o limite com o maior `ate` de base/extras/simulações (+12 meses de folga), igual ao
  `getMaxActiveMonth` do app Faturas.
- Comparação mês a mês (payload real): Set/2026 → Dez/2027 idênticos ao app, incluindo
  Out/2027 = 503,98, Nov/2027 = 374,99 e **Dez/2027 = 330,00**. Jan/2028 não é inventado.
- Versão **v145**.

### 🧪 Validação
- Suíte **34/34** (novo caso "a série vai até o último mês ativo"), `check-syntax` 13/13.

### 🧠 Regra
- Nada de mapa fixo de meses: o horizonte vem dos dados (`ate`), não do código.

## [2026-11-12 10:52] - Matrix Finance v143: exclusão de receita volta a grudar (lápides) e o par Estúdio × Renda Extra morre

### 🐞 Problema
A renda extra do estúdio (R$ 600) aparecia **duas vezes** em Novembro/2026 e "voltava" sempre que
o usuário excluía e salvava. No estado real havia duas cópias: `r7` "Estúdio" (conta `salario_bb`,
`renda: salario_usp`) e `rec_estudio_Novembro_2026` "Renda Extra" (conta `debito_inter`).
Três causas somadas:
1. `dedupeReceitasInState` só casava **mesmo nome + mesmo valor** (ou seed × `rN`), e aqui os
   nomes eram diferentes — o par passava ileso;
2. exclusão **não deixava lápide**: o `fetchFromCloud` re-adicionava da nuvem o item que o
   usuário tinha acabado de apagar;
3. `ensureMonthReceitas` re-semeava do `month.totais` sempre que a lista de receitas ficava vazia
   — apagar a última receita do mês recriava tudo.

### 🛠️ Correção
- `removeTransactionByIndex` grava `state.deletedItens[id] = Date.now()`; o compact leva as
  lápides para a nuvem e o merge do `fetchFromCloud` **filtra** qualquer item com lápide
  (fixos, outros, receitas e diários).
- `dedupeReceitasInState`: terceira regra — `Estúdio` × `Renda Extra` com o mesmo valor no mesmo
  mês é a mesma renda; fica a cópia com conta definida e as demais viram lápide.
- `ensureMonthReceitas`: `receitasSeedDone` por mês; semeia uma vez e nunca mais recria do `totais`.
- Limpeza da duplicata também roda no boot (`app.js`, junto do upgrade de fatura legada).
- Versão **v143**.

### 🧪 Validação
- Suíte **33/33** (novo `test/receitas-exclusao.test.js`), `check-syntax` 13/13.
- Casos cobertos: par Estúdio × Renda Extra cai (1 removida), exclusão deixa lápide e não
  renasce, lápides viajam no backup compacto.

### 🧠 Regra
- Toda exclusão do usuário precisa de **lápide** e o merge da nuvem precisa respeitá-la; sem isso
  a "fonte da verdade" desfaz a ação do usuário a cada abertura.
- Dedupe de receita não pode depender do nome exato: o app usa vários rótulos para a mesma renda.

## [2026-11-12 10:20] - Matrix Finance v142: VA/VR nunca mais "saldo cheio sem gasto" e faturas com simulações

### 🐞 Problema
1. **VA/VR errados**: o chip mostrava 2.059,84 / 1.105,16 (saldo = total, gasto 0) enquanto o app
   Casa Maracaju mostrava **1.569,28 / 343,26**. O `processMaracajuData({})` rodava com resposta
   vazia (token ausente) e fabricava "ciclo limpo"; esse zero era salvo e sincronizado, então a
   nuvem passou a repetir o valor falso em todos os aparelhos.
2. **Faturas de Dez/2026 em diante erradas**: o app Faturas inclui as **simulações**
   (ar-condicionado, máquina de lavar, Nutri…) no total do mês, o Matrix não. Dez/2026 aparecia
   como 1.568,05 em vez de 2.046,92; Jan/2027 como 600,99 em vez de 1.409,86.

### 🛠️ Correção
- `maracajuPayloadTemDados`: só processa VA/VR quando o payload tem compras, `benefitsSummary`/
  `matrixBenefits` ou totais de benefício. Resposta vazia mantém o último retrato bom.
- `maracajuSnapshotSuspeito`: retrato com `saldo == total`, gasto 0 e sem compras ganha
  `invalido: true` — o chip mostra `—` com tooltip "configure o token", em vez de um número falso.
- `getSatelliteConfig().includeSimulated` passa a ser **true** por padrão (o app Faturas não tem
  toggle e sempre soma as simulações); `matrix_include_simulated_invoices = 'false'` desliga.
- Versão **v142**.

### 🧪 Validação
- Suíte **30/30** (novo `test/maracaju-beneficios.test.js`) e `check-syntax` 13/13.
- Teste real com o payload do Casa Maracaju: `processMaracajuData` devolve
  `saldoVa 1569.28 / saldoVr 343.26 / gastoVa 490.56 / gastoVr 761.90` — idêntico ao app.
- Com o token configurado no perfil de teste, o chip passou a exibir `VA R$ 1.569,28` / `VR R$ 343,26`.

### 🧠 Regra
- Satélite sem dados **não** é satélite com zero. Payload vazio nunca pode virar retrato.
- "Saldo cheio + gasto zero + sem compras" é assinatura de bug, não de ciclo novo.
- A régua das faturas é o app Faturas: simulações contam no total do mês.

## [2026-11-12 09:52] - Matrix Finance v141: backup da nuvem corrompido (sobra de bloco) parava a restauração

### 🐞 Problema
Depois da v140 as faturas ficaram certas no aparelho (Dez/2026 = 1.568,05; Jan/2027 = 600,99),
mas **VA/VR apareceram como `—`** e o `get_state` da planilha respondeu
`SyntaxError: Unexpected non-whitespace character after JSON at position 39205`.

Causa: o `_Backup_JSON` guarda o estado fatiado em `Timestamp + Payload_JSON + Parte 2..4`
(45.000 chars cada). Quando o número de partes **encolhe**, uma sobra antiga podia ficar numa
coluna que o `clearContent` não alcançou; a leitura concatena todas as células não vazias e o
`JSON.parse` explodia. Como o `fetchFromCloud` cai no ramo `success: false`, o app **nunca
restaurava da nuvem** — cada dispositivo rodava só com o localStorage. Daí o `—` no VA/VR
(o `satellites.maracaju` local estava apenas com o estado-semente `semente: true`, que a v120
manda esconder) e a sensação de que "sincronizar não faz nada".

### 🛠️ Correção
- `apps_script.gs` — `doPost`: `rowPayload` normalizado para **5 células** (padding com `""`) e
  limpeza de `max(5, rowPayload.length, lastColumn)` antes de gravar. Acabou a coluna órfã.
- `apps_script.gs` — `doGet`: leitura tolerante; se o `JSON.parse` do concatenado falhar, fica com
  o **maior prefixo que fecha um JSON válido** e devolve `reparado: true` (recupera o backup em
  vez de derrubar a nuvem inteira).
- `js/sync-engine.js`: ao receber `reparado: true`, restaura e chama `queueSync()` para regravar o
  `_Backup_JSON` limpo.
- Versão **v141** (`CACHE_NAME` + `?v=`), porque `sync-engine.js` mudou.

### 🧪 Validação
- `check-syntax` 13/13 (inclui `apps_script.gs`) e suíte **26/26**.
- Sondagem real no perfil do Chrome do usuário (via CDP): o app carrega v141, o scrape de faturas
  grava `fonte: 'satelite'` com Jan/2027 = 600,99, e o `get_state` respondia o erro de parse —
  confirmando a corrupção da planilha como causa do "—".

### 🧠 Regra
- Backup fatiado tem que ter **largura fixa**; qualquer gravação que possa encolher precisa limpar
  todas as colunas do cabeçalho. E leitura de backup nunca deve ser all-or-nothing: se o fim está
  corrompido, o começo ainda é o dado do usuário.
- Se a nuvem falha, o app tem que **dizer** (status de erro), não continuar em silêncio com o seed.

## [2026-11-12 09:20] - Matrix Finance v140: faturas de Dez/2026 em diante param de congelar na sincronização

### 🐞 Problema
As faturas de **Dez/2026 em diante** apareciam desatualizadas e **não mudavam ao sincronizar**.
Causa em três camadas, todas no caminho da nuvem:
1. `compactStateForCloud` **não** levava `satellites.faturas` para o Google Sheets (só maracaju e fisioflow);
2. `expandStateFromCloud` então **recriava** as faturas com `processFaturasData({})` — o baseline
   embutido no código — e o carimbava com `atualizadoEm = agora`, parecendo recém-coletado;
3. esse baseline sobrescrevia o retrato real que o scraping havia gravado, e ainda vinha com
   `statusResults.faturas = { success: true }`.

Efeito prático: a exclusão da `Studio Rocha 1/6 (nova)` (Jan/2027) feita no app Faturas nunca
chegava — cada sincronização devolvia **+R$ 350/mês de Jan a Jun/2027** (Jan/2027: 950,99 em vez
de 600,99). Dez/2026 coincidia por acaso; de Jan/2027 para frente divergia sempre.
Além disso, quando a coleta falhava (CORS/JSONP), o app *chamava* `processFaturasData({})`, dizia
`success: true` e exibia o baseline como se fosse dado atual.

### 🛠️ Correção
- `processFaturasData(raw, sim, fromBaseline)`: novo carimbo `fonte: 'satelite' | 'baseline'` e
  `atualizadoEm = null` no baseline (baseline não finge ser coleta).
- `SatelliteConnectors.faturasSnapshotTs` / `mergeFaturasSnapshots`: baseline vale **0**; entre
  nuvem e local vence o retrato mais recente (empate → local, que traz os `itens` do drilldown;
  meses herdados da nuvem reaproveitam os itens locais quando o total é o mesmo).
- `runScrapeAll`: falha de coleta **mantém o último retrato bom** (`syncError` + `lastAttempt`) e
  devolve `success: false` em vez de gravar baseline.
- `compactStateForCloud` passa a levar as faturas (só `total`/`status` por mês, ~1 KB) e
  `expandStateFromCloud` não fabrica mais faturas.
- `fetchFromCloud` usa o merge novo e o badge de Faturas mostra **DESSINC.** quando a coleta falha
  (antes exibia ATIVO sempre).
- Versão **v140**: `CACHE_NAME` em `sw.js` e todos os `?v=` do `index.html`.

### 🧪 Validação
- `check-syntax` 13/13 e suíte **26/26** (novo `test/faturas-sync.test.js` com 4 casos:
  baseline ≠ fresco, compact/expand sem baseline, precedência do merge, round-trip sem +350).
- Reprodução com o payload real do Apps Script (`action=restore`, revisão 64): antes do fix o
  round-trip devolvia Jan/2027 = 950,99; depois devolve 600,99 (igual ao app Faturas) e
  Dez/2026, Jan, Fev e Jun/2027 sobrevivem intactos.

### 🧠 Regra
- Baseline embutido **nunca** ganha de um retrato real, e retrato sem `fonte`/`atualizadoEm` não
  pode se impor a um datado. Sincronizar não pode *inventar* satélite: se a coleta falhou, o app
  mantém o último retrato bom e avisa.
- Toda informação que atravessa a nuvem precisa estar no `compactStateForCloud`; se ficar de
  fora, o `expandStateFromCloud` a recria do zero — e o "zero" aqui era um baseline de ontem.

## [2026-11-11 21:56] - Matrix Finance v139: Provisão de Caronas Editável (Ajuste Manual Persistente)

### 🐞 Problema
Ao editar o valor de **Caronas** em Outubro no Fluxo de Caixa, o app parecia não deixar:
1. a célula de valor não tinha `onclick` (só a descrição e o ✏️ abriam o modal);
2. mesmo salvando, `syncCaronasWithCalendar()` rodava no `init` e sobrescrevia o valor com
   `commute.totalCaronas`, desfazendo o ajuste no próximo carregamento.

### 🛠️ Correção
- `saveItemFromModal`: item fixo que é carona recebe `valorManual: true`; ao renomear para algo
  que não é carona, o flag é limpo.
- `syncCaronasWithCalendar`: não sobrescreve mais quando `valorManual` está ativo.
- Célula de valor da carona ficou clicável (abre o modal de edição).
- Badge **✏️ Ajuste manual ↻** aparece na linha; ao tocar, `recalcularCarona()` remove o flag e
  volta ao valor calculado pelos dias do calendário.

### 🧪 Validação (Chromium, estado real)
- Outubro/2026, Caronas R$ 1.080: editar para R$ 1.111 → salva, badge manual, **permanece 1.111
  após reload**; ao tocar ↻ volta para **1.080**.
- `check-syntax` 13/13 e suíte **22/22**.

### 🧠 Regra
- Valor de carona só é automático enquanto `valorManual` não existir. Toda edição manual cria o
  flag; o calendário só volta a mandar depois do ↻ (ou de renomear o item).

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

---

## [2026-11-10 17:05] - Matrix Finance v119: Ícones Enxutos (de ~3,7 MB para 595 KB)

### 🔍 Motivação
O pacote de ícones havia crescido para **~3,7 MB** (fora o `oracle-cookie.jpg`, +772 KB): a arte é
fotográfica, mas estava salva em PNG RGBA (1.584 KB no 1024, 483 KB no 512, 443 KB no maskable) e o
`matrix-icon.svg` era um invólucro com **2,1 MB** de PNG em base64 — usado como favicon e precacheado.

### 🛠️ O que foi feito
- Ícones fotográficos convertidos para **JPEG** (achatados sobre `#050807`, sem perda visível):
  - `matrix-icon-512.jpg` — 89 KB (era 483 KB);
  - `matrix-icon-1024.jpg` — 226 KB (era 1.584 KB);
  - `matrix-icon-maskable-512.jpg` — 88 KB (era 443 KB);
  - `matrix-icon-192.png` mantido em PNG (81 KB, é o `apple-touch-icon`).
- `matrix-icon.svg` reescrito: invólucro SVG com **JPEG 512 embutido — 112 KB** (era 2.112 KB).
- **Removidos** (órfãos): `oracle-cookie.jpg` (772 KB, só estava no precache),
  `matrix-icon.jpg` (295 KB, sem referência na UI), `matrix-icon.png` e `matrix-icon-512.png`.
  O logo do cabeçalho continua em `matrix-icon-192.png`.
- `manifest.json` e `ASSETS_TO_CACHE` atualizados para os novos nomes/tipos; versões para **v119**.

### 🧪 Validação
- `icons/` total: **595 KB** (antes ~3,7 MB) — economia de ~84%.
- `check-syntax` 11/11; suíte **16/16** (incluindo manifest + assets do SW existindo no disco).
- Páginas no ar conferidas: todos os ícones retornam 200 com os novos tamanhos.

---

## [2026-11-10 17:25] - Matrix Finance v120: Fim do "Flash" de Valores de Exemplo no Carregamento

### 🐞 Bug
Ao abrir o app, o chip **Casa Maracaju** exibia `VA R$ 1.988,78 / VR R$ 805,41` (valores de exemplo) por um
instante antes de o puxão dos apps satélites fixar os números reais. Duas fontes:

1. os valores estavam **fixos no HTML** (`#topSatVaVal` / `#topSatVrVal`) e apareciam antes mesmo do JS rodar;
2. quando o estado não tinha `satellites.maracaju`, `db.js`/`app.js` injetavam um objeto-semente com esses
   números e o render tratava como valor real até a primeira sincronização.

### 🛠️ Correção
- HTML: os chips agora nascem com **`VA —` / `VR —`** (nada de número fictício antes do render).
- Os dois seeds de `satellites.maracaju` passaram a carregar **`semente: true`**.
- No render do painel: enquanto `semente && !manualOverride`, o chip mostra **`—`** com opacidade 0.75 e
  `title` "Sincronizando saldos com o app Casa Maracaju…". O número só aparece quando vem de
  `syncMaracajuFromLocal`/`scrapeAll` (ou de um ajuste manual do usuário).
- No drilldown do Casa Maracaju (`abrirDrilldown('maracaju')`): aviso âmbar "⏳ Aguardando o primeiro puxão
  do app Casa Maracaju…" e saldos/inputs com **`—`** enquanto pendente.
- Estado real salvo em `localStorage` (sem `semente`) continua renderizando imediatamente, sem flash.

### 🧪 Validação (Chromium headless, amostragem a cada 150 ms desde o primeiro paint)
- Perfil limpo: chip = `VA — | VR —` em **todas** as amostras (nenhum `1.988,78`), drilldown com aviso.
- Estado real injetado (1.614,98 / 343,26) + reload: chip renderiza `VA R$ 1.614,98` direto.
- `check-syntax` 11/11, suíte **16/16**, `sw.js` e `?v=` em **v120**.






---

## [2026-11-10 21:30] - Matrix Finance v122: FisioFlow Atualizado, Fim das Piscadas, Rendas sem Duplicata e Calendário Alinhado no Celular

### 🔍 Problemas Identificados & Causa Raiz
1. **Valores do FisioFlow não atualizavam**: o Apps Script do app de fisioterapia não responde JSONP e o navegador bloqueia a leitura por CORS (`Failed to fetch`). Além disso, `compactStateForCloud` descartava `satellites.fisioflow` e o `fetchFromCloud` apagava o satélite local a cada abertura; os valores de outubro/novembro/dezembro ainda estavam fixos em `3.700/1.140/995` em `app.js` e `db.js`.
2. **Piscadas no boot**: init, evento de `focus` e botão podiam disparar `scrapeAll` em paralelo; cada coleta salvava e re-renderizava a tela, e `smoothSetText` animava cada troca de valor. O histórico de backups mostrava coletas a cada 13–40 s.
3. **Rendas duplicadas**: `compactStateForCloud` reescrevia ids longos de receita para `r0`, `r1`...; o merge da nuvem casava só por `id` e re-inseria a versão local (`rec_sal_...`) como item novo. O snapshot da planilha já tinha os pares `rec_*` + `r*` em Dez/2026 e em todo 2027 (36 duplicatas no estado real).
4. **Calendário torto no celular**: as grids usavam `repeat(7, 1fr)`, cujo mínimo é o `min-content`; os textos `nowrap` das células alargavam as colunas dos dias (61,6 px) enquanto o cabeçalho ficava em 48,3 px. O grid dos dias também estourava a largura do wrapper.
5. **Backups**: o histórico `matrix_backup_history_v1` guardava apenas id/hora/motivo, sem o estado, então não permitia recuperar uma renda apagada.

### 🛠️ Correções Implementadas
- **FisioFlow**: `doGet` do `matheus-app-fisioterapia/Code.gs` passou a aceitar `?callback=` e devolver JSONP; `satellite-connectors.js` preserva o último retrato bom e registra `syncError`/`lastAttempt`; `app.js` calcula o caixa M+1 direto de `satellites.fisioflow.ganhosPorMes`, sem literais; `db.js` não calibra mais 3.810/3.700/1.140/995; `sync-engine.js` compacta e restaura `satellites.fisioflow`.
- **Piscadas**: `scrapeAll` tem trava de concorrência (`scrapeInFlight`), o foco só coleta a cada 2 min e com a aba visível, renders assíncronos passam por `scheduleRenderAll` (rAF) e o fade de valores fica desligado nos primeiros 5 s.
- **Duplicatas**: ids de receita nunca são reescritos; merge da nuvem reconhece a mesma renda por nome+valor ou seed×cópia curta e substitui a cópia pela seed; `MatrixDB.dedupeReceitasInState` limpa o estado local e o payload restaurado, disparando sync da versão limpa.
- **Calendário**: grids com `repeat(7, minmax(0, 1fr))` e `min-width: 0` nas células; rótulos móveis encurtados (`Fim`, `Abon.`, `Fer.`, `Rec.`).
- **Backups**: os 6 snapshots mais recentes passam a guardar o estado completo; `getLastAutoBackup`, `getBackupSnapshots` e `restoreBackupSnapshot` foram exportados.
- **Versões**: `sw.js` e todos os `?v=` do `index.html` em **v122** (o v121 virou v122 quando as correções do ciclo do Casa Maracaju entraram na mesma árvore).

### 🧪 Validação
- `node scripts/check-syntax.js`: 11/11 arquivos OK.
- `node --test "test/*.test.js"`: **22/22** (16 antigos + 3 regressões de dados: dedupe de receitas, parser FisioFlow e compactação com fisioflow + 3 do ciclo do Casa Maracaju).
- Chromium local com o estado real: FisioFlow passou a mostrar **14 sessões / R$ 1.245,00 realizado / R$ 3.465,00 previsto**; Dezembro M+1 = **R$ 1.245,00**; apenas **1** coleta no boot e nenhuma nova ao simular dois eventos de foco.
- Calendário: cabeçalho e dias com exatamente a mesma posição/largura em **390 px (48,3 px), 360 px (44 px) e 1440 px (185,4 px)**, sem overflow horizontal.
- Cloud restore simulado: preservou `satellites.fisioflow`, removeu as 36 duplicatas e enviou o estado limpo para a planilha.

### 🧠 Regras & Decisões Aprendidas (Para Próximos Chats)
- **FisioFlow é JSONP**: o `doGet` do app de fisioterapia precisa manter o bloco `callback`; sem ele o Matrix não lê os dados por CORS.
- **Nunca fixar ganhos da Scarlet por mês**: o caixa M+1 é sempre `ganhosPorMes[prevYm].total` (ou `realizado + aReceber`).
- **Nunca reescrever id de receita** na compactação da nuvem; ids são a chave do merge.
- **Uma coleta por boot**: não adicionar `scrapeAll` em `focus`/`visibilitychange` sem o throttle e a trava de concorrência.
- **Calendário**: qualquer grid de 7 colunas com texto precisa de `minmax(0, 1fr)` + `min-width: 0`.
- **Casa Maracaju (v122)**: o ciclo e os saldos publicados em `settings.matrixBenefits`/`benefitsSummary` prevalecem sobre o recálculo local; compras com `deletedIds` não voltam no merge. Coberto por `test/maracaju-benefits.test.js`.
- **Ação externa obrigatória**: publicar uma nova versão do Apps Script de `matheus-app-fisioterapia` (Implantar → Gerenciar implantações → Editar → Nova versão) para o JSONP valer no endpoint em produção.

---

## [2026-11-11 13:05] - Matrix Finance v127: Backup Pré-configurado, Satélite "Fresco" e Rolagem Livre no Celular

### 🛠️ 1) Endpoint de backup já configurado de fábrica
- `js/sync-engine.js` ganhou `DEFAULT_CLOUD_URL` com o Apps Script de backup do Matrix
  (`AKfycbyTXjWm4651tmwl4AujcG299cHBYGmECtLKoTruRaI7y9kzNOKr58QeKp0O46Erxb7DFQ`).
- `getConfig().cloudUrl` = `localStorage` → fallback para esse default, então o `init()` já dispara
  `fetchFromCloud()` ao abrir (antes, sem URL, o app abria em modo offline e usava apenas o cache local).
- O token continua vindo de `localStorage` (default `MatrixReloaded2026!`); a URL sozinha não grava nada.

### 🛠️ 2) VA/VR não mostram mais valor velho até a nuvem responder
- Novo `maracajuFreshNestaSessao`: só vira `true` quando o **Casa Maracaju responde** de fato
  (`results.maracaju.success`) ou quando o `fetchFromCloud` traz dados.
- `renderAll`/`renderTopPanel`: estado com `atualizadoEm` de **mais de 6 h** e sem resposta na sessão
  entra em modo pendente (`VA — / VR —`, mesmo padrão da v120) — inclusive no drilldown do Casa Maracaju.
- **Fallback de 8 s**: se nada respondeu (offline / sem token), aceita o último dado salvo e re-renderiza
  via `scheduleRenderAll` (respeitando a regra de boot sem piscar da v121).
- Causa do relato "puxou o valor errado até eu logar o script": sem URL/token o app não sincronizava e
  exibia o último estado salvo, possivelmente de outro ciclo.

### 🛠️ 3) Rolagem travada na parte inferior no celular
- Causa: `@media (max-width: 600px) .tab-content { touch-action: pan-x !important; }` — `pan-x` desabilita
  o pan vertical, então arrastar o dedo **dentro do conteúdo** não rolava a página.
- Correção: `touch-action: pan-y pinch-zoom !important`. O swipe entre abas continua via JS
  (`initSwipeNavigation`). `pan-x` segue apenas nas faixas horizontais (chips e legenda).

### 🧪 Validação (Chromium headless, 390×844)
- App sem nenhuma configuração sincronizou sozinho no boot e exibiu **VA R$ 1.614,98 / VR R$ 343,26**
  com badge "🟢 Salvo & Sincronizado" (dados reais vindos do backup), 0 erros de console e 0 requests 404.
- Estado artificial de 48 h + offline: chip `VA —` até o fallback de 8 s e então o valor salvo.
- Rolagem por toque (`Input.dispatchTouchEvent`): 381 px no primeiro arrasto; `touch-action` do
  `.tab-content.active` = `pan-y pinch-zoom`.
- `check-syntax` 11/11, suíte **22/22**, `sw.js` e `?v=` em **v127**.

---

## [2026-11-11 14:20] - Matrix Finance v128: Contador Regressivo do Salário (4º Dia Útil) no Calendário

### ✨ Novo recurso
Card fixo na aba **Calendário**, logo abaixo dos KPIs: mostra o **próximo salário** (4º dia útil bancário
nacional) e quantos **dias faltam** — válido para qualquer mês do seletor.

- Exemplo validado: hoje **11/11/2026** ⇒ cartão exibe `04/12/2026 (sexta)` e **23 dias**
  (exatamente o cálculo pedido: 04/12 − 11/11 = 23).
- O salário exibido é o que **fecha o ciclo do mês selecionado** (`getSalaryPayday(mês+1)`), então:
  - Dezembro/2026 ⇒ `07/01/2027 (quinta)`, 57 dias (01/01 feriado, 02–03 fim de semana, 07 é o 4º dia útil);
  - Outubro/2026 (passado) ⇒ `✔` com "Salário já creditado em 06/11/2026".
- Sempre usa `CalendarEngine.getSalaryPayday` — ou seja, **fins de semana e feriados bancários nacionais**
  (incluindo Carnaval/Sexta Santa/Corpus Christi) não contam. Feriados municipais (ex.: 04/11 São Carlos)
  não atrasam o crédito da folha USP, como já documentado na seção 12 do GEMINI.
- Cores: verde quando faltam mais de 5 dias, **âmbar** nos últimos 5, "HOJE 💰" no dia do crédito
  e `✔` para ciclos já creditados. O subtítulo mostra o ciclo (`06/11 a 03/12`).

### 🎨 Ajustes de layout que vieram junto
- **Hierarquia dos KPIs do calendário no celular**: a regra antiga usava seletores posicionais
  (`.cal-kpis-grid > div > div:last-child`) e aplicava **15px no sub-rótulo** (quase do tamanho do valor),
  esmagando o texto. Agora cada linha tem seu tamanho por classe: label 9,5px · valor 17px · sub 10px.
- O crédito do VR (`crédito R$ 1.105,16`) desce para a própria linha no celular (`.cal-kpi-sub-credit`).

### 🧪 Validação (Chromium headless)
- Desktop 1440 e mobile 390: card visível, sem overflow horizontal.
- Nov/2026 = **23 dias** / Dez/2026 = **57 dias** / Out/2026 = **✔ já creditado**.
- `check-syntax` 11/11, suíte **22/22**, `sw.js` e `?v=` em **v128**.

---

## [2026-11-11 15:10] - Matrix Finance v129: Cotações de Ações em Investimentos (Fechamento + Botão "Agora")

### ✨ O que foi entregue
- **Fechamento do dia anterior automático**: ao abrir a aba Investimentos, o app puxa a cotação de fechamento
  de cada ação da carteira (tickers lidos de `ativo`, ex.: "CSNA3", "MGLU3") e recalcula
  `precoAtual` / `valorAtual`. Cache local de 12 min e auto-sync a cada 10 min.
- **Botão "📈 Cotação atual"** na barra de filtros: puxa o preço **intradiário** (`regularMarketPrice`) e
  atualiza a carteira na hora; o card mostra "fech. 10/11 • atual 14:35".
- Cards do "Monitor B3" agora exibem o rótulo **FECHAMENTO B3** ou **COTAÇÃO ATUAL** conforme o modo, com a
  data do fechamento e a hora da cotação intradiária.
- Solução: `js/market-quotes.js` (novo) + ação **`quotes`** em `apps_script.gs`.

### 🔎 Por que a busca passa pelo Apps Script
- O Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart/...`) **não devolve
  `Access-Control-Allow-Origin`** — o navegador bloqueia. Testado: 200 com `Vary: Origin`, mas sem ACAO.
- A URL `/exec` do Apps Script **devolve `Access-Control-Allow-Origin: *`**, então o `fetch` do app funciona
  direto (JSONP só como fallback). A ação roda no servidor com `UrlFetchApp` e cache de 180 s no `CacheService`.
- `brapi.dev` sem token → 401; `allorigins` (proxy) → 522 no teste. Nenhum provedor público confiável.

### ⚠️ Ação manual obrigatória (uma vez)
- A ação `quotes` só existe no `apps_script.gs` do repositório. **É preciso reimplantar o script** no Google
  Sheets (Extensões → Apps Script → colar o arquivo → Implantar → Gerenciar implantações → Editar →
  Versão: "Nova versão" → Implantar). Sem isso o endpoint responde `{"success":false,"error":"Ação inválida: quotes"}`
  e o app mostra a mensagem de reimplantação.

### 🧪 Validação (Chromium + Apps Script mockado)
- Mock com CSNA3 (fech. 4,38 / atual 4,43) e MGLU3 (fech. 6,52 / atual 7,52):
  - automático: `precoAtual` 4,38 / 6,52 e carteira recalculada (175,20 / 893,24), card com "fech. 10/11";
  - botão: 4,43 / 7,52 (177,20 / 1.030,24), card com "COTAÇÃO ATUAL" + "fech. 10/11 • atual 14:35";
  - status "Cotações de agora atualizadas (2/2)." e 1 chamada por ação de cada vez.
- Sem erros de console; mobile 390 sem overflow.
- `check-syntax` 12/12, suíte **22/22**, `sw.js` e `?v=` em **v129**.

---

## [2026-11-11 15:50] - Matrix Finance v130: Cards de Meta do Renda+ 2055 Passam a ser Calculados

### 🐛 O problema
Os três cards do banner do simulador (`+1 Salário Líquido USP`, `100% Poder de Compra`,
`P.C. + Dobro de Dinheiro`) eram **texto fixo no HTML** (`R$ 6.044/mês`, `~R$ 941/mês`, etc.).
Salvar os parâmetros do simulador não mudava nada neles — só o modal recalculava.

### 🛠️ A correção
- Extraído o núcleo do cálculo para `calcularAporte2055(renda, params)` (mesma matemática do simulador:
  348 meses de acumulação, 240 de usufruto, 15% de IR sobre os ganhos, saldo atual capitalizado).
- `parametrosSimulador2055()` lê `matrix_simulador_2055_params` (o simulador salva a cada recálculo)
  e usa os inputs só como fallback.
- `atualizarCardsMetas2055()` recalcula os 3 aportes e as rendas das metas e escreve nos cards
  (`simMeta1Aporte` … `simMeta3Aporte`), além de um rodapé com os parâmetros usados
  (`Calculado com IPCA + 6,50% a.a. • saldo atual R$ 1.318,89 • PU R$ 466,07`).
- Chamado no `renderInvestments`, no fim de `recalcularSimulador2055` (que roda a cada `oninput`) e em
  `salvarParametrosSimulador2055` — que agora **recalcula antes de salvar**.
- O `title` de cada card mostra patrimônio necessário e títulos/mês.

### 🧪 Validação (Chromium)
- Padrão (IPCA+6,5%, saldo R$ 1.318,89): `~R$ 941` / `~R$ 1.016` / `~R$ 1.795` (relatório: 941,15 / 1.015,78 / 1.794,92).
- Parâmetros salvos a 6,0% / saldo 0: `~R$ 1.076` / `~R$ 1.160` / `~R$ 2.043` (relatório a 6%: 1.068,01 / 1.152,58 / 2.035,50 — mesma faixa).
- Salvar pelo modal a 6,0%: cards passam a `~R$ 1.068` / `~R$ 1.153` / `~R$ 2.036` e o rodapé para `IPCA + 6,00%`.
- `check-syntax` 12/12, suíte **22/22**, `sw.js` e `?v=` em **v130**.

---

## [2026-11-11 16:10] - Matrix Finance v131: Cotações Explicam a Falha (escopo UrlFetchApp)

### 🐛 Sintoma
O botão "Cotação atual" mostrava **"Cotações de agora atualizadas (0/2)."** em verde e nada mudava.
O endpoint respondia `success: true` com `data: [{ ok: false, error: "Exception: Você não tem permissão
para chamar UrlFetchApp.fetch. Permissões necessárias: .../script.external_request" }]`.

### 🔎 Causa
O Apps Script foi reimplantado com a ação `quotes`, mas a **autorização do script** (conta que executa a
implantação) não tinha o escopo `https://www.googleapis.com/auth/script.external_request` — sem ele, o
`UrlFetchApp.fetch` é bloqueado mesmo o código estando correto.

### 🛠️ Correções
- `appsscript.json` criado no repositório com `oauthScopes` explícitos: `spreadsheets` + `script.external_request`.
- `testarCotacoes()` no `apps_script.gs`: rodar uma vez no editor dispara o consentimento e valida a cotação.
- `market-quotes.js`: `mapearErroProvedor()` traduz o erro de permissão (e 429/HTTP) em instrução clara;
  se **nenhuma** ação retornar cotação, `sincronizar` devolve `ok:false` e a linha de status fica em
  vermelho com o texto do problema (antes ficava verde "0/2" sem explicação).

### ✅ Para funcionar (ação do usuário)
1. Apps Script → **Configurações do projeto** → marcar "Mostrar arquivo de manifesto appsscript.json" e
   colar o `appsscript.json` do repo.
2. Rodar a função **`testarCotacoes`** e aceitar a permissão.
3. **Implantar → Gerenciar implantações → Editar → Versão: "Nova versão" → Implantar**.

### 🧪 Validação
- Antes: `ok:false` silencioso com "(0/2)" em verde.
- Depois: status e alerta com "O script do Matrix ainda não está autorizado a acessar serviços externos
  (UrlFetchApp)…" — confirmado em Chromium contra o endpoint real.
- `check-syntax` 12/12, suíte **22/22**, `sw.js` e `?v=` em **v131**.

---

## [2026-11-11 16:45] - Matrix Finance v133: Um Card por Ação (qualquer ticker)

- O "Monitor B3" só desenhava CSNA3 e MGLU3 (dois cards fixos). Agora o `renderStockCards` percorre a
  carteira e cria **um card por ativo que tenha ticker** (via `MarketQuotes.tickerDe`), com paleta de cores
  rotativa; os dois cards antigos continuam como fallback quando a carteira não tem ações.
- Ticker é lido de `item.ticker` ou do padrão `AAAA3/AAAA11` dentro de `ativo`
  ("PETR4 (Petrobras)" → `PETR4`; "HGLG11 (CSHG Logística)" → `HGLG11`).
- A consulta de cotações já mandava todos os tickers da carteira numa única chamada (limite de 12 por
  requisição no `apps_script.gs`), então ativo novo entra no fechamento automático e no botão "Cotação atual"
  sem nenhuma configuração extra.
- Validado em Chromium: carteira com CSNA3/MGLU3/PETR4/HGLG11 ⇒ 4 cards e a chamada
  `action=quotes&symbols=CSNA3,MGLU3,PETR4,HGLG11`.
- `check-syntax` 13/13, suíte **22/22**, `sw.js` e `?v=` em **v133**.

---

## [2026-11-11 17:05] - Matrix Finance v134: Atendimentos (FisioFlow) Voltam a Carregar

### 🐛 Sintoma
"Agora está dando erro em Atendimentos ao puxar os dados" — o alerta de scraping dizia que o app de
Atendimentos não respondeu, e o console mostrava
`Uncaught ReferenceError: _matrix_gas_cb_… is not defined`.

### 🔎 Causa
- O conector pedia **JSONP primeiro com timeout de 8 s**, mas o endpoint do Atendimentos responde em
  **5,4 s a 10,5 s** (74 KB). Estourava o timeout, o `cleanup()` apagava o callback e, quando a resposta
  chegava, o navegador executava `cb(...)` → `ReferenceError`.
- O fallback `fetch` tinha timeout de apenas **2,5 s** e o segundo JSONP, 9 s — também estouravam.
- Os três endpoints (Matrix, Atendimentos, Faturas, Casa Maracaju) devolvem `Access-Control-Allow-Origin: *`,
  então o JSONP nem era necessário.

### 🛠️ Correção
- `fetchGasDataWithJsonpFallback`: **fetch nativo primeiro** com timeout de **20 s**; JSONP vira fallback (20 s).
- `SyncEngine.jsonpRequest`: no timeout o callback é trocado por um **no-op** em vez de apagado — resposta
  atrasada não gera mais `ReferenceError`.
- Validado: coleta automática e o botão "Fazer Scraping dos 3 Apps Agora" concluem com sucesso
  ("Scraping concluído com sucesso"), 16 sessões e R$ 1.435 a receber em nov/2026, 0 erros no console.
- `check-syntax` 13/13, suíte **22/22**, `sw.js` e `?v=` em **v134**.

---

## [2026-11-12 14:05] - Matrix Finance v152: Ação no Cadastro + Preço por Ação e Lucro no Card

### ✨ Novidades
- **Modal de investimento** ganhou o checkbox **"É ação da bolsa (B3)"** com campo de **ticker**.
  - Ao marcar, a categoria vira "Ações" e o ticker é **detectado pelo nome** ("PETR4 (Petrobras)" → `PETR4`).
  - Salva `isAcao: true` + `ticker`; sem ticker o app não deixa salvar (mostra aviso).
  - Ação sem posição informada começa com `quantidade × preço médio`, vencimento "Indeterminado / B3" e
    rentabilidade "Renda Variável B3".
- **Card do ativo** (aba Investimentos) agora mostra, para ações:
  - valor total (como antes),
  - **preço por ação** (`R$ 4,52/ação`),
  - **lucro/prejuízo** vs. preço médio pago (`+R$ 252,08 (+31,6%)`, verde/vermelho),
  - a origem/data da cotação (`fech. 11/11` ou `atual`).
- O ticker salvo entra automaticamente na lista de cotações (fechamento diário + botão "Cotação atual").

### 🧪 Validação (Chromium)
- Modal: checkbox oculto → `display:grid` ao marcar; ticker auto `PETR4`; categoria auto `Ações`.
- Salvo: `{ ativo: 'PETR4 (Petrobras)', ticker: 'PETR4', isAcao: true, qtd: 100, pm: 38.2 }`.
- Cards: `PETR4 R$ 4.125,00 · R$ 41,25/ação · +R$ 305,00 (+8,0%)`;
  `MGLU3 R$ 1.049,42 · R$ 7,66/ação · +R$ 252,08 (+31,6%)`;
  `CSNA3 R$ 180,80 · R$ 4,52/ação · -R$ 19,20 (-9,6%)`.
- `check-syntax` 13/13, suíte **35/35**, `sw.js` e `?v=` em **v152**.

---

## [2026-11-12 14:40] - Matrix Finance v153: Cotação AO VIVO no Botão (Yahoo via r.jina.ai)

### 🐛 Sintoma
Ao pedir "Cotação atual" às 14:30, o app devolvia a cotação de 13:30 ("Cotações via GitHub (há 59 min)").
O cron do GitHub Actions não roda a cada 5 min de verdade — o agendador atrasa e, no teste, só havia
1 execução registrada no repositório.

### 🛠️ Solução
- Nova função `MarketQuotes.buscarQuotesAoVivo(tickers)`: chama o endpoint **`spark`** do Yahoo
  (`v7/finance/spark?symbols=CSNA3.SA,MGLU3.SA&range=1d&interval=1m`) **através do `r.jina.ai`**,
  que libera CORS e devolve o JSON em `data.content`. Uma chamada resolve todos os tickers.
- Ordem de busca no `sincronizar`: **1) ao vivo** → 2) `data/quotes.json` do GitHub → 3) Apps Script.
  Cache em memória de 60 s para não repetir a consulta em cliques seguidos.
- Status passa a mostrar `Cotações ao vivo • 14:32 — 2/2.`

### 🧪 Validação (Chromium, 12/11 14:32)
- `buscarQuotesAoVivo(['CSNA3','MGLU3'])` → CSNA3 `atual 4,34` (fech. 4,52 de 11/11) e MGLU3 `7,27`
  (fech. 7,66), `fonte: 'Yahoo Finance (ao vivo)'`.
- `sincronizar('atual')` → `fonte: 'ao-vivo'`, 20 ms (cache), status "Cotações ao vivo • 14:32 — 2/2."
- `check-syntax` 13/13, suíte **35/35**, `sw.js` e `?v=` em **v153**.

---

## [2026-11-13 15:10] - Matrix Finance v155: Barra de Abas no Topo e Ordem Personalizável

### ✨ O que mudou
- A barra de navegação saiu de baixo do painel executivo e foi para **logo abaixo do header**,
  com `position: sticky` (fica visível ao rolar).
- Nova ordem padrão, conforme pedido: **Fluxo de Caixa → Investimentos → Calendário → Financiamento →
  Holerites → E se? → Backup**. Rótulos encurtados para caber mais abas.
- Botão **⚙️** no fim da barra (sticky à direita, sempre acessível) abre o modal **"Organizar abas"**:
  cada aba com ▲/▼ e um "Restaurar padrão". A ordem vale para a barra **e** para o deslize entre abas
  (as bolinhas acompanham) e fica salva em `matrix_tabs_order_v1`.
- No celular a barra ficou compacta (43 px de altura) e continua rolando na horizontal.

### 🧪 Validação (Chromium 1440 e 390)
- Barra em `top: 93` com o painel executivo em `157` (acima dele); `position: sticky`; sem overflow horizontal.
- Ordem padrão conferida no DOM; mover "Holerites" para o topo pelo modal atualiza barra + bolinhas,
  persiste no `localStorage` e sobrevive ao reload; "Restaurar padrão" volta à ordem original.
- `check-syntax` 13/13, suíte **35/35**, `sw.js` e `?v=` em **v155**.
