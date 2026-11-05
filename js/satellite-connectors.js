/**
 * MATRIX FINANCE - SATELLITE APPS INGESTION & SCRAPING ENGINE
 * Coleta automática e estruturada dos 3 apps conectados:
 * 1. FisioFlow: Ganhos passados, atuais e previsões futuras da Scarlet.
 * 2. Faturas: Faturas passadas, abertas, parcelas futuras e categorias Nubank Black.
 * 3. Maracaju 88: Gastos de mercado (NFC-e) vs saldo VA (R$ 2.050), reformas e carro.
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
      autoScrapeOnOpen: localStorage.getItem(STORAGE_KEYS.autoScrapeOnOpen) !== 'false'
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
  }

  // 1. Parser FisioFlow (Ganhos da Scarlet)
  function processFisioData(rawData) {
    const atendimentos = rawData.atendimentos || [];
    const pacientes = rawData.pacientes || [];

    // Agrupamento por mês: YYYY-MM
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

    // Projeção futura baseada nos pacientes ativos e frequência semanal
    let projecaoMensalRecorrente = 0;
    pacientes.forEach(p => {
      if (!p.Arquivado && p.Arquivado !== 'true') {
        const valPadrao = parseFloat(p.ValorPadrao) || 120;
        const freq = parseInt(p.FrequenciaSemanal, 10) || 1;
        projecaoMensalRecorrente += (valPadrao * freq * 4); // 4 semanas por mês
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

  // 2. Parser Faturas (Nubank Mastercard Black)
  function processFaturasData(rawData) {
    const months = rawData.monthStatus || rawData.months || {};
    const extra = rawData.extraItems || rawData.extra || [];
    const categories = rawData.userCategories || [];

    const faturasPorMes = {};
    let faturaAtualValor = 0;
    let faturasFuturasTotal = 0;

    for (const key in months) {
      const m = months[key];
      const val = parseFloat(m.total || m.valor || 0);
      faturasPorMes[key] = {
        valor: val,
        status: m.status || 'aberta',
        meta: parseFloat(m.meta || 0)
      };
      if (m.status === 'aberta') faturaAtualValor = val;
      if (m.status === 'futura' || m.status === 'prevista') faturasFuturasTotal += val;
    }

    return {
      origem: 'Faturas (Parcelado a Vista)',
      atualizadoEm: new Date().toISOString(),
      faturasPorMes,
      faturaAtualValor,
      faturasFuturasTotal,
      mensalidadeBlack: 89.0,
      totalLancamentosFuturos: Array.isArray(extra) ? extra.length : 0
    };
  }

  // 3. Parser Casa Maracaju (Mercado NFC-e & Lar)
  function processMaracajuData(rawData) {
    const comprasMercado = rawData.comprasMercado || (rawData.mercado && rawData.mercado.compras) || [];
    const reformas = rawData.reformas || [];
    const manutencoes = rawData.carro || [];

    // Gastos de mercado agrupados por mês
    const mercadoPorMes = {};
    let gastoMercadoMesAtual = 0;
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    comprasMercado.forEach(c => {
      const val = parseFloat(c.total || c.valor || 0);
      const ym = String(c.data || '').slice(0, 7);
      if (ym) {
        mercadoPorMes[ym] = (mercadoPorMes[ym] || 0) + val;
        if (ym === curYearMonth) {
          gastoMercadoMesAtual += val;
        }
      }
    });

    const vaMensal = 2050.0;
    const saldoVaRestante = Math.max(0, vaMensal - gastoMercadoMesAtual);
    const transbordouVa = gastoMercadoMesAtual > vaMensal ? gastoMercadoMesAtual - vaMensal : 0;

    return {
      origem: 'Maracaju 88',
      atualizadoEm: new Date().toISOString(),
      vaMensal,
      gastoMercadoMesAtual,
      saldoVaRestante,
      transbordouVa,
      mercadoPorMes,
      totalComprasNFCe: comprasMercado.length,
      reformasAndamento: reformas.filter(r => r.status === 'Em Andamento').length,
      manutencoesPendentes: manutencoes.filter(m => !m.concluido).length
    };
  }

  // Executa o Scraping de todos os 3 apps
  async function scrapeAll() {
    const cfg = getSatelliteConfig();
    const state = MatrixDB.getState();
    if (!state.satellites) state.satellites = {};

    const statusResults = { fisio: null, faturas: null, maracaju: null };

    // 1. Scraping FisioFlow
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

    // 2. Scraping Faturas
    if (cfg.faturasUrl) {
      try {
        const sep = cfg.faturasUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.faturasUrl}${sep}action=restore&token=${encodeURIComponent(cfg.faturasToken)}`);
        const json = await res.json();
        const payload = json.data || json;
        state.satellites.faturas = processFaturasData(payload);
        statusResults.faturas = { success: true };
      } catch (e) {
        statusResults.faturas = { success: false, error: e.message };
      }
    }

    // 3. Scraping Maracaju 88
    if (cfg.maracajuUrl) {
      try {
        const sep = cfg.maracajuUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.maracajuUrl}${sep}action=restore&token=${encodeURIComponent(cfg.maracajuToken)}`);
        const json = await res.json();
        const payload = json.data || json;
        state.satellites.maracaju = processMaracajuData(payload);
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
