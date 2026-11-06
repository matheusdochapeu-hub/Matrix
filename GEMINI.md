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

## 4. Escopo Temporal Ativo: Outubro/2026 em Diante
- Todos os registros, meses e dados anteriores a Outubro de 2026 (ano de 2025 completo e Janeiro a Setembro de 2026) foram permanentemente expurgados.
- O controle financeiro oficial do casal inicia estritamente a partir de **Outubro/2026** (Outubro, Novembro e Dezembro de 2026, e ano de 2027 em diante para planejamento/projeções).
- A navegação regressiva na timeline é bloqueada em Outubro/2026 (botão anterior desabilitado).
- Os holerites armazenados iniciam a partir de Outubro/2026 (`2026-10` USP).

## 5. Memória e Aprendizado de Categorias de Gastos
- O app memoriza dinamicamente as classificações de categorias atribuídas pelo usuário (`MatrixDB.learnCategoryMapping`).
- Ao digitar a descrição de um gasto nos formulários de lançamento rápido ou edição de despesas, o app prediz e seleciona automaticamente a categoria memorizada (`MatrixDB.predictCategory`), exibindo o indicador `✨ Lembrado: [Categoria]`.
- Se o usuário alterar a categoria manualmente, a nova preferência é imediatamente aprendida e gravada no `localStorage` (`matrix_category_memory`) e no banco local.

## 6. Simplificação de Origens de Recursos nos Lançamentos
- O seletor duplicado "De onde sai / entra" foi permanentemente removido do modal `#itemModalBackdrop`.
- A classificação do recurso é regida exclusivamente pelo campo **"Renda Vinculada"** (`#modalItemRenda`), simplificando a UX e eliminando duplicidades conceituais entre contas bancárias e fontes pagadoras.

## 7. Qualidade, Testes e Publicação
- Antes de publicar no GitHub (`origin main`), validar sintaxe com `node --check` em todos os arquivos de `js/*.js` e `sw.js`, incrementar `CACHE_NAME` em `sw.js` (atualmente `matrix-finance-v41`) e confirmar zero erros de execução.
