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
        categoria: 'Benefícios',
        pago: true
      });
    }

    const vaVal = parseFloat(t['VA']) || 0;
    if (vaVal > 0) {
      month.receitas.push({
        id: 'rec_va_' + mes,
        nome: 'Vale Alimentação (VA - Maracaju 88)',
        valor: vaVal,
        categoria: 'Benefícios',
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
        { id: 'rec_vr_' + mes, nome: 'Vale Refeição (VR)', valor: 1235.00, categoria: 'Benefícios', pago: false },
        { id: 'rec_va_' + mes, nome: 'Vale Alimentação (VA - Maracaju 88)', valor: 2050.00, categoria: 'Benefícios', pago: false }
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
    ensureMonthReceitas(month, ano, mes);
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
    return month.outros || (month.outros = []);
  }

  function addTransaction(ano, mes, tipo, item) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) s.anos[ano][mes] = { fixos: [], outros: [], receitas: [], totais: {} };

    const month = s.anos[ano][mes];
    const list = getListByTipo(month, tipo);
    const prefix = tipo === 'fixo' ? 'fix_' : (tipo === 'receita' ? 'rec_' : 'out_');

    list.push({
      id: prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      nome: item.nome,
      valor: parseFloat(item.valor) || 0,
      categoria: item.categoria || (tipo === 'receita' ? 'Salário / Proventos' : (tipo === 'fixo' ? 'Habitação' : 'Outros')),
      pago: !!item.pago
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
      Object.keys(s.anos).forEach(y => yearsSet.add(String(y)));
    }
    return Array.from(yearsSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  function createYear(targetYear, cloneFromYear = null) {
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
            totais: { ...(src.totais || {}) }
          };
        } else {
          // Inicialização limpa padrão para meses futuros
          s.anos[ty][mes] = {
            fixos: [],
            outros: [],
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
