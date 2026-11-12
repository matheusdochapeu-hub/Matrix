import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function carregarAplicacao(arquivos, storageInicial = {}) {
  const store = new Map(Object.entries(storageInicial));
  const noop = () => {};
  const sandbox = {
    console, Date, JSON, Math, parseFloat, parseInt, isNaN, String, Number, Object, Array, RegExp, Error, Promise,
    setTimeout, clearTimeout, addEventListener: noop, removeEventListener: noop,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop,
      createElement: () => ({ style: {}, classList: { add: noop, remove: noop }, setAttribute: noop }),
      head: { appendChild: noop }, body: { appendChild: noop }, visibilityState: 'visible'
    },
    navigator: {}, location: { href: 'http://localhost/' }, performance: { now: () => Date.now() },
    fetch: () => Promise.reject(new Error('sem rede no teste'))
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const arquivo of arquivos) {
    vm.runInContext(fs.readFileSync(path.join(rootDir, arquivo), 'utf8'), sandbox, { filename: arquivo });
  }
  return sandbox;
}

const app = carregarAplicacao(['js/faturas-data.js', 'js/satellite-connectors.js']);
const SC = app.SatelliteConnectors;

test('Maracaju: payload vazio não pode ser tratado como ciclo limpo', () => {
  assert.equal(SC.maracajuPayloadTemDados({}), false);
  assert.equal(SC.maracajuPayloadTemDados(null), false);
  assert.equal(SC.maracajuPayloadTemDados({ status: 'error' }), false);
  assert.equal(SC.maracajuPayloadTemDados({ settings: {} }), false);
  assert.equal(SC.maracajuPayloadTemDados({ comprasRegistros: [] }), false);

  assert.equal(SC.maracajuPayloadTemDados({ comprasRegistros: [{ id: 'x', total: 10 }] }), true);
  assert.equal(SC.maracajuPayloadTemDados({
    settings: { benefitsSummary: { cycleKey: '2026-11', vaBalance: 1569.28, vrBalance: 343.26 } }
  }), true);
  assert.equal(SC.maracajuPayloadTemDados({ vaTotal: 2059.84, saldoVaRestante: 1569.28 }), true);
});

test('Maracaju: benefitsSummary vira saldo real (não saldo cheio)', () => {
  const payload = {
    settings: {
      benefitsSummary: {
        cycleKey: '2026-11',
        vaTotal: 2059.84, vaSpent: 490.56, vaBalance: 1569.28,
        vrTotal: 1105.16, vrSpent: 761.9, vrBalance: 343.26
      }
    }
  };
  const out = SC.processMaracajuData(payload, 1105, []);
  assert.equal(out.cicloVigente, '2026-11');
  assert.equal(out.saldoVaRestante, 1569.28);
  assert.equal(out.saldoVrRestante, 343.26);
  assert.equal(out.gastoMercadoMesAtual, 490.56);
  assert.equal(out.gastoVrMesAtual, 761.9);

  assert.equal(SC.maracajuSnapshotSuspeito(out), false, 'retrato com gasto real não é suspeito');
});

test('Maracaju: retrato "saldo cheio sem gasto" é marcado como suspeito', () => {
  const vazio = SC.processMaracajuData({}, 1105, []);
  assert.equal(SC.maracajuSnapshotSuspeito(vazio), true, 'saldo == total com gasto 0 é resíduo de payload vazio');
  assert.equal(SC.maracajuSnapshotSuspeito({ ...vazio, manualOverride: true }), false);
  assert.equal(SC.maracajuSnapshotSuspeito({ ...vazio, comprasCicloAtual: [{ id: 'a', total: 20 }] }), false);
});

test('Faturas: simulações entram por padrão (igual ao app Faturas)', () => {
  const cfg = SC.getSatelliteConfig();
  assert.equal(cfg.includeSimulated, true, 'sem configuração explícita as simulações entram');

  const appDesligado = carregarAplicacao(['js/faturas-data.js', 'js/satellite-connectors.js'], {
    matrix_include_simulated_invoices: 'false'
  });
  assert.equal(appDesligado.SatelliteConnectors.getSatelliteConfig().includeSimulated, false, '"false" desliga');

  const base = SC.processFaturasData({ extraItems: [], overrides: {} }, false);
  const comSim = SC.processFaturasData({
    extraItems: [],
    overrides: {},
    simItems: [{ d: 'Ar Condicionado 1/10', v: 225.31, de: 3, ate: 3 }]
  }, true);
  assert.ok(
    Math.abs(comSim.faturasPorMes['2026-Dezembro'].total - (base.faturasPorMes['2026-Dezembro'].total + 225.31)) < 0.01,
    'o item simulado precisa somar em Dez/2026'
  );
  assert.equal(
    comSim.faturasPorMes['2027-Janeiro'].total,
    base.faturasPorMes['2027-Janeiro'].total,
    'simulação de Dez não pode vazar para Janeiro'
  );
});
