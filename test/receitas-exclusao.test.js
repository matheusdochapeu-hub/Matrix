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

function carregarModulo(arquivo, exportName, extras = {}) {
  const codigo = fs.readFileSync(path.join(rootDir, 'js', arquivo), 'utf8');
  const sandbox = {
    console, Date, JSON, Math, parseFloat, parseInt, isNaN, String, Number, Object, Array, RegExp, Error, Promise,
    setTimeout, clearTimeout,
    localStorage: criarLocalStorage(),
    ...extras
  };
  sandbox.window = sandbox;
  sandbox.document = sandbox.document || { getElementById: () => null, addEventListener: () => {}, querySelector: () => null };
  sandbox.addEventListener = () => {};
  sandbox.dispatchEvent = () => true;
  sandbox.CustomEvent = class CustomEvent {
    constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${codigo}\n;globalThis.__mod = ${exportName};`, sandbox, { filename: arquivo });
  return { mod: sandbox.__mod, sandbox };
}

test('Receitas: par Estúdio × Renda Extra do mesmo mês não duplica', async () => {
  const { mod: MatrixDB } = carregarModulo('db.js', 'MatrixDB');
  await new Promise((r) => setTimeout(r, 30));

  const state = {
    anos: {
      '2026': {
        Novembro: {
          receitas: [
            { id: 'r7', nome: 'Estúdio', valor: 600, conta: 'salario_bb', renda: 'salario_usp', pago: true },
            { id: 'rec_estudio_Novembro_2026', nome: 'Renda Extra', valor: 600, conta: 'debito_inter', pago: true }
          ]
        }
      }
    }
  };

  const removidas = MatrixDB.dedupeReceitasInState(state);
  const receitas = state.anos['2026'].Novembro.receitas;
  assert.equal(removidas, 1, 'a cópia do Estúdio/Renda Extra com o mesmo valor precisa cair');
  assert.equal(receitas.length, 1);
  assert.equal(receitas[0].valor, 600);
});

test('Receitas: excluir deixa lápide e não é recriada pelo seed do mês', async () => {
  const { mod: MatrixDB, sandbox } = carregarModulo('db.js', 'MatrixDB');
  await new Promise((r) => setTimeout(r, 30));

  const state = {
    anos: {
      '2026': {
        Novembro: {
          receitas: [{ id: 'rec_estudio_Novembro_2026', nome: 'Renda Extra', valor: 600, pago: true }],
          totais: { 'Estúdio': 600, 'Salário Mensal': 5788.19 }
        }
      }
    }
  };
  MatrixDB.saveState(state, 'teste', { skipCloudSync: true });

  assert.equal(MatrixDB.removeTransactionByIndex('2026', 'Novembro', 'receita', 0), true);

  const depois = MatrixDB.getState();
  const mes = depois.anos['2026'].Novembro;
  assert.equal(mes.receitas.length, 0, 'não pode renascer do totais');
  assert.equal(mes.receitasSeedDone, true);
  assert.ok(depois.deletedItens && depois.deletedItens['rec_estudio_Novembro_2026'], 'a exclusão precisa de lápide');
});

test('Nuvem: lápides viajam no backup compacto', () => {
  const { mod: SyncEngine } = carregarModulo('sync-engine.js', 'SyncEngine', {
    document: { getElementById: () => null }
  });

  const compacto = SyncEngine.compactStateForCloud({
    atualizadoEm: '2026-11-12T10:00:00.000Z',
    anos: { '2026': { Novembro: { receitas: [] } } },
    deletedItens: { rec_estudio_Novembro_2026: 1794449997864 }
  }, 45000);

  assert.equal(compacto.deletedItens.rec_estudio_Novembro_2026, 1794449997864);
});
