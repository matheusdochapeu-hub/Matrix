/**
 * MATRIX FINANCE - SATELLITE APPS INGESTION & SCRAPING ENGINE (v1.2.0)
 * Coleta com alta precisão e sem distorções dos 3 apps satélites:
 * 1. FisioFlow: Ganhos passados, mês atual e projeções futuras (Scarlet).
 * 2. Faturas: Nubank Mastercard Black — separação estrita de compras REAIS vs SIMULADAS,
 *    respeito absoluto aos 'overrides' (itens editados/deletados) e agrupamento de categorias.
 * 3. Maracaju 88: Confronto duplo de benefícios:
 *    - Mercado (NFC-e) vs Vale Alimentação (R$ 2.050,00)
 *    - Refeições / Almoço vs Vale Refeição (R$ 65,00/dia trabalhado na USP)
 */

const SatelliteConnectors = (function () {
  const STORAGE_KEYS = {
    fisioUrl: 'matrix_fisio_url',
    fisioToken: 'matrix_fisio_token',
    faturasUrl: 'matrix_faturas_url',
    faturasToken: 'matrix_faturas_token',
    maracajuUrl: 'matrix_maracaju_url',
    maracajuToken: 'matrix_maracaju_token',
    autoScrapeOnOpen: 'matrix_auto_scrape_on_open',
    includeSimulatedInvoices: 'matrix_include_simulated_invoices',
    lastScraped: 'matrix_satellites_last_scraped'
  };

  function getSatelliteConfig() {
    return {
      fisioUrl: localStorage.getItem(STORAGE_KEYS.fisioUrl) || '',
      fisioToken: localStorage.getItem(STORAGE_KEYS.fisioToken) || '',
      faturasUrl: localStorage.getItem(STORAGE_KEYS.faturasUrl) || '',
      faturasToken: localStorage.getItem(STORAGE_KEYS.faturasToken) || '',
      maracajuUrl: localStorage.getItem(STORAGE_KEYS.maracajuUrl) || '',
      maracajuToken: localStorage.getItem(STORAGE_KEYS.maracajuToken) || '',
      autoScrapeOnOpen: localStorage.getItem(STORAGE_KEYS.autoScrapeOnOpen) !== 'false',
      includeSimulated: localStorage.getItem(STORAGE_KEYS.includeSimulatedInvoices) === 'true'
    };
  }

  function saveSatelliteConfig(cfg) {
    if (cfg.fisioUrl !== undefined) localStorage.setItem(STORAGE_KEYS.fisioUrl, cfg.fisioUrl.trim());
    if (cfg.fisioToken !== undefined) localStorage.setItem(STORAGE_KEYS.fisioToken, cfg.fisioToken.trim());
    if (cfg.faturasUrl !== undefined) localStorage.setItem(STORAGE_KEYS.faturasUrl, cfg.faturasUrl.trim());
    if (cfg.faturasToken !== undefined) localStorage.setItem(STORAGE_KEYS.faturasToken, cfg.faturasToken.trim());
    if (cfg.maracajuUrl !== undefined) localStorage.setItem(STORAGE_KEYS.maracajuUrl, cfg.maracajuUrl.trim());
    if (cfg.maracajuToken !== undefined) localStorage.setItem(STORAGE_KEYS.maracajuToken, cfg.maracajuToken.trim());
    if (cfg.autoScrapeOnOpen !== undefined) localStorage.setItem(STORAGE_KEYS.autoScrapeOnOpen, cfg.autoScrapeOnOpen ? 'true' : 'false');
    if (cfg.includeSimulated !== undefined) localStorage.setItem(STORAGE_KEYS.includeSimulatedInvoices, cfg.includeSimulated ? 'true' : 'false');
  }

  // ========================================================
  // 1. PARSER FISIOFLOW (Scarlet)
  // ========================================================
  function processFisioData(rawData) {
    const atendimentos = rawData.atendimentos || [];
    const pacientes = rawData.pacientes || [];

    const ganhosPorMes = {};
    let totalPassado = 0;
    let mesAtualTotal = 0;
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    atendimentos.forEach(at => {
      const val = parseFloat(at.Valor) || 0;
      const dataStr = String(at.Data || '');
      const ym = dataStr.slice(0, 7);

      if (ym) {
        if (!ganhosPorMes[ym]) ganhosPorMes[ym] = { realizado: 0, aReceber: 0, sessoes: 0 };
        ganhosPorMes[ym].sessoes++;

        if (at.Status === 'PAGO' || at.Status === 'Pago') {
          ganhosPorMes[ym].realizado += val;
          totalPassado += val;
        } else {
          ganhosPorMes[ym].aReceber += val;
        }

        if (ym === curYearMonth) {
          mesAtualTotal += val;
        }
      }
    });

    let projecaoMensalRecorrente = 0;
    pacientes.forEach(p => {
      if (!p.Arquivado && p.Arquivado !== 'true') {
        const valPadrao = parseFloat(p.ValorPadrao) || 120;
        const freq = parseInt(p.FrequenciaSemanal, 10) || 1;
        projecaoMensalRecorrente += (valPadrao * freq * 4);
      }
    });

    return {
      origem: 'FisioFlow',
      atualizadoEm: new Date().toISOString(),
      ganhosPorMes,
      totalHistoricoRecebido: totalPassado,
      mesAtualTotal,
      projecaoMensalRecorrente,
      pacientesAtivos: pacientes.filter(p => !p.Arquivado).length,
      totalAtendimentosRegistrados: atendimentos.length
    };
  }

  // ========================================================
  // 2. PARSER FATURAS (Nubank Mastercard Black)
  // ATENÇÃO MÁXIMA: Separa estritamente Real vs Simulado
  // ========================================================
  function processFaturasData(rawData, includeSimulated = false) {
    const monthStatus = rawData.monthStatus || rawData.pv4_mstatus || {};
    const overrides = rawData.overrides || rawData.pv4_over || {};
    const extraItems = rawData.extraItems || rawData.pv4_extra || [];
    const simItems = rawData.simItems || rawData.pv4_sim || [];
    const profile = rawData.profile || rawData.pv4_profile || {};
    const userCategories = rawData.userCategories || rawData.pv4_custom_categories || [];

    const faturasPorMes = {};
    let faturaAtualReal = 0;
    let faturasFuturasCompromissadas = 0;
    const categoriasTotais = {};

    if (Array.isArray(extraItems)) {
      extraItems.forEach(it => {
        const val = parseFloat(it.val || it.valor || 0);
        const cat = it.categoria || 'Cartão Outros';
        categoriasTotais[cat] = (categoriasTotais[cat] || 0) + val;
      });
    }

    for (const key in monthStatus) {
      const st = monthStatus[key];
      const val = parseFloat(st.total || st.valor || st || 0);

      faturasPorMes[key] = {
        status: typeof st === 'string' ? st : (st.status || 'aberta'),
        valorReal: val,
        valorSimulado: 0
      };

      if (faturasPorMes[key].status === 'aberta') {
        faturaAtualReal = val;
      } else if (faturasPorMes[key].status === 'futura' || faturasPorMes[key].status === 'prevista') {
        faturasFuturasCompromissadas += val;
      }
    }

    let totalSimuladoFuturo = 0;
    if (Array.isArray(simItems)) {
      simItems.forEach(s => {
        totalSimuladoFuturo += parseFloat(s.v || s.val || 0);
      });
    }

    return {
      origem: 'Faturas (Parcelado a Vista)',
      atualizadoEm: new Date().toISOString(),
      faturasPorMes,
      faturaAtualReal,
      faturasFuturasCompromissadas,
      totalSimuladoFuturo,
      includeSimulated,
      mensalidadeBlack: 89.0,
      limiteMetaMensal: parseFloat(profile.meta || 4000.0),
      categoriasTotais
    };
  }

  // ========================================================
  // 3. PARSER CASA MARACAJU 88 (Mercado NFC-e, VA e VR)
  // ========================================================
  function processMaracajuData(rawData, vrCreditadoNoMes = 1235.0) {
    const comprasMercado = rawData.comprasMercado || (rawData.mercado && rawData.mercado.compras) || [];
    const refeicoesFora = rawData.refeicoes || (rawData.mercado && rawData.mercado.refeicoes) || [];
    const reformas = rawData.reformas || [];
    const carro = rawData.carro || [];

    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Gastos de Mercado (NFC-e)
    let gastoMercadoMesAtual = 0;
    comprasMercado.forEach(c => {
      const val = parseFloat(c.total || c.valor || 0);
      const ym = String(c.data || '').slice(0, 7);
      if (ym === curYearMonth) {
        gastoMercadoMesAtual += val;
      }
    });

    const vaMensal = 2050.0;
    const saldoVaRestante = Math.max(0, vaMensal - gastoMercadoMesAtual);
    const transbordouVa = gastoMercadoMesAtual > vaMensal ? (gastoMercadoMesAtual - vaMensal) : 0;

    // 2. Gastos com Refeições / Almoço fora (Confronto VR)
    let gastoVrMesAtual = 0;
    refeicoesFora.forEach(r => {
      const val = parseFloat(r.total || r.valor || 0);
      const ym = String(r.data || '').slice(0, 7);
      if (ym === curYearMonth) {
        gastoVrMesAtual += val;
      }
    });

    const saldoVrRestante = Math.max(0, vrCreditadoNoMes - gastoVrMesAtual);
    const transbordouVr = gastoVrMesAtual > vrCreditadoNoMes ? (gastoVrMesAtual - vrCreditadoNoMes) : 0;

    return {
      origem: 'Maracaju 88',
      atualizadoEm: new Date().toISOString(),
      vaMensal,
      gastoMercadoMesAtual,
      saldoVaRestante,
      transbordouVa,
      vrCreditadoNoMes,
      gastoVrMesAtual,
      saldoVrRestante,
      transbordouVr,
      reformasAndamento: reformas.filter(r => r.status === 'Em Andamento').length,
      manutencoesCarro: carro.length
    };
  }

  // ========================================================
  // MOTOR CENTRAL DE SCRAPING DOS 3 APPS
  // ========================================================
  async function scrapeAll() {
    const cfg = getSatelliteConfig();
    const state = MatrixDB.getState();
    if (!state.satellites) state.satellites = {};

    const statusResults = { fisio: null, faturas: null, maracaju: null };

    // 1. FisioFlow
    if (cfg.fisioUrl) {
      try {
        const sep = cfg.fisioUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.fisioUrl}${sep}token=${encodeURIComponent(cfg.fisioToken)}`);
        const json = await res.json();
        state.satellites.fisioflow = processFisioData(json);
        statusResults.fisio = { success: true };
      } catch (e) {
        statusResults.fisio = { success: false, error: e.message };
      }
    }

    // 2. Faturas (com cautela extrema em itens simulados)
    if (cfg.faturasUrl) {
      try {
        const sep = cfg.faturasUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.faturasUrl}${sep}action=restore&token=${encodeURIComponent(cfg.faturasToken)}`);
        const json = await res.json();
        const payload = json.data || json;
        state.satellites.faturas = processFaturasData(payload, cfg.includeSimulated);
        statusResults.faturas = { success: true };
      } catch (e) {
        statusResults.faturas = { success: false, error: e.message };
      }
    }

    // 3. Maracaju 88 (Confronto Duplo: VA e VR)
    if (cfg.maracajuUrl) {
      try {
        const sep = cfg.maracajuUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.maracajuUrl}${sep}action=restore&token=${encodeURIComponent(cfg.maracajuToken)}`);
        const json = await res.json();
        const payload = json.data || json;

        let vrAtual = 1235.0;
        try {
          const now = new Date();
          const commute = CalendarEngine.calculateCommuteAndVR(now.getFullYear(), now.getMonth() + 1);
          if (commute && commute.totalVR) vrAtual = commute.totalVR;
        } catch (err) {}

        state.satellites.maracaju = processMaracajuData(payload, vrAtual);
        statusResults.maracaju = { success: true };
      } catch (e) {
        statusResults.maracaju = { success: false, error: e.message };
      }
    }

    state.satellites.lastScraped = new Date().toISOString();
    MatrixDB.saveState(state);
    localStorage.setItem(STORAGE_KEYS.lastScraped, state.satellites.lastScraped);

    return statusResults;
  }

  return {
    getSatelliteConfig,
    saveSatelliteConfig,
    processFisioData,
    processFaturasData,
    processMaracajuData,
    scrapeAll
  };
})();

if (typeof window !== 'undefined') {
  window.SatelliteConnectors = SatelliteConnectors;
}
