/**
 * MATRIX FINANCE - SATELLITE APPS INGESTION & SCRAPING ENGINE (v1.3.0)
 * Coleta com alta precisão e sem distorções dos 3 apps satélites:
 * 1. Atendimentos: Ganhos passados, mês atual e projeções futuras (Scarlet).
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
    // v114: token NÃO fica mais no código (o repo é público). Configure em Backup & Conexões.
    maracajuToken: ''
  };

  // v114: mês vigente dinâmico para os diários de VA/VR (antes era fixo em 2026/Novembro).
  function getDiariosMesVigente(state) {
    const agora = new Date();
    const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const ano = String(agora.getFullYear());
    const mes = nomes[agora.getMonth()];
    return (state && state.anos && state.anos[ano] && state.anos[ano][mes] && state.anos[ano][mes].diarios) || [];
  }

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
    origem: 'Atendimentos',
    semente: true,
    atualizadoEm: new Date().toISOString(),
    ganhosPorMes: {
      '2026-08': { realizado: 4670, aReceber: 0, previsto: 0, sessoes: 51, total: 4670, ganhoPossivel: 4670 },
      '2026-09': { realizado: 3700, aReceber: 0, previsto: 0, sessoes: 40, total: 3700, ganhoPossivel: 3700 },
      '2026-10': { realizado: 950, aReceber: 190, previsto: 0, sessoes: 13, total: 1140, ganhoPossivel: 1140 },
      '2026-11': { realizado: 0, aReceber: 995, previsto: 3810, sessoes: 11, total: 995, ganhoPossivel: 4805 }
    },
    totalHistoricoRecebido: 10505.00,
    mesAtualTotal: 995.00,
    mesAtualPrevisto: 3810.00,
    ganhoPossivelMes: 4805.00,
    capacidadeMensalRecorrente: 5080.00,
    projecaoMensalRecorrente: 5080.00,
    pacientesAtivos: 8,
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

    // Reconciliação idêntica ao motor financeiro dos Atendimentos (reconcileSchedulesWithEntries):
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

    // Somar atendimentos realizados/lançados (cancelados não entram em sessões nem em valores)
    const atendimentosValidos = atendimentos.filter(at => {
      const st = String((at && at.Status) || '').toLowerCase();
      return st !== 'cancelado' && st !== 'cancelada' && st !== 'canceled';
    });

    atendimentosValidos.forEach(at => {
      const val = parseFloat(at.Valor) || 0;
      const dataStr = String(at.Data || '');
      const ym = dataStr.slice(0, 7);

      if (ym) {
        if (!ganhosPorMes[ym]) ganhosPorMes[ym] = { realizado: 0, aReceber: 0, previsto: 0, sessoes: 0, total: 0, ganhoPossivel: 0 };
        ganhosPorMes[ym].sessoes++;
        ganhosPorMes[ym].total += val;

        const st = String(at.Status || '').toLowerCase();
        if (st === 'pago' || st === 'recebido' || st === 'paid') {
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
      origem: 'Atendimentos',
      atualizadoEm: new Date().toISOString(),
      ganhosPorMes,
      totalHistoricoRecebido: totalPassado,
      mesAtualTotal,
      mesAtualPrevisto,
      ganhoPossivelMes: ganhoPossivelMes > 0 ? ganhoPossivelMes : (capacidadeMensalRecorrente || 4400.00),
      capacidadeMensalRecorrente: capacidadeMensalRecorrente || 4400.00,
      projecaoMensalRecorrente: capacidadeMensalRecorrente || 4400.00,
      pacientesAtivos: pacAtivosCount || 7,
      totalAtendimentosRegistrados: atendimentosValidos.length
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

  const BASELINE_FATURAS_RAW = {"extraItems": [{"desc": "Rd Saude Online", "val": 116.94, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 0}, {"desc": "Mercadolivre*Mercadol", "val": 67.64, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 1}, {"desc": "Amazonprimebr", "val": 19.9, "de": 1, "ate": 12, "tag": "extra", "isExtra": true, "extraIdx": 2}, {"desc": "Claro Flex", "val": 39.99, "de": 1, "ate": 13, "tag": "extra", "isExtra": true, "extraIdx": 3}, {"desc": "Rosa Cabelereira", "val": 210, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 4}, {"desc": "Nubank Ultravioleta", "val": 89, "de": 1, "ate": 13, "tag": "extra", "isExtra": true, "extraIdx": 5}, {"desc": "Kalunga R Pr*Kalunga", "val": 17.4, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 6}, {"desc": "Dl*Uberrides", "val": 14.98, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 7}, {"desc": "Mobifacil", "val": 61.71, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 8}, {"desc": "Dl*Uberrides", "val": 7.94, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 9}, {"desc": "Petlove - NuPay", "val": 352.8, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 10}, {"desc": "Dl*Uberrides", "val": 8.96, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 11}, {"desc": "Petlove - NuPay", "val": 174.17, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 12}, {"desc": "NuTag*PZC3J89", "val": 240.78, "de": 1, "ate": 1, "tag": "extra", "isExtra": true, "extraIdx": 13}, {"desc": "Claro Flex", "val": 44.99, "de": 2, "ate": 14, "tag": "extra", "isExtra": true, "extraIdx": 14}, {"desc": "Dl *Uberrides", "val": 8.92, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 15}, {"desc": "Autoparque", "val": 8, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 16}, {"desc": "Zé Delivery - NuPay", "val": 59.33, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 17}, {"desc": "99food *Hortifruti Cha", "val": 47.95, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 18}, {"desc": "Dl *Uberrides", "val": 12.95, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 19}, {"desc": "Dl *Uberrides", "val": 14.91, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 20}, {"desc": "Amazon Credito - NuPay", "val": 111, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 21}, {"desc": "Dl *Uberrides", "val": 4.85, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 22}, {"desc": "Petlove - NuPay - Parcela 1/3", "val": 168.3, "de": 2, "ate": 4, "tag": "extra", "isExtra": true, "extraIdx": 23}, {"desc": "Dl *Uberrides", "val": 52.96, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 24}, {"desc": "Estac Shopping", "val": 4.5, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 25}, {"desc": "Sodre Sodre Comercio D", "val": 33.99, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 26}, {"desc": "Mercadolivre*Chunhuaw - Parcela 1/2", "val": 31.62, "de": 2, "ate": 3, "tag": "extra", "isExtra": true, "extraIdx": 27}, {"desc": "NuTag*PZC3J89", "val": 220.23, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 28}, {"desc": "NuTag*FRV9579", "val": 14.5, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 29}, {"desc": "NuTag*PZC3J89", "val": 8.17, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 30}, {"desc": "NuTag*PZC3J89", "val": 17.38, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 31}, {"desc": "Sigapay", "val": 3, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 32}, {"desc": "Mi Alimentacao e Comer", "val": 50.05, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 33}, {"desc": "Restart Carnes", "val": 90.46, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 34}, {"desc": "Maravilhas do Lar", "val": 124.92, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 35}, {"desc": "S V Comercio", "val": 19.99, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 36}, {"desc": "NuTag*FRV9579", "val": 9.7, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 37}, {"desc": "NuTag*PZC3J89", "val": 17.38, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 38}, {"desc": "NuTag*FRV9579", "val": 6.65, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 39}, {"desc": "NuTag*FRV9579", "val": 11.02, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 40}, {"desc": "NuTag*PZC3J89", "val": 8.17, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 41}, {"desc": "NuTag*FRV9579", "val": 16.1, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 42}, {"desc": "NuTag*FRV9579", "val": 12.8, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 43}, {"desc": "Tres Marias Burger e B", "val": 345.18, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 44}, {"desc": "Estac Shopping", "val": 13, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 45}, {"desc": "Gelatto Borelli", "val": 40, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 46}, {"desc": "Sigapay", "val": 3, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 47}, {"desc": "Jockey Cafe", "val": 172.3, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 48}, {"desc": "Filialdrive", "val": 91.2, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 49}, {"desc": "Mariajosepereira", "val": 20, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 50}, {"desc": "Mariajosepereira", "val": 70, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 51}, {"desc": "Ifood", "val": 68.27, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 52}, {"desc": "Shopee", "val": 59.99, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 53}, {"desc": "Pasticceria Borelli", "val": 25, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 54}, {"desc": "Spoleto", "val": 227.4, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 55}, {"desc": "Estac Shopping", "val": 22, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 56}, {"desc": "Men Of Steel Rib Sho", "val": 130, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 57}, {"desc": "Outback Ribeirao Preto", "val": 246.51, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 58}, {"desc": "Livraria da Vila", "val": 44.9, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 59}, {"desc": "NuTag*FRV9579", "val": 14.5, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 60}, {"desc": "Dl *Uberrides", "val": 13.92, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 61}, {"desc": "Dl *Uberrides", "val": 14.95, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 62}, {"desc": "NuTag*FRV9579", "val": 14.5, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 63}, {"desc": "Rosinei da Costa Sorve", "val": 19.74, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 64}, {"desc": "Posto Sao Judas", "val": 37.97, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 65}, {"desc": "J A Arantes Limonta Si", "val": 20, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 66}, {"desc": "Vfa Alimentos", "val": 110.4, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 67}, {"desc": "NuTag*PZC3J89", "val": 11.8, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 68}, {"desc": "NuTag*PZC3J89", "val": 11.8, "de": 2, "ate": 2, "tag": "extra", "isExtra": true, "extraIdx": 69}], "simItems": [], "overrides": {"Borelli (2)__1": 23, "Cotton On 1/3__1": 69.95, "Cotton On 2/3__2": 69.95, "Cobertura 5/10__4": -1}, "purchHist": [], "profile": {"meta": 3000, "selic": 13.75, "cambio": 5.01, "milhas": 2.2, "milhaVal": 0.03, "gasUrl": "https://script.google.com/macros/s/AKfycbzXFXbZQ8TfHYwntMXg5k1lI_1pzBx7rTwVYycNESff8KC3DV95CRq15OrcP6dsC2_F/exec", "gasToken": ""}};

  function getBaselineFaturasData() {
    return processFaturasData(BASELINE_FATURAS_RAW, false);
  }

  function processFaturasData(rawData, includeSimulated = false) {
    if (!rawData || (!rawData.extraItems && !rawData.overrides)) {
      rawData = BASELINE_FATURAS_RAW;
    }
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

    const faturaAtualReal = faturasPorMes['2026-Novembro'] ? faturasPorMes['2026-Novembro'].total : 4883.05;
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
    // Fonte com erro é descartada, mas a outra fonte (e os túmulos) continua valendo.
    if (cloudPayload && cloudPayload.status === 'error') cloudPayload = null;
    if (localPayload && localPayload.status === 'error') localPayload = null;
    if (!cloudPayload && !localPayload) return {};

    const cData = (cloudPayload && (cloudPayload.data || cloudPayload)) || {};
    const lData = (localPayload && (localPayload.data || localPayload)) || {};

    // Exclusões feitas no Casa Maracaju são definitivas: o Matrix não pode
    // devolver na planilha uma compra que o usuário apagou (o app de origem
    // já registra o "túmulo" em deletedIds).
    const deletedIds = { comprasRegistros: {} };
    [cData, lData].forEach(src => {
      const col = src && src.deletedIds && src.deletedIds.comprasRegistros;
      if (col && typeof col === 'object' && !Array.isArray(col)) {
        Object.entries(col).forEach(([id, ts]) => {
          deletedIds.comprasRegistros[id] = Math.max(Number(deletedIds.comprasRegistros[id]) || 0, Number(ts) || Date.now());
        });
      }
    });
    const isTombstoned = (r) => {
      const id = r && r.id;
      return !!(id && Object.prototype.hasOwnProperty.call(deletedIds.comprasRegistros, String(id)));
    };

    const mapReg = new Map();
    const addRecord = (r) => {
      if (!r || typeof r !== 'object') return;
      if (isTombstoned(r)) return;
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

    const cMatrixBenefits = (cData.settings && cData.settings.matrixBenefits) || null;
    const lMatrixBenefits = (lData.settings && lData.settings.matrixBenefits) || null;
    const mergedMatrixBenefits = cloudIsNewer
      ? (cMatrixBenefits || lMatrixBenefits)
      : (lMatrixBenefits || cMatrixBenefits);

    const baseData = cloudIsNewer ? { ...lData, ...cData } : { ...cData, ...lData };

    return {
      ...baseData,
      deletedIds,
      comprasRegistros: Array.from(mapReg.values()),
      settings: {
        ...(lData.settings || {}),
        ...(cData.settings || {}),
        benefits: mergedBenefits,
        benefitsSummary: mergedSummary || undefined,
        matrixBenefits: mergedMatrixBenefits || undefined
      }
    };
  }

  function compactMaracajuStateForCloud(rawState) {
    if (!rawState || typeof rawState !== 'object') return null;
    const s = rawState.data || rawState;
    const stripBase64 = (val) => (typeof val === 'string' && val.startsWith('data:image/')) ? '' : val;
    const stripPhotosArr = (arr) => Array.isArray(arr) ? arr.filter(p => !String(p).startsWith('data:image/')) : undefined;
    const toNumber = (v) => {
      if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
      const parsed = Number(String(v === undefined || v === null ? '' : v).replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
    };
    return {
      updatedAt: s.updatedAt || s.lastUpdated || new Date().toISOString(),
      lastUpdated: s.lastUpdated || s.updatedAt || new Date().toISOString(),
      // Preserva as exclusões feitas no Casa Maracaju (senão o Matrix as "desfaz"
      // ao enviar o payload mesclado de volta para a planilha).
      deletedIds: (s.deletedIds && typeof s.deletedIds === 'object') ? s.deletedIds : { comprasRegistros: {} },
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
        total: toNumber(r.total !== undefined ? r.total : r.valor),
        paymentMethod: r.paymentMethod || r.metodoPagamento || 'va',
        nfeKey: r.nfeKey || '',
        sourceUrl: r.sourceUrl || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        items: (Array.isArray(r.items) ? r.items : []).map(it => ({
          name: it.name,
          qty: it.qty,
          unit: it.unit,
          unitPrice: toNumber(it.unitPrice),
          totalPrice: toNumber(it.totalPrice),
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
        benefitsSummary: (s.settings && s.settings.benefitsSummary) ? s.settings.benefitsSummary : undefined,
        matrixBenefits: (s.settings && s.settings.matrixBenefits) ? s.settings.matrixBenefits : undefined
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
    const pad = n => String(n).padStart(2, '0');
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

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

    // O CASA MARACAJU é a autoridade sobre o ciclo e os saldos. Quando ele publica
    // o retrato do ciclo vigente (matrixBenefits/benefitsSummary), usamos o cycleKey
    // dele — não o mês do calendário do Matrix. Antes, entre o dia 1º e o 4º dia
    // útil, o Matrix achava que o ciclo já tinha virado e ignorava o saldo real.
    const summary = (payload.settings && (payload.settings.matrixBenefits || payload.settings.benefitsSummary)) || payload.matrixBenefits || payload.benefitsSummary || null;
    const summaryCycleKey = summary && /^\d{4}-\d{2}$/.test(String(summary.cycleKey || '')) ? String(summary.cycleKey) : '';
    let curCycleKey = summaryCycleKey || `${curYear}-${pad(curMonth)}`;

    function getCycleKeyFromDate(dateStr) {
      const clean = String(dateStr || '').slice(0, 10);
      const m = clean.match(/^(\d{4})-(\d{2})/);
      if (!m) return '';
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const credit = (benefitsConfig.monthlyCreditDates && benefitsConfig.monthlyCreditDates[`${y}-${pad(mo)}`]) || '';
      if (credit && clean < credit) {
        const prev = new Date(y, mo - 2, 1);
        return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
      }
      return `${y}-${pad(mo)}`;
    }

    // Data de corte do crédito do ciclo vigente (ex.: 06/11/2026 = 4º dia útil).
    const creditDateCiclo = (benefitsConfig.monthlyCreditDates && benefitsConfig.monthlyCreditDates[curCycleKey]) || '';

    let vaDeposit = benefitsConfig.vaFixedAmount; // R$ 2.050,00
    const vrDays = (benefitsConfig.monthlyDays && benefitsConfig.monthlyDays[curCycleKey]) || 17;
    let vrDeposit = Math.round(vrDays * benefitsConfig.vrDailyAmount * 100) / 100; // R$ 1.105,00

    const rollover = (benefitsConfig.monthlyRolloverOverrides && benefitsConfig.monthlyRolloverOverrides[curCycleKey]) || { vaRollover: 0, vrRollover: 0 };
    const vaRollover = Number(rollover.vaRollover) || 0;
    const vrRollover = Number(rollover.vrRollover) || 0;

    let vaTotal = Math.round((vaDeposit + vaRollover) * 100) / 100; // R$ 2.059,84
    let vrTotal = Math.round((vrDeposit + vrRollover) * 100) / 100; // R$ 1.105,16

    let gastoMercadoCicloAtual = 0;
    let gastoVrCicloAtual = 0;
    let gastoMercadoCicloAnterior = 0;
    let gastoVrCicloAnterior = 0;

    const comprasCicloAtual = [];
    const comprasCicloAnterior = [];
    const seenKeys = new Set();
    // v116: o modal de gasto diário do Matrix é ESPELHO do Casa Maracaju. Para uma compra
    // espelhada (mesma data + valor + método) não ser somada de novo, guardamos a assinatura
    // dos lançamentos que já vieram do satélite.
    const seenSateliteDateValue = new Set();
    const assinaturaCompra = (dataStr, val, isVr) => `${String(dataStr || '').slice(0, 10)}|${(Math.round(val * 100) / 100).toFixed(2)}|${isVr ? 'vr' : 'va'}`;

    // 1. Processa comprasRegistros (NFC-e e lançamentos manuais de VA/VR no Maracaju 88)
    registros.forEach(r => {
      // v115: itens que vieram dos diários do Matrix entram apenas pelo bloco 3 (matrixDiarios),
      // senão a mesma compra é somada duas vezes no ciclo.
      if (r && r.fromMatrix) return;
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
      seenSateliteDateValue.add(assinaturaCompra(dataStr, val, isVr));

      // Compras anteriores à data do crédito (ex: 03/11 < 06/11) pertencem ao ciclo anterior (Outubro)
      if (dataStr && getCycleKeyFromDate(dataStr) === curCycleKey) {
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
      seenSateliteDateValue.add(assinaturaCompra(dataStr, val, true));

      if (dataStr && getCycleKeyFromDate(dataStr) === curCycleKey) {
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

        const dataStr = String(d.data || d.dataHora || '').slice(0, 10);
        const dedupKey = `${dataStr}_${val.toFixed(2)}_${String(d.nome || '').trim().toLowerCase()}`;
        if (seenKeys.has(dedupKey)) return;
        // v116: espelho do Casa Maracaju (mesma data/valor/método) já está contado no satélite.
        if (seenSateliteDateValue.has(assinaturaCompra(dataStr, val, isVr))) return;
        seenKeys.add(dedupKey);

        const itemEntry = {
          id: d.id || dedupKey,
          date: dataStr || creditDateCiclo,
          establishment: d.nome || (isVr ? 'Gasto VR (Matrix)' : 'Gasto VA (Matrix)'),
          total: Math.round(val * 100) / 100,
          paymentMethod: isVr ? 'vr' : 'va',
          itemsCount: 1,
          fromMatrix: true
        };

        if (dataStr && getCycleKeyFromDate(dataStr) === curCycleKey) {
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

    const round2 = (v) => Math.round(v * 100) / 100;
    const asNumber = (v) => (v === undefined || v === null || v === '' ? NaN : Number(v));

    // 4. O CASA MARACAJU é a autoridade sobre VA/VR. O retrato do ciclo
    // (matrixBenefits/benefitsSummary) prevalece sobre o recálculo local —
    // era isso que fazia o Matrix mostrar saldo diferente do app de origem
    // (e ignorar o saldo quando o mês do calendário != ciclo do benefício).
    const summaryMatchesCycle = !!summary && (!summary.cycleKey || String(summary.cycleKey) === curCycleKey);
    if (summaryMatchesCycle) {
      const sVaTotal = asNumber(summary.vaTotal);
      const sVrTotal = asNumber(summary.vrTotal);
      const sVaSpent = asNumber(summary.vaSpent);
      const sVrSpent = asNumber(summary.vrSpent);
      // O VR é a soma do depósito + sobra do ciclo anterior.
      const sVrRollover = asNumber(summary.vrRollover);

      if (Number.isFinite(sVaTotal) && sVaTotal > 0) {
        vaDeposit = round2(Math.max(0, sVaTotal - vaRollover));
        vaTotal = round2(sVaTotal);
      }
      if (Number.isFinite(sVrTotal) && sVrTotal > 0) {
        const resolvedRollover = Number.isFinite(sVrRollover) ? sVrRollover : vrRollover;
        vrDeposit = round2(Math.max(0, sVrTotal - resolvedRollover));
        vrTotal = round2(sVrTotal);
      }
      if (Number.isFinite(sVaSpent) && sVaSpent >= 0) {
        gastoMercadoCicloAtual = round2(sVaSpent);
      }
      if (Number.isFinite(sVrSpent) && sVrSpent >= 0) {
        gastoVrCicloAtual = round2(sVrSpent);
      }
    }

    let saldoVaRestante = Math.max(0, Math.round((vaTotal - gastoMercadoCicloAtual) * 100) / 100);
    let transbordouVa = gastoMercadoCicloAtual > vaTotal ? Math.round((gastoMercadoCicloAtual - vaTotal) * 100) / 100 : 0;

    let saldoVrRestante = Math.max(0, Math.round((vrTotal - gastoVrCicloAtual) * 100) / 100);
    let transbordouVr = gastoVrCicloAtual > vrTotal ? Math.round((gastoVrCicloAtual - vrTotal) * 100) / 100 : 0;

    if (summaryMatchesCycle) {
      const sumVaBal = asNumber(summary.vaBalance);
      const sumVrBal = asNumber(summary.vrBalance);
      if (Number.isFinite(sumVaBal) && sumVaBal >= 0) {
        saldoVaRestante = round2(sumVaBal);
      }
      if (Number.isFinite(sumVrBal) && sumVrBal >= 0) {
        saldoVrRestante = round2(sumVrBal);
      }
      // Mantém o gasto coerente com o saldo informado (VA/VR residual).
      if (Number.isFinite(sumVaBal) && sumVaBal >= 0 && (gastoMercadoCicloAtual === 0 || Math.abs((vaTotal - round2(sumVaBal)) - gastoMercadoCicloAtual) > 0.02)) {
        gastoMercadoCicloAtual = Math.max(0, round2(vaTotal - round2(sumVaBal)));
      }
      if (Number.isFinite(sumVrBal) && sumVrBal >= 0 && (gastoVrCicloAtual === 0 || Math.abs((vrTotal - round2(sumVrBal)) - gastoVrCicloAtual) > 0.02)) {
        gastoVrCicloAtual = Math.max(0, round2(vrTotal - round2(sumVrBal)));
      }
      transbordouVa = gastoMercadoCicloAtual > vaTotal ? round2(gastoMercadoCicloAtual - vaTotal) : 0;
      transbordouVr = gastoVrCicloAtual > vrTotal ? round2(gastoVrCicloAtual - vrTotal) : 0;
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
      creditDate: creditDateCiclo,
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
      const novDiarios = getDiariosMesVigente(state);
      const hasMatrixBenefitDiarios = novDiarios.some(d => {
        const c = String((d && d.conta) || '').toLowerCase();
        return c === 'cartao_vr' || c === 'vr' || c === 'cartao_va' || c === 'va';
      });
      // v115: estados antigos guardavam no ciclo compras derivadas dos diários (fromMatrix).
      // Nesses casos o recálculo manda, para o gasto inflado (contagem dupla) não ficar preso no "máximo".
      const temDerivadosDeDiarios = hasMatrixBenefitDiarios
        || !!(existing && Array.isArray(existing.comprasCicloAtual)
          && existing.comprasCicloAtual.some(r => r && r.fromMatrix));

      if (localRaw || hasMatrixBenefitDiarios) {
        // Mescla compras que já vieram da nuvem (existing.comprasCicloAtual) com o localStorage para nunca apagar gastos sincronizados
        // v115: os diários do Matrix são reaplicados a cada sync (parâmetro matrixDiarios).
        // Se as entradas derivadas deles (fromMatrix) voltarem como "registros", o gasto VA/VR dobra.
        const existingSynthetic = existing ? {
          lastUpdated: existing.atualizadoEm,
          comprasRegistros: (Array.isArray(existing.comprasCicloAtual) ? existing.comprasCicloAtual : [])
            .filter(r => r && !r.fromMatrix)
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
          // v115: quando há diários VA/VR no Matrix, o recálculo é autoritativo (inclui tudo).
          // Sem diários, mantém o "máximo" para não perder gastos que só existiam na nuvem.
          if (!temDerivadosDeDiarios && (existing.gastoVrMesAtual || 0) > computed.gastoVrMesAtual) {
            computed.gastoVrMesAtual = existing.gastoVrMesAtual;
            computed.saldoVrRestante = Math.max(0, Math.round((computed.vrTotal - computed.gastoVrMesAtual) * 100) / 100);
          }
          if (!temDerivadosDeDiarios && (existing.gastoMercadoMesAtual || 0) > computed.gastoMercadoMesAtual) {
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
  // HELPER UNIVERSAL DE FETCH PARA GOOGLE APPS SCRIPT
  // Tenta fetch nativo com timeout; se falhar por CORS/rede, usa JSONP
  // ========================================================
    async function fetchGasDataWithJsonpFallback(url, params = {}) {
    if (!url) return null;

    // Para URLs do Google Apps Script (script.google.com), prioriza JSONP direto
    // Isso evita o atraso de 6s de timeout CORS que invariavelmente ocorre no mobile
    if (url.includes('script.google.com')) {
      if (typeof SyncEngine !== 'undefined' && typeof SyncEngine.jsonpRequest === 'function') {
        try {
          const jsonpData = await SyncEngine.jsonpRequest(url, params, 8000);
          if (jsonpData && jsonpData.status !== 'error') return jsonpData.data || jsonpData;
        } catch (e) {}
      }
    }

    const fetchOpts = {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      cache: 'no-store'
    };
    const sep = url.includes('?') ? '&' : '?';
    const query = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .concat(['_t=' + Date.now()])
      .join('&');
    const fullUrl = url + sep + query;

    // 1. Tenta fetch nativo (com timeout rápido de 2.5s)
    try {
      const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
      const res = await fetch(fullUrl, controller ? Object.assign({}, fetchOpts, { signal: controller.signal }) : fetchOpts);
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status !== 'error') return json.data || json;
      }
    } catch (e) {
      // Falha CORS ou rede: continua para o fallback JSONP
    }

    // 2. Fallback JSONP via SyncEngine ou script tag direto
    if (typeof SyncEngine !== 'undefined' && typeof SyncEngine.jsonpRequest === 'function') {
      try {
        const data = await SyncEngine.jsonpRequest(url, params, 9000);
        if (data && data.status !== 'error') return data.data || data;
      } catch (e) {}
    } else {
      try {
        const data = await new Promise((resolve, reject) => {
          if (typeof document === 'undefined') return reject(new Error('Sem DOM'));
          const cbName = '_sat_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
          const script = document.createElement('script');
          const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout JSONP'));
          }, 9000);
          function cleanup() {
            clearTimeout(timer);
            try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
            if (script && script.parentNode) script.parentNode.removeChild(script);
          }
          window[cbName] = function (res) {
            cleanup();
            resolve(res);
          };
          const q = Object.keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .concat(['callback=' + cbName, '_t=' + Date.now()])
            .join('&');
          script.id = cbName;
          script.src = url + sep + q;
          script.onerror = function () { cleanup(); reject(new Error('Script error')); };
          document.head.appendChild(script);
        });
        if (data && data.status !== 'error') return data.data || data;
      } catch (e) {}
    }

    return null;
  }

  // ========================================================
  // MOTOR CENTRAL DE SCRAPING DOS 3 APPS
  // ========================================================
  // v121: uma única coleta por vez. Antes o init, o evento de foco e o botão podiam
  // disparar scrapeAll em paralelo, cada um salvando e re-renderizando a tela (piscadas).
  let scrapeInFlight = null;

  async function scrapeAll() {
    if (scrapeInFlight) return scrapeInFlight;
    scrapeInFlight = runScrapeAll().finally(() => { scrapeInFlight = null; });
    return scrapeInFlight;
  }

  async function runScrapeAll() {
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

    // 1. Atendimentos
    if (cfg.fisioUrl) {
      const attempt = new Date().toISOString();
      try {
        const fisioData = await fetchGasDataWithJsonpFallback(cfg.fisioUrl, { action: 'getData', token: cfg.fisioToken || '' });
        if (fisioData) {
          const processed = processFisioData(fisioData);
          processed.syncError = null;
          processed.lastAttempt = attempt;
          state.satellites.fisioflow = processed;
          statusResults.fisio = { success: true, atualizadoEm: processed.atualizadoEm };
        } else {
          // Mantém o último retrato bom; só marca que a tentativa falhou (não sobrescreve
          // com baseline nem atualiza atualizadoEm, para a tela não fingir que sincronizou).
          if (!state.satellites.fisioflow) state.satellites.fisioflow = getBaselineFisioData();
          const ff = state.satellites.fisioflow;
          ff.syncError = 'Atendimentos não respondeu (CORS/JSONP).';
          ff.lastAttempt = attempt;
          statusResults.fisio = { success: false, error: ff.syncError };
        }
      } catch (e) {
        if (!state.satellites.fisioflow) {
          state.satellites.fisioflow = getBaselineFisioData();
        }
        const ff = state.satellites.fisioflow;
        ff.syncError = e.message;
        ff.lastAttempt = attempt;
        statusResults.fisio = { success: false, error: e.message };
      }
    }

    // 2. Faturas (Nubank Mastercard Black)
    // Tenta via fetch com fallback JSONP (Google Apps Script) e fallback localStorage
    let faturasRaw = null;
    if (cfg.faturasUrl) {
      try {
        faturasRaw = await fetchGasDataWithJsonpFallback(cfg.faturasUrl, { action: 'restore', token: cfg.faturasToken || '' });
      } catch (e) {
        // Fallback local caso requisição remota falhe
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

    const fatProcessed = processFaturasData(faturasRaw || {}, cfg.includeSimulated);
    state.satellites.faturas = fatProcessed;
    statusResults.faturas = { success: true };

    // Sincroniza o valor calculado da fatura diretamente nos meses do Matrix
    if (fatProcessed && fatProcessed.faturasPorMes && state.anos) {
      Object.keys(fatProcessed.faturasPorMes).forEach(mKey => {
        const parts = mKey.split('-');
        if (parts.length === 2) {
          const ano = parts[0];
          const mes = parts[1];
          const mesFat = fatProcessed.faturasPorMes[mKey];
          if (mesFat && typeof mesFat.total === 'number' && state.anos[ano] && state.anos[ano][mes]) {
            const mData = state.anos[ano][mes];
            if (!mData.scarlet) mData.scarlet = {};
            mData.scarlet.faturaNubank = mesFat.total;
          }
        }
      });
    }

    // 3. Maracaju 88 (Confronto Duplo: VA e VR + Ponte Local MARACAJU_STATE_v1)
    const localMaracajuRaw = getLocalMaracajuRawState();
    let cloudMaracajuRaw = null;
    let cloudHadError = false;

    if (cfg.maracajuUrl && !cfg.maracajuToken) {
      // v114: sem token configurado não há como autenticar no app Casa Maracaju.
      statusResults.maracaju = {
        success: false,
        error: 'Token do Casa Maracaju não configurado (Backup & Conexões).'
      };
    }

    if (cfg.maracajuUrl && cfg.maracajuToken) {
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
    const novDiarios = getDiariosMesVigente(state);

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
    if (localMaracajuRaw && cfg.maracajuUrl && cfg.maracajuToken && localRegCount > cloudRegCount) {
      try {
        const compacted = compactMaracajuStateForCloud(mergedMaracajuRaw);
        const bodyStr = JSON.stringify({
          action: 'backup',
          token: cfg.maracajuToken || '',
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

    const freshState = MatrixDB.getState();
    if (!freshState.satellites) freshState.satellites = {};
    Object.assign(freshState.satellites, state.satellites);
    freshState.satellites.lastScraped = new Date().toISOString();
    MatrixDB.saveState(freshState, 'satellite_scrape', { skipCloudSync: true });
    localStorage.setItem(STORAGE_KEYS.lastScraped, freshState.satellites.lastScraped);

    return statusResults;
  }

  return {
    getSatelliteConfig,
    getBaselineFaturasData,
    saveSatelliteConfig,
    getBaselineFisioData,
    processFisioData,
    processFaturasData,
    processMaracajuData,
    mergeMaracajuPayloads,
    compactMaracajuStateForCloud,
    getLocalMaracajuRawState,
    syncMaracajuFromLocal,
    scrapeAll
  };
})();

if (typeof window !== 'undefined') {
  window.SatelliteConnectors = SatelliteConnectors;
}
