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
npm test           # 15 testes: sintaxe, integridade do HTML, Service Worker
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
| `js/satellite-connectors.js` | Puxa dados de maracaju88, faturas e fisioflow |
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

## Dívida técnica conhecida

- **Resolvida na v112:** o quadro de resultados do simulador 2055 estava duplicado no
  `index.html` (bloco dentro do modal + cópia órfã no fim do `<body>` com valores fixos
  `R$ 1.053.372` / `2.259,5 títulos`, que nunca era atualizada). O bloco órfão foi
  removido e o teste de IDs duplicados voltou a ser estrito.
- **Acoplamento temporal:** `js/sync-engine.js` e `js/app.js` ainda tratam
  `'2026-11'`/`'2026'` como constantes em várias regras (ex.: preservação do consumo
  local do Casa Maracaju no sync). Ao virar o mês/ano, revisar essas comparações.
- **Persistência de botões rápidos é só local:** `MatrixDB.saveCustomQuickButtons`
  grava em `localStorage` (`matrix_custom_quick_buttons`) e não entra no estado
  sincronizado com o Google Sheets — cada dispositivo tem seus próprios atalhos.
- **⚠️ Segredo exposto no repositório público:** `js/satellite-connectors.js` contém
  `maracajuToken: 'Maracaju88CasalSegredo2026!'` (linhas ~27, ~390 e ~1223) junto da
  URL do Apps Script do Casa Maracaju. Como o GitHub Pages é público, qualquer pessoa
  consegue ler/gravar os dados de VA/VR. **Ação do dono do projeto:** rotacionar o
  token no Apps Script e passar a configurá-lo por `localStorage`
  (`matrix_maracaju_*`) em vez de deixá-lo no código.

## Vizinhança (ecossistema)

Este app é o **centro**. Os satélites alimentam dados para cá:

- `../maracaju88` — VA/VR e contas da casa (saldo de benefícios).
- `../parcelado-a-vista` — faturas dos cartões (Nubank/BB).
- `../fisioflow` — faturamento clínico da Scarlet (ganho possível/recebido).

Ao mexer em contratos de dados entre apps, ajuste também `js/satellite-connectors.js`.
