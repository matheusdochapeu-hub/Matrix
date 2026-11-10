import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const scriptsCarregados = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map(
  (m) => m[1].replace(/\?.*$/, '')
);

test('HTML: documento completo e sem tags truncadas', () => {
  assert.match(html, /^<!DOCTYPE html>/i, 'index.html deve começar com <!DOCTYPE html>.');
  assert.match(html, /<\/html>\s*$/i, 'index.html deve fechar a tag </html>.');

  const truncadas = (html.match(/<\/[a-z]{1,2}(?:\s|>|\r?\n)/gi) || [])
    .map((t) => t.trim().toLowerCase())
    .filter(
      (t) =>
        !['</p>', '</b>', '</i>', '</u>', '</a>', '</em>', '</li>', '</td>', '</th>', '</tr>', '</h1>', '</h2>', '</h3>', '</h4>', '</h5>', '</h6>', '</ol>', '</ul>', '</div>', '</h1>'].includes(t)
    );
  assert.equal(truncadas.length, 0, `Tags suspeitas/truncadas encontradas: ${truncadas.join(', ')}`);
});

test('HTML: nenhum id duplicado (quebra getElementById em produção)', () => {
  /*
   * Até a v111 o quadro de resultados do simulador 2055 aparecia duas vezes no
   * index.html: o bloco dentro do modal (atualizado por getElementById) e uma
   * cópia órfã no fim do <body> com valores fixos. Como getElementById devolve
   * sempre o PRIMEIRO elemento, a cópia órfã ficava visível e nunca era
   * atualizada. Na v112 o bloco órfão foi removido, então nenhuma exceção é
   * tolerada aqui: qualquer id repetido reprova a suíte.
   */
  const ids = Array.from(html.matchAll(/\sid=["']([^"']+)["']/g)).map((m) => m[1]);
  const vistos = new Map();
  const duplicados = [];

  for (const id of ids) {
    const total = (vistos.get(id) || 0) + 1;
    vistos.set(id, total);
    if (total === 2) duplicados.push(id);
  }

  assert.equal(duplicados.length, 0, `IDs duplicados no index.html: ${duplicados.join(', ')}.`);
  assert.ok(ids.length > 100, `Esperado um HTML grande com muitos IDs, encontrado ${ids.length}.`);
});

test('HTML: todos os <script src> apontam para arquivos existentes', () => {
  assert.ok(scriptsCarregados.length >= 8, `Esperado ao menos 8 scripts, encontrado ${scriptsCarregados.length}.`);

  for (const src of scriptsCarregados) {
    if (/^https?:/i.test(src)) continue;
    assert.ok(fs.existsSync(path.join(rootDir, src)), `O script "${src}" deve existir no repositório.`);
  }
});

test('HTML: ordem de carregamento preserva as dependências do app', () => {
  const indice = (nome) => scriptsCarregados.findIndex((s) => s.endsWith(nome));

  const db = indice('js/db.js');
  const app = indice('js/app.js');
  assert.ok(db >= 0, 'js/db.js precisa ser carregado.');
  assert.ok(app >= 0, 'js/app.js precisa ser carregado.');
  assert.ok(db < app, 'js/db.js deve ser carregado ANTES de js/app.js (app usa MatrixDB).');

  for (const modulo of ['js/sync-engine.js', 'js/satellite-connectors.js']) {
    const pos = indice(modulo);
    if (pos >= 0) {
      assert.ok(pos < app, `${modulo} deve vir antes de js/app.js.`);
    }
  }
});

test('HTML: versionamento ?v= é uniforme em todos os assets', () => {
  const versoes = Array.from(html.matchAll(/\?v=(\d+)/g)).map((m) => m[1]);
  assert.ok(versoes.length > 0, 'Os assets devem usar cache-busting com ?v=.');

  const distintas = [...new Set(versoes)];
  assert.equal(
    distintas.length,
    1,
    `Todos os assets devem compartilhar a mesma versão ?v=; encontrado: ${distintas.join(', ')}. Misturar versões deixa o PWA com arquivos antigos em cache.`
  );
});

test('HTML: ?v= dos assets casa com o CACHE_NAME do service worker', () => {
  const versaoHtml = html.match(/\?v=(\d+)/);
  assert.ok(versaoHtml, 'Os assets devem usar cache-busting com ?v=.');

  const sw = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
  const versaoCache = sw.match(/CACHE_NAME\s*=\s*['"]matrix-finance-v(\d+)['"]/);
  assert.ok(versaoCache, 'sw.js deve declarar CACHE_NAME no padrão matrix-finance-vN.');

  assert.equal(
    versaoHtml[1],
    versaoCache[1],
    `O ?v=${versaoHtml[1]} do index.html está dessincronizado do CACHE_NAME v${versaoCache[1]} do sw.js. Suba as DUAS versões juntas ao publicar assets.`
  );
});

test('HTML: nenhum arquivo de js/ ficou órfão (existe no disco mas não é carregado)', () => {
  const emDisco = fs
    .readdirSync(path.join(rootDir, 'js'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `js/${f}`);

  const naoCarregados = emDisco.filter((arquivo) => !scriptsCarregados.includes(arquivo));
  assert.equal(
    naoCarregados.length,
    0,
    `Estes módulos existem mas não são carregados pelo index.html: ${naoCarregados.join(', ')}`
  );
});
