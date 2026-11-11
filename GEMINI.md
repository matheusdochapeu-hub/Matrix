# Memória do Projeto — Matrix Finance 360 & Ecossistema Satélite

Este documento registra as regras de negócio, integrações, convenções de UX e decisões arquiteturais do **Matrix Finance 360** (`c:\Users\matheus.ribeiro\Desktop\Matheus\5. IA\matrix`) e seus aplicativos satélites. Ele é carregado automaticamente em todas as sessões futuras.

---

## 1. Ecossistema e Repositórios
- **Matrix Finance 360 (App Central)**:
  - Diretório: `c:\Users\matheus.ribeiro\Desktop\Matheus\5. IA\matrix`
  - GitHub: `https://github.com/matheusdochapeu-hub/Matrix.git` (branch `main`)
  - GitHub Pages (Produção): `https://matheusdochapeu-hub.github.io/Matrix/`
  - Backend Cloud Sync: Google Apps Script (`apps_script.gs`)
- **Apps Satélites Conectados (`js/satellite-connectors.js`)**:
  1. **Casa Maracaju 88 (`maracaju88`)**: Gestão de Vale Alimentação (VA), Vale Refeição (VR) e obras/contas da casa.
     - **URL Cloud Sync**: `https://script.google.com/macros/s/AKfycbz8kE8p5E-cW-bT7wJ9C4X2mN1vP6qR0sT3uV5wX7yZ9aB1cD3e/exec` (configurável em `satellite-connectors.js` / localStorage `maracaju_cloud_url`).
  2. **Faturas & Parcelado à Vista (`parcelado-a-vista`)**: Gestão de cartões (Nubank Matheus, BB Ourocard Matheus, Nubank Scarlet).
  3. **Atendimentos Scarlet (`fisioflow` é só a chave interna)**: o faturamento clínico da Scarlet vem do app pessoal `../matheus-app-fisioterapia` (`satellite-connectors.js` → `DEFAULT_ENDPOINTS.fisioUrl`). O `../fisioflow` é o produto comercial multi-tenant e **não** alimenta o Matrix.
- **Ambiente Técnico Local**:
  - Binário do Node.js local (para validação de sintaxe `node --check` e testes headless JSDOM): `C:\Users\matheus.ribeiro\Desktop\Matheus\5. IA\node-bin\PFiles64\nodejs\node.exe`

---

## 2. Regras de Negócio Financeiras (Matheus & Scarlet)

### 2.1 Terminologia e Ganhos
- O indicador principal de entradas chama-se apenas **"Ganhos"** (nunca exibir "Ganhos em Pecúnia" nos títulos de KPI, abas ou modais).
- **Benefícios Não-Pecúnia (VA e VR)**:
  - Não entram na soma de "Ganhos" em conta corrente, pois têm destinação específica (alimentação/refeição) gerida no app **Casa Maracaju 88**.
  - São exibidos no card dedicado **🍽️ Benefícios (Casa Maracaju 88)** no Painel Executivo.

### 2.2 Ciclo de VA e VR — Casa Maracaju 88 (Regra do 4º Dia Útil)
- Os créditos de **VA (`R$ 2.050,00`)** e **VR (`R$ 1.105,00`)** da USP são depositados todo **4º dia útil bancário** de cada mês.
- O saldo vigente do ciclo atual soma automaticamente o **saldo remanescente do ciclo anterior (rollover)** com a **nova recarga do mês**.
  - Exemplo de referência (Ciclo Novembro/2026 iniciado em `06/11/2026`, 4º dia útil):
    - Sobras de Outubro: `VA R$ 9,84` + `VR R$ 0,16` (`R$ 10,00` acumulados).
    - Recarga de Novembro: `VA R$ 2.050,00` + `VR R$ 1.105,00`.
    - Saldo disponível ativo em Novembro: **`VA R$ 2.059,84`** e **`VR R$ 1.105,16`** (Total **`R$ 3.165,00`**).
- O conector [`satellite-connectors.js`](file:///c:/Users/matheus.ribeiro/Desktop/Matheus/5.%20IA/matrix/js/satellite-connectors.js) sempre calcula o ciclo vigente pela data real de 4º dia útil (`getCicloVigentePorData`) e ignora caches obsoletos caso pertençam a ciclos anteriores.

### 2.3 Composição dos Gastos Totais e Roteamento de Gastos Diários
- **Fórmula de Gastos Totais do Mês**:
  $$\text{Gastos Totais} = \text{Gastos Fixos} + \text{Gastos Variáveis (Outros)} + \text{Gastos Diários (lançados no mês)} + \text{Contas de Início de Ano (em Janeiro)}$$
- **Roteamento Automático de Lançamentos Rápidos (Gastos Diários)**:
  - **Débito Inter (`debito_inter`)**: Permanece no **mês vigente**, somando na lista de `diarios` do próprio mês.
  - **Crédito Nubank Matheus (`credito_nubank`)** ou **Crédito Banco do Brasil (`credito_bb`)**: É roteado automaticamente para o **mês seguinte**, somando na respectiva fatura dentro de **Gastos Variáveis (`outros`)** (`Nubank Matheus` ou `Banco do Brasil`).
  - **Cartão Nubank da Scarlet**: Não possui opção no formulário de lançamento diário do Matrix; os gastos do cartão dela são lançados exclusivamente no app **Faturas (`parcelado-a-vista`)** e puxados automaticamente via satélite.

### 2.4 Card de Sobra no Mês e Sub-card "👨 Sobra pra Mim (Matheus)"
- Dentro do card principal **⚖️ Sobra no Mês (Casal)**, existe o sub-card clicável **👨 Sobra pra Mim (Matheus)** (calculado por [`calcSobraMatheus(ano, mes)`](file:///c:/Users/matheus.ribeiro/Desktop/Matheus/5.%20IA/matrix/js/app.js)):
  - **Entradas consideradas**: Apenas os ganhos pessoais do Matheus (Salário líquido USP de `R$ 5.788,19` ou holerite do mês, 13º, renda extra dele), sem VA/VR e sem faturamento FisioFlow da Scarlet.
  - **Saídas consideradas**: Gastos fixos próprios + gastos variáveis próprios + gastos diários próprios + contas de início de ano + **transferência enviada para a Scarlet** (item `'Scarlet'` / `'Transferência da conta USP para Scarlet'`).
  - **Exclusão estrita**: A fatura do cartão `'Nubank Scarlet'` (`isGastoDaScarlet`) **nunca** é descontada da sobra pessoal do Matheus.

---

## 3. Simulador Interativo de Aposentadoria 2055 (Tesouro Renda+ 2055)
- Localizado na aba **📈 Investimentos** (banner de destaque + modal `#simulador2055ModalBackdrop`).
- **Premissas Base (ajustáveis pelo usuário e salvas no `localStorage`)**:
  - Salário Bruto USP atual (base 2026): `R$ 6.264,00` | Salário Líquido atual: `R$ 5.788,19`.
  - Evolução real até 2055 (29 anos, 65 anos de idade):
    - **Conservador**: `+0,80% a.a.` (Salário Mínimo 2055: `R$ 2.040,34`)
    - **Mediano (Base)**: `+1,65% a.a.` (Salário Mínimo 2055: `R$ 2.603,80`)
    - **Otimista**: `+2,50% a.a.` (Salário Mínimo 2055: `R$ 3.316,58`)
  - **Perdas na Aposentadoria (aos 65 anos)**:
    - Fim do depósito mensal de FGTS (`8%`).
    - Perda integral de **VA (`R$ 2.050,00`)**, **VR (`R$ 1.105,00`)** e **Auxílio-Saúde (`R$ 660,00`)**.
    - Custo de plano de saúde sênior (65+ anos) estimado em `R$ 2.650,00/mês` (valores reais de hoje).
  - **Cálculo por Preço Unitário (PU / Cotas) do Tesouro Renda+ 2055**:
    - Permite informar o **valor atual de 1 título inteiro (`PU`)** (padrão `R$ 465,67`) e a **taxa real contratada (IPCA+)** (padrão `6,45% a.a.`), exibindo quantos **títulos/cotas por mês** comprar e o total de títulos a acumular até Janeiro/2055.
  - **Exportação**: Permite baixar a análise atualizada em **Markdown (`.md`)** ou **PDF / Impressão** a qualquer momento.

---

## 4. Identidade Visual e PWA
- **Logo Oficial**: Imagem da Oráculo do filme *Matrix* oferecendo biscoitos (`./icons/matrix-icon-192.png`, usada no cabeçalho e como `apple-touch-icon`), acompanhada da estética verde neon clássica (`--green: #00ff66`).
- **Service Worker (`sw.js`)**: Sempre incrementar `CACHE_NAME` (atualmente `matrix-finance-v119`) ao publicar alterações em arquivos JS/CSS/HTML para forçar atualização imediata nos dispositivos móveis e desktop.
- **Ícones (v119 — enxutos, ~595 KB no total)**:
  - `matrix-icon-192.png` (192, `any`, PNG — também é o `apple-touch-icon`);
  - `matrix-icon-512.jpg` (512, `any`), `matrix-icon-1024.jpg` (1024, `any`) e `matrix-icon-maskable-512.jpg` (512, `maskable`, arte dentro da *safe zone* porque o Android recorta);
  - `matrix-icon.svg` (favicon): invólucro SVG com um JPEG 512 embutido (~112 KB; antes eram 2,1 MB de PNG em base64).
  - A arte é fotográfica, então **JPEG** é obrigatório para não inflar o download; o PNG só se justifica no 192 e para transparência real.
  - Todo ícone do manifest precisa existir e o maskable precisa estar no `ASSETS_TO_CACHE` (teste `Manifest: todos os ícones existem e há um maskable`).

---

## 5. Escopo Temporal Ativo: Outubro/2026 em Diante
- Todos os registros, meses e dados anteriores a Outubro de 2026 (ano de 2025 completo e Janeiro a Setembro de 2026) foram permanentemente expurgados.
- O controle financeiro oficial inicia estritamente em **Outubro/2026** (Outubro, Novembro e Dezembro de 2026, e 2027 em diante para planejamento/projeções).
- A navegação regressiva na timeline é travada em Outubro/2026 (botão anterior desabilitado).
- Os holerites armazenados iniciam em Outubro/2026 (`2026-10` USP).

---

## 6. Memória e Aprendizado de Categorias de Gastos
- O app memoriza dinamicamente as classificações de categorias atribuídas pelo usuário (`MatrixDB.learnCategoryMapping`).
- Ao digitar a descrição de um gasto nos formulários de lançamento rápido ou edição de despesas, o app prediz e seleciona automaticamente a categoria memorizada (`MatrixDB.predictCategory`), exibindo o indicador `✨ Lembrado: [Categoria]`.
- Se o usuário alterar a categoria manualmente, a nova preferência é imediatamente aprendida e gravada no `localStorage` (`matrix_category_memory`) e no banco local.

---

## 7. Simplificação de Origens de Recursos nos Lançamentos
- O seletor duplicado "De onde sai / entra" foi removido do modal `#itemModalBackdrop`.
- A classificação da fonte de custeio/recurso é regida exclusivamente por **"Renda Vinculada"** (`#modalItemRenda`), descomplicando a interface de cadastro e edição de receitas/despesas.

---

## 8. Drilldown Consolidado de Gastos Totais do Mês
- O clique no card principal **🔒 Gastos Totais do Mês** dispara `MatrixApp.abrirDrilldown('gastos_totais')`, consolidando em visualização única:
  - 🔒 **Gastos Fixos** (contas e parcelas)
  - 🛍️ **Gastos Variáveis & Aportes** (faturas de cartão e despesas eventuais)
  - ⚡ **Gastos Diários** (lançamentos rápidos debitados no mês)
  - ⚠️ **Contas de Início de Ano** (quando aplicável em Janeiro)
- O modal inclui barra de abas interativas no topo para alternar instantaneamente entre `Todos`, `Fixos`, `Variáveis` e `Diários`.
- Cliques diretos nas linhas individuais do card no painel filtram diretamente a categoria desejada.

---

## 9. Chips dos Pilares Satélites no Mobile
- A barra de chips satélites (`.unified-satellites-bar`) no mobile adota container flex com scroll horizontal suave (`overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none`).
- Preserva rigorosamente as proporções, altura alinhada (`42px`), ícones (`15px`), tipografia e espaçamentos do desktop em todos os 3 chips (Faturas Nubank, Fisio Scarlet e Casa Maracaju VA & VR), eliminando compressões e quebras de linhas desiguais.

---

## 10. Padronização de Datas e Meses no Formato Brasileiro (PT-BR)
- Todas as datas e meses da aplicação foram unificados estritamente no padrão brasileiro:
  - Meses de início/término em simulações e hipóteses utilizam formato `MM/AAAA` (ex: `12/2026`, `06/2027`) com máscara interativa `maskMesAno`.
  - Gastos diários exibem data completa brasileira `DD/MM/AAAA HH:mm` (ex: `06/11/2026 14:30`).
  - Conciliação FisioFlow e relatórios exibem competências em `MM/AAAA` (ex: `08/2026`, `11/2026`).
  - Utilitários globais `formatMesAnoBR`, `parseMesAnoBR`, `formatDataBR` e `maskMesAno` garantem interoperabilidade transparente sem quebrar persistência de dados.

---

## 11. Segregação Rigorosa de Contas no Simulador 'E se?' (Projeções Futuras)
- O Laboratório de Projeções (`#tab-simulador`) segrega integralmente os fluxos de caixa e custos simulados entre as contas:
  1. 👨 **Eu (Matheus • USP)**: Salário líquido USP + 13º + rendas extras vs Gastos próprios fixos/variáveis/diários + transferência para Scarlet + início de ano. Apresenta o impacto dos cenários do Matheus e a sua **Sobra pra Mim**.
  2. 👩 **Scarlet (FisioFlow)**: Faturamento FisioFlow vs Fatura Nubank Scarlet. Apresenta os cenários exclusivos da Scarlet (ex: Seguro de Vida Scarlet, parcelas de tênis) e a sobra real da conta dela.
  3. 🛒 **Vale Alimentação (VA)**: Crédito mensal USP (R$ 2.050/mês) vs compras de supermercado e cenários em VA.
  4. 🍽️ **Vale Refeição (VR)**: Crédito mensal USP (R$ 1.105/mês) vs almoço presencial e cenários em VR.
  5. ⚖️ **Consolidado (Casal)**: Visão integrada das finanças domésticas em conta corrente, com badges individuais por conta em cada mês (`👨 Matheus | 👩 Scarlet | 🛒 VA | 🍽️ VR`).
- Seletor de visão rápida no topo (`.sim-vision-bar`) com botões dedicados e responsivos no mobile.
- Cards de KPI adaptam dinamicamente título, valores e sobra média estimada para a conta selecionada.
- Clique em qualquer card do grid de Correlação de Renda filtra imediatamente para a conta correspondente.
- Modal Raio-X do Simulador detalha lado a lado a situação financeira de cada conta e da união do casal.

---

## 12. Ciclo Salarial de Caronas USP e Sincronização Automática com Gastos Fixos
- **Definição do Ciclo de Caronas**:
  - Inicia no dia em que o salário cai (todo **4º dia útil bancário nacional**, inclusive, pois as caronas são custeadas com o novo salário recebido).
  - Encerra no **dia anterior ao dia do pagamento do próximo mês**.
  - **Exemplo de Referência (Novembro/2026)**:
    - Salário creditado em: `06/11/2026` (4º dia útil bancário; o feriado municipal de 04/11 em São Carlos não suspende a compensação bancária nem o crédito salarial).
    - Salário de Dezembro/2026 creditado em: `04/12/2026`.
    - Ciclo Salarial de Caronas: **`06/11 a 03/12`**.
    - Dias úteis presenciais previstos: **19 dias**.
    - Valor total das Caronas: $19 \times \text{R\$} 60,00 = \textbf{R\$ 1.140,00}$.
- **Vinculação com Gastos Fixos (`monthData.fixos`)**:
  - O item **"Caronas"** na tabela de Gastos Fixos é sincronizado automaticamente (`syncCaronasWithCalendar`) com base no calendário do ciclo salarial.
  - Ao alterar qualquer dia no calendário (ex: marcar falta abonada, folga, férias ou presencial), o valor do item Caronas nos Gastos Fixos é atualizado imediatamente.
  - O item de Caronas no Fluxo de Caixa exibe o badge informativo `🚗 Calendário USP: [X]d ([Início] a [Fim])` e o atalho `📅` para navegação direta ao calendário.

---

## 13. Amortização Exclusiva de Prazo no Financiamento Caixa
- **Foco Único em Redução de Prazo**:
  - A estratégia de amortização extraordinária é fixada exclusivamente em **Redução de Prazo** (`modalidade = 'prazo'`), eliminando juros futuros e abreviando a quitação da casa.
  - A lista suspensa de escolha entre prazo/parcela foi removida, dando lugar ao badge de status permanente: `🎯 Amortização Exclusiva de Prazo`.
- **Layout de Resultados dos KPIs da Amortização**:
  - Grade responsiva de 3 colunas (`repeat(3, 1fr)` em telas largas, 2 colunas em tablets e 1 coluna em mobile), com espaçamento generoso e contenção `min-width: 0; overflow: hidden;`.
  - Apresentação em duas linhas legíveis por card (valor principal em destaque + subtítulo contextual sem corte ou transbordamento entre cards adjacentes).



---

## 14. Reordenação da Aba Investimentos 360 e Simulador Aposentadoria 2055
- **Ordem de Leitura e Fluxo da Aba Investimentos (`#tab-investimentos`)**:
  1. **KPIs Resumo de Patrimônio** (Patrimônio Total, Reserva Imediata, Matheus e Scarlet).
  2. **Barra de Filtros e Ações** (`Todos`, `👨 Matheus`, `👩 Scarlet`, `📦 Agrupar por Ativo`, `+ Novo Investimento`, `Google Finance`).
  3. **📁 Ativos em Carteira** (Posicionado imediatamente abaixo dos filtros para acesso direto aos cards de investimentos).
  4. **Banner & Acesso ao Simulador de Aposentadoria 2055 (Tesouro Renda+)**.
  5. **Horizontes de Vencimento e Prazos Reais** (Liquidez Diária, Aposentadoria 2055, Médio Prazo, Renda Variável).
  6. **Monitor B3 em Tempo Real (Google Finance - CSNA3 e MGLU3)**.
  7. **Gráficos de Investimentos** (Divisão Patrimonial Matheus vs Scarlet, Alocação por Classe e Previsão Individual por Ativo).
- **Correções do Simulador Interativo 2055 (`#simulador2055ModalBackdrop`)**:
  - **Fechamento Instantâneo**: Removida a classe legada `.matrix-modal-backdrop.active` do CSS e corrigido `closeModal(id)`, tecla Escape e listeners para sempre remover as classes `open` e `active` e forçar `display: none`. Adicionado botão `✕ Fechar` no rodapé.
  - **Esquadro e Legibilidade das Metas**: Grid responsivo (`.sim2055-meta-grid`) com cartões estruturados (`.sim2055-meta-btn`), eliminando vazamento de texto (`white-space: normal`) e corte de botões no mobile e desktop.
  - **Quadro de Resultados Proporcionado**: Cards de KPI (`Aporte Mensal`, `Cotas / Mês`, `Total Acumulado` e `Patrimônio em 2055`) com títulos diretos, tipografia contida e sem sobreposição.

---

## 15. Gestão de Empréstimos Consignados, Início de Amortização & Antiduplicidade com Holerite
- **Novo Layout e UX do Box de Condições do Empréstimo (`#modalEmprestimoSection`)**:
  - Substituída a classe quebrada legada `input-matrix` por `matrix-input` e `matrix-select`, padronizando alturas (`38px`), tema dark (`#050807`), bordas e foco verde neon sem caixas brancas desconfiguradas.
  - Seletor de modalidade: **🏛️ Consignado em Folha (USP • Reduz Salário)** vs **💳 Débito em Conta / Boleto (Gasto Bancário)**.
  - Cálculo automático sugerido da parcela ao digitar o valor total e número de parcelas.
- **Escolha do Mês de Início da Amortização (`#modalEmprestimoInicioMes`)**:
  - O usuário escolhe exatamente a partir de qual mês o empréstimo começará a amortizar (Mês seguinte padrão ou meses futuros para respeitar carência contratual).
- **Prevenção Rigorosa de Duplicidade com Holerites Futuros (`isConsignadoFolhaJaDescontado`)**:
  - **Meses Futuros (Projeção sem Holerite)**: A parcela atua normalmente como Gasto Fixo deduzido da receita de salário base (`R$ 5.788,19`), simulando com exatidão o salário reduzido do Matheus na projeção da sobra (`5.788,19 - 350 = 5.438,19`).
  - **Meses com Holerite Oficial Lançado**: O salário líquido que entra na conta corrente já vem descontado pela USP no holerite (`rec_sal = liquido`). O app detecta a presença do holerite oficial e sinaliza a parcela nos Gastos Fixos como `📋 Retido no Holerite (Sem Duplicidade)` e `✔ RETIDO EM FOLHA`, impedindo que o valor seja descontado uma segunda vez da conta bancária ou da sobra pessoal do Matheus.
  - O formulário manual de holerite inclui o campo opcional `hlConsignado` com recálculo dinâmico do líquido.

---

## 16. Autoridade Satélite de VA e VR (Casa Maracaju 88) e Prevenção de Sobrescrita pelo Calendário
- **Soberania do App Casa Maracaju 88 (`state.satellites.maracaju`)**:
  - Os valores de saldo vigente de **Vale Alimentação (VA)** e **Vale Refeição (VR)** são determinados prioritariamente pela extração do app **Casa Maracaju 88** (para Novembro/2026: **`VA R$ 2.059,84`** e **`VR R$ 1.105,16`**, considerando a recarga do 4º dia útil somada ao rollover de Outubro).
  - O modal de edição `#saldosEditModalBackdrop` (`openEditSaldosModal`) preenche automaticamente os campos de VA e VR com base nos dados do Casa Maracaju 88 e quaisquer edições salvas pelo usuário (`vaManual` e `vrManual`).
- **Eliminação de Sobrescrita pelo Commute (`CalendarEngine.calculateCommuteAndVR`)**:
  - O motor de caronas calculava uma estimativa hipotética de VR baseada em dias úteis ($19 \times \text{R\$} 65 = \text{R\$} 1.235,00$) e sobrescrevia forçosamente `monthData.totais['VR']` a cada renderização (`renderMonth`, `syncCaronasWithCalendar` e `aplicarCaronasNoMes`).
  - Essa sobrescrita foi permanentemente removida: o calendário USP agora sincroniza estritamente o gasto fixo **"Caronas"**, respeitando de forma inviolável o saldo contratual de VR (`R$ 1.105,16`) da USP e do Casa Maracaju.
- **Persistência Completa ao Salvar Saldos e Rendas (`salvarSaldosModal`)**:
  - Suporte a parsing numérico com vírgula (`1105,16`) ou ponto (`1105.16`).
  - Atualização simultânea das receitas (`rec_va` e `rec_vr` em `monthData.receitas`), dos totais (`totais['VA']` e `totais['VR']`) e das propriedades de controle (`vaManual` e `vrManual`).
  - Persistência atômica com chamada obrigatória a `MatrixDB.saveMonth(ano, mes, monthData)` e `MatrixDB.saveState(state)`, eliminando o descarte em memória que causava o travamento e reversão ao salvar.

---

## 17. Sincronização de Ganho Possível do FisioFlow (Scarlet) e Responsividade Mobile
- **Origem do Ganho no FisioFlow (`satellite-connectors.js`)**:
  - No app FisioFlow, a métrica oficial é o **Ganho Possível**: soma das sessões já realizadas no mês com as sessões agendadas a realizar (`Feito + Previsto`), ou a **capacidade mensal recorrente** contratada dos pacientes ativos.
  - Com base nos 8 pacientes ativos particulares da Scarlet (Irani R$ 760, Sebastião R$ 760, Diva R$ 800, Tereza R$ 560, Vinícius R$ 720, Márcia R$ 400, Cláudio R$ 400, Paciente 8), a capacidade contratada real é de **`R$ 5.080,00 / mês`**.
  - No mês de Novembro/2026, com 11 sessões já realizadas (`R$ 995,00`) e 46 sessões agendadas na agenda (`R$ 3.810,00`), o **Ganho Previsto da agenda é de `R$ 3.810,00`** e o **Ganho Possível** totaliza **`R$ 4.805,00`**.
  - **Sensibilidade Temporal Estrita ao Mês Ativo da Timeline**:
    - As linhas informativas de **Realizado no Mês** (`topScarletGanhosAtualVal`), **Previsto na Agenda** (`topScarletGanhosPrevistoVal`) e **Caixa Fisio M+1** (`topScarletGanhosFisioVal`) são sincronizadas dinamicamente de acordo com o ano e mês selecionados (`currentYear`, `currentMonth`).
    - Em meses futuros como Fevereiro/2027 (onde o app Atendimentos não possui sessões ou agendamentos cadastrados), os valores são exibidos corretamente como **`R$ 0,00`** com rótulos contextuais (`🩺 Realizado no Mês: R$ 0,00`, `🗓️ Previsto na Agenda: R$ 0,00` e `🩺 (+) Caixa Fisio do Mês (M+1 • Jan): R$ 0,00`).
  - **Regra de Ouro da Previsão**: O valor de Ganho Previsto (`R$ 3.810,00` em Nov/2026) é puramente informativo de pipeline de atendimentos futuros agendados e **NUNCA** é somado ao Ganho Real / Recursos ou ao Caixa da família até que as sessões sejam efetivamente realizadas, confirmadas e recebidas (regra M+1).
  - O valor legado de `R$ 1.500,00` era um placeholder estático do `BASELINE_FISIO` que foi permanentemente substituído pela extração dinâmica de atendimentos, agendamentos e pacientes ativos.
- **Card no Modal Consolidado FisioFlow (`#drilldownModalBackdrop`)**:
  - Título oficial: **🎯 Ganho Possível (FisioFlow)**, destacando o potencial real (`R$ 4.805,00`) e a capacidade base contratada (`R$ 5.080/mês com 8 pacientes ativos`).
- **Eliminação de Sobreposição na Tabela de Conciliação no Mobile**:
  - Títulos de colunas ajustados para concisão (`Competência`, `Caixa Matrix`, `Sessões` e `Total Faturado`), com `white-space: nowrap;` e container com scroll horizontal suave (`overflow-x: auto; -webkit-overflow-scrolling: touch;`), impedindo qualquer colisão de cabeçalhos em telas de smartphones.

---

## 18. Consistência e Atualização Integral de Valores Vigentes de VA e VR
- **Eliminação de Resíduos Obsoletos de Benefícios (`R$ 3.285,00` e `R$ 1.170,00`)**:
  - Resíduos originários de cálculos antigos de dias úteis civis ($18 \times \text{R\$} 65 = \text{R\$} 1.170,00$) e de soma de VR hipotético ($2050 + 1235 = 3285$) foram permanentemente erradicados.
  - O cálculo de `beneficiosNaoPecunia` passou a ser estritamente calculado pela soma exata dos valores vigentes de VA e VR: $\text{beneficiosNaoPecunia} = va + vr$.
- **Sincronização Visual e Rastreabilidade no Painel Executivo**:
  - **Chip Satélite do Topo (`#topSatCasaVal`)**: Exibe **`VA R$ 2.059,84`** e **`VR R$ 1.105,16`** (com auto-recuperação contra caches obsoletos gravados no `localStorage`).
  - **Card Ganhos — Subtítulo (`#topRendaConjuntaSub`)**: Exibe `Líquido em conta (exclui R$ 3.165,00 em benefícios)`.
  - **Card Ganhos — Bloco de Benefícios (`.unified-benefits-block`)**:
    - **Total (`#topTotalBeneficiosVal`)**: **`R$ 3.165,00`**.
    - **`🥗 VA (Maracaju 88)` (`#topVaVal`)**: **`R$ 2.059,84`**.
    - **`🍽️ VR (Almoço)` (`#topVrVal`)**: **`R$ 1.105,16`**.
  - **Drilldown de folga de caixa (`#drilldownModalBackdrop`)**: O fallback legado de `3.285,00` foi substituído pelo valor oficial de `3.165,00`.

---

## 19. Fluxo Financeiro da Scarlet (FisioFlow, Outras Rendas, Transf. Matheus & Sobra Livre)
- **Composição da Renda e Recursos da Scarlet**:
  $$\text{Recursos Totais Scarlet} = \text{Ganhos FisioFlow (M+1)} + \text{Outras Rendas Scarlet (Manual)} + \text{Transferência Recebida de Matheus}$$
  - **FisioFlow**: Ganhos realizados vs previstos (Novembro/2026: R$ 1.140,00 faturados em Outubro recebidos em Novembro).
  - **Outras Rendas Manuais**: Permite cadastrar rendas extras da Scarlet (ex: Novembro/2026 recebeu R$ 4.000,00 por outros trabalhos prestados em Outubro).
  - **Transferência do Matheus**: Repasse de apoio para pagamento da fatura (Novembro/2026: R$ 2.000,00 transferidos da conta USP).
  - **Total Disponível em Novembro/2026**: $1.140 + 4.000 + 2.000 = \textbf{R\$} 7.140,00$.
- **Sobra Real da Scarlet**:
  $$\text{Sobra Scarlet} = \text{Recursos Totais Scarlet} - \text{Fatura Nubank Scarlet} - \text{Gastos Próprios}$$
  - A sobra positiva representa capital livre para a Scarlet poupar ou destinar aos seus investimentos.
- **Erradicação Estrita de Valores Sintéticos (R$ 1.500,00)**:
  - De Janeiro/2027 em diante, na ausência de atendimentos confirmados ou lançamentos manuais, os ganhos da Scarlet são rigorosamente fixados em **zero (0)**.
  - Sanitização automática na inicialização elimina quaisquer resíduos gravados em caches locais antigos.

---

## 20. Separação de Aposentadoria (Matheus vs Scarlet), Cotação Diária Tesouro Renda+ 2055 e Soberania Cloud
- **Divisão da Aposentadoria em Investimentos 360**:
  - Em Horizontes de Vencimento e Prazos Reais, os cards são segregados:
    - 👨 **Aposentadoria Matheus (2055)**: Tesouro Direto Renda+ 2055 (XP e Inter).
    - 👩 **Aposentadoria Scarlet**: Tesouro Direto Renda+ 2055 e Previdência Scarlet.
  - No gráfico de alocação por categoria, a Previdência/Aposentadoria é separada individualmente entre Matheus e Scarlet.
- **Simulador Aposentadoria 2055 & Cotação Diária Oficial**:
  - Correção definitiva de reabertura do modal (`#simulador2055ModalBackdrop`), unificando `.modal-backdrop` com controle atômico `display: flex` / `display: none`.
  - Busca diária automatizada de Preço Unitário (`PU`) e Taxa real (`IPCA + X%`) no Tesouro Direto, armazenando em cache de 24h (`matrix_tesouro_2055_quote`) com botão manual de atualização.
  - Novo endpoint `action=get_tesouro_2055` implementado no Apps Script (`apps_script.gs`).
- **Soberania do Google Sheets (`sync-engine.js`)**:
  - A planilha do Google Sheets é a fonte da verdade oficial: ao abrir em qualquer dispositivo ou clicar em sincronizar, os dados mais recentes da nuvem prevalecem e atualizam o estado local.

---

## 21. Proteção de Modais contra Fechamento Acidental & Salvamento Não-Destrutivo de Gastos Diários
- **Eliminação de Fechamento Espontâneo de Modais (`app.js`)**:
  - Removido o `MutationObserver` que competia com `popstate` e disparava múltiplos `history.back()` assíncronos que fechavam o modal durante a abertura ou ao alternar campos.
  - Implementado bloqueio rigoroso de pointer: o backdrop escuro só fecha se o `mousedown`/`touchstart` e o `click` ocorrerem ambos diretamente no fundo escuro, com intervalo mínimo de 400ms desde a abertura (eliminando cliques sintéticos de toque mobile).
  - Cliques e toques dentro da caixa do modal (`.matrix-modal`) têm propagação estritamente bloqueada (`stopPropagation`), impedindo fechamento ao arrastar cursor, selecionar texto ou editar campos.
  - Proteção no evento `popstate`: se o usuário estiver ativamente com foco em `input`, `textarea` ou `select`, o modal não fecha ao dispensar o teclado virtual no celular.
- **Merge Não-Destrutivo e Auto-Recuperação de Gastos Diários (`sync-engine.js`, `db.js` e `apps_script.gs`)**:
  - **Auto-recuperação Local (`db.js`)**: Na inicialização ou chamada de `getState()`, o motor inspeciona `matrix_backup_auto_last` e `matrix_backup_history_v1`. Caso algum diário tenha sido expurgado acidentalmente, ele é imediatamente restaurado e fundido ao estado ativo.
  - **Merge Inteligente na Sincronização Nuvem (`sync-engine.js`)**: O download da planilha (`fetchFromCloud`) não substitui cegamente a lista de `diarios`. Realiza união por `id` e `(nome + valor + dataHora)`, preservando todos os lançamentos locais e enviando os diários ausentes de volta para a nuvem via `queueSync()`.
  - **Integração com a Aba Lançamentos da Planilha (`apps_script.gs`)**: No `doGet`, a ação `get_state` lê dinamicamente as linhas da aba física `Lançamentos` do Google Sheets, incorporando edições diretas feitas pelo usuário na planilha ao snapshot retornado.
  - **Eliminação de Race Condition no Scraping Satélite (`satellite-connectors.js`)**: A função `scrapeAll` atualiza apenas o objeto de satélites no estado atual fresco (`MatrixDB.getState()`), impedindo que o salvamento assíncrono sobrescreva transações adicionadas durante os segundos de requisição de rede.
- **Botão '+ Renda' & Reconhecimento de Transferências nos Gastos Diários (`app.js` & `index.html`)**:
  - Adicionado o botão **`[+ Renda]`** no topo do card da Scarlet para lançamento direto de receitas/entradas dela (ex: receitas da irmã, consultoria, aulas) via formulário de nova receita.
  - As transferências para a Scarlet lançadas como **Gasto Diário** (ex: Pix/Débito) agora são detectadas e computadas automaticamente como repasse na linha **Transf. para Scarlet** (tanto deduzindo do Matheus quanto somando nos Recursos dela), sem duplicar na soma de despesas diárias normais.
  - A descrição padrão da receita de R$ 4.000,00 de Novembro/2026 foi oficializada como **'Receitas da irmã'**.
- **Diagnóstico Estratégico Realista no Fechamento Anual (`app.js` • v103)**:
  - Expurgada a análise sintética fictícia (Globoplay, Petlove e mensalidade Ultravioleta).
  - Substituída pelo **Diagnóstico Estratégico de Otimização & Alavancas Reais de Economia**:
    1. **Logística de Caronas USP**: R$ 60/dia presencial (R$ 1.140 em 19 dias). Economia de folgas/recessos de R$ 420 a R$ 1.200/ano canalizada ao Renda+ 2055.
    2. **Quitação de Empréstimos Familiares**: Término das parcelas de Edna (R$ 500), Alberto (R$ 250) e Cesar (R$ 150) liberando até R$ 900,00/mês (R$ 10.800/ano) no fluxo de caixa.
    3. **Amortização Exclusiva de Prazo (Caixa)**: Abatimento de juros com FGTS USP bienal (~R$ 12.000) e saldo devedor de R$ 157k.
    4. **FisioFlow & Auto-suficiência da Fatura Scarlet**: Capacidade de R$ 4.400/mês garantindo a quitação da fatura e gerando excedente para a Previdência dela.
    5. **Blindagem com Benefícios**: R$ 3.165/mês em VA (R$ 2.050) e VR (R$ 1.105) zerando alimentação em conta corrente.

---

## 22. Atalhos Dinâmicos de Gastos Diários (Top 3 Mais Usados) & Carona USP (R$ 30 • Pix)
- **Carona USP Unitária (R$ 30,00 • Pix Inter)**:
  - O valor padrão da Carona USP no lançamento rápido é de **`R$ 30,00`**, permitindo lançar individualmente a ida e a volta ao longo do dia ($2 \times \text{R\$} 30 = \text{R\$} 60/\text{dia}$).
  - Meio de pagamento padrão: **🟠 Pix Inter** (`pix_inter`) e categoria **Transporte** (com abate automático da provisão de caronas).
  - O atalho rápido de Carona ⚡ na tabela de Gastos Fixos (`lancarCaronaRapidaHoje`) também lança `R$ 30,00` via Pix.
- **Remoção de Botões Estáticos Obsoletos**:
  - Removidos permanentemente os botões fixos `🍽️ Almoço VR (R$ 25)` e `☕ Café USP (R$ 8)`.
- **Inteligência dos Top 3 Atalhos Dinâmicos (`renderQuickExpenseButtons` / `getTopQuickExpenses`)**:
  - Os 3 botões do modal adaptam-se dinamicamente mês a mês com base nos lançamentos diários mais frequentes do usuário.
  - O algoritmo atribui peso prioritário (peso 3) aos lançamentos do mês ativo da timeline e peso complementar (peso 1) ao histórico recente.
  - Memoriza e aplica dinamicamente o valor mais usual, a conta/meio de pagamento mais frequente e a categoria correspondente de cada item.


---

## 23. Botão Fixo/Dinâmico da Mega Sena (R$ 5 • Débito Inter • 🍀) & Garantia Visual
- **Garantia Incondicional dos Staples Top 2**:
  - **Botão 1 (Verde Matrix)**: **`🚗 Carona USP (R$ 30)`** — Pix Inter, Transporte (abate da provisão de caronas).
  - **Botão 2 (Ciano Neon)**: **`🍀 Mega Sena (R$ 5)`** — Débito Inter (`debito_inter`), Categoria Lazer, ícone de trevo de 4 folhas (`🍀`). Se o usuário lançar outros valores ou meios de pagamento, o motor adapta dinamicamente para o valor e conta mais frequentes.
  - **Botão 3 (Roxo Neon)**: Selecionado dinamicamente a partir dos gastos mais recorrentes do mês ativo e do histórico recente (ex: Padaria, Droga Raia, Supermercado, etc.).
- **Blindagem no HTML (`index.html`) e no Engine (`js/app.js`)**:
  - O markup inicial do modal `#quickExpenseQuickButtons` já contém os botões de Carona USP e Mega Sena antes mesmo da execução de qualquer script ou revalidação de cache.
  - O motor `getTopQuickExpenses` consulta `MatrixDB.getCategoryMemory()` e atribui peso garantido para que a Mega Sena nunca desapareça por falta de histórico inicial no mês corrente.
  - O modal agora abre com padrão coerente: categoria `Alimentação` e conta `🟢 Débito Inter (Mês Vigente)`.
  - Service Worker atualizado para `matrix-finance-v109`.


---

## 24. Isolamento Estrito do Scroll Horizontal dos Chips Satélites no Mobile
- **Eliminação de Rolagem da Tela para Baixo ("Scroll Hijack") ao Mover os Chips**:
  - A barra `.unified-satellites-bar` e os chips `.sat-chip` receberam as regras W3C `touch-action: pan-x !important;` e `overscroll-behavior: contain !important;`.
  - Isso impede categoricamente que o navegador móvel (Android Chrome / iOS Safari) interprete pequenos desvios verticais de arraste como scroll da página, blindando a tela contra rolagem vertical indesejada.
- **Isolamento da Navegação Gestual de Abas (`initSwipeNavigation`)**:
  - O listener de gestos de swipe entre abas foi restrito estritamente ao corpo da aba ativa (`.tab-content.active`).
  - Toques que iniciam no cabeçalho, painel superior executivo (`#unifiedTopExecutivePanel`) ou na barra de satélites (`.unified-satellites-bar` e `.sat-chip`) são sumariamente ignorados pelo motor de swipe.
- **Eliminação de Saltos Verticais via `scrollIntoView` na Troca de Abas**:
  - A linha `btn.scrollIntoView(...)` em `switchTab` foi substituída por rolagem horizontal contida exclusivamente no container `.matrix-tabs` (`tabsBar.scrollTo({ left, behavior: 'smooth' })`), eliminando de vez qualquer salto da janela para baixo.
  - Service Worker atualizado para `matrix-finance-v110`.


---

## 25. Gestão Completa de Botões de Atalho Rápido & Fixação Instantânea
- **Botão `⭐ Fixar como Botão` no Modal de Gasto Diário**:
  - Permite ao usuário, ao preencher qualquer gasto diário (nome, valor, categoria, conta), clicar em `⭐ Fixar como Botão` para gravá-lo imediatamente como atalho frequente permanente na barra superior do modal.
  - Reconhece ou infere automaticamente o melhor emoji para o gasto (`🚗`, `🍀`, `🥖`, `🛒`, `💊`, `🍽️`, `☕`, `⛽`, `🍿`, `⚡`).
- **Modal Exclusivo `⚙️ Gerenciar Botões Rápidos` (`#quickButtonsModalBackdrop`)**:
  - Acessível diretamente pelo botão `⚙️ Editar Botões` ao lado dos atalhos.
  - **Edição Completa**: Permite editar nome, valor padrão, categoria, conta de débito/crédito e ícone/emoji de qualquer botão existente.
  - **Reordenação e Exclusão**: Botões para mover para cima (`▲`), mover para baixo (`▼`) e excluir (`🗑️`).
  - **Criação de Novos Botões**: Formulário dedicado com seletor rápido de emojis.
  - **Restauração**: Opção `↺ Restaurar Padrões` para reverter aos staples base (Carona USP e Mega Sena).
- **Persistência Local e no DB**:
  - Gravado no `localStorage` sob a chave `matrix_custom_quick_buttons` e sincronizado com `MatrixDB.getCustomQuickButtons()` e `MatrixDB.saveCustomQuickButtons()`.
  - Service Worker atualizado para `matrix-finance-v111`.

---

## 26. Revisão Técnica v112: Fonte Única de Resultados no Simulador 2055, Versões Alinhadas e Higiene de Encoding
- **Quadro de Resultados do Simulador 2055 (fonte única)**:
  - O `index.html` tinha **dois** quadros de resultados: o real, dentro de `#simulador2055ModalBackdrop` (`.sim2055-results-grid`, atualizado por `getElementById`), e uma **cópia órfã** no fim do `<body>` com valores fixos (`R$ 1.015,78`, `2.259,5 títulos`, `R$ 1.053.372`).
  - A cópia órfã aparecia sempre na página e nunca era atualizada (os ids repetidos faziam `getElementById` devolver o nó do modal). Foi **removida**; agora cada id do simulador existe uma única vez e o teste de IDs duplicados é estrito, sem exceções.
- **Versão do cache sempre igual à versão dos assets**:
  - Até a v111 o HTML estava em `?v=98` com `CACHE_NAME = matrix-finance-v111`. Passou a valer a regra única: `?v=N` de todos os `<script>`/`<link>` **deve** ser igual ao `N` de `matrix-finance-vN` no `sw.js` (coberto por teste).
  - Versão vigente: **`matrix-finance-v112`**.
- **Encoding**:
  - Removidos BOMs residuais de `js/satellite-connectors.js`, `js/scenario-simulator.js`, `js/seed-data.js` e `MEMORY.md`.
  - Corrigido texto duplamente codificado no baseline de faturas (`"ZÃ© Delivery - NuPay"` → `"Zé Delivery - NuPay"`).
- **Observação sobre a §18:** os elementos `#topTotalBeneficiosVal` e `#topRendaConjuntaSub` citados ali **não existem mais** no markup atual (a seção é histórica). Hoje os benefícios são exibidos em:
  - `#topVaVal` / `#topVrVal` (linhas de **crédito** do mês: `R$ 2.050,00` e `R$ 1.105,00`, base USC, sem rollover — o rollover não entra em "Ganhos" para não duplicar receita de mês anterior);
  - `#topSatVaVal` / `#topSatVrVal` (chip Casa Maracaju com o **saldo restante** do ciclo vigente, ex.: `VA R$ 1.988,78` / `VR R$ 805,41`);
  - `#topSatCasaVal` (container do chip) e `#topGanhosFooterTotalVal` (total de ganhos com benefícios).
  - O KPI `#calVRTotal` da aba Calendário (`R$ 1.170,00` = 18 dias civis × R$ 65) é **informativo** e não sobrescreve mais `totais['VR']` — a regra contratual de VR (`R$ 1.105,16`) permanece inviolável.

---

## 27. UX Responsiva (v113): Nada de Informação Cortada, FAB Discreto e Alvos de Toque Reais

- **Regra de ouro do truncamento**: rótulos e valores **informativos** não podem depender de `text-overflow: ellipsis`. Onde o texto não cabe, ele **quebra linha** (`.dual-gastos-title`, `.dual-gastos-sub`, `.unified-card-title`, `.unified-row > span`, `.cal-header-title`, `.cal-kpi-label`, `.cal-kpi-sub`, `.cal-banner-inline`, `.eq-label`). O único lugar em que `ellipsis` continua aceitável é em conteúdo redundante (tooltip já presente).
- **Nunca sobrescrever `className` de botões que carregam classe estrutural.** `setSim2055Meta` e `onSim2055CustomRendaInput` faziam `btn.className = 'btn-matrix'` e apagavam `.sim2055-meta-btn` — o layout de card do simulador 2055 quebrava assim que o modal abria. Use a lista completa (`'btn-matrix sim2055-meta-btn [primary]'`) ou `classList.toggle`.
- **FAB "Gasto Diário"**:
  - `≤480px`: circular de 52px, só o ícone (`aria-label="Registrar gasto diário"`), para não cobrir valores de tabelas;
  - **oculto** nas abas `tab-holerites` e `tab-backup` (feito em `switchTab`) para não cobrir campos de formulário;
  - `.tab-content.active` reserva `padding-bottom` para o conteúdo rolar além do FAB.
- **Alvos de toque (mobile)**: mínimo de ~40px de altura nos controles do cabeçalho (`header-controls`), 42×38px nas setas de mês (`#prevMonthBtn`/`#nextMonthBtn`) e 30px nos chips `✏️ Saldos`. A regra antiga `.month-nav-btn` apontava para uma classe inexistente — cuidado com seletores órfãos.
- **Rolagem horizontal com pista visual**: `.unified-satellites-bar` e `.cal-legend-bar` usam máscara de *fade* na borda direita (`mask-image`) para indicar que há mais conteúdo; os rótulos dos chips têm 9,5px (mínimo aceitável) no celular.
- **Formulários**: em `≤640px`, linhas com `datetime-local` + valor empilham (o input de data tem largura mínima grande e esmagava o campo de valor).
- **Simulador 2055**: `.sim2055-meta-grid` usa `repeat(auto-fit, minmax(128px, 1fr))` e os cards de resultado não cortam valores (`R$ 1.014.106,20` deve aparecer inteiro).
- **Checklist de validação visual**: o app deve ser conferido em **1440×900, 768×1024, 390×844 e 360×740** com `document.documentElement.scrollWidth === window.innerWidth` e nenhum rótulo truncado.
- Service Worker atualizado para `matrix-finance-v113`.

---

## 28. Segredos, Datas Reais e KPI de VR do Calendário (v114)

- **Token do Casa Maracaju nunca no código**:
  - O token é lido de `localStorage` (`matrix_maracaju_token`) e editado em **Backup & Conexões**
    (`#cfgMaracajuToken`). `DEFAULT_ENDPOINTS.maracajuToken` é `''`.
  - Sem token o conector **não** dispara GET/POST: devolve
    `{ success: false, error: 'Token do Casa Maracaju não configurado (Backup & Conexões).' }`
    e o restante do scraping segue normalmente.
  - **Rotação obrigatória**: o token antigo esteve versionado em repositório público e continua
    no histórico do Git. Trocar o valor no Apps Script do Casa Maracaju e salvar o novo token
    apenas nos dispositivos.
- **Nada de `'2026-11'` como regra**: usa-se `isMesVigenteReal(ano, mes)` (`app.js`) e
  `getDiariosMesVigente(state)` (`satellite-connectors.js`); no sync a comparação é
  `cicloVigente` local × `cicloVigente` do snapshot. Literais de 2026 que restarem devem ser
  **dados** (seed/fallback), nunca condição de comportamento.
- **KPI de VR no Calendário (`#calVRTotal`)**:
  - Título: **“VR Consumido (R$ 65/dia)”**. Valor = dias presenciais × R$ 65 (**consumo estimado**,
    não crédito).
  - Subtítulo: `N dias x R$ 65 • crédito R$ 1.105,16` (crédito de `satellites.maracaju.vrTotal`).
  - Se o consumo passar do crédito, o número fica em âmbar (`var(--amber)`) e ganha `title`
    explicativo. **Nunca** grava em `totais['VR']` — a regra contratual de VR segue inviolável.
- Service Worker atualizado para `matrix-finance-v114`.

---

## 29. Saldo VA/VR sem Contagem Dupla (v115)

- **Fonte única para cada compra**: um gasto com conta `cartao_va`/`cartao_vr` lançado **no Matrix** entra no
  saldo do Casa Maracaju **apenas** pelo parâmetro `matrixDiarios` de `processMaracajuData`.
  - `comprasCicloAtual` pode conter itens `fromMatrix: true` (para exibição/histórico), mas eles **não podem
    voltar como `comprasRegistros`** em `syncMaracajuFromLocal` — por isso o filtro `.filter(r => !r.fromMatrix)`
    em `existingSynthetic` e o `if (r.fromMatrix) return;` no laço de registros.
  - Motivo: os "registros" deduplicam por `id`/`nfeKey`, enquanto os diários deduplicam por
    `data_valor_nome`; sem o filtro, a mesma compra era somada duas vezes (bug da v114, corrigido na v115).
- **Auto-cura de estado inflado**: as guardas `existing.gasto* > computed.gasto*` (que preservavam gastos
  antigos) só se aplicam quando **não** existe derivado de diários (`temDerivadosDeDiarios`). Com diários,
  o recálculo é autoritativo e corrige valores gravados pelo bug na primeira carga.
- **Sintoma que isso causava**: chip Casa Maracaju com saldo menor que o real (ex.: `VA 1.614,98` / `VR 343,26`
  quando o correto era `1.988,78` / `805,41` no cenário base) — a diferença era exatamente 2× a soma dos diários
  de VA/VR do mês.
- Service Worker atualizado para `matrix-finance-v115`.

---

## 30. Gasto Diário de VA/VR é Espelho do Casa Maracaju (v116)

- O modal **Registrar Gasto Diário** é o espelho do app Casa Maracaju: ao lançar uma compra com
  `cartao_va`/`cartao_vr`, ela normalmente já existe do outro lado.
- **Regra de soma**: `processMaracajuData` monta `seenSateliteDateValue` com a assinatura
  `data|valor|método` de cada compra vinda do satélite. Um diário do Matrix com a mesma
  assinatura é **ignorado** (é espelho); com assinatura nova entra **uma única vez**.
- **Data do diário**: usar `d.data || d.dataHora` — os diários reais gravam `dataHora`
  (`2026-11-07T10:00`), então o corte para `YYYY-MM-DD` é obrigatório para a assinatura casar.
- **Espelho reverso (edição de saldo)**: `salvarSaldoAtualMaracajuInline` grava
  `settings.benefits.monthlyEndingBalances[cicloVigente]` no `MARACAJU_STATE_v1`; nunca use
  chave fixa de mês.
- **Cuidado ao mudar isso**: remover a deduplicação por `data+valor+método` reintroduz o bug do
  saldo VA/VR abaixo do real (diferença de 1× a soma dos diários espelhados).
- Service Worker atualizado para `matrix-finance-v116`.

---

## 31. Saldo do Casa Maracaju é Preservado no Carregamento (v117)

- **Fonte da verdade**: o saldo vigente de VA/VR vem do app **Casa Maracaju 88** (aba *Mercado*) e chega ao
  Matrix pelo conector/ponte `MARACAJU_STATE_v1`. O Matrix **não** pode substituí-lo por valores de exemplo.
- **Regra de inicialização**: `db.js` (`sanitizeState`) e `app.js` (`init`) só criam o estado inicial quando
  **faltam** `vaTotal`, `vrTotal`, `saldoVaRestante` ou `saldoVrRestante`. Nunca por:
  - `vaTotal !== 2059.84` / `vrTotal !== 1105.16` (comparação estrita de float; `"2059.84"` string quebrava);
  - `cicloVigente !== '2026-11'` (mês fixo — na virada do mês zerava o saldo todo carregamento).
- **Seed**: `cicloVigente` é calculado com a data real e `creditDate` nasce `null` (o conector preenche no
  primeiro sync). Não reintroduza literais de mês no seed.
- **Sintoma que isso causava**: ao carregar, o chip mostrava `1.988,78 / 805,41` (exemplo) em vez do saldo
  real do app (`1.614,98 / 343,26`), voltando ao certo só depois de uma sincronização.
- Service Worker atualizado para `matrix-finance-v117`.

---

## 32. Nada de Valor de Exemplo na Tela: Estados de Carregamento (v120)

- **Dados de satélite nunca aparecem "chutados"**: enquanto o primeiro puxão dos apps de terceiros não chega,
  o chip **Casa Maracaju** (`#topSatVaVal` / `#topSatVrVal`) exibe **`VA —` / `VR —`**, com opacidade 0.75 e
  `title` "Sincronizando saldos com o app Casa Maracaju…".
- **Regra de implementação**:
  - o HTML nasce com `—` (nunca com números de exemplo);
  - os seeds de `satellites.maracaju` (em `db.js` e `app.js`) carregam `semente: true`;
  - o render só mostra números quando o objeto **não é semente** (ou é `manualOverride` do usuário), isto é,
    quando veio de `syncMaracajuFromLocal` / `scrapeAll`;
  - estado real salvo em `localStorage` (sem `semente`) aparece imediatamente, sem flash.
- **Drilldown `maracaju`**: com estado pendente, mostra o aviso âmbar "⏳ Aguardando o primeiro puxão do app
  Casa Maracaju…" e saldos/inputs com `—`.
- **Ao adicionar novos KPIs satélites**: siga o mesmo padrão (placeholder neutro + marca de semente), para não
  repetir o flash de `1.988,78 / 805,41` antes da sincronização.
- Service Worker atualizado para `matrix-finance-v120`.

---

## 33. Backup Pré-configurado, Satélite "Fresco" e Rolagem no Celular (v127)

- **Endpoint de backup padrão**: `DEFAULT_CLOUD_URL` em `sync-engine.js` aponta para o Apps Script de backup
  do Matrix. `getConfig().cloudUrl` = `localStorage` → fallback para esse default, então o boot já chama
  `fetchFromCloud()`. O token continua em `localStorage` (a URL sozinha não grava nada sem ele).
- **Dado de satélite velho não é exibido como atual**:
  - `maracajuFreshNestaSessao` só fica `true` quando o Casa Maracaju responde (`results.maracaju.success`) ou
    quando o `fetchFromCloud` retorna dados;
  - `atualizadoEm` com mais de **6 h** + sessão sem sincronização ⇒ chip `VA — / VR —` (mesmo no drilldown);
  - **fallback de 8 s** aceita o último dado salvo se nada responder (offline/sem token), via `scheduleRenderAll`.
- **Rolagem no celular**: **nunca** use `touch-action: pan-x` em contêiner de conteúdo (`.tab-content`).
  `pan-x` desliga o pan vertical e o app "trava" ao arrastar dentro da página. Use `pan-y pinch-zoom`;
  o swipe horizontal de abas é feito por JS. `pan-x` só em faixas horizontais (`.unified-satellites-bar`,
  `.sat-chip`, `.cal-legend-bar`).
- Service Worker atualizado para `matrix-finance-v127`.

---

## 34. Contador Regressivo do Salário no Calendário (v128)

- **O que mostra**: `💼 Próximo salário [4º dia útil]` + data (`04/12/2026 (sexta)`) + **D-N dias**.
  O salário exibido é o que **fecha o ciclo do mês selecionado**: `getSalaryPayday(mês + 1)`.
  - Mês atual (nov/2026 em 11/11): 23 dias.
  - Mês futuro (dez/2026): 07/01/2027, 57 dias.
  - Mês passado: `✔` + "Salário já creditado em DD/MM/AAAA".
- **Cálculo**: `CalendarEngine.getSalaryPayday(ano, mês)` — 4º dia útil **bancário nacional**
  (fins de semana + feriados bancários; feriados municipais como 04/11 em São Carlos **não** entram).
  A diferença é em dias corridos: `Math.round((alvo - hoje) / 86400000)`.
- **Cores**: verde (> 5 dias), âmbar (≤ 5), "HOJE 💰" (0) e `✔` (negativo = já creditado).
- **Nunca** recalcule isso com dias úteis “civis” ou com o mês do calendário sem o `+1`: o crédito de
  um ciclo cai sempre no mês seguinte.
- **KPIs do calendário (mobile)**: tamanhos por **classe** (`.cal-kpi-label` 9,5px · `.cal-kpi-val` 17px ·
  `.cal-kpi-sub` 10px). Não volte a usar `div:last-child` — o seletor pegava o sub-rótulo e o deixava com 15px.
- Service Worker atualizado para `matrix-finance-v128`.

---

## 35. Cotações de Ações: Fechamento Automático + Botão "Cotação Atual" (v129)

- **Fonte única**: ação `quotes` do Apps Script (`fetchStockQuote` → Yahoo Finance via `UrlFetchApp`).
  O Yahoo **não** libera CORS para o navegador; a `/exec` do Apps Script libera (`Access-Control-Allow-Origin: *`).
  Nunca chame o Yahoo direto do cliente nem dependa de proxies públicos (brapi sem token = 401; allorigins instável).
- **Contrato da ação**: `GET ?action=quotes&symbols=CSNA3,MGLU3&token=...` →
  `{ success: true, data: [{ ticker, ok, fechamento, fechamentoData, atual, atualEm, moeda, fonte }] }`.
  `fechamentoData` é `YYYY-MM-DD` no fuso `America/Sao_Paulo` e **nunca** é o dia corrente (é o último fechamento
  anterior a hoje); `atual` é `meta.regularMarketPrice`.
- **Cliente** (`js/market-quotes.js`): cache `matrix_market_quotes_v1` (12 min), auto-sync no máximo a cada 10 min,
  `fechamento` no boot da aba e `atual` no botão. Tickers vêm de `item.ticker` ou do padrão `AAAA3` dentro de `ativo`.
- **Ao mudar `apps_script.gs`, sempre avise que é preciso reimplantar** (Implantar → Gerenciar implantações →
  Editar → Versão: Nova versão). Sem isso a ação nova responde `Ação inválida` e o app mostra a instrução.
- Service Worker atualizado para `matrix-finance-v129`.

---

## 36. Cards de Meta do Renda+ 2055 são Calculados (v130)

- **Nunca** volte a colocar números fixos nos cards do banner do simulador. As rendas das metas são
  constantes (`6044,00` / `6519,11` / `11479,11` — documentadas no relatório), mas o **aporte** é
  calculado por `calcularAporte2055(renda, params)` com os parâmetros salvos:
  `matrix_simulador_2055_params` (PU, taxa real, saldo atual).
- Fórmula: patrimônio = `renda/0,875 × (1 − (1+r)^-240)/r`; aporte = `(patrimônio − saldo×(1+r)^348) /
  (((1+r)^348 − 1)/r)`, com `r = (1+taxa)^(1/12) − 1`.
- `atualizarCardsMetas2055()` é chamado no `renderInvestments`, no `recalcularSimulador2055` (oninput) e no
  `salvarParametrosSimulador2055` (que recalcula antes de salvar). O rodapé `#simMetasParametros` mostra
  a taxa e o saldo usados — se o card não mudar, confira esse rodapé.
- Service Worker atualizado para `matrix-finance-v130`.
