# Memória do Repositório — Matrix Finance 360

Este arquivo documenta todas as regras de negócio, fórmulas financeiras, integrações com apps satélites e padrões de interface implementados no **Matrix Finance 360**.

## 1. Regras Financeiras Essenciais
1. **Rótulo de Entradas**: Usar sempre **"Ganhos"** (não usar "Ganhos em Pecúnia" na UI).
2. **Gastos Totais**:
   - `Gastos Totais = Gastos Fixos + Gastos Variáveis (Outros) + Gastos Diários (mês vigente) + Contas de Início de Ano (Janeiro)`.
3. **Roteamento de Gastos Diários (`salvarGastoDiarioModal`)**:
   - `debito_inter` → permanece nos gastos diários do **mês vigente**.
   - `credito_nubank` (Matheus) ou `credito_bb` (Banco do Brasil) → vai automaticamente para o **mês seguinte**, somando na fatura correspondente dentro de **Gastos Variáveis (`outros`)**.
   - Gastos do cartão **Nubank da Scarlet** são lançados apenas no app **Faturas (`parcelado-a-vista`)** e sincronizados automaticamente.
4. **Sobra Pessoal do Matheus (`calcSobraMatheus(ano, mes)`)**:
   - Exibida no sub-card **👨 Sobra pra Mim (Matheus)** dentro do card de Sobra no Mês.
   - `Sobra Matheus = Ganhos Pessoais Matheus - (Gastos Próprios Fixos/Variáveis/Diários/Início de Ano + Transferência para Scarlet)`.
   - Distingue estritamente a transferência enviada para a Scarlet (`isTransferenciaParaScarlet`) da fatura do cartão dela (`isGastoDaScarlet`: `'Nubank Scarlet'`), que nunca entra na conta pessoal do Matheus.

## 2. Integração Casa Maracaju 88 (VA e VR no 4º Dia Útil)
- Créditos mensais USP: **VA `R$ 2.050,00`** + **VR `R$ 1.105,00`** creditados todo **4º dia útil bancário** do mês.
- O motor de ciclos (`js/satellite-connectors.js`) identifica automaticamente se a data atual já atingiu o 4º dia útil do mês e soma o **rollover (sobra do mês anterior)** aos novos créditos.
- No ciclo de Novembro/2026 (iniciado em `06/11/2026`):
  - Rollover de Outubro: `VA R$ 9,84` e `VR R$ 0,16`.
  - Saldo Vigente Novembro: **`VA R$ 2.059,84`** e **`VR R$ 1.105,16`** (Total **`R$ 3.165,00`**).

## 3. Simulador Tesouro Renda+ 2055 (Aba Investimentos)
- Simula 3 cenários de crescimento real salarial até 2055 (Conservador `0,80% a.a.`, Mediano `1,65% a.a.`, Otimista `2,50% a.a.`) a partir do salário bruto USP de `R$ 6.264,00`.
- Contabiliza as perdas na aposentadoria aos 65 anos: fim do FGTS (`8%`), perda de VA (`R$ 2.050`), VR (`R$ 1.105`) e Auxílio-Saúde (`R$ 660`), mais o custo do plano de saúde sênior (`R$ 2.650/mês`).
- Calcula aportes mensais, quantidade de títulos/cotas pelo **Preço Unitário (PU)** do Tesouro Renda+ 2055 (`#sim2055PrecoTitulo`) e permite exportar o estudo completo em `.md` ou PDF/Impressão.

## 4. Qualidade, Testes e Publicação
- Antes de publicar no GitHub (`origin main`), validar sintaxe com `node --check` em todos os arquivos de `js/*.js` e `sw.js`, incrementar `CACHE_NAME` em `sw.js` e confirmar zero erros de execução.
