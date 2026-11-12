import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Carrega vários scripts clássicos no MESMO contexto (como o index.html faz).
 * Devolve o sandbox para o teste pegar window.SatelliteConnectors / window.SyncEngine.
 */
function carregarAplicacao(arquivos) {
  const store = new Map();
  const noop = () => {};
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    String,
    Number,
    Object,
    Array,
    RegExp,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    addEventListener: noop,
    removeEventListener: noop,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      createElement: () => ({ style: {}, classList: { add: noop, remove: noop }, setAttribute: noop }),
      head: { appendChild: noop },
      body: { appendChild: noop },
      visibilityState: 'visible'
    },
    navigator: {},
    location: { href: 'http://localhost/' },
    performance: { now: () => Date.now() },
    fetch: () => Promise.reject(new Error('sem rede no teste'))
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.addEventListener = noop;
  sandbox.window.removeEventListener = noop;
  vm.createContext(sandbox);
  for (const arquivo of arquivos) {
    const codigo = fs.readFileSync(path.join(rootDir, arquivo), 'utf8');
    vm.runInContext(codigo, sandbox, { filename: arquivo });
  }
  return sandbox;
}

const app = carregarAplicacao([
  'js/faturas-data.js',
  'js/satellite-connectors.js',
  'js/sync-engine.js'
]);
const SC = app.SatelliteConnectors;
const SE = app.SyncEngine;

test('Faturas: baseline embutido não se passa por retrato fresco', () => {
  const baseline = SC.getBaselineFaturasData();
  assert.equal(baseline.fonte, 'baseline', 'o baseline precisa se identificar como baseline');
  assert.equal(baseline.atualizadoEm, null, 'baseline não pode carimbar a hora atual como se fosse coleta');

  const real = SC.processFaturasData({
    extraItems: [{ desc: 'Compra Teste', val: 10, de: 1, ate: 1, tag: 'extra' }],
    overrides: {}
  });
  assert.equal(real.fonte, 'satelite');
  assert.ok(!isNaN(Date.parse(real.atualizadoEm)), 'retrato real tem data de coleta');
  assert.equal(SC.faturasSnapshotTs(baseline), 0, 'baseline nunca é "mais novo"');
  assert.ok(SC.faturasSnapshotTs(real) > 0);
});

test('Nuvem: compact leva as faturas e expand não inventa baseline', () => {
  const vivo = SC.processFaturasData({
    extraItems: [{ desc: 'Compra Teste', val: 10, de: 3, ate: 3, tag: 'extra' }],
    overrides: {}
  });
  const snapshot = {
    atualizadoEm: '2026-11-12T09:00:00.000Z',
    anos: { '2026': { Dezembro: { receitas: [], fixos: [] } } },
    satellites: { faturas: vivo }
  };

  const compacto = SE.compactStateForCloud(snapshot, 45000);
  assert.ok(compacto.satellites.faturas, 'as faturas precisam ir para a nuvem');
  assert.equal(compacto.satellites.faturas.faturasPorMes['2026-Dezembro'].total, vivo.faturasPorMes['2026-Dezembro'].total);

  const expandido = SE.expandStateFromCloud(JSON.parse(JSON.stringify(compacto)));
  assert.equal(
    expandido.satellites.faturas.faturasPorMes['2026-Dezembro'].total,
    vivo.faturasPorMes['2026-Dezembro'].total,
    'o round-trip pela nuvem não pode trocar o retrato real pelo baseline'
  );

  const semFaturas = SE.expandStateFromCloud({ anos: {} });
  assert.equal(semFaturas.satellites.faturas, undefined, 'expand não pode fabricar faturas sozinho');
});

test('Faturas: merge fica com o retrato mais recente e preserva itens locais', () => {
  const baseline = SC.getBaselineFaturasData();
  const localAntigo = SC.processFaturasData({ extraItems: [], overrides: {} });
  localAntigo.atualizadoEm = '2026-11-10T10:00:00.000Z';

  const localNovo = SC.processFaturasData({ extraItems: [], overrides: {} });
  localNovo.atualizadoEm = '2026-11-12T10:00:00.000Z';

  assert.equal(SC.mergeFaturasSnapshots(baseline, localAntigo), localAntigo, 'baseline perde para retrato real');
  const voltou = SC.mergeFaturasSnapshots(localAntigo, baseline);
  assert.equal(
    voltou.faturasPorMes['2026-Dezembro'].total,
    localAntigo.faturasPorMes['2026-Dezembro'].total,
    'baseline nunca sobrescreve o retrato real do local'
  );
  assert.equal(voltou.fonte, 'satelite', 'o resultado continua marcado como retrato real');

  const nuvemMaisNova = JSON.parse(JSON.stringify(localNovo));
  nuvemMaisNova.atualizadoEm = '2026-11-12T11:00:00.000Z';
  nuvemMaisNova.faturasPorMes['2026-Dezembro'].total = 1234.56;
  const mesclado = SC.mergeFaturasSnapshots(nuvemMaisNova, localNovo);
  assert.equal(mesclado.faturasPorMes['2026-Dezembro'].total, 1234.56, 'nuvem mais nova manda no total');
  assert.ok(Array.isArray(mesclado.faturasPorMes['2027-Janeiro'].itens), 'itens locais sobrevivem quando o total é o mesmo');
});

test('Regressão: sincronizar não infla as faturas de Dez/2026 em diante', () => {
  // Cenário real: o dono excluiu a 1/6 do Studio Rocha (Jan/2027) no app Faturas, e a
  // exclusão chega no payload. O baseline embutido não a conhece — era ele que voltava
  // depois da sincronização, somando +350 em cada mês de Jan a Jun/2027.
  const extras = [{ desc: 'Claro Flex', val: 44.99, de: 2, ate: 14, tag: 'extra' }];
  const semExclusao = SC.processFaturasData({ extraItems: extras, overrides: {} });
  const vivo = SC.processFaturasData({
    extraItems: extras,
    overrides: { 'Studio Rocha 1/6 (nova)__4': -1 }
  });

  assert.ok(
    Math.abs(vivo.faturasPorMes['2027-Janeiro'].total - (semExclusao.faturasPorMes['2027-Janeiro'].total - 350)) < 0.005,
    'o payload do app Faturas precisa remover a parcela excluída'
  );
  assert.notEqual(
    SC.getBaselineFaturasData().faturasPorMes['2027-Janeiro'].total,
    vivo.faturasPorMes['2027-Janeiro'].total,
    'o baseline embutido é justamente o valor velho que não pode voltar'
  );

  const estado = { atualizadoEm: '2026-11-12T12:00:00.000Z', anos: {}, satellites: { faturas: vivo } };
  const expandido = SE.expandStateFromCloud(JSON.parse(JSON.stringify(SE.compactStateForCloud(estado, 45000))));
  for (const mes of ['2026-Dezembro', '2027-Janeiro', '2027-Fevereiro', '2027-Junho']) {
    assert.equal(
      expandido.satellites.faturas.faturasPorMes[mes].total,
      vivo.faturasPorMes[mes].total,
      `${mes} não pode mudar de valor depois de sincronizar`
    );
  }
});
