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

{
  /*
   * Dívida conhecida (2026-11-10): o quadro de resultados do simulador 2055 está
   * duplicado dentro do mesmo modal — um bloco dinâmico (atualizado por
   * getElementById em app.js) e uma cópia antiga com valores fixos
   * ("R$ 1.053.372", "2.259,5 títulos"). Como getElementById sempre devolve o
   * PRIMEIRO elemento, a cópia antiga nunca é atualizada.
   *
   * Enquanto a duplicação não for removida, estes IDs ficam na lista de
   * exceções. Qualquer NOVO id duplicado reprova a suíte.
   */
  const IDS_DUPLICADOS_CONHECIDOS = new Set([
    'simResAporteMensal',
    'simResTitulosMes',
    'simResTotalTitulos',
    'simResMontanteFinal',
    'sim2055LabelMeta'
  ]);

  test('HTML: nenhum id duplicado (quebra getElementById em produção)', () => {
    const ids = Array.from(html.matchAll(/\sid=["']([^"']+)["']/g)).map((m) => m[1]);
    const vistos = new Map();
    const duplicados = [];

    for (const id of ids) {
      const total = (vistos.get(id) || 0) + 1;
      vistos.set(id, total);
      if (total === 2) duplicados.push(id);
    }

    const inesperados = duplicados.filter((id) => !IDS_DUPLICADOS_CONHECIDOS.has(id));
    assert.equal(
      inesperados.length,
      0,
      `IDs duplicados no index.html: ${inesperados.join(', ')}. (IDs da dívida conhecida do simulador 2055 estão permitidos.)`
    );
    assert.ok(ids.length > 100, `Esperado um HTML grande com muitos IDs, encontrado ${ids.length}.`);
  });

  test('HTML: a dívida de IDs duplicados não cresceu além do conhecido', () => {
    const ids = Array.from(html.matchAll(/\sid=["']([^"']+)["']/g)).map((m) => m[1]);
    const contagem = new Map();
    ids.forEach((id) => contagem.set(id, (contagem.get(id) || 0) + 1));

    for (const id of IDS_DUPLICADOS_CONHECIDOS) {
      const total = contagem.get(id) || 0;
      assert.ok(
        total <= 2,
        `O id "${id}" aparece ${total}x. A duplicação conhecida é de 2 ocorrências — foi piorada.`
      );
    }
  });
}

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
