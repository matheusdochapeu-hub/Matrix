# MEMORY.md — Memória Persistente do Projeto Matrix Finance 360

Este documento armazena o histórico de auditorias (`/autofix` / `/revisar`), regras de negócio consolidadas, decisões arquiteturais e correções de bugs do **Matrix Finance 360** (Orçamento Familiar Matheus & Scarlet).

---

## [2026-11-07 14:52] - Sincronização do Saldo Atual de VA & VR (Casa Maracaju 88), Regra Estrita M+1 do FisioFlow & Auditoria `/autofix` (v75)

### Resumo Geral
Corrigida a exibição e sincronização do **Saldo Atual de VA e VR** no chip superior `🏠 CASA MARACAJU VA & VR` e no modal de detalhamento, eliminando o bloqueio que mantinha o VR fixo em `R$ 1.105,16` após gastos realizados ontem (`06/11`) e hoje (`07/11`) no app Casa Maracaju 88. Também foi realizada uma varredura completa (`/autofix`) em todos os módulos JS do Matrix Finance e do conector Google Sheets do Maracaju 88.

### Regras de Negócio Consolidadas (Invioláveis)
1. **Saldo Atual de VA & VR no Topo (`#topSatVaVal`, `#topSatVrVal`, `#topSatCasaVal`):**
   - O chip superior `🏠 CASA MARACAJU VA & VR` exibe **sempre o saldo atual restante** (`saldoVaRestante` e `saldoVrRestante`), já descontando todas as compras e refeições do ciclo vigente (a partir do 4º dia útil, `06/11/2026`), sincronizado via ponte `localStorage` same-origin (`MARACAJU_STATE_v1`), nuvem (`maracajuUrl`) e lançamentos diários em Cartão VA/VR.
   - Os cards de **Ganhos** (`Card 1` e `Linha do Tempo`) exibem o **crédito total do ciclo** (`vaTotal = R$ 2.059,84` e `vrTotal = R$ 1.105,16`), separando claramente *Crédito Recebido no Mês* de *Saldo Restante Atual no Cartão*.
2. **Regra M+1 Estrita para Ganhos da Scarlet (FisioFlow):**
   - Os atendimentos realizados pela Scarlet no mês `M` entram como receita disponível no orçamento familiar no mês `M+1`:
     - **Setembro/2026 (`09/2026`):** `R$ 3.700,00` → Caixa de **Outubro/2026**.
     - **Outubro/2026 (`10/2026`):** `R$ 1.140,00` → Caixa de **Novembro/2026**.
     - **Novembro/2026 (`11/2026`):** `R$ 995,00` realizados (`R$ 4.295,00` possíveis, que **não** entram como realizados) → Caixa de **Dezembro/2026**.
     - **Janeiro/2027 em diante:** `R$ 0,00` (proibido inventar ou projetar valores sem lançamentos reais no FisioFlow).
3. **Transferências Internas do Casal (Repasse Matheus → Scarlet de R$ 1.600,00):**
   - Deduzem da sobra individual do Matheus e somam nos recursos disponíveis da Scarlet para pagar a fatura Nubank, mas **jamais** são somadas nos Ganhos Conjuntos do Casal para não inflar o saldo final.
4. **Remoção Definitiva de "Orçamento Geral":**
   - Todas as despesas e cenários saem exclusivamente dos ganhos do Matheus (`salario_usp`), dos ganhos da Scarlet (`ganhos_scarlet`), dos cartões de benefício (`va_mercado`, `vr_almoco`) ou de `investimentos`.

### Problemas Encontrados e Resolvidos (`/autofix`)
- **`Matrix/js/app.js` (`renderKPIs`, `salvarSaldosModal`, `abrirDrilldown`):**
  - **Problema 1:** `salvarSaldosModal` gravava `monthData.vaManual = 2059.84` e `monthData.vrManual = 1105.16` e sobrescrevia `state.satellites.maracaju.saldoVrRestante = 1105.16`. Em seguida, `renderKPIs` priorizava `monthData.vrManual` sobre `satMaracaju.saldoVrRestante`, travando o chip `CASA MARACAJU VA & VR` em `R$ 1.105,16`.
  - **Solução:** `vaAtual` e `vrAtual` no chip `CASA MARACAJU VA & VR` agora leem estritamente `satMaracaju.saldoVaRestante` e `satMaracaju.saldoVrRestante`. Adicionados listeners `focus` e `storage` para atualização em tempo real ao alternar entre o app Maracaju 88 e o Matrix, além de painel de ajuste rápido e tabela de compras do ciclo vigente (`comprasCicloAtual`) no modal da Casa Maracaju 88.
- **`Matrix/js/satellite-connectors.js` (`getLocalMaracajuRawState`, `syncMaracajuFromLocal`, `processMaracajuData`, `scrapeAll`):**
  - **Problema 2:** O Matrix não lia a chave `MARACAJU_STATE_v1` do `localStorage` compartilhado no mesmo domínio (`matheusdochapeu-hub.github.io`) e tratava respostas de erro da nuvem (`{ status: "error" }`) como um estado vazio de `0` compras, resetando o saldo para `R$ 1.105,16`. Além disso, `processMaracajuData` somava itens da lista de compras (`payload.compras`) junto com `comprasRegistros`.
  - **Solução:** Criada ponte síncrona `syncMaracajuFromLocal()` com mesclagem inteligente `mergeMaracajuPayloads()`, leitura de `settings.benefits` (`monthlyEndingBalances`), filtro estrito de `comprasRegistros` + diários VA/VR e auto-reparo automático (`auto-heal`) da célula `Backup_JSON!B2` da planilha do Maracaju 88.
- **`Matrix/js/sync-engine.js` (`compactStateForCloud`, `fetchFromCloud`):**
  - **Problema 3:** `compactStateForCloud` descartava `satellites.maracaju` e `fetchFromCloud` sobrescrevia o estado local na inicialização sem preservar `satellites.maracaju`.
  - **Solução:** `compactStateForCloud` agora preserva o resumo leve de `satellites.maracaju` e `fetchFromCloud` preserva os gastos locais mais recentes e executa `syncMaracajuFromLocal()`.
- **`Matrix/js/app.js` & `Matrix/js/scenario-simulator.js` (Duplicidade de Gastos no Crédito e Isolamento de VA/VR):**
  - **Problema 4:** `saveQuickExpense` lançava gastos de cartão de crédito tanto em `outros` quanto em `diarios` do mês seguinte sem flag de exclusão, duplicando o valor no cálculo de gastos. Além disso, gastos diários com `conta: 'cartao_va'` ou `'cartao_vr'` reduziam a conta corrente do Matheus em `calcSobraMatheus`.
  - **Solução:** Adicionada a flag `jaAlocadoVariavel: true` nos registros espelho de `diarios` e filtrados `cartao_va`, `va`, `cartao_vr` e `vr` das despesas em conta corrente (abatendo exclusivamente do saldo dos cartões VA/VR). Removida chave duplicada `onModalCategoriaChange` na exportação de `MatrixApp`.
- **`maracaju88/js/sheets.js` & `maracaju88/apps_script.gs` (Limite de 50.000 Caracteres do Google Sheets):**
  - **Problema 5:** A inclusão de fotos base64 (`data:image/...`) na aba Pets fez o JSON de backup do Maracaju 88 ultrapassar 50.000 caracteres na célula `Backup_JSON!B2`, gerando erro no Apps Script e deixando a célula vazia (`SyntaxError: Unexpected end of JSON input`).
  - **Solução:** `backupToSheets` em `maracaju88/js/sheets.js` agora remove strings `data:image/` do payload da nuvem (mantendo-as no `localStorage`), inclui `settings.benefits` no backup e `apps_script.gs` suporta particionamento em múltiplas colunas (`readChunkedJsonRow`).

### Validação e Testes
- Sintaxe validada em todos os 10 módulos JS do `Matrix` (`node -c` / `new Function`).
- Suíte de verificação `verify_v75.js` executada com sucesso validando o abatimento exato de compras de VR de ontem (`06/11`) e hoje (`07/11`) sobre os `R$ 1.105,16`.
- Suíte de testes automatizados do `maracaju88` executada: **73/73 testes aprovados (100%)**.

---

## [2026-11-07 20:40] - Sincronização Dinâmica em Tempo Real de VA/VR (Maracaju 88 v2.5.0 & Matrix v81)

### Resumo das Melhorias
1. **Maracaju 88 (`v2.5.0`):**
   - **Remoção de Fotos Base64 no Backup Cloud (`maracaju88/js/sheets.js`):** Higienização de fotos em todas as coleções (`pets.fotos`, `pets.exames[].fotos`, `comprasRegistros[].photos`, `compras[].photos`, `sonhos[].photos`, `carro[].photos`), garantindo que o payload de backup seja sempre `< 44.000` caracteres, prevenindo falhas silenciosas no limite de 50.000 caracteres de célula do Google Sheets.
   - **Geração e Envio de `settings.benefitsSummary`:** Salva o balanço calculado (`vaBalance`, `vrBalance`, `vaSpent`, `vrSpent`) tanto no `localStorage` quanto no backup do Google Sheets.
   - **Push Pós-Merge no `syncPullFromSheets` (`maracaju88/js/app.js`):** Sobe automaticamente as compras feitas no celular para a planilha ao abrir o app caso a nuvem ainda não as possua.

2. **Matrix Finance 360 (`v81`):**
   - **Chip Superior de Satélite (`#topSatVaVal`, `#topSatVrVal`, `#topSatCasaVal`):** Exibe com fidelidade absoluta o saldo atual restante de VA e VR.
   - **Interoperabilidade com `marketName` (`satellite-connectors.js`):** Reconhece compras do Maracaju 88 pelo campo oficial `marketName` e integra diretamente o `benefitsSummary`.
   - **Fim dos Resets Destrutivos (`init()`):** Eliminada a redefinição arbitrária que zerava gastos de VA/VR para 2059.84 / 1105.16 no boot do Matrix.
   - **Sincronização Bidirecional ao Editar Saldos / Receitas:** Ao alterar os valores de VA ou VR no modal de Saldos ou na tabela de Receitas, o saldo restante do satélite Maracaju é atualizado na hora e o badge reflete a alteração.
   - **Auto-scraping ao Alternar Abas (`focus`):** Ao gastar no Maracaju 88 e voltar para a aba do Matrix, o Matrix atualiza automaticamente via Google Sheets em segundo plano.
   - **Correção Visual de Espaçamento dos Símbolos:** Ajustado o espaçamento entre operadores `+`, `-`, `=` nos mini-cálculos para evitar sobreposição visual.

---

## [2026-11-07 21:50] - Vínculo Estrito de Status [PAGO] x [PENDENTE], Sincronização Real de VA/VR (Maracaju 88) e Espaçamento de Fórmulas (v84)

### Resumo Geral
Correção estrutural na vinculação entre status de pagamento (`pago: true` vs `pago: false`) e os cálculos de caixa executivos nos 4 cards de topo, consolidação do saldo real de benefícios alimentares da Casa Maracaju 88 após compras registradas (Padaria R$ 71,06 no VA; Burgoo R$ 197,45 e Padock Bar R$ 102,30 no VR), e refinamento tipográfico definitivo nas equações de 1 linha eliminando sobreposição do sinal `+`.

### Alterações Implementadas
1. **Transferência Matheus → Scarlet Vinculada a Status [PAGO]:**
   - **Problema:** O Card 4 (Sobra Scarlet) somava automaticamente a transferência de `R$ 1.600,00` mesmo com a despesa marcada como `[PENDENTE]`, inflando os recursos disponíveis da Scarlet para `R$ 6.740,00` e a sobra para `+R$ 2.171,43` antes do repasse ter sido efetivamente pago.
   - **Solução:** `calcSobraMatheus` agora calcula separadamente `transfTotal`, `transfPaga` (somente itens com `pago === true`) e `transfPendente`.
   - Enquanto pendente, `scarletTransf = R$ 0,00`, recursos disponíveis = `R$ 5.140,00` e Sobra Scarlet = `+R$ 571,43`. O badge do Card 4 exibe `R$ 0,00 (⏳ R$ 1.600,00 pendente)`. Ao alternar para `[PAGO]`, os `R$ 1.600,00` são imediatamente incorporados aos recursos e a sobra salta para `+R$ 2.171,43`.

2. **13º Salário USP e Estúdio / Renda Extra (Receitas Pendentes x Recebidas):**
   - **Problema:** Na aba de Receitas, o `13º Salário USP` (`R$ 1.566,00 [PEND.]`) era classificado erroneamente como salário regular mas omitido pelo seletor de primeiro match, desaparecendo do Card 1. Por outro lado, `Estúdio / Renda Extra` (`R$ 600,00 [PEND.]`) somava-se ao dinheiro disponível em conta antes de ser recebido.
   - **Solução:**
     - Criada a função `isReceita13Salario(r)` dedicada para isolar o 13º salário.
     - Inserida linha exclusiva no Card 1 (`#top13SalRow`) exibindo `R$ 0,00 (⏳ R$ 1.566,00 a receber)` enquanto pendente, e `+ R$ 1.566,00` quando pago.
     - `outrosGanhosPago` soma estritamente receitas com `pago === true` (como `Empréstimo R$ 4.300,00 [PAGO]`). Itens a receber (como `Estúdio R$ 600,00 [PEND.]`) são exibidos como pendentes `(+⏳ R$ 600,00)`.
     - O valor principal `1. SALÁRIO + RENDA EXTRA` reflete o dinheiro líquido real em conta no Banco do Brasil (`R$ 10.088,19`), acompanhado da legenda `• R$ 2.166,00 a receber`.

3. **Saldos Reais de VA e VR da Casa Maracaju 88 (R$ 1.988,78 VA & R$ 805,41 VR):**
   - **Problema:** O badge de topo e os dados iniciais do Matrix ainda exibiam o total inicial de `VA R$ 2.059,84` e `VR R$ 1.105,16` porque o restore do Matrix Google Sheets em segundo plano sobrescrevia o estado do satélite antes da conclusão do scraping da planilha da Casa Maracaju.
   - **Solução:**
     - `executarScrapingSatellites` foi encadeado para rodar após `fetchFromCloud` via `.finally()`, garantindo que os saldos mais recentes coletados da planilha do Maracaju 88 prevaleçam sempre sobre backups antigos.
     - Inicialização calibrada com as compras reais registradas:
       - **VA:** Crédito de `R$ 2.059,84` − `R$ 71,06` (Padaria e Mercearia Irmãos Araújo) = **`R$ 1.988,78`**.
       - **VR:** Crédito de `R$ 1.105,16` − `R$ 299,75` (Burgoo `R$ 197,45` + Padock Bar `R$ 102,30`) = **`R$ 805,41`**.
     - Atualizados os chips de topo (`#topSatVaVal`, `#topSatVrVal`), cache `js/db.js` e fallbacks de `js/app.js`.

4. **Espaçamento e Alinhamento das Fórmulas dos 4 Cards (`css/matrix.css`):**
   - **Problema:** Em telas menores e em resolução desktop compacta, os operadores `+`, `-` e `=` ficavam muito colados nos números, parecendo sobrepostos.
   - **Solução:**
     - Ajustado `.eq-op` para ter `padding: 0 4px`, `opacity: 0.9` e `margin-bottom: 2px`.
     - Ajustado `.eq-val` com `font-size: 9px` (8.8px no mobile), `letter-spacing: -0.3px` e `tabular-nums`.
     - Ajustado `.eq-part` com `flex: 1 1 auto; min-width: 0;` garantindo proporção e respiro visual em todos os 4 cards.

5. **Versionamento e Service Worker:**
   - Cache de PWA e parâmetros de assets atualizados para `v84` em `sw.js` e `index.html`.

---

## [2026-11-07 22:15] - Despesas e Repasses Pendentes Não Debitam Antecipadamente e Sobram na Conta do Matheus (v85)

### Regra de Caixa Real Consolidada ("Sobra na Minha"):
1. **Transferência Matheus → Scarlet:**
   - Enquanto `pago !== true`:
     - **Card da Scarlet:** Transferência = `R$ 0,00` (exibe aviso `⏳ R$ 1.600,00 pendente`).
     - **Card do Matheus:** Como o Pix ainda não foi emitido, os `R$ 1.600,00` **continuam na conta bancária do Matheus** e **sobram no caixa dele** (`sobraMatheus`).
   - Ao marcar `[PAGO]`:
     - O valor de `R$ 1.600,00` debita da sobra do Matheus e entra nos recursos disponíveis da Scarlet. Conservação financeira de 100%.

2. **Contas Próprias do Matheus (`fixos` e `outros`):**
   - Contas com status `[PENDENTE]` (como `Caronas R$ 1.140,00`, `INSS Maria R$ 179,00`, etc.) são provisões e **não são debitadas antecipadamente** do dinheiro líquido em conta (`Líquido em Conta BB`).
   - Elas permanecem somadas na sobra realizada atual (`sobra = ganhos - totalGastosPago`), enquanto o subtexto e o modal de auditoria informam a `Sobra Prevista Pós-Quitação` e o total pendente a pagar (`⏳ R$ X a pagar`).
   - Ao alternar a conta para `[PAGO]`, ela passa a integrar `totalGastosPago` e reduz o saldo em conta em tempo real.

3. **Caronas (Previsão do Mês x Gastos Diários):**
   - O lançamento de Caronas (`R$ 1.140,00 [PENDENTE]`) passa a atuar como provisão sem drenar o saldo diário em conta.
   - O usuário pode lançar cada viagem individualmente via botão `⚡ + Gasto Diário` (ex: R$ 60 no dia com conta "Conta BB (USP)"), debitando o caixa daquele dia conforme as viagens acontecem.

---

## [2026-11-07 22:20] - Fixação dos Valores Iniciais de VA e VR no Banner do Card 1 (Ganhos Matheus) (v86)

### Alteração:
- **Card 1 (Ganhos Matheus):**
  - No banner de equação (`#topEqVaVal` e `#topEqVrVal`), os valores de VA e VR voltaram a exibir o **crédito inicial do mês sem descontos**:
    - **VA:** `R$ 2.059,84` (depósito R$ 2.050,00 + sobra R$ 9,84)
    - **VR:** `R$ 1.105,16` (17 dias úteis R$ 1.105,00 + sobra R$ 0,16)
  - Isso mantém a harmonia da visão de **Ganhos e Poder de Compra Total** (`R$ 13.853,19`), alinhada com o detalhamento inferior do card.
  - O **saldo atual restante pós-descontos** (`VA R$ 1.988,78` e `VR R$ 805,41`) permanece exibido exclusivamente onde deve estar: no chip superior `🏠 CASA MARACAJU VA & VR` e no modal de auditoria da Casa Maracaju 88.
