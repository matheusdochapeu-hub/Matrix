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

test('Receitas: dedupe remove seed + cópia curta (r0) e preserva rendas distintas', async () => {
  const MatrixDB = carregarModulo('db.js', 'MatrixDB');
  await new Promise((r) => setTimeout(r, 30));

  const state = {
    anos: {
      '2026': {
        Novembro: {
          receitas: [
            { id: 'rec_sal_Novembro_2026', nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, pago: false },
            { id: 'r0', nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, pago: true },
            { id: 'rec_vr_Novembro_2026', nome: 'Vale Refeição (VR)', valor: 1105, pago: false },
            { id: 'r1', nome: 'Vale Refeição (VR)', valor: 1300, pago: false },
            { id: 'r5', nome: 'Empréstimo', valor: 4300, pago: true },
            { id: 'r6', nome: 'Parcela', valor: 100, pago: false },
            { id: 'r7', nome: 'Parcela', valor: 100, pago: true },
            { id: 'r8', nome: 'Renda Extra', valor: 600, pago: false },
            { id: 'r9', nome: 'Renda Extra', valor: 700, pago: false }
          ]
        }
      }
    }
  };

  const removidas = MatrixDB.dedupeReceitasInState(state);
  const receitas = state.anos['2026'].Novembro.receitas;

  assert.equal(removidas, 3, 'salário duplicado, VR seed×curta e Parcela exata devem sair');
  assert.deepEqual(
    Array.from(receitas, (r) => r.id),
    ['rec_sal_Novembro_2026', 'rec_vr_Novembro_2026', 'r5', 'r6', 'r8', 'r9']
  );
  assert.equal(receitas[0].pago, true, 'o status pago da cópia duplicada é preservado');
  assert.equal(receitas.find((r) => r.nome === 'Renda Extra' && r.valor === 700).id, 'r9');
});

test('FisioFlow: parser ignora cancelados e reconcilia sessões com agendamentos', () => {
  const SC = carregarModulo('satellite-connectors.js', 'SatelliteConnectors');
  const hoje = new Date();
  const ym = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const dia = `${ym}-10`;
  const diaAgenda = `${ym}-20`;

  const dados = {
    pacientes: [{ ID: 'p1', Nome: 'Paciente Teste', ValorPadrao: 95, FrequenciaSemanal: '2x/sem', Arquivado: 'Não' }],
    atendimentos: [
      { ID: 'a1', Paciente: 'Paciente Teste', Data: dia, Valor: 95, Status: 'Pendente' },
      { ID: 'a2', Paciente: 'Paciente Teste', Data: dia, Valor: 70, Status: 'Pendente' },
      { ID: 'a3', Paciente: 'Paciente Teste', Data: dia, Valor: 500, Status: 'Cancelado' }
    ],
    agendamentos: [
      { ID: 's1', PacienteNome: 'Paciente Teste', Data: diaAgenda, Valor: 90, Status: 'Agendado' }
    ]
  };

  const out = SC.processFisioData(dados);
  assert.equal(out.ganhosPorMes[ym].sessoes, 2);
  assert.equal(out.ganhosPorMes[ym].total, 165);
  assert.equal(out.ganhosPorMes[ym].previsto, 90);
  assert.equal(out.totalAtendimentosRegistrados, 2);
});

test('Nuvem: compactação preserva id de receita e o satélite FisioFlow', () => {
  const SyncEngine = carregarModulo('sync-engine.js', 'SyncEngine', {
    document: { getElementById: () => null },
    navigator: {}
  });

  const state = {
    anos: {
      '2026': {
        Novembro: {
          receitas: [{ id: 'rec_renda_extra_1780000000000', nome: 'Renda Extra', valor: 600 }],
          fixos: []
        }
      }
    },
    satellites: {
      fisioflow: {
        origem: 'FisioFlow',
        atualizadoEm: '2026-11-10T23:43:07.088Z',
        ganhosPorMes: { '2026-11': { total: 1245, previsto: 3465, sessoes: 14 } },
        mesAtualTotal: 1245,
        mesAtualPrevisto: 3465
      }
    }
  };

  const compacto = SyncEngine.compactStateForCloud(state, 35000);
  assert.equal(compacto.anos['2026'].Novembro.receitas[0].id, 'rec_renda_extra_1780000000000');
  assert.equal(compacto.satellites.fisioflow.ganhosPorMes['2026-11'].total, 1245);
});
