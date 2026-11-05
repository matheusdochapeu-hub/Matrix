/**
 * MATRIX FINANCE - DATABASE & LOCAL STORAGE ADAPTER
 * Persistência ultra-resiliente via localStorage e IndexedDB com pré-carga de seed.
 */

const MatrixDB = (function () {
  const STORAGE_KEY = 'MATRIX_FINANCE_STATE_v1';
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

  function getMonth(ano, mes) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) {
      s.anos[ano][mes] = { fixos: [], outros: [], totais: {} };
    }
    return s.anos[ano][mes];
  }

  function saveMonth(ano, mes, data) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    s.anos[ano][mes] = data;
    saveState(s);
    return data;
  }

  function addTransaction(ano, mes, tipo, item) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) s.anos[ano][mes] = { fixos: [], outros: [], totais: {} };

    const month = s.anos[ano][mes];
    if (tipo === 'fixo') {
      if (!month.fixos) month.fixos = [];
      month.fixos.push({
        id: 'fix_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nome: item.nome,
        valor: parseFloat(item.valor) || 0,
        categoria: item.categoria || 'Geral',
        pago: !!item.pago
      });
    } else {
      if (!month.outros) month.outros = [];
      month.outros.push({
        id: 'out_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nome: item.nome,
        valor: parseFloat(item.valor) || 0,
        categoria: item.categoria || 'Variável',
        pago: !!item.pago
      });
    }
    saveState(s);
    return month;
  }

  function updateTransaction(ano, mes, tipo, id, updates) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;

    const list = tipo === 'fixo' ? month.fixos : month.outros;
    if (!list) return false;

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
    } else {
      month.outros = (month.outros || []).filter(it => it.id !== id && it.nome !== id);
    }
    saveState(s);
    return true;
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
    removeTransaction,
    exportBackupJSON,
    importBackupJSON,
    resetToDefault
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixDB = MatrixDB;
}
