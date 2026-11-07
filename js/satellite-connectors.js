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
      '2026-08': { realizado: 4670, aReceber: 0, previsto: 0, sessoes: 51, total: 4670, ganhoPossivel: 4670 },
      '2026-09': { realizado: 3700, aReceber: 0, previsto: 0, sessoes: 40, total: 3700, ganhoPossivel: 3700 },
      '2026-10': { realizado: 950, aReceber: 190, previsto: 0, sessoes: 13, total: 1140, ganhoPossivel: 1140 },
      '2026-11': { realizado: 0, aReceber: 995, previsto: 3300, sessoes: 11, total: 995, ganhoPossivel: 4295 }
    },
    totalHistoricoRecebido: 10505.00,
    mesAtualTotal: 995.00,
    mesAtualPrevisto: 3300.00,
    ganhoPossivelMes: 4295.00,
    capacidadeMensalRecorrente: 4400.00,
    projecaoMensalRecorrente: 4400.00,
    pacientesAtivos: 7,
    totalAtendimentosRegistrados: 115
  };

  function getBaselineFisioData() {
    return JSON.parse(JSON.stringify(BASELINE_FISIO));
  }

  function normName(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function processFisioData(rawData) {
    const atendimentos = (rawData && rawData.atendimentos) || [];
    const pacientes = (rawData && rawData.pacientes) || [];
    const agendamentos = (rawData && rawData.agendamentos) || [];

    if (!atendimentos.length && !pacientes.length) {
      return getBaselineFisioData();
    }

    const patientMap = {};
    pacientes.forEach(p => {
      const pid = p.ID || p.id;
      if (pid) patientMap[pid] = p;
    });

    function getSchedulePatient(sc) {
      const pid = sc.PacienteID || sc.pacienteId || sc.PacienteId;
      if (pid && patientMap[pid]) return patientMap[pid];
      const scName = normName(sc.PacienteNome || sc.pacienteNome || sc.Paciente || '');
      if (!scName) return null;
      return pacientes.find(p => {
        return (p.Nome && normName(p.Nome) === scName) ||
               (p.NomeFantasia && normName(p.NomeFantasia) === scName) ||
               (p.Paciente && normName(p.Paciente) === scName);
      }) || null;
    }

    function entryMatchesPatient(at, pObj) {
      if (!at || !pObj) return false;
      const atName = normName(at.Paciente || at.paciente || at.Nome || '');
      if (!atName) return false;
      if (pObj.Nome && normName(pObj.Nome) === atName) return true;
      if (pObj.NomeFantasia && normName(pObj.NomeFantasia) === atName) return true;
      if (pObj.Paciente && normName(pObj.Paciente) === atName) return true;
      return false;
    }

    // Reconciliação idêntica ao motor financeiro do FisioFlow (reconcileSchedulesWithEntries):
    // Vincula sessões já realizadas aos agendamentos para não duplicar valores na previsão
    const usedEntryIds = {};
    const processedSchedules = agendamentos.map(ag => ({ ...ag }));

    // 1) Marca agendamentos já vinculados explicitamente por AtendimentoId
    processedSchedules.forEach(sc => {
      const atId = sc.AtendimentoId || sc.atendimentoId;
      if (atId) {
        const match = atendimentos.find(e => (e.ID || e.id) === atId);
        if (match) {
          usedEntryIds[match.ID || match.id] = sc.ID || sc.id;
          if (sc.Status !== 'Realizado' && sc.Status !== 'Cancelado') {
            sc.Status = 'Realizado';
          }
        }
      }
    });

    // 2) Vincula agendamentos que ocorreram no mesmo dia e mesmo paciente de um atendimento realizado
    processedSchedules.forEach(sc => {
      const st = sc.Status || 'Agendado';
      const atId = sc.AtendimentoId || sc.atendimentoId;
      if (st === 'Cancelado' || atId) return;

      const scData = String(sc.Data || '').slice(0, 10);
      const pObj = getSchedulePatient(sc);
      const scRawName = normName(sc.PacienteNome || sc.pacienteNome || sc.Paciente || '');

      const matchEntry = atendimentos.find(e => {
        const eId = e.ID || e.id;
        if (usedEntryIds[eId]) return false;
        const eData = String(e.Data || '').slice(0, 10);
        if (eData !== scData) return false;
        if (pObj) return entryMatchesPatient(e, pObj);
        return normName(e.Paciente || e.paciente || e.Nome || '') === scRawName;
      });

      if (matchEntry) {
        const eId = matchEntry.ID || matchEntry.id;
        sc.AtendimentoId = eId;
        sc.Status = 'Realizado';
        usedEntryIds[eId] = sc.ID || sc.id;
      }
    });

    const ganhosPorMes = {};
    let totalPassado = 0;
    let mesAtualTotal = 0;
    let mesAtualPrevisto = 0;
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Somar atendimentos realizados/lançados
    atendimentos.forEach(at => {
      const val = parseFloat(at.Valor) || 0;
      const dataStr = String(at.Data || '');
      const ym = dataStr.slice(0, 7);

      if (ym) {
        if (!ganhosPorMes[ym]) ganhosPorMes[ym] = { realizado: 0, aReceber: 0, previsto: 0, sessoes: 0, total: 0, ganhoPossivel: 0 };
        ganhosPorMes[ym].sessoes++;
        ganhosPorMes[ym].total += val;

        if (at.Status === 'PAGO' || at.Status === 'Pago' || at.Status === 'Recebido') {
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

    // Somar apenas agendamentos pendentes (não realizados e não cancelados)
    processedSchedules.forEach(sc => {
      const st = sc.Status || 'Agendado';
      if (st !== 'Agendado') return;
      if (sc.AtendimentoId && atendimentos.some(e => (e.ID || e.id) === sc.AtendimentoId)) return;

      let val = parseFloat(sc.Valor) || 0;
      if (!val) {
        const pObj = getSchedulePatient(sc);
        if (pObj) val = parseFloat(pObj.ValorPadrao || pObj.valorPadrao) || 0;
      }

      const dataStr = String(sc.Data || '');
      const ym = dataStr.slice(0, 7);
      if (ym) {
        if (!ganhosPorMes[ym]) ganhosPorMes[ym] = { realizado: 0, aReceber: 0, previsto: 0, sessoes: 0, total: 0, ganhoPossivel: 0 };
        ganhosPorMes[ym].previsto += val;
        if (ym === curYearMonth) {
          mesAtualPrevisto += val;
        }
      }
    });

    Object.keys(ganhosPorMes).forEach(ym => {
      ganhosPorMes[ym].ganhoPossivel = (ganhosPorMes[ym].total || 0) + (ganhosPorMes[ym].previsto || 0);
    });

    let capacidadeMensalRecorrente = 0;
    let pacAtivosCount = 0;
    pacientes.forEach(p => {
      const isArq = p.Arquivado === 'Sim' || p.Arquivado === 'true' || p.Arquivado === true;
      if (!isArq) {
        pacAtivosCount++;
        const valPadrao = parseFloat(p.ValorPadrao) || 95;
        const freqStr = String(p.FrequenciaSemanal || '');
        let fNum = 1;
        if (freqStr.includes('3')) fNum = 3;
        else if (freqStr.includes('2')) fNum = 2;
        else if (freqStr.includes('1')) fNum = 1;
        capacidadeMensalRecorrente += (valPadrao * fNum * 4);
      }
    });

    const ganhoPossivelMes = mesAtualTotal + mesAtualPrevisto;

    return {
      origem: 'FisioFlow',
      atualizadoEm: new Date().toISOString(),
      ganhosPorMes,
      totalHistoricoRecebido: totalPassado,
      mesAtualTotal,
      mesAtualPrevisto,
      ganhoPossivelMes: ganhoPossivelMes > 0 ? ganhoPossivelMes : (capacidadeMensalRecorrente || 4400.00),
      capacidadeMensalRecorrente: capacidadeMensalRecorrente || 4400.00,
      projecaoMensalRecorrente: capacidadeMensalRecorrente || 4400.00,
      pacientesAtivos: pacAtivosCount || 7,
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
    const faturasFuturasCompromissadas = faturasPorMes['2026-Dezembro'] ? faturasPorMes['2026-Dezembro'].total : 1568.05;

    return {
      origem: 'Faturas (Parcelado a Vista)',
      atualizadoEm: new Date().toISOString(),
      faturasPorMes,
      faturaAtualReal,
      faturaAtualValor: faturaAtualReal,
      faturasFuturasCompromissadas,
      faturasFuturasTotal: faturasFuturasCompromissadas,
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
  // - Sincroniza também via localStorage same-origin (MARACAJU_STATE_v1)
  // ========================================================
  function getLocalMaracajuRawState() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem('MARACAJU_STATE_v1') || localStorage.getItem('MARACAJU88_STATE_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function mergeMaracajuPayloads(cloudPayload, localPayload) {
    if (!cloudPayload && !localPayload) return {};
    if (!cloudPayload || cloudPayload.status === 'error') return localPayload || {};
    if (!localPayload || localPayload.status === 'error') return cloudPayload || {};

    const cData = cloudPayload.data || cloudPayload;
    const lData = localPayload.data || localPayload;

    const mapReg = new Map();
    const addRecord = (r) => {
      if (!r || typeof r !== 'object') return;
      const mkt = String(r.marketName || r.establishment || r.estabelecimento || '').trim().toLowerCase();
      const key = r.id || r.nfeKey || `${String(r.date || r.data || '').slice(0, 10)}_${Number(r.total || r.valor || 0).toFixed(2)}_${mkt}`;
      const existing = mapReg.get(key);
      if (!existing) {
        mapReg.set(key, r);
      } else {
        const tNew = new Date(r.updatedAt || r.createdAt || 0).getTime();
        const tOld = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (tNew >= tOld) mapReg.set(key, { ...existing, ...r });
      }
    };

    (Array.isArray(cData.comprasRegistros || cData.registros) ? (cData.comprasRegistros || cData.registros) : []).forEach(addRecord);
    (Array.isArray(lData.comprasRegistros || lData.registros) ? (lData.comprasRegistros || lData.registros) : []).forEach(addRecord);

    const tCloud = new Date(cData.lastUpdated || cData.updatedAt || 0).getTime();
    const tLocal = new Date(lData.lastUpdated || lData.updatedAt || 0).getTime();
    const cloudIsNewer = tCloud >= tLocal;

    const cBenefits = (cData.settings && cData.settings.benefits) || {};
    const lBenefits = (lData.settings && lData.settings.benefits) || {};
    const primaryBenefits = cloudIsNewer ? cBenefits : lBenefits;
    const secondaryBenefits = cloudIsNewer ? lBenefits : cBenefits;

    const mergedBenefits = {
      ...secondaryBenefits,
      ...primaryBenefits,
      monthlyDays: { ...(secondaryBenefits.monthlyDays || {}), ...(primaryBenefits.monthlyDays || {}) },
      monthlyCreditDates: { ...(secondaryBenefits.monthlyCreditDates || {}), ...(primaryBenefits.monthlyCreditDates || {}) },
      monthlyEndingBalances: { ...(secondaryBenefits.monthlyEndingBalances || {}), ...(primaryBenefits.monthlyEndingBalances || {}) },
      monthlyRolloverOverrides: { ...(secondaryBenefits.monthlyRolloverOverrides || {}), ...(primaryBenefits.monthlyRolloverOverrides || {}) }
    };

    const cSummary = (cData.settings && cData.settings.benefitsSummary) || null;
    const lSummary = (lData.settings && lData.settings.benefitsSummary) || null;
    let mergedSummary = cloudIsNewer ? (cSummary || lSummary) : (lSummary || cSummary);
    if (cSummary && lSummary) {
      const cSpent = (Number(cSummary.vaSpent) || 0) + (Number(cSummary.vrSpent) || 0);
      const lSpent = (Number(lSummary.vaSpent) || 0) + (Number(lSummary.vrSpent) || 0);
      if (cSpent > lSpent) mergedSummary = cSummary;
      else if (lSpent > cSpent) mergedSummary = lSummary;
    }

    const baseData = cloudIsNewer ? { ...lData, ...cData } : { ...cData, ...lData };

    return {
      ...baseData,
      comprasRegistros: Array.from(mapReg.values()),
      settings: {
        ...(lData.settings || {}),
        ...(cData.settings || {}),
        benefits: mergedBenefits,
        benefitsSummary: mergedSummary || undefined
      }
    };
  }

  function compactMaracajuStateForCloud(rawState) {
    if (!rawState || typeof rawState !== 'object') return null;
    const s = rawState.data || rawState;
    const stripBase64 = (val) => (typeof val === 'string' && val.startsWith('data:image/')) ? '' : val;
    const stripPhotosArr = (arr) => Array.isArray(arr) ? arr.filter(p => !String(p).startsWith('data:image/')) : undefined;
    return {
      updatedAt: s.updatedAt || s.lastUpdated || new Date().toISOString(),
      lastUpdated: s.lastUpdated || s.updatedAt || new Date().toISOString(),
      reformas: (Array.isArray(s.reformas) ? s.reformas : []).map(r => ({
        ...r,
        photoUrl: stripBase64(r.photoUrl),
        photos: stripPhotosArr(r.photos)
      })),
      compras: (Array.isArray(s.compras) ? s.compras : []).map(c => ({
        ...c,
        imageUrl: stripBase64(c.imageUrl),
        photos: stripPhotosArr(c.photos)
      })),
      comprasRegistros: (Array.isArray(s.comprasRegistros) ? s.comprasRegistros : []).map(r => ({
        id: r.id,
        date: r.date || r.data,
        monthKey: r.monthKey || '',
        marketName: r.marketName || r.establishment || r.estabelecimento || '',
        establishment: r.establishment || r.marketName || r.estabelecimento || '',
        cnpj: r.cnpj || '',
        total: r.total !== undefined ? r.total : r.valor,
        paymentMethod: r.paymentMethod || r.metodoPagamento || 'va',
        nfeKey: r.nfeKey || '',
        sourceUrl: r.sourceUrl || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        items: (Array.isArray(r.items) ? r.items : []).map(it => ({
          name: it.name,
          qty: it.qty,
          unit: it.unit,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          category: it.category
        }))
      })),
      carro: (Array.isArray(s.carro) ? s.carro : []).map(c => ({
        ...c,
        photoUrl: stripBase64(c.photoUrl),
        photos: stripPhotosArr(c.photos)
      })),
      pets: (Array.isArray(s.pets) ? s.pets : []).map(p => ({
        ...p,
        photoUrl: stripBase64(p.photoUrl),
        foto: stripBase64(p.foto),
        photo: stripBase64(p.photo),
        photos: stripPhotosArr(p.photos),
        fotos: stripPhotosArr(p.fotos)
      })),
      settings: {
        benefits: (s.settings && s.settings.benefits) ? s.settings.benefits : undefined,
        benefitsSummary: (s.settings && s.settings.benefitsSummary) ? s.settings.benefitsSummary : undefined
      }
    };
  }

  function processMaracajuData(rawData, vrCreditadoNoMes = 1105.0, matrixDiarios = []) {
    if (!rawData || rawData.status === 'error') rawData = {};
    const payload = (rawData.data && typeof rawData.data === 'object') ? rawData.data : rawData;

    const registros = Array.isArray(payload.comprasRegistros || payload.registros)
      ? (payload.comprasRegistros || payload.registros)
      : [];
    const refeicoesList = Array.isArray(payload.refeicoes || (payload.mercado && payload.mercado.refeicoes))
      ? (payload.refeicoes || (payload.mercado && payload.mercado.refeicoes))
      : [];
    const reformas = Array.isArray(payload.reformas) ? payload.reformas : [];
    const carro = Array.isArray(payload.carro) ? payload.carro : [];

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curCycleKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const rawBenefits = (payload.settings && payload.settings.benefits) || payload.benefits || {};

    // Configurações de crédito e rollover oficiais da Casa Maracaju 88 (mescladas com payload.settings.benefits)
    const benefitsConfig = {
      vaFixedAmount: Number(rawBenefits.vaFixedAmount) > 0 ? Number(rawBenefits.vaFixedAmount) : 2050.00,
      vrDailyAmount: Number(rawBenefits.vrDailyAmount) > 0 ? Number(rawBenefits.vrDailyAmount) : 65.00,
      monthlyDays: {
        '2026-10': 17,
        '2026-11': 17,
        ...(rawBenefits.monthlyDays || {})
      },
      monthlyCreditDates: {
        '2026-10': '2026-10-06',
        '2026-11': '2026-11-06',
        ...(rawBenefits.monthlyCreditDates || {})
      },
      monthlyEndingBalances: {
        '2026-10': { vaEndingBalance: 9.84, vrEndingBalance: 0.16 },
        ...(rawBenefits.monthlyEndingBalances || {})
      },
      monthlyRolloverOverrides: {
        '2026-11': { vaRollover: 9.84, vrRollover: 0.16 },
        ...(rawBenefits.monthlyRolloverOverrides || {})
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

    const comprasCicloAtual = [];
    const comprasCicloAnterior = [];
    const seenKeys = new Set();

    // 1. Processa comprasRegistros (NFC-e e lançamentos manuais de VA/VR no Maracaju 88)
    registros.forEach(r => {
      const val = parseFloat(r.total !== undefined ? r.total : (r.valor || 0));
      if (!Number.isFinite(val) || val <= 0) return;

      const dataStr = String(r.date || r.data || r.createdAt || '').slice(0, 10);
      const methodRaw = String(r.paymentMethod || r.metodoPagamento || 'va').toLowerCase();
      const isVr = methodRaw === 'vr' || methodRaw.includes('refei') || methodRaw === 'cartao_vr';
      const isVa = methodRaw === 'va' || methodRaw.includes('aliment') || methodRaw === 'cartao_va';
      if (!isVr && !isVa) return;

      const mktName = r.marketName || r.establishment || r.estabelecimento || (isVr ? 'Despesa VR' : 'Mercado VA');
      const dedupKey = r.id || r.nfeKey || `${dataStr}_${val.toFixed(2)}_${String(mktName).trim().toLowerCase()}`;
      if (seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);

      const itemEntry = {
        id: r.id || dedupKey,
        date: dataStr,
        marketName: mktName,
        establishment: mktName,
        total: Math.round(val * 100) / 100,
        paymentMethod: isVr ? 'vr' : 'va',
        itemsCount: Array.isArray(r.items) ? r.items.length : 0
      };

      // Compras anteriores à data do crédito (ex: 03/11 < 06/11) pertencem ao ciclo anterior (Outubro)
      if (dataStr && dataStr < creditDateNov) {
        if (isVr) gastoVrCicloAnterior += val;
        else gastoMercadoCicloAnterior += val;
        comprasCicloAnterior.push(itemEntry);
      } else {
        // Compras efetuadas a partir de 06/11 pertencem ao ciclo vigente (Novembro)
        if (isVr) gastoVrCicloAtual += val;
        else gastoMercadoCicloAtual += val;
        comprasCicloAtual.push(itemEntry);
      }
    });

    // 2. Processa refeicoesList legado se houver
    refeicoesList.forEach(rf => {
      const val = parseFloat(rf.total !== undefined ? rf.total : (rf.valor || 0));
      if (!Number.isFinite(val) || val <= 0) return;
      const dataStr = String(rf.date || rf.data || '').slice(0, 10);
      const dedupKey = rf.id || `${dataStr}_${val.toFixed(2)}_${String(rf.establishment || rf.nome || 'refeicao').trim().toLowerCase()}`;
      if (seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);

      const itemEntry = {
        id: dedupKey,
        date: dataStr,
        establishment: rf.establishment || rf.nome || 'Refeição VR',
        total: Math.round(val * 100) / 100,
        paymentMethod: 'vr',
        itemsCount: 1
      };

      if (dataStr && dataStr < creditDateNov) {
        gastoVrCicloAnterior += val;
        comprasCicloAnterior.push(itemEntry);
      } else {
        gastoVrCicloAtual += val;
        comprasCicloAtual.push(itemEntry);
      }
    });

    // 3. Integra gastos diários lançados no próprio Matrix com conta Cartão VA / Cartão VR
    if (Array.isArray(matrixDiarios)) {
      matrixDiarios.forEach(d => {
        if (!d || typeof d !== 'object') return;
        const conta = String(d.conta || '').toLowerCase();
        const isVr = conta === 'cartao_vr' || conta === 'vr';
        const isVa = conta === 'cartao_va' || conta === 'va';
        if (!isVr && !isVa) return;

        const val = parseFloat(d.valor || 0);
        if (!Number.isFinite(val) || val <= 0) return;

        const dataStr = String(d.data || '').slice(0, 10);
        const dedupKey = `${dataStr}_${val.toFixed(2)}_${String(d.nome || '').trim().toLowerCase()}`;
        if (seenKeys.has(dedupKey)) return;
        seenKeys.add(dedupKey);

        const itemEntry = {
          id: d.id || dedupKey,
          date: dataStr || creditDateNov,
          establishment: d.nome || (isVr ? 'Gasto VR (Matrix)' : 'Gasto VA (Matrix)'),
          total: Math.round(val * 100) / 100,
          paymentMethod: isVr ? 'vr' : 'va',
          itemsCount: 1,
          fromMatrix: true
        };

        if (dataStr && dataStr < creditDateNov) {
          if (isVr) gastoVrCicloAnterior += val;
          else gastoMercadoCicloAnterior += val;
          comprasCicloAnterior.push(itemEntry);
        } else {
          if (isVr) gastoVrCicloAtual += val;
          else gastoMercadoCicloAtual += val;
          comprasCicloAtual.push(itemEntry);
        }
      });
    }

    gastoMercadoCicloAtual = Math.round(gastoMercadoCicloAtual * 100) / 100;
    gastoVrCicloAtual = Math.round(gastoVrCicloAtual * 100) / 100;

    // 4. Integra resumo direto (benefitsSummary) salvo pelo Maracaju 88 se disponível para o ciclo vigente
    const summary = (payload.settings && payload.settings.benefitsSummary) || payload.benefitsSummary || null;
    if (summary && (!summary.cycleKey || summary.cycleKey === curCycleKey)) {
      const sumVaSpent = Number(summary.vaSpent);
      const sumVrSpent = Number(summary.vrSpent);
      if (Number.isFinite(sumVaSpent) && sumVaSpent > gastoMercadoCicloAtual) {
        gastoMercadoCicloAtual = Math.round(sumVaSpent * 100) / 100;
      }
      if (Number.isFinite(sumVrSpent) && sumVrSpent > gastoVrCicloAtual) {
        gastoVrCicloAtual = Math.round(sumVrSpent * 100) / 100;
      }
    }

    let saldoVaRestante = Math.max(0, Math.round((vaTotal - gastoMercadoCicloAtual) * 100) / 100);
    let transbordouVa = gastoMercadoCicloAtual > vaTotal ? Math.round((gastoMercadoCicloAtual - vaTotal) * 100) / 100 : 0;

    let saldoVrRestante = Math.max(0, Math.round((vrTotal - gastoVrCicloAtual) * 100) / 100);
    let transbordouVr = gastoVrCicloAtual > vrTotal ? Math.round((gastoVrCicloAtual - vrTotal) * 100) / 100 : 0;

    if (summary && (!summary.cycleKey || summary.cycleKey === curCycleKey)) {
      const sumVaBal = Number(summary.vaBalance);
      const sumVrBal = Number(summary.vrBalance);
      if (Number.isFinite(sumVaBal) && sumVaBal >= 0 && sumVaBal < saldoVaRestante) {
        saldoVaRestante = Math.round(sumVaBal * 100) / 100;
      }
      if (Number.isFinite(sumVrBal) && sumVrBal >= 0 && sumVrBal < saldoVrRestante) {
        saldoVrRestante = Math.round(sumVrBal * 100) / 100;
      }
    }

    // Respeita override de saldo final manual (monthlyEndingBalances) se configurado no Maracaju 88 para o ciclo vigente
    const endingOverride = benefitsConfig.monthlyEndingBalances && benefitsConfig.monthlyEndingBalances[curCycleKey];
    if (endingOverride && typeof endingOverride === 'object') {
      if (endingOverride.vaEndingBalance !== undefined && endingOverride.vaEndingBalance !== null && endingOverride.vaEndingBalance !== '') {
        const manualVaEnd = Number(endingOverride.vaEndingBalance);
        if (Number.isFinite(manualVaEnd) && manualVaEnd >= 0) {
          saldoVaRestante = Math.round(manualVaEnd * 100) / 100;
          if (gastoMercadoCicloAtual === 0 && vaTotal > saldoVaRestante) {
            gastoMercadoCicloAtual = Math.round((vaTotal - saldoVaRestante) * 100) / 100;
          }
        }
      }
      if (endingOverride.vrEndingBalance !== undefined && endingOverride.vrEndingBalance !== null && endingOverride.vrEndingBalance !== '') {
        const manualVrEnd = Number(endingOverride.vrEndingBalance);
        if (Number.isFinite(manualVrEnd) && manualVrEnd >= 0) {
          saldoVrRestante = Math.round(manualVrEnd * 100) / 100;
          if (gastoVrCicloAtual === 0 && vrTotal > saldoVrRestante) {
            gastoVrCicloAtual = Math.round((vrTotal - saldoVrRestante) * 100) / 100;
          }
        }
      }
    }

    comprasCicloAtual.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    comprasCicloAnterior.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

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
      comprasCicloAtual,
      comprasCicloAnterior,
      reformasAndamento: reformas.filter(r => r.status === 'Em Andamento' || r.status === 'andamento').length,
      manutencoesCarro: carro.length
    };
  }

  function syncMaracajuFromLocal(stateObj) {
    try {
      const state = stateObj || (typeof MatrixDB !== 'undefined' ? MatrixDB.getState() : null);
      if (!state) return null;
      if (!state.satellites) state.satellites = {};

      const existing = state.satellites.maracaju || null;
      const localRaw = getLocalMaracajuRawState();
      const novDiarios = (state.anos && state.anos['2026'] && state.anos['2026']['Novembro'] && state.anos['2026']['Novembro'].diarios) || [];
      const hasMatrixBenefitDiarios = novDiarios.some(d => {
        const c = String((d && d.conta) || '').toLowerCase();
        return c === 'cartao_vr' || c === 'vr' || c === 'cartao_va' || c === 'va';
      });

      if (localRaw || hasMatrixBenefitDiarios) {
        // Mescla compras que já vieram da nuvem (existing.comprasCicloAtual) com o localStorage para nunca apagar gastos sincronizados
        const existingSynthetic = existing ? {
          lastUpdated: existing.atualizadoEm,
          comprasRegistros: Array.isArray(existing.comprasCicloAtual) ? existing.comprasCicloAtual : []
        } : null;
        const mergedInput = mergeMaracajuPayloads(existingSynthetic, localRaw || {});
        const computed = processMaracajuData(mergedInput, 1105.0, novDiarios);

        if (existing && existing.cicloVigente === computed.cicloVigente) {
          // Se houve ajuste manual direto no Matrix ou se a nuvem já tinha mais gastos registrados do que o cache local antigo do navegador
          if (existing.manualOverride) {
            const gVa = Math.max(existing.gastoMercadoMesAtual || 0, computed.gastoMercadoMesAtual || 0);
            const gVr = Math.max(existing.gastoVrMesAtual || 0, computed.gastoVrMesAtual || 0);
            existing.gastoMercadoMesAtual = gVa;
            existing.gastoVrMesAtual = gVr;
            if (computed.comprasCicloAtual && computed.comprasCicloAtual.length > (existing.comprasCicloAtual || []).length) {
              existing.comprasCicloAtual = computed.comprasCicloAtual;
            }
            return existing;
          }
          if ((existing.gastoVrMesAtual || 0) > computed.gastoVrMesAtual) {
            computed.gastoVrMesAtual = existing.gastoVrMesAtual;
            computed.saldoVrRestante = Math.max(0, Math.round((computed.vrTotal - computed.gastoVrMesAtual) * 100) / 100);
          }
          if ((existing.gastoMercadoMesAtual || 0) > computed.gastoMercadoMesAtual) {
            computed.gastoMercadoMesAtual = existing.gastoMercadoMesAtual;
            computed.saldoVaRestante = Math.max(0, Math.round((computed.vaTotal - computed.gastoMercadoMesAtual) * 100) / 100);
          }
          computed.totalDisponivel = Math.round((computed.saldoVaRestante + computed.saldoVrRestante) * 100) / 100;
        }
        state.satellites.maracaju = computed;
        return computed;
      }
      return existing;
    } catch (e) {
      return null;
    }
  }

  // ========================================================
  // MOTOR CENTRAL DE SCRAPING DOS 3 APPS
  // ========================================================
  async function scrapeAll() {
    const cfg = getSatelliteConfig();
    const state = MatrixDB.getState();
    if (!state.satellites) state.satellites = {};

    const statusResults = { fisio: null, faturas: null, maracaju: null };
    const fetchOpts = {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      cache: 'no-store'
    };

    // 1. FisioFlow
    if (cfg.fisioUrl) {
      try {
        const sep = cfg.fisioUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.fisioUrl}${sep}action=getData&token=${encodeURIComponent(cfg.fisioToken || '')}&_t=${Date.now()}`, fetchOpts);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status !== 'error') {
            state.satellites.fisioflow = processFisioData(json);
            statusResults.fisio = { success: true };
          }
        }
      } catch (e) {
        if (!state.satellites.fisioflow) {
          state.satellites.fisioflow = getBaselineFisioData();
        }
        statusResults.fisio = { success: false, error: e.message };
      }
    }

    // 2. Faturas (Nubank Mastercard Black)
    // Tenta primeiro via fetch remoto, se falhar ou se estiver no mesmo domínio, tenta localStorage
    let faturasRaw = null;
    if (cfg.faturasUrl) {
      try {
        const sep = cfg.faturasUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.faturasUrl}${sep}action=restore&token=${encodeURIComponent(cfg.faturasToken || '')}&_t=${Date.now()}`, fetchOpts);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status !== 'error') {
            faturasRaw = json.data || json;
          }
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

    // 3. Maracaju 88 (Confronto Duplo: VA e VR + Ponte Local MARACAJU_STATE_v1)
    const localMaracajuRaw = getLocalMaracajuRawState();
    let cloudMaracajuRaw = null;
    let cloudHadError = false;

    if (cfg.maracajuUrl) {
      try {
        const sep = cfg.maracajuUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${cfg.maracajuUrl}${sep}action=restore&token=${encodeURIComponent(cfg.maracajuToken || '')}&_t=${Date.now()}`, fetchOpts);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status !== 'error') {
            cloudMaracajuRaw = json.data || json;
          } else {
            cloudHadError = true;
          }
        } else {
          cloudHadError = true;
        }
      } catch (e) {
        cloudHadError = true;
        statusResults.maracaju = { success: false, error: e.message };
      }
    }

    const mergedMaracajuRaw = mergeMaracajuPayloads(cloudMaracajuRaw, localMaracajuRaw);
    const novDiarios = (state.anos && state.anos['2026'] && state.anos['2026']['Novembro'] && state.anos['2026']['Novembro'].diarios) || [];

    let vrAtual = 1105.0;
    try {
      const now = new Date();
      const commute = CalendarEngine.calculateCommuteAndVR(now.getFullYear(), now.getMonth() + 1);
      if (commute && commute.totalVR) vrAtual = commute.totalVR;
    } catch (err) {}

    if (cloudMaracajuRaw || localMaracajuRaw || novDiarios.length > 0) {
      const prevMaracaju = state.satellites.maracaju;
      const nextMaracaju = processMaracajuData(mergedMaracajuRaw, vrAtual, novDiarios);
      // Preserva ajuste manual de saldo se não houver novas compras na nuvem que superem o ajuste
      if (prevMaracaju && prevMaracaju.manualOverride && prevMaracaju.cicloVigente === nextMaracaju.cicloVigente) {
        if (nextMaracaju.gastoVrMesAtual === 0 && prevMaracaju.saldoVrRestante !== nextMaracaju.saldoVrRestante) {
          nextMaracaju.saldoVrRestante = prevMaracaju.saldoVrRestante;
          nextMaracaju.gastoVrMesAtual = Math.max(0, Math.round((nextMaracaju.vrTotal - prevMaracaju.saldoVrRestante) * 100) / 100);
          nextMaracaju.manualOverride = true;
        }
        if (nextMaracaju.gastoMercadoCicloAtual === 0 && prevMaracaju.saldoVaRestante !== nextMaracaju.saldoVaRestante) {
          nextMaracaju.saldoVaRestante = prevMaracaju.saldoVaRestante;
          nextMaracaju.gastoMercadoMesAtual = Math.max(0, Math.round((nextMaracaju.vaTotal - prevMaracaju.saldoVaRestante) * 100) / 100);
          nextMaracaju.manualOverride = true;
        }
        nextMaracaju.totalDisponivel = Math.round((nextMaracaju.saldoVaRestante + nextMaracaju.saldoVrRestante) * 100) / 100;
      }
      state.satellites.maracaju = nextMaracaju;
      statusResults.maracaju = { success: true, source: localMaracajuRaw ? 'local+cloud' : 'cloud' };
    }

    // Só envia localMaracajuRaw para a nuvem se o local tiver MAIS registros de compra do que a nuvem
    const localRegCount = (localMaracajuRaw && Array.isArray(localMaracajuRaw.comprasRegistros)) ? localMaracajuRaw.comprasRegistros.length : 0;
    const cloudRegCount = (cloudMaracajuRaw && Array.isArray(cloudMaracajuRaw.comprasRegistros)) ? cloudMaracajuRaw.comprasRegistros.length : 0;
    if (localMaracajuRaw && cfg.maracajuUrl && localRegCount > cloudRegCount) {
      try {
        const compacted = compactMaracajuStateForCloud(mergedMaracajuRaw);
        const bodyStr = JSON.stringify({
          action: 'backup',
          token: cfg.maracajuToken || 'Maracaju88CasalSegredo2026!',
          data: compacted
        });
        if (bodyStr.length < 45000) {
          fetch(cfg.maracajuUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: bodyStr
          }).catch(() => {});
        }
      } catch (e) {}
    }

    state.satellites.lastScraped = new Date().toISOString();
    MatrixDB.saveState(state, 'satellite_scrape', { skipCloudSync: true });
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
    getLocalMaracajuRawState,
    syncMaracajuFromLocal,
    scrapeAll
  };
})();

if (typeof window !== 'undefined') {
  window.SatelliteConnectors = SatelliteConnectors;
}
