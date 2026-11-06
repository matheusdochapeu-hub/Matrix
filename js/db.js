/**
 * MATRIX FINANCE - DATABASE & LOCAL STORAGE ADAPTER
 * Persistência ultra-resiliente via localStorage e IndexedDB com pré-carga de seed.
 */

const MatrixDB = (function () {
  const STORAGE_KEY = 'MATRIX_FINANCE_STATE_v2';
  let memoryCache = null;

  async function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memoryCache = JSON.parse(raw);
      } else if (typeof MATRIX_SEED_DATA !== 'undefined') {
        memoryCache = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
      } else {
        memoryCache = {
          versao: '1.0.0',
          atualizadoEm: new Date().toISOString(),
          perfil: {},
          financiamentoCaixa: {},
          bancos: [],
          investimentos: [],
          holerites: [],
          simulacoesAtivas: [],
          anos: {}
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage:', e);
      if (typeof MATRIX_SEED_DATA !== 'undefined') {
        memoryCache = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
      }
    }
    return memoryCache;
  }

  function isSummaryOrTotalItem(name) {
    if (!name) return false;
    const n = String(name).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const exactForbidden = [
      'total', 'totais', 'subtotal', 'sub-total', 'sub total', 'gastos',
      'total gastos fixos', 'total gastos variaveis', 'total outros gastos',
      'subtotal gastos', 'subtotal ganhos', 'ganhos - gastos',
      'soma', 'saldo final', 'resumo', 'ideal', 'investimentos'
    ];
    if (exactForbidden.includes(n)) return true;
    if (/^(total|totais|subtotal|sub-total|sub\s+total|gastos)\b/i.test(n)) return true;
    return false;
  }

  // Regra Financeira: VA e VR são benefícios de alimentação e NÃO são dinheiro em pecúnia para pagar contas
  function isBeneficioNaoPecunia(itemOuNome) {
    if (!itemOuNome) return false;
    if (typeof itemOuNome === 'object') {
      if (itemOuNome.naoPecunia === true) return true;
      const cat = (itemOuNome.categoria || '').toLowerCase();
      if (cat.includes('não pecúnia') || cat.includes('nao pecunia')) return true;
    }
    const str = (typeof itemOuNome === 'string' ? itemOuNome : (itemOuNome.nome || '')).toLowerCase();
    if (/vale\s*(alimenta[çc][ãa]o|refei[çc][ãa]o)/i.test(str)) return true;
    if (/\bva\b/i.test(str) && (str.includes('maracaju') || str.includes('alelo') || str.includes('aliment') || str.includes('benef') || str.trim() === 'va')) return true;
    if (/\bvr\b/i.test(str) && (str.includes('usp') || str.includes('refei') || str.includes('benef') || str.trim() === 'vr')) return true;
    if (str.includes('maracaju 88')) return true;
    if (str === 'va' || str === 'vr') return true;
    return false;
  }

  function sanitizeState(state) {
    if (!state || !state.anos) return state;
    let mutated = false;
    for (const ano in state.anos) {
      // Regra Estrita: 2024 e anos anteriores não possuem dados e são expurgados
      if (parseInt(ano, 10) < 2025) {
        delete state.anos[ano];
        mutated = true;
        continue;
      }
      for (const mes in state.anos[ano]) {
        const m = state.anos[ano][mes];
        if (!m) continue;
        if (m.fixos && Array.isArray(m.fixos)) {
          const origLen = m.fixos.length;
          m.fixos = m.fixos.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.fixos.length !== origLen) mutated = true;
        }
        if (m.outros && Array.isArray(m.outros)) {
          const origLen = m.outros.length;
          m.outros = m.outros.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.outros.length !== origLen) mutated = true;
        }
        if (m.receitas && Array.isArray(m.receitas)) {
          const origLen = m.receitas.length;
          m.receitas = m.receitas.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.receitas.length !== origLen) mutated = true;
          // Sinalizar VA e VR existentes como não-pecúnia
          m.receitas.forEach(r => {
            if (isBeneficioNaoPecunia(r) && (!r.naoPecunia || r.categoria !== 'Benefício (Não Pecúnia)')) {
              r.naoPecunia = true;
              r.categoria = 'Benefício (Não Pecúnia)';
              mutated = true;
            }
          });
        }
        if (m.diarios && Array.isArray(m.diarios)) {
          const origLen = m.diarios.length;
          m.diarios = m.diarios.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.diarios.length !== origLen) mutated = true;
        }
      }
    }
    if (mutated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }
    return state;
  }

  function getState() {
    if (!memoryCache) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { memoryCache = JSON.parse(raw); } catch (e) {}
      }
      if (!memoryCache && typeof MATRIX_SEED_DATA !== 'undefined') {
        memoryCache = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
      }
    }

    if (memoryCache) {
      sanitizeState(memoryCache);
      if (!memoryCache.config) memoryCache.config = {};
      if (!memoryCache.config.nomeEstudio) memoryCache.config.nomeEstudio = 'Estúdio';
    }

    // Compatibilidade e enriquecimento automático de titularidade (Matheus & Scarlet)
    if (memoryCache && memoryCache.investimentos) {
      memoryCache.investimentos.forEach(inv => {
        if (!inv.titular) inv.titular = 'Matheus';
      });

      // Se o cache antigo do usuário ainda não possuir os ativos de Scarlet, mescla os seeds
      const temScarlet = memoryCache.investimentos.some(inv => inv.titular === 'Scarlet');
      if (!temScarlet && typeof MATRIX_SEED_DATA !== 'undefined' && MATRIX_SEED_DATA.investimentos) {
        const scarletSeeds = MATRIX_SEED_DATA.investimentos.filter(s => s.titular === 'Scarlet');
        if (scarletSeeds.length > 0) {
          memoryCache.investimentos.push(...JSON.parse(JSON.stringify(scarletSeeds)));
        }
      }
    }

    // Mescla holerites do seed ausentes no cache do usuário (especialmente holerites oficiais de 2025)
    if (memoryCache && typeof MATRIX_SEED_DATA !== 'undefined' && Array.isArray(MATRIX_SEED_DATA.holerites)) {
      if (!Array.isArray(memoryCache.holerites)) memoryCache.holerites = [];
      let holMutated = false;
      MATRIX_SEED_DATA.holerites.forEach(seedH => {
        const existingIdx = memoryCache.holerites.findIndex(h => h.periodo === seedH.periodo);
        if (existingIdx === -1) {
          memoryCache.holerites.push(JSON.parse(JSON.stringify(seedH)));
          holMutated = true;
        } else if (!memoryCache.holerites[existingIdx].itens || memoryCache.holerites[existingIdx].itens.length === 0) {
          memoryCache.holerites[existingIdx] = JSON.parse(JSON.stringify(seedH));
          holMutated = true;
        }
      });
      if (holMutated) {
        memoryCache.holerites.sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Sincronização dos meses de 2025 (Fevereiro a Dezembro/2025 MPSP)
    if (memoryCache && memoryCache.anos && memoryCache.anos['2025'] && typeof MATRIX_SEED_DATA !== 'undefined' && MATRIX_SEED_DATA.anos && MATRIX_SEED_DATA.anos['2025']) {
      const seed2025 = MATRIX_SEED_DATA.anos['2025'];
      let ano2025Mutated = false;
      Object.keys(seed2025).forEach(mNome => {
        if (!memoryCache.anos['2025'][mNome]) {
          memoryCache.anos['2025'][mNome] = JSON.parse(JSON.stringify(seed2025[mNome]));
          ano2025Mutated = true;
        } else {
          const curM = memoryCache.anos['2025'][mNome];
          if (!curM.receitas || curM.receitas.length === 0 || !curM.receitas.some(r => r.nome && r.nome.includes('MPSP'))) {
            curM.receitas = JSON.parse(JSON.stringify(seed2025[mNome].receitas || []));
            if (!curM.totais) curM.totais = {};
            Object.assign(curM.totais, seed2025[mNome].totais || {});
            ano2025Mutated = true;
          }
        }
      });
      if (ano2025Mutated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Sincronização dos meses de 2026 (Janeiro a Junho/2026 MPSP)
    if (memoryCache && memoryCache.anos && memoryCache.anos['2026'] && typeof MATRIX_SEED_DATA !== 'undefined' && MATRIX_SEED_DATA.anos && MATRIX_SEED_DATA.anos['2026']) {
      const seed2026 = MATRIX_SEED_DATA.anos['2026'];
      let ano2026Mutated = false;
      ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'].forEach(mNome => {
        if (memoryCache.anos['2026'][mNome] && seed2026[mNome]) {
          const curM = memoryCache.anos['2026'][mNome];
          const hasOfficialMpsp = curM.receitas && curM.receitas.some(r => r.nome && r.nome.includes('MPSP') && r.pago);
          if (!hasOfficialMpsp) {
            const nonSal = (curM.receitas || []).filter(r => !r.nome || (!r.nome.includes('MPSP') && !r.nome.includes('USP')));
            const mpspRecs = JSON.parse(JSON.stringify(seed2026[mNome].receitas || [])).filter(r => r.nome && r.nome.includes('MPSP'));
            curM.receitas = mpspRecs.concat(nonSal);
            if (!curM.totais) curM.totais = {};
            curM.totais['Salário Mensal'] = seed2026[mNome].totais['Salário Mensal'];
            curM.totais['Subtotal Ganhos'] = seed2026[mNome].totais['Subtotal Ganhos'];
            ano2026Mutated = true;
          }
        }
      });
      if (ano2026Mutated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    return memoryCache;
  }

  function saveState(state) {
    state.atualizadoEm = new Date().toISOString();
    memoryCache = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Falha ao gravar no localStorage:', e);
    }
    window.dispatchEvent(new CustomEvent('matrix_data_changed', { detail: state }));
    return state;
  }

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function ensureMonthReceitas(month, ano, mes) {
    if (!month) return [];
    if (month.receitas && month.receitas.length > 0) return month.receitas;
    if (!month.receitas) month.receitas = [];

    const t = month.totais || {};
    // Extrair receitas mapeadas da planilha/seed original
    const salarioVal = parseFloat(t['Salário Mensal']) || 0;
    if (salarioVal > 0) {
      const isMpsp = (ano === '2025' || (ano === '2026' && ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'].includes(mes)));
      month.receitas.push({
        id: 'rec_sal_' + mes,
        nome: isMpsp ? 'Salário Líquido MPSP (Bradesco)' : 'Salário Líquido USP (Banco do Brasil)',
        valor: salarioVal,
        categoria: 'Salário / Proventos',
        pago: true
      });
    }

    const vrVal = parseFloat(t['VR']) || 0;
    if (vrVal > 0) {
      month.receitas.push({
        id: 'rec_vr_' + mes,
        nome: 'Vale Refeição (VR)',
        valor: vrVal,
        categoria: 'Benefício (Não Pecúnia)',
        naoPecunia: true,
        pago: true
      });
    }

    const vaVal = parseFloat(t['VA']) || 0;
    if (vaVal > 0) {
      month.receitas.push({
        id: 'rec_va_' + mes,
        nome: 'Vale Alimentação (VA - Maracaju 88)',
        valor: vaVal,
        categoria: 'Benefício (Não Pecúnia)',
        naoPecunia: true,
        pago: true
      });
    }

    const decimoVal = parseFloat(t['13º']) || (ano === '2026' && mes === 'Novembro' ? 1566.00 : (ano === '2026' && mes === 'Dezembro' ? 1280.00 : 0));
    if (decimoVal > 0) {
      month.receitas.push({
        id: 'rec_13_' + mes,
        nome: '13º Salário USP',
        valor: decimoVal,
        categoria: 'Salário / Proventos',
        pago: (ano === '2025' || (ano === '2026' && ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'].includes(mes)))
      });
    }

    const estudioVal = parseFloat(t['Estúdio']) || 0;
    if (estudioVal > 0) {
      month.receitas.push({
        id: 'rec_estudio_' + mes,
        nome: 'Estúdio / Renda Extra',
        valor: estudioVal,
        categoria: 'Renda Extra',
        pago: true
      });
    }

    // Se ainda estiver vazia e for ano recente/futuro, inicializa base padrão USP
    if (month.receitas.length === 0 && (parseInt(ano, 10) >= 2026)) {
      month.receitas.push(
        { id: 'rec_sal_' + mes, nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, categoria: 'Salário / Proventos', pago: false },
        { id: 'rec_vr_' + mes, nome: 'Vale Refeição (VR)', valor: 1235.00, categoria: 'Benefício (Não Pecúnia)', naoPecunia: true, pago: false },
        { id: 'rec_va_' + mes, nome: 'Vale Alimentação (VA - Maracaju 88)', valor: 2050.00, categoria: 'Benefício (Não Pecúnia)', naoPecunia: true, pago: false }
      );
    }

    return month.receitas;
  }

  function getMonth(ano, mes) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) {
      s.anos[ano][mes] = { fixos: [], outros: [], receitas: [], totais: {} };
    }
    const month = s.anos[ano][mes];
    if (!month.fixos) month.fixos = [];
    if (!month.outros) month.outros = [];
    month.fixos = month.fixos.filter(it => it && !isSummaryOrTotalItem(it.nome));
    month.outros = month.outros.filter(it => it && !isSummaryOrTotalItem(it.nome));
    ensureMonthReceitas(month, ano, mes);
    if (month.receitas) {
      month.receitas = month.receitas.filter(it => it && !isSummaryOrTotalItem(it.nome));
    }
    return month;
  }

  function saveMonth(ano, mes, data) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    s.anos[ano][mes] = data;
    saveState(s);
    return data;
  }

  function getListByTipo(month, tipo) {
    if (tipo === 'fixo') return month.fixos || (month.fixos = []);
    if (tipo === 'receita') return month.receitas || (month.receitas = []);
    if (tipo === 'diario' || tipo === 'gasto_diario') return month.diarios || (month.diarios = []);
    return month.outros || (month.outros = []);
  }

  function addTransaction(ano, mes, tipo, item) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) s.anos[ano][mes] = { fixos: [], outros: [], receitas: [], diarios: [], totais: {} };

    const month = s.anos[ano][mes];
    const list = getListByTipo(month, tipo);
    const prefix = tipo === 'fixo' ? 'fix_' : (tipo === 'receita' ? 'rec_' : (tipo === 'diario' || tipo === 'gasto_diario' ? 'diar_' : 'out_'));

    list.push({
      id: prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      nome: item.nome,
      valor: parseFloat(item.valor) || 0,
      categoria: item.categoria || (tipo === 'receita' ? 'Salário / Proventos' : (tipo === 'fixo' ? 'Habitação' : (tipo === 'diario' ? 'Alimentação & Lanches' : 'Outros'))),
      conta: item.conta || 'debito_nubank',
      renda: item.renda || '',
      metodo: item.metodo || 'debito',
      dataHora: item.dataHora || new Date().toISOString(),
      obs: item.obs || '',
      pago: item.pago !== undefined ? !!item.pago : true
    });

    saveState(s);
    return month;
  }

  function updateTransaction(ano, mes, tipo, id, updates) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;

    const list = getListByTipo(month, tipo);
    const item = list.find(it => it.id === id || it.nome === id);
    if (item) {
      Object.assign(item, updates);
      saveState(s);
      return true;
    }
    return false;
  }

  function removeTransaction(ano, mes, tipo, id) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;

    if (tipo === 'fixo') {
      month.fixos = (month.fixos || []).filter(it => it.id !== id && it.nome !== id);
    } else if (tipo === 'receita') {
      month.receitas = (month.receitas || []).filter(it => it.id !== id && it.nome !== id);
    } else {
      month.outros = (month.outros || []).filter(it => it.id !== id && it.nome !== id);
    }
    saveState(s);
    return true;
  }

  function togglePaidByIndex(ano, mes, tipo, index) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;
    const list = getListByTipo(month, tipo);
    if (!list || !list[index]) return false;
    list[index].pago = !list[index].pago;
    saveState(s);
    return list[index].pago;
  }

  function removeTransactionByIndex(ano, mes, tipo, index) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;
    const list = getListByTipo(month, tipo);
    if (!list || index < 0 || index >= list.length) return false;
    list.splice(index, 1);
    saveState(s);
    return true;
  }

  function updateTransactionByIndex(ano, mes, tipo, index, updates) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;
    const list = getListByTipo(month, tipo);
    if (!list || !list[index]) return false;
    Object.assign(list[index], updates);
    saveState(s);
    return true;
  }

  function getAllYears() {
    const s = getState();
    const yearsSet = new Set(['2025', '2026', '2027']);
    if (s.anos) {
      Object.keys(s.anos).forEach(y => {
        if (parseInt(y, 10) >= 2025) yearsSet.add(String(y));
      });
    }
    return Array.from(yearsSet).filter(y => parseInt(y, 10) >= 2025).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  function createYear(targetYear, cloneFromYear = null) {
    if (parseInt(targetYear, 10) < 2025) return;
    const s = getState();
    if (!s.anos) s.anos = {};
    const ty = String(targetYear);
    
    if (!s.anos[ty]) {
      s.anos[ty] = {};
    }

    const sourceYearData = cloneFromYear && s.anos[String(cloneFromYear)];

    MONTH_NAMES.forEach(mes => {
      if (!s.anos[ty][mes]) {
        if (sourceYearData && sourceYearData[mes]) {
          const src = sourceYearData[mes];
          s.anos[ty][mes] = {
            fixos: (src.fixos || []).map(f => ({ ...f, id: 'fix_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), pago: false })),
            outros: (src.outros || []).map(o => ({ ...o, id: 'out_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), pago: false })),
            receitas: (src.receitas || []).map(r => ({ ...r, id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), pago: false })),
            diarios: [],
            totais: { ...(src.totais || {}) }
          };
        } else {
          // Inicialização limpa padrão para meses futuros
          s.anos[ty][mes] = {
            fixos: [],
            outros: [],
            diarios: [],
            receitas: [
              { id: 'rec_sal_' + mes, nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, categoria: 'Salário / Proventos', pago: false },
              { id: 'rec_vr_' + mes, nome: 'Vale Refeição (VR)', valor: 1235.00, categoria: 'Benefícios', pago: false },
              { id: 'rec_va_' + mes, nome: 'Vale Alimentação (VA - Maracaju 88)', valor: 2050.00, categoria: 'Benefícios', pago: false }
            ],
            totais: {}
          };
        }
      }
    });

    saveState(s);
    return s.anos[ty];
  }

  function exportBackupJSON() {
    return JSON.stringify(getState(), null, 2);
  }

  function importBackupJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.anos) {
        throw new Error('Formato de backup inválido: falta a estrutura principal.');
      }
      saveState(parsed);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function resetToDefault() {
    if (typeof MATRIX_SEED_DATA !== 'undefined') {
      const clone = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
      saveState(clone);
      return clone;
    }
    return null;
  }

  // Inicializar na carga
  init();

  return {
    init,
    getState,
    saveState,
    getMonth,
    saveMonth,
    addTransaction,
    updateTransaction,
    updateTransactionByIndex,
    removeTransaction,
    removeTransactionByIndex,
    togglePaidByIndex,
    ensureMonthReceitas,
    isBeneficioNaoPecunia,
    getAllYears,
    createYear,
    exportBackupJSON,
    importBackupJSON,
    resetToDefault
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixDB = MatrixDB;
}
