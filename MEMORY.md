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
