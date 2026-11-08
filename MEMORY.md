# Memória Persistente do Projeto — Férias Inteligente

Este arquivo registra o histórico permanente de auditorias, regras de negócio aprendidas, correções implementadas e diretrizes de arquitetura para orientação de sessões e modelos futuros.

---

## [2026-11-04 15:55] - Revisão e Correção Automática (/revisar)

### 🔍 Problemas Identificados & Causa Raiz

1. **Incongruência de Metadados em `js/dados.js` (`montarCalendarios`)**:
   - *Falha*: A função `montarCalendarios()` reconstruía o objeto `calendarios[ano].entes[enteId]` com uma lista fixa de propriedades (`id`, `nome`, `esfera`, `pagamento`, `abonadas`, etc.), omitindo `regrasInicio` que foi adicionada em `data/entes.json`.
   - *Causa Raiz*: Whitelist manual de propriedades em `js/dados.js` sem mapear `regrasInicio`. No motor (`js/motor.js`), a condição `enteObj && enteObj.regrasInicio` resultava em `undefined` no navegador (funcionava na USP somente pelo fallback `ehUsp === true`).

2. **Incongruência no Precache Offline do PWA (`sw.js`)**:
   - *Falha*: `js/pwa.js` é importado no final de `index.html` para registrar o Service Worker, mas não estava listado no array `PRECACHE` do `sw.js`.
   - *Causa Raiz*: Omissão do arquivo ao estruturar os assets do shell offline.

3. **Incompatibilidade Multiplataforma no Script de Validação (`package.json`)**:
   - *Falha*: O comando `"check": "agy-node --check js/*.js scripts/*.js"` falhava no Windows (`MODULE_NOT_FOUND`) porque cmd/powershell não expandem globs (`*.js`), e dependia do binário `agy-node` em vez do runner universal `node`.
   - *Causa Raiz*: Suposição de expansão de glob pelo shell (comum em bash, inexistente em cmd.exe).

4. **Lacuna de Testes em `escolherAno` e `montarCalendarios`**:
   - *Falha*: A função de virada de ano (`escolherAno`, regra de 1º de outubro) e a integridade de montagem de calendários não possuíam testes unitários automatizados.

5. **Lista de Arquivos do Sincronizador GitHub Desatualizada (`scripts/upload-github.js`)**:
   - *Falha*: `upload-github.js` não continha `js/pwa.js`, `MEMORY.md` nem novos utilitários.

---

### 🛠️ Correções Implementadas

1. **Propagação de `regrasInicio` em `js/dados.js`**:
   - Adicionado `regrasInicio: entes[id].regrasInicio || null` na montagem de cada ente em `montarCalendarios()`.
   - Exportadas as funções `montarCalendarios` e `escolherAno` tanto em `window` (quando em navegador) quanto em `module.exports` (quando em ambiente Node.js de teste).

2. **Atualização do Precache Offline (`sw.js`)**:
   - Incluído `"js/pwa.js"` no array `PRECACHE`.
   - Incrementado `CACHE_VERSION` para `"v6"` para garantir revalidação imediata do cache nos clientes.

3. **Criação do Verificador de Sintaxe Universal (`scripts/check-syntax.js`)**:
   - Criado script nativo em Node.js usando a API `vm.Script` para varrer recursivamente `js/`, `scripts/` e `test/`.
   - Atualizado `package.json` para `"check": "node scripts/check-syntax.js"` e `"test": "node --test test/**/*.test.js"`.
   - Atualizado `.github/workflows/ci.yml` para executar o script multiplataforma.

4. **Novos Testes Automatizados em `test/dados.test.js`**:
   - Teste de `escolherAno`: valida que antes de 1º de outubro (ex.: setembro) o app não libera o ano seguinte, e a partir de 1º de outubro o ano seguinte é liberado.
   - Teste de `montarCalendarios`: valida que `regrasInicio.proibirSexta` e `regrasInicio.proibirAntecedenciaFeriado` são devidamente propagados para `window.CALENDARIOS[ano].entes.usp`.

5. **Sincronização Abrangente (`scripts/upload-github.js`)**:
   - Incluídos `js/pwa.js`, `scripts/check-syntax.js` e `MEMORY.md` no array `ARQUIVOS`.

---

### 🧪 Validação

- **Sintaxe**: 17 arquivos JS verificados via `scripts/check-syntax.js` (0 erros).
- **Testes Unitários**: 23 testes executados com 100% de aprovação (0 falhas).
  - App exporta iniciar, trocarAno e resetar
  - App.trocarAno reseta estado completo e limpa DOM
  - atualizarAnoUI e trocarAno refletem ano no DOM
  - js/dados.js delega para App.trocarAno com fallback
  - js/dados.js escolherAno: transição de ano respeita 1º de outubro
  - js/dados.js montarCalendarios: preserva regrasInicio de entes.json
  - pmrp 30 dias corridas: totalDescanso >= 30
  - usp 15 dias abonadas: abonadas dentro das regras
  - limeira abonadas _duplo: somente quando fracionado é false
  - usp 5 dias: resultados válidos com diasFerias === 5
  - 0 dias de férias com banco de horas: semFerias: true e diasEspeciais.length > 0
  - usp ferias: nunca iniciam na sexta-feira nem nos 2 dias que antecedem feriados
  - pmrp: permite inícios em sexta-feira quando aplicável
  - Meeus Easter e feriados móveis 2027 e 2028
  - Moveis.entradasParaJSON: estrutura correta
  - Botão personalizado: HTML, listeners, comportamento e CSS
  - opcoesRestantes: 0 dias + fluxo multi-período + prevenção de colisão

---

### 🧠 Regras & Decisões Aprendidas (Para Próximos Chats)

1. **Configuração Orientada a Dados (`data/entes.json`)**:
   - Toda nova regra ou restrição legal de um órgão (ex.: `regrasInicio`, `abonadas`) deve ser declarada em `data/entes.json` e propagada em `js/dados.js:montarCalendarios()`.
   - O motor em `js/motor.js` deve sempre ler do `enteObj` montado a partir de `CALENDARIOS[ano].entes[enteId]`, mantendo fallback conservador apenas se o metadado não estiver definido.

2. **Regras Férias Web (USP / CLT art. 134, § 3º)**:
   - Servidores da USP nunca podem iniciar férias na sexta-feira nem nos 2 dias que antecedem feriados ou pontos facultativos.
   - Folgas de banco de horas / TRE puras (`diasFerias === 0`) são isentas dessa vedação de férias.

3. **Transição de Ano (1º de Outubro)**:
   - O ano Y só é liberado para exibição a partir de 1º/out do ano Y-1. Antes dessa data, mesmo que os dados do ano Y existam, o app prioriza o ano corrente para evitar exibição de projeções antes dos decretos oficiais.

4. **Multiplataforma (Windows + Linux)**:
   - Nunca utilizar wildcards (`*.js`) em chamadas CLI do `package.json` dependentes de shell. Use scripts Node dedicados (`scripts/check-syntax.js`).

---

## [2026-11-04 16:55] - Correção de Falha na CI e Desbloqueio do GitHub Pages

### 🔍 Problemas Identificados & Causa Raiz

1. **Falha na CI (Node 20)**:
   - *Falha*: A execução dos testes automatizados falhava no ambiente Node 20 com o erro: `Could not find '.../test/**/*.test.js'`.
   - *Causa Raiz*: No runner Ubuntu do GitHub Actions, o bash é executado sem `globstar` ativado, de forma que o padrão recursivo `**/*.test.js` não é expandido pelo shell. No Node 22 há resolução de globs embutida no CLI, mas no Node 20 a ausência de expansão causou a tentativa de carregar o arquivo com o literal `**`, quebrando a esteira com exit code 1.
   - *Impacto*: O repositório exibia badge de falha vermelha (❌), e o deploy do GitHub Pages foi impedido de prosseguir.

2. **Deploy Quebrado no GitHub Pages (`errored: Page build failed`)**:
   - *Falha*: O status da API do GitHub Pages retornou `Pages status: errored (Page build failed.)`.
   - *Causa Raiz*: Ausência do arquivo `.nojekyll` na raiz do repositório. Por padrão, o GitHub Pages aciona o parser do Jekyll para compilar o site. Na presença de arquivos markdown e diretórios especiais, o Jekyll falhou na compilação estática.
   - *Impacto*: O site publicado em `https://matheusdochapeu-hub.github.io/ferias-inteligente/` permaneceu estagnado na versão antiga (`v4`), onde as férias da USP ainda iniciavam em sextas-feiras.

3. **Spam de Commits Concorrentes no Sincronizador (`scripts/upload-github.js`)**:
   - *Falha*: O script subia todos os 21 arquivos sequencialmente criando 21 commits separados via API REST, cancelando deploys do Pages e estourando o limite de concorrência.
   - *Causa Raiz*: Ausência de verificação de hash Git local vs. remoto (`gitBlobSha`).

### 🛠️ Correções Implementadas

1. **Correção do Padrão de Testes na CI (`.github/workflows/ci.yml` & `package.json`)**:
   - Substituído `node --test test/**/*.test.js` por `node --test test/*.test.js`. Como todos os testes do projeto estão situados diretamente na raiz da pasta `test/`, o glob simples é expandido perfeitamente tanto no Node 20 quanto no Node 22 e no Windows.

2. **Criação de `.nojekyll` na Raiz**:
   - Adicionado o arquivo `.nojekyll` para desativar o mecanismo Jekyll no GitHub Pages, garantindo deploy estático imediato e livre de falhas de build.

3. **Deduplicação de Uploads via Hash Git (`scripts/upload-github.js`)**:
   - Implementado cálculo de SHA-1 idêntico ao Git (`blob <size>\0<bytes>`). O script agora verifica se o hash local coincide com o remoto e pula arquivos inalterados, enviando apenas arquivos que de fato sofreram modificação.

### 🧪 Validação

- Testes nativos executados: 23 testes passando localmente (Node 20 e 24+).
- Script de sintaxe: 17 arquivos validados sem nenhum erro de parsing.
- Verificação exaustiva de sextas-feiras: 0 sugestões de início em sextas-feiras para a USP em qualquer cidade ou modo.


---

## [2026-11-05 16:30] - Nova Identidade Visual e Ícones Modernos 3D (Lógica do App Maracaju)

### 🎨 Motivação & Solução
1. **Nova Identidade Visual 3D**:
   - Seguindo a lógica do app Maracaju, o cabeçalho agora utiliza uma marca estruturada (`.brand-wrapper`) com o logotipo moderno do app (`.brand-logo`) ao lado do título institucional, substituindo o emoji cru anterior.
   - Ícone concebido com metáfora 3D tátil de alto padrão (calendário moderno de mesa integrado a um cenário tropical ensolarado com mar turquesa, areia e guarda-sol listrado, em degradê azul real e oceano profundo).
2. **Pacote Completo de Ícones PWA**:
   - Gerados com interpolação de alta qualidade: `icon-512.png`, `icon-192.png`, `icon-maskable-512.png` (com safe margin para launchers circulares/adaptativos do Android), `apple-touch-icon.png` (180x180), `favicon.png` (64x64) e `favicon.ico` multi-resolução (16/32/48/64) na raiz.
   - Criado script de automação `scripts/generate-icons.ps1` usando PowerShell e `System.Drawing`.
3. **PWA & Cache**:
   - `sw.js` atualizado para a versão de cache `v7`, incluindo os novos assets de ícone no precache offline.
4. **Validação**:
   - 16 arquivos JS validados pelo verificador de sintaxe (0 erros).
   - 23 testes unitários nativos executados com 100% de aprovação.


---

## [2026-11-06 11:30] - Botão de Instalação PWA e Guia Ilustrado

### 📲 Motivação & Solução
1. **Botão "Instalar aplicativo" no Cabeçalho**:
   - Adicionado botão pill com degradê azul escuro/real (`#1565c0` / `#0d47a1`), ícone `📲` e microinteração de hover em `.header-actions`.
   - Se o usuário já estiver acessando em modo standalone (PWA instalado), o botão é automaticamente ocultado para não ocupar espaço.
2. **Suporte Nativo Android / Chromium e Guia iOS**:
   - Em navegadores com suporte a `beforeinstallprompt` (Chrome Android, Edge, etc.), aciona diretamente a caixa de diálogo nativa de instalação com 1 toque.
   - No iPhone/Safari ou navegadores sem prompt nativo, abre o modal acessível `#instalar-modal` com passo a passo ilustrado para iOS (Safari), Android e Computador.
3. **PWA & Cache**:
   - `sw.js` incrementado para `v8`.
4. **Validação & Testes**:
   - Criado `test/pwa.test.js` cobrindo presença no HTML, estilos CSS e listeners em `js/pwa.js`.
   - 17 arquivos JS validados pelo verificador de sintaxe (0 erros).
   - 26 testes unitários nativos executados com 100% de aprovação.

- **Garantia de Desaparecimento Pós-Instalação**:
  - Implementada media query CSS `@media all and (display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui) { #btn-instalar-app, .header-actions { display: none !important; } }`, eliminando qualquer piscada visual ao abrir o app instalado.
  - Monitoramento contínuo em JavaScript (`ehStandalone()`, listener dinâmico de `matchMedia`, evento `appinstalled`, aceite no `beforeinstallprompt` e persistência em `localStorage`).
  - Adicionado botão *"Já instalei o app"* no rodapé do modal de instruções para usuários de iPhone/Safari poderem ocultar o botão manualmente caso desejem.

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


