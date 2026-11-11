import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function criarLocalStorage(inicial = {}) {
  const store = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _store: store
  };
}

function carregarModulo(arquivo, exportName, sandboxExtra = {}) {
  const codigo = fs.readFileSync(path.join(rootDir, 'js', arquivo), 'utf8');
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
    localStorage: criarLocalStorage(),
    ...sandboxExtra
  };
  const contexto = vm.createContext(sandbox);
  vm.runInContext(`${codigo}\n;globalThis.__mod = ${exportName};`, contexto, { filename: arquivo });
  return sandbox.__mod;
}

test('Matrix ↔ Maracaju: o ciclo e os saldos de VA/VR vêm do resumo publicado pelo app de origem', () => {
  const SC = carregarModulo('satellite-connectors.js', 'SatelliteConnectors');

  const raw = {
    settings: {
      benefits: {
        vaFixedAmount: 2050,
        vrDailyAmount: 65,
        monthlyDays: { '2026-12': 18 },
        monthlyCreditDates: { '2026-12': '2026-12-04' },
        monthlyEndingBalances: {},
        monthlyRolloverOverrides: { '2026-12': { vaRollover: 9.84, vrRollover: 0.16 } }
      },
      matrixBenefits: {
        origem: 'Maracaju 88',
        cycleKey: '2026-12',
        vaTotal: 2059.84,
        vaSpent: 759.19,
        vaBalance: 1300.65,
        vrTotal: 1170.16,
        vrSpent: 761.90,
        vrBalance: 408.26,
        updatedAt: '2026-12-10T12:00:00.000Z'
      }
    },
    comprasRegistros: []
  };

  const out = SC.processMaracajuData(raw);

  assert.equal(out.cicloVigente, '2026-12', 'Ciclo deve ser o do Maracaju, não o mês do calendário');
  assert.equal(out.creditDate, '2026-12-04');
  assert.equal(out.vaTotal, 2059.84);
  assert.equal(out.gastoMercadoMesAtual, 759.19);
  assert.equal(out.saldoVaRestante, 1300.65);
  assert.equal(out.vrTotal, 1170.16);
  assert.equal(out.gastoVrMesAtual, 761.90);
  assert.equal(out.saldoVrRestante, 408.26);
  assert.equal(out.totalDisponivel, 1708.91);
});

test('Matrix ↔ Maracaju: compra excluída no Casa Maracaju não volta no merge', () => {
  const SC = carregarModulo('satellite-connectors.js', 'SatelliteConnectors');

  const hash = { comprasRegistros: { compra_apagada: Date.now() } };
  const merged = SC.mergeMaracajuPayloads(
    {
      lastUpdated: '2026-12-10T12:00:00.000Z',
      deletedIds: hash,
      comprasRegistros: [
        { id: 'compra_apagada', marketName: 'Carrefour', date: '2026-11-03', total: 280.66, paymentMethod: 'va' },
        { id: 'compra_ok', marketName: 'Savegnago', date: '2026-12-08', total: 161.81, paymentMethod: 'va' }
      ]
    },
    null
  );

  const ids = merged.comprasRegistros.map(p => p.id);
  assert.deepEqual(ids, ['compra_ok']);
  assert.ok(merged.deletedIds.comprasRegistros.compra_apagada, 'O túmulo deve ser preservado para o push');
});

test('Matrix → Maracaju: compactação envia totais numéricos e não perde as exclusões', () => {
  const SC = carregarModulo('satellite-connectors.js', 'SatelliteConnectors');

  const compact = SC.compactMaracajuStateForCloud({
    lastUpdated: '2026-12-10T12:00:00.000Z',
    deletedIds: { comprasRegistros: { nfe_x: 123 } },
    comprasRegistros: [
      { id: 'nfe_teste', marketName: 'Carrefour', date: '2026-11-10', total: '264,33', paymentMethod: 'va' }
    ]
  });

  assert.equal(compact.comprasRegistros[0].total, 264.33);
  assert.equal(compact.deletedIds.comprasRegistros.nfe_x, 123);
});
