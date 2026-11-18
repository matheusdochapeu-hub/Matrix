import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbCode = fs.readFileSync(path.join(rootDir, 'js', 'db.js'), 'utf8');

const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const sandbox = {
  localStorage: mockLocalStorage,
  console,
  Date,
  Math,
  parseInt,
  parseFloat,
  isNaN,
  Array,
  Object,
  String,
  Set,
  window: {}
};

const fn = new Function('localStorage', 'window', 'console', 'Date', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'Array', 'Object', 'String', 'Set', dbCode);
fn(mockLocalStorage, sandbox.window, console, Date, Math, parseInt, parseFloat, isNaN, Array, Object, String, Set);

const MatrixDB = sandbox.window.MatrixDB;

test('Gastos Diários: getDiarioTimestamp processa ISO e data brasileira', () => {
  assert.ok(typeof MatrixDB.getDiarioTimestamp === 'function', 'getDiarioTimestamp deve ser função exportada');
  
  const tIso = MatrixDB.getDiarioTimestamp({ dataHora: '2026-11-07T15:26:00' });
  const tBr = MatrixDB.getDiarioTimestamp({ dataHora: '07/11/2026 15:26' });
  const tData = MatrixDB.getDiarioTimestamp({ data: '07/11/2026' });

  assert.ok(tIso > 0, 'Timestamp ISO deve ser válido');
  assert.ok(tBr > 0, 'Timestamp BR com hora deve ser válido');
  assert.ok(tData > 0, 'Timestamp BR sem hora deve ser válido');

  const tEarlier = MatrixDB.getDiarioTimestamp({ dataHora: '2026-11-07T15:10:00' });
  assert.ok(tEarlier < tIso, '15:10 deve ter timestamp menor que 15:26');
});

test('Gastos Diários: sortDiariosInMonth organiza automaticamente por data', () => {
  const month = {
    diarios: [
      { id: 'd2', nome: 'Cobasi Tarde', valor: 15.8, dataHora: '2026-11-07T15:26' },
      { id: 'd1', nome: 'Cobasi Manhã', valor: 9.8, dataHora: '2026-11-07T15:10' },
      { id: 'd0', nome: 'Mercado Dia 1', valor: 50.0, dataHora: '2026-11-01T10:00' }
    ]
  };

  MatrixDB.sortDiariosInMonth(month);

  assert.strictEqual(month.diarios[0].id, 'd0', 'Dia 01 deve ser o primeiro');
  assert.strictEqual(month.diarios[1].id, 'd1', '15:10 deve vir antes de 15:26');
  assert.strictEqual(month.diarios[2].id, 'd2', '15:26 deve ser o último');
});

test('Gastos Diários: ordenação e botões de toggle no app e index', () => {
  const appCode = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
  const indexCode = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  assert.ok(appCode.includes('getOrdemDiarios'), 'app.js deve ter getOrdemDiarios');
  assert.ok(appCode.includes('toggleOrdemDiarios'), 'app.js deve ter toggleOrdemDiarios');
  assert.ok(indexCode.includes('btnToggleOrdemDiarios'), 'index.html deve ter o botão de alternância de ordenação');
});
