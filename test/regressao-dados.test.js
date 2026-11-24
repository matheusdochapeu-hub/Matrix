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

test('Nuvem: compactação preserva id de receita, fixo e outro (evita duplicata na restauração)', () => {
  const SyncEngine = carregarModulo('sync-engine.js', 'SyncEngine', {
    document: { getElementById: () => null },
    navigator: {}
  });

  const state = {
    anos: {
      '2026': {
        Novembro: {
          receitas: [{ id: 'rec_renda_extra_1780000000000', nome: 'Renda Extra', valor: 600 }],
          fixos: [{ id: 'fix_1780000000000_ab12', nome: 'Psicóloga', valor: 600, categoria: 'Psicóloga & Terapias', conta: 'scarlet_fisio', renda: 'ganhos_scarlet' }],
          outros: [{ id: 'out_1780000000000_cd34', nome: 'Farmácia', valor: 80, categoria: 'Saúde' }]
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
  assert.equal(compacto.anos['2026'].Novembro.fixos[0].id, 'fix_1780000000000_ab12');
  assert.equal(compacto.anos['2026'].Novembro.outros[0].id, 'out_1780000000000_cd34');
  assert.equal(compacto.satellites.fisioflow.ganhosPorMes['2026-11'].total, 1245);
});

test('Gastos Scarlet: par f0/o0 antigo vira um só item com lápide', async () => {
  const MatrixDB = carregarModulo('db.js', 'MatrixDB');
  await new Promise((r) => setTimeout(r, 30));

  const state = {
    anos: {
      '2026': {
        Novembro: {
          fixos: [
            { id: 'fix_1780000000000_ab12', nome: 'Psicóloga', valor: 600, categoria: 'Psicóloga & Terapias', conta: 'scarlet_fisio', renda: 'ganhos_scarlet', pago: false },
            { id: 'f0', nome: 'Psicóloga', valor: 600, categoria: 'Psicóloga & Terapias', conta: 'scarlet_fisio', renda: 'ganhos_scarlet', pago: true }
          ],
          outros: []
        }
      }
    }
  };

  const removidos = MatrixDB.dedupeLancamentoIdPairsInState(state);
  const fixos = state.anos['2026'].Novembro.fixos;
  assert.equal(removidos, 1);
  assert.equal(fixos.length, 1);
  assert.equal(fixos[0].id, 'fix_1780000000000_ab12');
  assert.equal(fixos[0].pago, true, 'o pago da cópia curta é preservado');
  assert.ok(state.deletedItens['f0'], 'a cópia curta precisa deixar lápide');
});

test('Lançamento novo preserva titular e metadados (addTransaction)', async () => {
  const MatrixDB = carregarModulo('db.js', 'MatrixDB');
  await new Promise((r) => setTimeout(r, 30));

  MatrixDB.addTransaction('2026', 'Novembro', 'fixo', {
    nome: 'Psicóloga',
    valor: 600,
    categoria: 'Psicóloga & Terapias',
    conta: 'scarlet_fisio',
    renda: 'ganhos_scarlet',
    titular: 'scarlet',
    pago: true,
    valorManual: false
  });

  const item = (MatrixDB.getMonth('2026', 'Novembro').fixos || []).find((i) => i.nome === 'Psicóloga');
  assert.ok(item, 'o lançamento precisa existir');
  assert.equal(item.titular, 'scarlet');
  assert.equal(item.valorManual, false);
  assert.equal(item.pago, true);
});

test('Nuvem v160: migra URL legada de célula única (AKfycbySx...) e compacta/expande defaults sem perda', () => {
  const ls = criarLocalStorage({
    matrix_cloud_url: 'https://script.google.com/macros/s/AKfycbySxW123456789/exec'
  });
  const SyncEngine = carregarModulo('sync-engine.js', 'SyncEngine', {
    localStorage: ls,
    document: { getElementById: () => null },
    navigator: {}
  });

  const cfg = SyncEngine.getConfig();
  assert.ok(!cfg.cloudUrl.includes('AKfycbySx'), 'URL legada de célula única deve ser migrada automaticamente');
  assert.ok(cfg.cloudUrl.includes('AKfycbyTXjWm4651tmwl4AujcG299cHBYGmECtLKoTruRaI7y9kzNOKr58QeKp0O46Erxb7DFQ'));

  const state = {
    anos: {
      '2026': {
        Novembro: {
          fixos: [
            { id: 'fix_3', nome: 'Parcela casa', valor: 1395.88, categoria: 'Geral', titular: 'matheus', conta: 'salario_bb', renda: 'salario_usp', investLinkedId: null, investLinkedOp: null, investLinkedVal: 0, pago: false },
            { id: 'fix_carona_1', nome: 'Caronas', valor: 1200, categoria: 'Geral', pago: false },
            { id: 'fix_carona_2', nome: 'Caronas', valor: 1140, categoria: 'Geral', pago: false }
          ],
          outros: [
            { id: 'out_6', nome: 'Renda+ 2055', valor: 102, categoria: 'Variável', titular: 'matheus', conta: 'salario_bb', renda: 'salario_usp', pago: true }
          ],
          receitas: [
            { id: 'rec_sal_Novembro_2026', nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, categoria: 'Salário / Proventos', conta: 'bb', renda: 'salario_usp', pago: true },
            { id: 'rec_vr_Novembro_2026', nome: 'Vale Refeição (VR)', valor: 1105, categoria: 'Benefício (Não Pecúnia)', naoPecunia: true, conta: 'cartao_vr', renda: 'vr_almoco', pago: true },
            { id: 'rec_va_Novembro_2026', nome: 'Vale Alimentação (VA - Maracaju 88)', valor: 2050, categoria: 'Benefício (Não Pecúnia)', naoPecunia: true, conta: 'cartao_va', renda: 'va_mercado', pago: true }
          ],
          scarlet: { gastos: [], ganhos: 0, faturaNubank: 4883.05 }
        }
      }
    }
  };

  const compacto = SyncEngine.compactStateForCloud(state, 35000);
  const novComp = compacto.anos['2026'].Novembro;
  assert.equal(novComp.fixos.length, 2, 'duplicata de Caronas no mesmo mês é consolidada');
  assert.equal(novComp.fixos[0].categoria, undefined, 'categoria Geral default é omitida no payload compacto');
  assert.equal(novComp.outros[0].categoria, undefined, 'categoria Variável default é omitida no payload compacto');
  assert.equal(novComp.scarlet.gastos, undefined, 'lista vazia de gastos Scarlet é omitida no payload compacto');

  const expandido = SyncEngine.expandStateFromCloud(JSON.parse(JSON.stringify(compacto)));
  const novExp = expandido.anos['2026'].Novembro;
  assert.equal(novExp.fixos[0].categoria, 'Geral');
  assert.equal(novExp.outros[0].categoria, 'Variável');
  assert.equal(novExp.receitas[1].naoPecunia, true);
  assert.equal(novExp.receitas[1].conta, 'cartao_vr');
  assert.equal(novExp.receitas[2].naoPecunia, true);
  assert.equal(novExp.receitas[2].conta, 'cartao_va');
  assert.deepEqual(Array.from(novExp.scarlet.gastos), []);
  assert.equal(novExp.scarlet.faturaNubank, 4883.05);
});
