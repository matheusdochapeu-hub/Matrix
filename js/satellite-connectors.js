/**
 * MATRIX FINANCE - SATELLITE APPS INGESTION & SCRAPING ENGINE (v1.3.0)
 * Coleta com alta precisão e sem distorções dos 3 apps satélites:
 * 1. FisioFlow: Ganhos passados, mês atual e projeções futuras (Scarlet).
 * 2. Faturas: Nubank Mastercard Black — dados reais da fatura calculados
 *    a partir dos itens base e lançamentos extras da planilha/app Faturas.
 * 3. Maracaju 88: Confronto duplo de benefícios (Mercado NFC-e vs VA e VR).
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

  const DEFAULT_ENDPOINTS = {
    faturasUrl: 'https://script.google.com/macros/s/AKfycbzXFXbZQ8TfHYwntMXg5k1lI_1pzBx7rTwVYycNESff8KC3DV95CRq15OrcP6dsC2_F/exec',
    fisioUrl: 'https://script.google.com/macros/s/AKfycbz9uHQZiq_eNMs7pA4_uiI_qLxcrkG7BuW_ThjLt7yRh7cBuHT3Pg8B2nIn402JrlO7Vw/exec',
    maracajuUrl: 'https://script.google.com/macros/s/AKfycbywJvIREiTE3wO1J_8dE-vSXWHk4SzsU2XCvL7ktlj1CkF5T24aXMvkLa3XCadNG0sxWg/exec',
    maracajuToken: 'Maracaju88CasalSegredo2026!'
  };

  // Itens base idênticos aos de parcelado-a-vista/index.html
  const BASE_ITEMS = [
    /* ── OUTUBRO/2026 (R$ 3.418,03) ── */
    { d: 'Casa Almeida 5/5', v: 101.88, de: 1, ate: 1, tag: 'parc', cat: 'Casa & Utilidades' },
    { d: 'Maravilhas do Lar 2/2', v: 57.47, de: 1, ate: 1, tag: 'parc', cat: 'Casa & Utilidades' },
    { d: 'Black Creek 3/4', v: 64.48, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'S V Comercio 2/2', v: 97.46, de: 1, ate: 1, tag: 'parc', cat: 'Compras & Variados' },
    { d: 'Globoplay 8/12', v: 22.90, de: 1, ate: 1, tag: 'parc', cat: 'Serviços & Assinaturas' },
    { d: 'Estratégia 3/12', v: 48.93, de: 1, ate: 1, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Amazon 3/3', v: 73.30, de: 1, ate: 1, tag: 'parc', cat: 'Compras & E-commerce' },
    { d: 'Petlove Clube 10/12', v: 9.99, de: 1, ate: 1, tag: 'parc', cat: 'Pet & Veterinário' },
    { d: 'Tennis One 4/5', v: 79.99, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Black Creek 3/4 (2)', v: 94.97, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Petlove NuPay 2/2', v: 206.40, de: 1, ate: 1, tag: 'parc', cat: 'Pet & Veterinário' },
    { d: 'Studio Rocha 4/6', v: 350.00, de: 1, ate: 1, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Quiosque Ribeirão 2/2', v: 57.49, de: 1, ate: 1, tag: 'parc', cat: 'Alimentação & Gastronomia' },
    { d: 'Maravilhas do Lar 2/2 (2)', v: 93.43, de: 1, ate: 1, tag: 'parc', cat: 'Casa & Utilidades' },
    { d: 'Casas Bahia 10/10', v: 203.95, de: 1, ate: 1, tag: 'parc', cat: 'Casa & Utilidades' },
    { d: 'Tennis One 3/4', v: 49.99, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Le Sac 4/4', v: 62.99, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Converse Dom Pedro 5/6', v: 124.96, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Gelatto Borelli', v: 66.00, de: 1, ate: 1, tag: 'var', cat: 'Alimentação & Gastronomia' },
    { d: 'Estacionamento', v: 17.50, de: 1, ate: 1, tag: 'var', cat: 'Transporte & Tag' },
    { d: 'Rd Saude Online (1)', v: 88.28, de: 1, ate: 1, tag: 'var', cat: 'Saúde & Farmácia' },
    { d: 'Mercadolivre', v: 67.64, de: 1, ate: 1, tag: 'var', cat: 'Compras & E-commerce' },
    { d: 'Rd Saude Online (2)', v: 116.94, de: 1, ate: 1, tag: 'var', cat: 'Saúde & Farmácia' },
    { d: 'Claro Flex', v: 44.99, de: 1, ate: 1, tag: 'var', cat: 'Serviços & Assinaturas' },
    { d: 'Shopping Ribeirão', v: 39.80, de: 1, ate: 1, tag: 'var', cat: 'Alimentação & Gastronomia' },
    { d: 'Bagaggio 1/2', v: 62.43, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Pernambucanas 1/3', v: 113.31, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 1/10', v: 157.07, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tramontina', v: 25.90, de: 1, ate: 1, tag: 'var', cat: 'Casa & Utilidades' },
    { d: 'Divai Utilidades', v: 161.94, de: 1, ate: 1, tag: 'var', cat: 'Casa & Utilidades' },
    { d: 'Caedu', v: 19.99, de: 1, ate: 1, tag: 'var', cat: 'Vestuário & Moda' },
    { d: 'Estac Shopping (2)', v: 26.50, de: 1, ate: 1, tag: 'var', cat: 'Transporte & Tag' },
    { d: 'Inovathi 1/3', v: 60.01, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Pernambucanas (avulso)', v: 59.99, de: 1, ate: 1, tag: 'var', cat: 'Vestuário & Moda' },
    { d: 'Lupofranquia 1/3', v: 262.88, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Sigapay', v: 3.00, de: 1, ate: 1, tag: 'var', cat: 'Transporte & Tag' },
    { d: 'Cotton On 1/3', v: 69.97, de: 1, ate: 1, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Borelli (1)', v: 46.00, de: 1, ate: 1, tag: 'var', cat: 'Alimentação & Gastronomia' },
    { d: 'Borelli (2)', v: 28.00, de: 1, ate: 1, tag: 'var', cat: 'Alimentação & Gastronomia' },
    { d: 'Corrida Sampa 1/3', v: 79.31, de: 1, ate: 1, tag: 'parc', cat: 'Saúde & Bem-estar' },
    /* ── NOVEMBRO/2026 (R$ 1.651,04) ── */
    { d: 'Tennis One 4/4', v: 49.99, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Cotton On 2/3', v: 69.95, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Converse Dom Pedro 6/6', v: 124.96, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Pernambucanas 2/3', v: 113.31, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Bagaggio 2/2', v: 62.42, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 2/10', v: 156.99, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Inovathi 2/3', v: 59.99, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Lupofranquia 2/3', v: 262.86, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 5/5', v: 79.99, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Black Creek 4/4', v: 94.97, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Studio Rocha 5/6', v: 350.00, de: 2, ate: 2, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Black Creek 4/4 (2)', v: 64.48, de: 2, ate: 2, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Globoplay 9/12', v: 22.90, de: 2, ate: 2, tag: 'parc', cat: 'Serviços & Assinaturas' },
    { d: 'Estratégia 4/12', v: 48.93, de: 2, ate: 2, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Petlove Clube 11/12', v: 9.99, de: 2, ate: 2, tag: 'parc', cat: 'Pet & Veterinário' },
    { d: 'Corrida Sampa 2/3', v: 79.31, de: 2, ate: 2, tag: 'parc', cat: 'Saúde & Bem-estar' },
    /* ── DEZEMBRO/2026 ── */
    { d: 'Pernambucanas 3/3', v: 113.31, de: 3, ate: 3, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Cotton On 3/3', v: 69.97, de: 3, ate: 3, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 3/10', v: 156.99, de: 3, ate: 3, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Inovathi 3/3', v: 59.99, de: 3, ate: 3, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Lupofranquia 3/3', v: 262.86, de: 3, ate: 3, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Studio Rocha 6/6', v: 350.00, de: 3, ate: 3, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Globoplay 10/12', v: 22.90, de: 3, ate: 3, tag: 'parc', cat: 'Serviços & Assinaturas' },
    { d: 'Estratégia 5/12', v: 48.93, de: 3, ate: 3, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Petlove Clube 12/12', v: 9.99, de: 3, ate: 3, tag: 'parc', cat: 'Pet & Veterinário' },
    { d: 'Corrida Sampa 3/3', v: 79.31, de: 3, ate: 3, tag: 'parc', cat: 'Saúde & Bem-estar' },
    /* ── JANEIRO/2027 ── */
    { d: 'Studio Rocha 1/6 (nova)', v: 350.00, de: 4, ate: 4, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Globoplay 11/12', v: 22.90, de: 4, ate: 4, tag: 'parc', cat: 'Serviços & Assinaturas' },
    { d: 'Petlove Clube 1/12 (nova)', v: 9.99, de: 4, ate: 4, tag: 'parc', cat: 'Pet & Veterinário' },
    /* ── PARCELAS CONTÍNUAS ── */
    { d: 'Tennis One 4/10', v: 156.99, de: 4, ate: 4, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 5/10', v: 156.99, de: 5, ate: 5, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 6/10', v: 156.99, de: 6, ate: 6, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 7/10', v: 156.99, de: 7, ate: 7, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 8/10', v: 156.99, de: 8, ate: 8, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 9/10', v: 156.99, de: 9, ate: 9, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Tennis One 10/10', v: 156.99, de: 10, ate: 10, tag: 'parc', cat: 'Vestuário & Moda' },
    { d: 'Estratégia 6/12', v: 48.93, de: 4, ate: 4, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Estratégia 7/12', v: 48.93, de: 5, ate: 5, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Estratégia 8/12', v: 48.93, de: 6, ate: 6, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Estratégia 9/12', v: 48.93, de: 7, ate: 7, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Estratégia 10/12', v: 48.93, de: 8, ate: 8, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Estratégia 11/12', v: 48.93, de: 9, ate: 9, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Estratégia 12/12', v: 48.93, de: 10, ate: 10, tag: 'parc', cat: 'Educação & Cursos' },
    { d: 'Studio Rocha 2/6 (nova)', v: 350.00, de: 5, ate: 5, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Studio Rocha 3/6 (nova)', v: 350.00, de: 6, ate: 6, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Studio Rocha 4/6 (nova)', v: 350.00, de: 7, ate: 7, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Studio Rocha 5/6 (nova)', v: 350.00, de: 8, ate: 8, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Studio Rocha 6/6 (nova)', v: 350.00, de: 9, ate: 9, tag: 'parc', cat: 'Saúde & Bem-estar' },
    { d: 'Globoplay 12/12', v: 22.90, de: 5, ate: 5, tag: 'parc', cat: 'Serviços & Assinaturas' },
    { d: 'Petlove Clube 2/12', v: 9.99, de: 5, ate: 12, tag: 'parc', cat: 'Pet & Veterinário' }
  ];

  function getSatelliteConfig() {
    return {
      fisioUrl: localStorage.getItem(STORAGE_KEYS.fisioUrl) || DEFAULT_ENDPOINTS.fisioUrl,
      fisioToken: localStorage.getItem(STORAGE_KEYS.fisioToken) || '',
      faturasUrl: localStorage.getItem(STORAGE_KEYS.faturasUrl) || DEFAULT_ENDPOINTS.faturasUrl,
      faturasToken: localStorage.getItem(STORAGE_KEYS.faturasToken) || '',
      maracajuUrl: localStorage.getItem(STORAGE_KEYS.maracajuUrl) || DEFAULT_ENDPOINTS.maracajuUrl,
      maracajuToken: localStorage.getItem(STORAGE_KEYS.maracajuToken) || DEFAULT_ENDPOINTS.maracajuToken,
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
  const BASELINE_FISIO = {
    origem: 'FisioFlow',
    atualizadoEm: new Date().toISOString(),
    ganhosPorMes: {
      '2026-08': { realizado: 4670, aReceber: 0, sessoes: 38, total: 4670 },
      '2026-09': { realizado: 3700, aReceber: 0, sessoes: 30, total: 3700 },
      '2026-10': { realizado: 1140, aReceber: 0, sessoes: 10, total: 1140 },
      '2026-11': { realizado: 805, aReceber: 0, sessoes: 7, total: 805 }
    },
    totalHistoricoRecebido: 10315.00,
    mesAtualTotal: 805.00,
    projecaoMensalRecorrente: 1500.00,
    pacientesAtivos: 8,
    totalAtendimentosRegistrados: 85
  };

  function getBaselineFisioData() {
    return JSON.parse(JSON.stringify(BASELINE_FISIO));
  }

  function processFisioData(rawData) {
    const atendimentos = (rawData && rawData.atendimentos) || [];
    const pacientes = (rawData && rawData.pacientes) || [];

    if (!atendimentos.length && !pacientes.length) {
      return getBaselineFisioData();
    }

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
        if (!ganhosPorMes[ym]) ganhosPorMes[ym] = { realizado: 0, aReceber: 0, sessoes: 0, total: 0 };
        ganhosPorMes[ym].sessoes++;
        ganhosPorMes[ym].total += val;

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
      projecaoMensalRecorrente: Math.max(1500, projecaoMensalRecorrente),
      pacientesAtivos: pacientes.filter(p => !p.Arquivado && p.Arquivado !== 'true').length,
      totalAtendimentosRegistrados: atendimentos.length
    };
  }

  // ========================================================
  // 2. PARSER FATURAS (Nubank Mastercard Black)
  // ========================================================
  function inferCategory(desc) {
    const d = (desc || '').toLowerCase();
    if (d.includes('uber') || d.includes('nutag') || d.includes('estac') || d.includes('autoparque') || d.includes('sigapay') || d.includes('mobifacil')) {
      return 'Transporte & Tag';
    }
    if (d.includes('petlove')) {
      return 'Pet & Veterinário';
    }
    if (d.includes('ifood') || d.includes('delivery') || d.includes('borelli') || d.includes('spoleto') || d.includes('jockey') || d.includes('outback') || d.includes('burger') || d.includes('carnes') || d.includes('filialdrive') || d.includes('hortifruti') || d.includes('mariajose') || d.includes('alimentacao')) {
      return 'Alimentação & Gastronomia';
    }
    if (d.includes('shopee') || d.includes('mercado') || d.includes('amazon') || d.includes('kalunga') || d.includes('casas bahia') || d.includes('maravilhas')) {
      return 'Compras & E-commerce';
    }
    if (d.includes('tennis') || d.includes('cotton') || d.includes('converse') || d.includes('lupo') || d.includes('bagaggio') || d.includes('pernambucanas') || d.includes('inovathi') || d.includes('black creek') || d.includes('caedu') || d.includes('le sac')) {
      return 'Vestuário & Moda';
    }
    if (d.includes('globoplay') || d.includes('claro') || d.includes('nubank') || d.includes('estratégia')) {
      return 'Serviços & Assinaturas';
    }
    if (d.includes('studio rocha') || d.includes('rosa') || d.includes('saude') || d.includes('corrida')) {
      return 'Saúde, Estética & Bem-estar';
    }
    return 'Compras & Variados';
  }

  function processFaturasData(rawData, includeSimulated = false) {
    const overrides = rawData.overrides || rawData.pv4_over || {};
    const extraItems = rawData.extraItems || rawData.pv4_extra || [];
    const simItems = rawData.simItems || rawData.pv4_sim || [];
    const profile = rawData.profile || rawData.pv4_profile || {};

    const MNS_MAP = {
      0: '2026-Setembro',
      1: '2026-Outubro',
      2: '2026-Novembro',
      3: '2026-Dezembro',
      4: '2027-Janeiro',
      5: '2027-Fevereiro',
      6: '2027-Março',
      7: '2027-Abril',
      8: '2027-Maio',
      9: '2027-Junho',
      10: '2027-Julho',
      11: '2027-Agosto',
      12: '2027-Setembro',
      13: '2027-Outubro',
      14: '2027-Novembro'
    };

    const faturasPorMes = {};
    const categoriasTotais = {};

    // Calcula dinamicamente cada mês de 0 a 14
    for (let mi = 0; mi <= 14; mi++) {
      const monthKey = MNS_MAP[mi] || `Mês_${mi}`;
      const itemsDoMes = [];
      let totalMes = 0;

      // 1. Itens base
      BASE_ITEMS.forEach(it => {
        if (mi >= it.de && mi <= it.ate) {
          const overKey = `${it.d}__${mi}`;
          const val = overrides.hasOwnProperty(overKey) ? overrides[overKey] : it.v;
          if (val >= 0) { // -1 significa deletado
            const cat = it.cat || inferCategory(it.d);
            itemsDoMes.push({
              desc: it.d,
              valor: val,
              tag: it.tag,
              categoria: cat,
              isBase: true
            });
            totalMes += val;
            categoriasTotais[cat] = (categoriasTotais[cat] || 0) + val;
          }
        }
      });

      // 2. Itens extras
      if (Array.isArray(extraItems)) {
        extraItems.forEach(it => {
          const de = parseInt(it.de, 10);
          const ate = parseInt(it.ate, 10);
          if (mi >= de && mi <= ate) {
            const val = parseFloat(it.val || it.valor || 0);
            const cat = it.categoria || inferCategory(it.desc || it.d);
            itemsDoMes.push({
              desc: it.desc || it.d || 'Gasto Cartão',
              valor: val,
              tag: it.tag || 'extra',
              categoria: cat,
              isExtra: true
            });
            totalMes += val;
            categoriasTotais[cat] = (categoriasTotais[cat] || 0) + val;
          }
        });
      }

      // 3. Simulações (se ativadas)
      if (includeSimulated && Array.isArray(simItems)) {
        simItems.forEach(s => {
          const de = parseInt(s.de, 10);
          const ate = parseInt(s.ate, 10);
          if (mi >= de && mi <= ate) {
            const val = parseFloat(s.v || s.val || 0);
            itemsDoMes.push({
              desc: `(Simulado) ${s.d || 'Simulação'}`,
              valor: val,
              tag: 'sim',
              categoria: 'Simulado',
              isSimulated: true
            });
            totalMes += val;
          }
        });
      }

      const categoriasDoMes = {};
      itemsDoMes.forEach(it => {
        const cat = it.categoria || inferCategory(it.desc || it.d);
        categoriasDoMes[cat] = Math.round(((categoriasDoMes[cat] || 0) + it.valor) * 100) / 100;
      });

      faturasPorMes[monthKey] = {
        total: Math.round(totalMes * 100) / 100,
        status: mi < 2 ? 'fechada' : 'aberta',
        itens: itemsDoMes,
        categorias: categoriasDoMes,
        mesIndex: mi
      };
    }

    const faturaAtualReal = faturasPorMes['2026-Novembro'] ? faturasPorMes['2026-Novembro'].total : 4568.57;

    return {
      origem: 'Faturas (Parcelado a Vista)',
      atualizadoEm: new Date().toISOString(),
      faturasPorMes,
      faturaAtualReal,
      faturasFuturasCompromissadas: faturasPorMes['2026-Dezembro'] ? faturasPorMes['2026-Dezembro'].total : 1568.05,
      includeSimulated,
      mensalidadeBlack: 89.0,
      limiteMetaMensal: parseFloat(profile.meta || 3000.0),
      categoriasTotais
    };
  }

  // ========================================================
  // 3. PARSER CASA MARACAJU 88 (Mercado NFC-e, VA e VR)
  // Regras idênticas ao motor de benefícios do App Maracaju 88:
  // - Crédito cai todo 4º dia útil bancário (em 2026-11: dia 06/11)
  // - Compras antes do 4º dia útil pertencem ao ciclo anterior (Outubro)
  // - Ciclo vigente (Novembro) recebe as sobras de Outubro somadas ao novo crédito:
  //   * VA: R$ 2.050,00 (depósito) + R$ 9,84 (sobra Out) = R$ 2.059,84
  //   * VR: R$ 1.105,00 (17 dias úteis USP x R$ 65) + R$ 0,16 (sobra Out) = R$ 1.105,16
  //   * Total: R$ 3.165,00
  // ========================================================
  function processMaracajuData(rawData, vrCreditadoNoMes = 1105.0) {
    if (!rawData) rawData = {};
    const payload = rawData.data || rawData;

    const registros = payload.comprasRegistros || payload.registros || [];
    const comprasList = payload.compras || payload.comprasMercado || (payload.mercado && payload.mercado.compras) || [];
    const refeicoesList = payload.refeicoes || (payload.mercado && payload.mercado.refeicoes) || [];
    const reformas = payload.reformas || [];
    const carro = payload.carro || [];

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curCycleKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    // Configurações de crédito e rollover oficiais da Casa Maracaju 88
    const benefitsConfig = {
      vaFixedAmount: 2050.00,
      vrDailyAmount: 65.00,
      monthlyDays: { '2026-10': 17, '2026-11': 17 },
      monthlyCreditDates: { '2026-10': '2026-10-06', '2026-11': '2026-11-06' },
      monthlyEndingBalances: {
        '2026-10': { vaEndingBalance: 9.84, vrEndingBalance: 0.16 }
      },
      monthlyRolloverOverrides: {
        '2026-11': { vaRollover: 9.84, vrRollover: 0.16 }
      }
    };

    // Data de corte do crédito de Novembro: 06/11/2026 (4º dia útil bancário)
    const creditDateNov = (benefitsConfig.monthlyCreditDates && benefitsConfig.monthlyCreditDates[curCycleKey]) || '2026-11-06';

    const vaDeposit = benefitsConfig.vaFixedAmount; // R$ 2.050,00
    const vrDays = (benefitsConfig.monthlyDays && benefitsConfig.monthlyDays[curCycleKey]) || 17;
    const vrDeposit = Math.round(vrDays * benefitsConfig.vrDailyAmount * 100) / 100; // R$ 1.105,00

    const rollover = (benefitsConfig.monthlyRolloverOverrides && benefitsConfig.monthlyRolloverOverrides[curCycleKey]) || { vaRollover: 9.84, vrRollover: 0.16 };
    const vaRollover = Number(rollover.vaRollover) || 0;
    const vrRollover = Number(rollover.vrRollover) || 0;

    const vaTotal = Math.round((vaDeposit + vaRollover) * 100) / 100; // R$ 2.059,84
    const vrTotal = Math.round((vrDeposit + vrRollover) * 100) / 100; // R$ 1.105,16

    let gastoMercadoCicloAtual = 0;
    let gastoVrCicloAtual = 0;
    let gastoMercadoCicloAnterior = 0;
    let gastoVrCicloAnterior = 0;

    // 1. Processa NFC-e e compras
    registros.forEach(r => {
      const val = parseFloat(r.total || r.valor || 0);
      const dataStr = String(r.date || r.data || r.createdAt || '').slice(0, 10);
      const method = String(r.paymentMethod || r.metodoPagamento || 'va').toLowerCase();

      // Compras anteriores à data do crédito (ex: 03/11 < 06/11) pertencem ao ciclo anterior (Outubro)
      if (dataStr && dataStr < creditDateNov) {
        if (method === 'vr' || method.includes('refei')) {
          gastoVrCicloAnterior += val;
        } else {
          gastoMercadoCicloAnterior += val;
        }
      } else {
        // Compras efetuadas a partir de 06/11 pertencem ao ciclo vigente (Novembro)
        if (method === 'vr' || method.includes('refei')) {
          gastoVrCicloAtual += val;
        } else {
          gastoMercadoCicloAtual += val;
        }
      }
    });

    comprasList.forEach(c => {
      if (c.bought) {
        const val = parseFloat(c.totalPrice || c.price || c.valor || 0);
        const dataStr = String(c.date || c.data || c.createdAt || '').slice(0, 10);
        const method = String(c.paymentMethod || 'va').toLowerCase();
        if (dataStr && dataStr < creditDateNov) {
          if (method === 'vr') gastoVrCicloAnterior += val;
          else gastoMercadoCicloAnterior += val;
        } else {
          if (method === 'vr') gastoVrCicloAtual += val;
          else gastoMercadoCicloAtual += val;
        }
      }
    });

    refeicoesList.forEach(rf => {
      const val = parseFloat(rf.total || rf.valor || 0);
      const dataStr = String(rf.date || rf.data || '').slice(0, 10);
      if (dataStr && dataStr < creditDateNov) {
        gastoVrCicloAnterior += val;
      } else {
        gastoVrCicloAtual += val;
      }
    });

    const saldoVaRestante = Math.max(0, Math.round((vaTotal - gastoMercadoCicloAtual) * 100) / 100);
    const transbordouVa = gastoMercadoCicloAtual > vaTotal ? Math.round((gastoMercadoCicloAtual - vaTotal) * 100) / 100 : 0;

    const saldoVrRestante = Math.max(0, Math.round((vrTotal - gastoVrCicloAtual) * 100) / 100);
    const transbordouVr = gastoVrCicloAtual > vrTotal ? Math.round((gastoVrCicloAtual - vrTotal) * 100) / 100 : 0;

    return {
      origem: 'Maracaju 88',
      atualizadoEm: new Date().toISOString(),
      cicloVigente: curCycleKey,
      creditDate: creditDateNov,
      vaMensal: vaDeposit,
      vaRollover,
      vaTotal,
      gastoMercadoMesAtual: gastoMercadoCicloAtual,
      saldoVaRestante,
      transbordouVa,
      vrCreditadoNoMes: vrDeposit,
      vrRollover,
      vrTotal,
      vrDays,
      gastoVrMesAtual: gastoVrCicloAtual,
      saldoVrRestante,
      transbordouVr,
      totalBeneficios: Math.round((vaTotal + vrTotal) * 100) / 100,
      totalDisponivel: Math.round((saldoVaRestante + saldoVrRestante) * 100) / 100,
      gastoMercadoCicloAnterior: Math.round(gastoMercadoCicloAnterior * 100) / 100,
      gastoVrCicloAnterior: Math.round(gastoVrCicloAnterior * 100) / 100,
      reformasAndamento: reformas.filter(r => r.status === 'Em Andamento' || r.status === 'andamento').length,
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
        const res = await fetch(`${cfg.fisioUrl}${sep}action=getData&token=${encodeURIComponent(cfg.fisioToken || '')}`);
        if (res.ok) {
          const json = await res.json();
          state.satellites.fisioflow = processFisioData(json);
          statusResults.fisio = { success: true };
        }
      } catch (e) {
        statusResults.fisio = { success: false, error: e.message };
      }
    }

    // 2. Faturas (Nubank Mastercard Black)
    // Tenta primeiro via fetch remoto, se falhar ou se estiver no mesmo domínio, tenta localStorage
    let faturasRaw = null;
    if (cfg.faturasUrl) {
      try {
        const sep = cfg.faturasUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.faturasUrl}${sep}action=restore&token=${encodeURIComponent(cfg.faturasToken || '')}`);
        if (res.ok) {
          const json = await res.json();
          faturasRaw = json.data || json;
        }
      } catch (e) {
        // Fallback local caso fetch falhe
      }
    }

    if (!faturasRaw) {
      try {
        const sOver = localStorage.getItem('pv4_over');
        const sExtra = localStorage.getItem('pv4_extra');
        const sProfile = localStorage.getItem('pv4_profile');
        if (sExtra || sOver) {
          faturasRaw = {
            overrides: sOver ? JSON.parse(sOver) : {},
            extraItems: sExtra ? JSON.parse(sExtra) : [],
            profile: sProfile ? JSON.parse(sProfile) : {}
          };
        }
      } catch (e) {}
    }

    state.satellites.faturas = processFaturasData(faturasRaw || {}, cfg.includeSimulated);
    statusResults.faturas = { success: true };

    // 3. Maracaju 88 (Confronto Duplo: VA e VR)
    if (cfg.maracajuUrl) {
      try {
        const sep = cfg.maracajuUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.maracajuUrl}${sep}action=restore&token=${encodeURIComponent(cfg.maracajuToken || '')}`);
        if (res.ok) {
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
        }
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
    getBaselineFisioData,
    processFisioData,
    processFaturasData,
    processMaracajuData,
    scrapeAll
  };
})();

if (typeof window !== 'undefined') {
  window.SatelliteConnectors = SatelliteConnectors;
}
