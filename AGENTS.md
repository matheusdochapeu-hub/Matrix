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
node scripts/check-syntax.js      # valida sintaxe de todos os js/ e do sw.js
node --test test/**/*.test.js     # 15 testes: sintaxe, integridade do HTML, Service Worker
npm run verify                    # os dois acima em sequência
```
O Node local do workspace fica em `..\node-bin\PFiles64\nodejs\node.exe`.

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
   (`matrix-finance-vN`) **e** o `?v=N` de todos os `<script>` no `index.html`.
   O teste `HTML: versionamento ?v= é uniforme` reprova se ficarem dessincronizados.
2. **Nunca reaproveitar `id` no HTML.** `getElementById` devolve só o primeiro.
   O teste de IDs duplicados existe por causa de um bug real (ver dívida abaixo).
3. **Não remover os `stopPropagation`/`popstate` dos modais** — foram adicionados para
   impedir fechamento acidental ao arrastar/rolar no celular.
4. **Nunca apagar `diarios` em massa** na sincronização: o merge é por `id` e por
   `(nome, valor, dataHora)` de propósito.
5. **Não expor dados pessoais** em arquivos que vão para o repositório público.

## Dívida técnica conhecida

- O quadro de resultados do simulador 2055 está **duplicado** no `index.html`
  (dois blocos com os mesmos `id`: `simResAporteMensal`, `simResTitulosMes`,
  `simResTotalTitulos`, `simResMontanteFinal`, `sim2055LabelMeta`). O segundo bloco é
  uma cópia antiga com valores fixos e nunca é atualizado. A suíte permite esses 5 IDs
  como exceção; qualquer novo duplicado reprova. **Corrigir removendo o bloco antigo.**

## Vizinhança (ecossistema)

Este app é o **centro**. Os satélites alimentam dados para cá:

- `../maracaju88` — VA/VR e contas da casa (saldo de benefícios).
- `../parcelado-a-vista` — faturas dos cartões (Nubank/BB).
- `../fisioflow` — faturamento clínico da Scarlet (ganho possível/recebido).

Ao mexer em contratos de dados entre apps, ajuste também `js/satellite-connectors.js`.
