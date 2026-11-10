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



