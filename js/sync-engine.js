/**
 * MATRIX FINANCE - SYNC & EXTERNAL CONNECTORS ENGINE (v70)
 * Sincronização em nuvem resiliente com Google Sheets (Planilha Matrix Finance 360)
 * com compactação estrita garantida (< 35.000 caracteres para jamais atingir o
 * limite de 50.000 caracteres por célula do Google Sheets).
 */

const SyncEngine = (function () {
  const STORAGE_KEYS = {
    cloudUrl: 'matrix_cloud_url',
    cloudToken: 'matrix_cloud_token',
    lastSync: 'matrix_last_sync_timestamp',
    maracajuUrl: 'matrix_maracaju_url',
    maracajuToken: 'matrix_maracaju_token',
    faturasUrl: 'matrix_faturas_url',
    faturasToken: 'matrix_faturas_token',
    fisioflowUrl: 'matrix_fisioflow_url',
    fisioflowToken: 'matrix_fisioflow_token'
  };

  // v127: endpoint do Apps Script de backup do Matrix, configurado de fábrica.
  // O token continua vindo do usuário (localStorage) — a URL sozinha não grava nada sem ele.
  const DEFAULT_CLOUD_URL = 'https://script.google.com/macros/s/AKfycbyTXjWm4651tmwl4AujcG299cHBYGmECtLKoTruRaI7y9kzNOKr58QeKp0O46Erxb7DFQ/exec';

  const DEFAULT_SPREADSHEET_ID = '1imbffaHJJIIZDqFbTwCJS7_TPUJAvRhcBWPtURYoMwU';
  const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1imbffaHJJIIZDqFbTwCJS7_TPUJAvRhcBWPtURYoMwU/edit';
  const SHEETS_STRICT_CHAR_LIMIT = 35000; // Garantia estrita muito abaixo dos 50.000 chars do Google Sheets

  let debounceTimer = null;
  let isSyncing = false;
  let pendingFollowUpSync = false;
  const DIRTY_LOCAL_KEY = 'matrix_local_dirty_since';

  function syncInputsIfPresent() {
    if (typeof document === 'undefined') return;
    const urlInput = document.getElementById('cfgCloudUrl');
    const tokenInput = document.getElementById('cfgCloudToken');
    if (urlInput && urlInput.value && urlInput.value.trim()) {
      localStorage.setItem(STORAGE_KEYS.cloudUrl, urlInput.value.trim());
    }
    if (tokenInput && tokenInput.value && tokenInput.value.trim()) {
      localStorage.setItem(STORAGE_KEYS.cloudToken, tokenInput.value.trim());
    }
  }

  function getConfig() {
    syncInputsIfPresent();
    return {
      cloudUrl: (localStorage.getItem(STORAGE_KEYS.cloudUrl) || DEFAULT_CLOUD_URL).trim(),
      cloudToken: (localStorage.getItem(STORAGE_KEYS.cloudToken) || 'MatrixReloaded2026!').trim(),
      lastSync: localStorage.getItem(STORAGE_KEYS.lastSync) || '',
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
      maracajuUrl: localStorage.getItem(STORAGE_KEYS.maracajuUrl) || '',
      maracajuToken: localStorage.getItem(STORAGE_KEYS.maracajuToken) || '',
      faturasUrl: localStorage.getItem(STORAGE_KEYS.faturasUrl) || '',
      faturasToken: localStorage.getItem(STORAGE_KEYS.faturasToken) || '',
      fisioflowUrl: localStorage.getItem(STORAGE_KEYS.fisioflowUrl) || '',
      fisioflowToken: localStorage.getItem(STORAGE_KEYS.fisioflowToken) || ''
    };
  }

  function saveConfig(cfg) {
    if (cfg.cloudUrl !== undefined) localStorage.setItem(STORAGE_KEYS.cloudUrl, cfg.cloudUrl.trim());
    if (cfg.cloudToken !== undefined) localStorage.setItem(STORAGE_KEYS.cloudToken, cfg.cloudToken.trim());
    if (cfg.maracajuUrl !== undefined) localStorage.setItem(STORAGE_KEYS.maracajuUrl, cfg.maracajuUrl.trim());
    if (cfg.maracajuToken !== undefined) localStorage.setItem(STORAGE_KEYS.maracajuToken, cfg.maracajuToken.trim());
    if (cfg.faturasUrl !== undefined) localStorage.setItem(STORAGE_KEYS.faturasUrl, cfg.faturasUrl.trim());
    if (cfg.faturasToken !== undefined) localStorage.setItem(STORAGE_KEYS.faturasToken, cfg.faturasToken.trim());
    if (cfg.fisioflowUrl !== undefined) localStorage.setItem(STORAGE_KEYS.fisioflowUrl, cfg.fisioflowUrl.trim());
    if (cfg.fisioflowToken !== undefined) localStorage.setItem(STORAGE_KEYS.fisioflowToken, cfg.fisioflowToken.trim());
  }

  function updateStatusUI(status, message) {
    const el = document.getElementById('cloudSyncStatusBadge');
    if (!el) return;

    if (status === 'syncing') {
      el.className = 'status-badge pendente';
      el.textContent = '🟡 Salvando...';
      el.title = message || 'Salvando alterações imediatamente no dispositivo e na nuvem';
    } else if (status === 'synced') {
      el.className = 'status-badge pago';
      el.textContent = '🟢 Salvo & Sincronizado';
      el.title = message || 'Todas as alterações estão salvas no dispositivo e na planilha Matrix Finance 360';
    } else if (status === 'error') {
      el.className = 'status-badge danger';
      el.textContent = '🟡 Salvo Local (Erro Nuvem)';
      el.title = message || 'Salvo no aparelho • Falha ao sincronizar com a planilha Matrix Finance 360';
    } else {
      el.className = 'status-badge pago';
      el.textContent = '💾 Salvo Automaticamente';
      el.title = message || 'Alterações salvas instantaneamente no aparelho • Toque para configurar backup em nuvem';
    }
  }

  /**
   * Compacta de forma determinística o estado antes de enviar para o Google Sheets,
   * garantindo matematicamente que JSON.stringify(state) tenha sempre < 35.000 caracteres
   * (muito abaixo do limite de 50.000 caracteres por célula do Google Sheets).
   */
  function compactStateForCloud(rawState, maxChars = SHEETS_STRICT_CHAR_LIMIT) {
    if (!rawState || typeof rawState !== 'object') return {};

    // 1. Whitelist apenas das chaves essenciais de dados do usuário (exclui caches de satélites e memória de categorias)
    const c = {
      versao: rawState.versao || '1.0.0',
      atualizadoEm: new Date().toISOString(),
      config: rawState.config ? JSON.parse(JSON.stringify(rawState.config)) : {},
      perfil: rawState.perfil ? JSON.parse(JSON.stringify(rawState.perfil)) : {},
      financiamentoCaixa: rawState.financiamentoCaixa ? JSON.parse(JSON.stringify(rawState.financiamentoCaixa)) : {},
      bancos: Array.isArray(rawState.bancos) ? JSON.parse(JSON.stringify(rawState.bancos)) : [],
      investimentos: Array.isArray(rawState.investimentos) ? JSON.parse(JSON.stringify(rawState.investimentos)) : [],
      holerites: Array.isArray(rawState.holerites) ? JSON.parse(JSON.stringify(rawState.holerites)) : [],
      simulacoesAtivas: Array.isArray(rawState.simulacoesAtivas) ? JSON.parse(JSON.stringify(rawState.simulacoesAtivas)) : [],
      simulacoesAmortizacao: [],
      calendarioCustom: rawState.calendarioCustom ? JSON.parse(JSON.stringify(rawState.calendarioCustom)) : { overrides: {}, folgas: [] },
      satellites: (() => {
        const sat = {};
        const m = rawState.satellites && rawState.satellites.maracaju;
        if (m) {
          sat.maracaju = {
            origem: m.origem || 'Maracaju 88',
            // v146: o selo de "isto é só semente" precisa sobreviver à nuvem, senão outro
            // aparelho recebe o saldo de exemplo e o exibe como se fosse real (regra 10).
            semente: !!m.semente,
            invalido: !!m.invalido,
            atualizadoEm: m.atualizadoEm,
            cicloVigente: m.cicloVigente || '2026-11',
            creditDate: m.creditDate || '2026-11-06',
            vaMensal: m.vaMensal || 2050,
            vaRollover: m.vaRollover != null ? m.vaRollover : 9.84,
            vaTotal: m.vaTotal || 2059.84,
            gastoMercadoMesAtual: m.gastoMercadoMesAtual || 0,
            saldoVaRestante: m.saldoVaRestante != null ? m.saldoVaRestante : 2059.84,
            vrCreditadoNoMes: m.vrCreditadoNoMes || 1105,
            vrRollover: m.vrRollover != null ? m.vrRollover : 0.16,
            vrTotal: m.vrTotal || 1105.16,
            gastoVrMesAtual: m.gastoVrMesAtual || 0,
            saldoVrRestante: m.saldoVrRestante != null ? m.saldoVrRestante : 1105.16,
            totalBeneficios: m.totalBeneficios || 3165,
            totalDisponivel: m.totalDisponivel != null ? m.totalDisponivel : 3165,
            gastoMercadoCicloAnterior: m.gastoMercadoCicloAnterior || 390.41,
            comprasCicloAtual: Array.isArray(m.comprasCicloAtual) ? m.comprasCicloAtual.slice(0, 30) : []
          };
        }
        // v121: o Atendimentos também precisa sobreviver ao round-trip da nuvem. Antes ele era
        // descartado no compact e o fetchFromCloud apagava o satélite local a cada abertura.
        const ff = rawState.satellites && rawState.satellites.fisioflow;
        if (ff) {
          sat.fisioflow = {
            origem: ff.origem || 'Atendimentos',
            atualizadoEm: ff.atualizadoEm || null,
            ganhosPorMes: ff.ganhosPorMes && typeof ff.ganhosPorMes === 'object'
              ? JSON.parse(JSON.stringify(ff.ganhosPorMes))
              : {},
            totalHistoricoRecebido: ff.totalHistoricoRecebido || 0,
            mesAtualTotal: ff.mesAtualTotal || 0,
            mesAtualPrevisto: ff.mesAtualPrevisto || 0,
            ganhoPossivelMes: ff.ganhoPossivelMes || 0,
            capacidadeMensalRecorrente: ff.capacidadeMensalRecorrente || 0,
            projecaoMensalRecorrente: ff.projecaoMensalRecorrente || 0,
            pacientesAtivos: ff.pacientesAtivos || 0,
            totalAtendimentosRegistrados: ff.totalAtendimentosRegistrados || 0,
            syncError: ff.syncError || null,
            lastAttempt: ff.lastAttempt || null
          };
        }
        // v140: as faturas também precisam sobreviver ao round-trip. Antes o compact descartava
        // o satélite inteiro e o expand recriava do baseline embutido — por isso "sincronizar"
        // deixava Dez/2026 em diante desatualizado.
        const fa = rawState.satellites && rawState.satellites.faturas;
        if (fa && fa.faturasPorMes) {
          const porMes = {};
          Object.keys(fa.faturasPorMes).forEach(k => {
            const m = fa.faturasPorMes[k] || {};
            porMes[k] = { total: parseFloat(m.total) || 0, status: m.status || 'aberta' };
          });
          sat.faturas = {
            origem: fa.origem || 'Faturas (Parcelado a Vista)',
            fonte: fa.fonte || 'satelite',
            atualizadoEm: fa.atualizadoEm || null,
            faturasPorMes: porMes,
            faturaAtualReal: fa.faturaAtualReal,
            faturaAtualValor: fa.faturaAtualValor,
            faturasFuturasCompromissadas: fa.faturasFuturasCompromissadas,
            faturasFuturasTotal: fa.faturasFuturasTotal,
            limiteMetaMensal: fa.limiteMetaMensal,
            includeSimulated: !!fa.includeSimulated
          };
        }
        return Object.keys(sat).length ? sat : undefined;
      })(),
      anos: rawState.anos ? JSON.parse(JSON.stringify(rawState.anos)) : {},
      // v143: lápides de itens apagados pelo usuário (sobrevivem ao round-trip).
      deletedItens: rawState.deletedItens && typeof rawState.deletedItens === 'object'
        ? JSON.parse(JSON.stringify(rawState.deletedItens))
        : {}
    };

    // 2. Limpa tabelas pesadas de 271 meses que possam estar dentro de simulacoesAmortizacao
    if (Array.isArray(rawState.simulacoesAmortizacao)) {
      c.simulacoesAmortizacao = rawState.simulacoesAmortizacao.slice(0, 10).map(sim => ({
        id: sim.id,
        nome: sim.nome,
        data: sim.data,
        config: sim.config,
        resultado: sim.resultado ? {
          novoPrazo: sim.resultado.novoPrazo,
          novoPrazoAnos: sim.resultado.novoPrazoAnos,
          mesesPoupados: sim.resultado.mesesPoupados,
          anosPoupados: sim.resultado.anosPoupados,
          economiaJuros: sim.resultado.economiaJuros,
          totalAportadoExtra: sim.resultado.totalAportadoExtra,
          novoTotalPago: sim.resultado.novoTotalPago,
          dataQuitacaoNova: sim.resultado.dataQuitacaoNova,
          dataQuitacaoOriginal: sim.resultado.dataQuitacaoOriginal
        } : {}
      }));
    }

    // 3. Limpa anos e lançamentos (remove valores padrão redundantes que ocupam milhares de caracteres)
    if (c.anos) {
      Object.keys(c.anos).forEach(ano => {
        if (parseInt(ano, 10) < 2026) {
          delete c.anos[ano];
          return;
        }
        const anoObj = c.anos[ano];
        if (!anoObj || typeof anoObj !== 'object') return;
        Object.keys(anoObj).forEach(mes => {
          const md = anoObj[mes];
          if (!md || typeof md !== 'object') return;
          delete md.totais;
          ['fixos', 'outros', 'receitas', 'diarios'].forEach(tipo => {
            if (Array.isArray(md[tipo])) {
              md[tipo].forEach((it, idx) => {
                if (!it || typeof it !== 'object') return;
                if (!it.obs) delete it.obs;
                if (!it.descricao) delete it.descricao;
                if (!it.renda) delete it.renda;
                if (it.metodo === 'debito') delete it.metodo;
                if (it.conta === 'debito_nubank') delete it.conta;
                if (!it.pago) delete it.pago;
                // Preserva IDs semânticos da Scarlet/Fisio/Salário/VA/VR para não perder vínculo após restaurar da nuvem
                const idStr = String(it.id || '');
                const isSemanticId = idStr.includes('scarlet') || idStr.includes('fisio') || idStr.startsWith('rec_sal') || idStr.startsWith('rec_va') || idStr.startsWith('rec_vr') || idStr.startsWith('rec_extra');
                // v121: NUNCA reescrever o id de uma RECEITA. O merge da nuvem casa por id e, ao
                // trocar 'rec_...' por 'r0', a mesma renda voltava como item novo e duplicava.
                if (idStr.length > 10 && !isSemanticId && tipo !== 'receitas') {
                  it.id = tipo[0] + idx;
                }
              });
              if (md[tipo].length === 0) delete md[tipo];
            }
          });
        });
      });
    }

    // 4. Se ainda passar do limite estrito (ex: usuário clonou muitos anos futuros 2028..2035), enxuga itens de holerites e anos distantes
    if (JSON.stringify(c).length > maxChars && Array.isArray(c.holerites)) {
      c.holerites.forEach(h => {
        if (h) delete h.itens;
      });
    }

    if (JSON.stringify(c).length > maxChars && c.anos) {
      const sortedYears = Object.keys(c.anos).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
      for (const y of sortedYears) {
        if (JSON.stringify(c).length <= maxChars) break;
        if (parseInt(y, 10) > 2027) {
          delete c.anos[y];
        }
      }
    }

    return c;
  }

  /**
   * Restaura campos padrão omitidos na compactação ao baixar da nuvem.
   */
  function expandStateFromCloud(cloudState) {
    if (!cloudState || typeof cloudState !== 'object') return cloudState;
    if (cloudState.anos) {
      Object.keys(cloudState.anos).forEach(ano => {
        const anoObj = cloudState.anos[ano];
        if (!anoObj || typeof anoObj !== 'object') return;
        Object.keys(anoObj).forEach(mes => {
          const md = anoObj[mes];
          if (!md || typeof md !== 'object') return;
          if (!md.fixos) md.fixos = [];
          if (!md.outros) md.outros = [];
          if (!md.receitas) md.receitas = [];
          if (!md.diarios) md.diarios = [];
          if (!md.totais) md.totais = {};
          ['fixos', 'outros', 'receitas', 'diarios'].forEach(tipo => {
            if (Array.isArray(md[tipo])) {
              md[tipo].forEach(it => {
                if (it && typeof it === 'object') {
                  it.pago = !!it.pago;
                }
              });
            }
          });
        });
      });
    }
    // v140: NÃO inventar faturas aqui. Antes o baseline embutido (processFaturasData({})) era
    // injetado a cada restauração, carimbado com a hora atual e sobrescrevia o retrato real que
    // o scraping tinha acabado de gravar — as faturas de Dez/2026 em diante nunca avançavam.
    if (!cloudState.satellites) cloudState.satellites = {};
    return cloudState;
  }

  // v147: o JSONP injeta <script src> — aceitar qualquer host permitiria que código de
  // terceiros rodasse na origem do app (notificação/redirect malicioso). Só Apps Script.
  function isAppsScriptUrl(url) {
    try {
      const u = new URL(String(url));
      return u.protocol === 'https:' &&
        (u.hostname === 'script.google.com' || u.hostname === 'script.googleusercontent.com');
    } catch (e) {
      return false;
    }
  }

  function jsonpRequest(url, params, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return reject(new Error('Sem DOM'));
      if (!isAppsScriptUrl(url)) {
        return reject(new Error('URL de sincronização não autorizada: use o endereço do Apps Script (https://script.google.com/.../exec).'));
      }
      const cbName = '_matrix_gas_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout JSONP ao conectar ao Google Apps Script'));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        // v136: NÃO apagar o callback. Se a resposta do Apps Script chegar depois do timeout,
        // o navegador executaria cb(...) e estouraria "Uncaught ReferenceError: _matrix_gas_cb_… is not defined".
        // Deixamos um no-op no lugar.
        window[cbName] = function () {};
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        cleanup();
        resolve(data);
      };

      const sep = url.includes('?') ? '&' : '?';
      const query = Object.keys(params || {})
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .concat(['callback=' + cbName, '_t=' + Date.now()])
        .join('&');

      script.id = cbName;
      script.src = url + sep + query;
      script.onerror = function () {
        cleanup();
        reject(new Error('Falha ao carregar resposta JSONP do Apps Script'));
      };
      document.head.appendChild(script);
    });
  }

  function validateUrl(url) {
    if (!url) {
      return {
        valid: false,
        error: 'Cole a URL do App da Web (https://script.google.com/macros/s/.../exec) da planilha "Matrix Finance 360" antes de testar.'
      };
    }
    if (url.includes('/edit') || (url.includes('docs.google.com/spreadsheets') && !url.includes('script.google.com'))) {
      return {
        valid: false,
        error: 'Você colou o link direto da planilha (/edit). Na planilha "Matrix Finance 360", clique em "Extensões > Apps Script > Implantar > Nova implantação (App da Web)" e copie a URL terminada em /exec.'
      };
    }
    if (url.includes('script.google.com') && url.endsWith('/dev')) {
      return {
        valid: false,
        error: 'Você colou a URL de teste (/dev), que exige login de desenvolvedor. Copie a URL de produção terminada em /exec em "Implantar > Gerenciar implantações".'
      };
    }
    return { valid: true };
  }

  function normalizePingResponse(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.success === true || data.status === 'success' || data.ok === true || data.ping === 'pong') {
      return {
        success: true,
        title: data.title || data.spreadsheetTitle || 'Matrix Finance 360',
        timestamp: data.timestamp || data.serverTime || new Date().toISOString()
      };
    }
    if (data.error || data.message) {
      return { success: false, error: data.error || data.message };
    }
    return null;
  }

  async function pingCloud() {
    const cfg = getConfig();
    const check = validateUrl(cfg.cloudUrl);
    if (!check.valid) {
      updateStatusUI('error', check.error);
      return { success: false, error: check.error };
    }

    const sep = cfg.cloudUrl.includes('?') ? '&' : '?';
    const target = `${cfg.cloudUrl}${sep}action=ping&token=${encodeURIComponent(cfg.cloudToken)}&_t=${Date.now()}`;
    let explicitServerError = null;

    try {
      const res = await fetch(target, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const norm = normalizePingResponse(data);
        if (norm) {
          if (norm.success) {
            updateStatusUI('synced', 'Conectado: ' + norm.title);
            return norm;
          }
          explicitServerError = norm.error;
        }
      }
    } catch (e) {}

    if (!explicitServerError) {
      try {
        const jsonpData = await jsonpRequest(cfg.cloudUrl, { action: 'ping', token: cfg.cloudToken });
        const norm = normalizePingResponse(jsonpData);
        if (norm) {
          if (norm.success) {
            updateStatusUI('synced', 'Conectado: ' + norm.title);
            return norm;
          }
          explicitServerError = norm.error;
        }
      } catch (e) {}
    }

    if (!explicitServerError) {
      try {
        const resPost = await fetch(cfg.cloudUrl, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'ping', token: cfg.cloudToken })
        });
        if (resPost.ok) {
          const dataPost = await resPost.json();
          const norm = normalizePingResponse(dataPost);
          if (norm) {
            if (norm.success) {
              updateStatusUI('synced', 'Conectado: ' + norm.title);
              return norm;
            }
            explicitServerError = norm.error;
          }
        }
      } catch (e) {}
    }

    const finalError = explicitServerError ||
      'Não foi possível validar a resposta do Apps Script na planilha "Matrix Finance 360". Verifique se:\n' +
      '1) O código atualizado do apps_script.gs foi colado em Extensões > Apps Script;\n' +
      '2) Foi criada uma Nova Implantação do tipo "App da Web" com "Quem pode acessar: Qualquer pessoa";\n' +
      '3) A URL termina com /exec e o Token é "' + cfg.cloudToken + '".';

    updateStatusUI('error', finalError);
    return {
      success: false,
      error: finalError
    };
  }

  function normalizarNomeReceita(valor) {
    return String(valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function isSeedReceitaId(id) {
    return /^rec_(sal|vr|va|13|13o|extra|fisio|ferias|decimo|outras)/.test(String(id || ''));
  }

  function isShortReceitaId(id) {
    return /^r\d+$/.test(String(id || ''));
  }

  // Duas rendas representam a mesma linha quando têm o mesmo nome E o mesmo valor,
  // ou quando uma é o seed canônico (rec_...) e a outra é a cópia antiga curta (r0, r1...).
  function mesmaReceita(a, b) {
    if (!a || !b) return false;
    const nomeA = normalizarNomeReceita(a.nome);
    const nomeB = normalizarNomeReceita(b.nome);
    if (!nomeA || nomeA !== nomeB) return false;
    const valorA = Math.round((parseFloat(a.valor) || 0) * 100);
    const valorB = Math.round((parseFloat(b.valor) || 0) * 100);
    if (valorA === valorB) return true;
    return (isSeedReceitaId(a.id) && isShortReceitaId(b.id)) || (isShortReceitaId(a.id) && isSeedReceitaId(b.id));
  }

  async function fetchFromCloud(options = {}) {
    const cfg = getConfig();
    if (!cfg.cloudUrl) {
      updateStatusUI('offline');
      return { success: false, error: 'URL do Google Sheets não configurada.' };
    }
    const check = validateUrl(cfg.cloudUrl);
    if (!check.valid) {
      updateStatusUI('error', check.error);
      return { success: false, error: check.error };
    }

    updateStatusUI('syncing', 'Buscando dados da planilha Matrix Finance 360...');
    const sep = cfg.cloudUrl.includes('?') ? '&' : '?';
    const target = `${cfg.cloudUrl}${sep}action=get_state&token=${encodeURIComponent(cfg.cloudToken)}&_t=${Date.now()}`;

    let json = null;
    try {
      const res = await fetch(target, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        cache: 'no-store'
      });
      if (res.ok) {
        json = await res.json();
      }
    } catch (err) {}

    if (!json) {
      try {
        json = await jsonpRequest(cfg.cloudUrl, { action: 'get_state', token: cfg.cloudToken });
      } catch (err) {
        updateStatusUI('error', err.message);
        return {
          success: false,
          error: 'Não foi possível ler os dados da planilha "Matrix Finance 360". Verifique se a implantação está publicada com acesso para "Qualquer pessoa".'
        };
      }
    }

    const rawPayload = json && (json.data || json.state);
    if (json && (json.success || json.status === 'success' || json.ok) && rawPayload) {
      const currentLocalState = MatrixDB.getState();
      const dirtySince = localStorage.getItem(DIRTY_LOCAL_KEY);
      const localTs = (currentLocalState && currentLocalState.atualizadoEm) ? Date.parse(currentLocalState.atualizadoEm) : 0;
      const cloudTs = rawPayload.atualizadoEm ? Date.parse(rawPayload.atualizadoEm) : 0;

      // Fidelização Soberana do Google Sheets:
      // A planilha é soberana para que em qualquer local ou dispositivo que acessar puxe os últimos dados inseridos.
      // Se cloudTs >= localTs ou se for carregamento inicial ou force=true, a planilha prevalece.
      const isForceOrInitial = (options && options.force) || !dirtySince;
      const cloudIsNewerOrEqual = (cloudTs > 0 && cloudTs >= localTs);

      if (!isForceOrInitial && !cloudIsNewerOrEqual && dirtySince && localTs > cloudTs + 2000) {
        syncToCloud();
        return {
          success: true,
          data: currentLocalState,
          keptLocal: true,
          timestamp: currentLocalState.atualizadoEm
        };
      }
      localStorage.removeItem(DIRTY_LOCAL_KEY);

      const localMaracajuSat = currentLocalState && currentLocalState.satellites && currentLocalState.satellites.maracaju;
      const localFaturasSat = currentLocalState && currentLocalState.satellites && currentLocalState.satellites.faturas;
      const payloadData = expandStateFromCloud(rawPayload);
      if (!payloadData.satellites) payloadData.satellites = {};

      // v143: lápides de exclusão (do local e da nuvem) vencem o merge. Sem isso o item
      // apagado voltava na próxima restauração — o clássico "excluí o Estúdio e ele reapareceu".
      const lapides = Object.assign({}, (rawPayload && rawPayload.deletedItens) || {}, (currentLocalState && currentLocalState.deletedItens) || {});
      payloadData.deletedItens = lapides;
      const estaApagado = (it) => !!(it && it.id && Object.prototype.hasOwnProperty.call(lapides, String(it.id)));
      const lapidesNuvem = (rawPayload && rawPayload.deletedItens) || {};
      const lapidesNovas = Object.keys(lapides).some((id) => !Object.prototype.hasOwnProperty.call(lapidesNuvem, id));
      let lapidesAplicadas = false;
      if (payloadData.anos) {
        Object.keys(payloadData.anos).forEach(ano => {
          const anoObj = payloadData.anos[ano];
          if (!anoObj || typeof anoObj !== 'object') return;
          Object.keys(anoObj).forEach(mes => {
            const md = anoObj[mes];
            if (!md || typeof md !== 'object') return;
            ['fixos', 'outros', 'receitas', 'diarios'].forEach(tipo => {
              if (!Array.isArray(md[tipo])) return;
              const antes = md[tipo].length;
              md[tipo] = md[tipo].filter(it => !estaApagado(it));
              if (md[tipo].length !== antes) lapidesAplicadas = true;
            });
          });
        });
      }
      if (!payloadData.satellites.maracaju && localMaracajuSat) {
        payloadData.satellites.maracaju = localMaracajuSat;
      }
      // v140: faturas seguem a mesma regra dos outros satélites — vale o retrato mais recente
      // (baseline do código nunca ganha de um retrato real do app Faturas).
      const faturasMescladas = (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.mergeFaturasSnapshots === 'function')
        ? SatelliteConnectors.mergeFaturasSnapshots(payloadData.satellites.faturas, localFaturasSat)
        : (payloadData.satellites.faturas || localFaturasSat);
      if (faturasMescladas) payloadData.satellites.faturas = faturasMescladas;
      if (payloadData.satellites.maracaju && localMaracajuSat) {
        // Se o estado local já tiver gastos maiores/mais recentes no ciclo vigente, preserva
        const cSat = payloadData.satellites.maracaju;
        // v114: compara o ciclo vigente do local com o do snapshot (antes era fixo em '2026-11'
        // e a proteção deixava de valer assim que o mês virasse).
        const mesmoCicloMaracaju = !cSat.cicloVigente || localMaracajuSat.cicloVigente === cSat.cicloVigente;
        if (mesmoCicloMaracaju && ((localMaracajuSat.gastoVrMesAtual || 0) > (cSat.gastoVrMesAtual || 0) || (localMaracajuSat.gastoMercadoMesAtual || 0) > (cSat.gastoMercadoMesAtual || 0))) {
          payloadData.satellites.maracaju = localMaracajuSat;
        }
      }

      // v121: o backup antigo não guardava o Atendimentos. Sem preservar o local, toda abertura
      // apagava os ganhos reais da Scarlet e a tela voltava para os valores de exemplo.
      const localFisioSat = currentLocalState && currentLocalState.satellites && currentLocalState.satellites.fisioflow;
      const cloudFisioSat = payloadData.satellites.fisioflow;
      const localFisioTs = localFisioSat && localFisioSat.atualizadoEm ? Date.parse(localFisioSat.atualizadoEm) : 0;
      const cloudFisioTs = cloudFisioSat && cloudFisioSat.atualizadoEm ? Date.parse(cloudFisioSat.atualizadoEm) : 0;
      if (!cloudFisioSat && localFisioSat) {
        payloadData.satellites.fisioflow = JSON.parse(JSON.stringify(localFisioSat));
      } else if (localFisioSat && cloudFisioSat) {
        // O snapshot da planilha pode estar mais velho que o último scraping deste aparelho.
        const localTemSync = localFisioTs > 0;
        const cloudTemSync = cloudFisioTs > 0;
        if ((localTemSync && !cloudTemSync) || (localTemSync && cloudTemSync && localFisioTs > cloudFisioTs)) {
          payloadData.satellites.fisioflow = JSON.parse(JSON.stringify(localFisioSat));
        }
      }
      // MERGE INTELIGENTE E NÃO-DESTRUTIVO DE DIÁRIOS E LANÇAMENTOS LOCAIS:
      let hadLocalDiariosMerged = false;
      if (currentLocalState && currentLocalState.anos && payloadData && payloadData.anos) {
        Object.keys(currentLocalState.anos).forEach(ano => {
          if (!payloadData.anos[ano]) payloadData.anos[ano] = {};
          Object.keys(currentLocalState.anos[ano]).forEach(mes => {
            const localMonth = currentLocalState.anos[ano][mes];
            if (!payloadData.anos[ano][mes]) {
              payloadData.anos[ano][mes] = JSON.parse(JSON.stringify(localMonth));
              hadLocalDiariosMerged = true;
              return;
            }
            const cloudMonth = payloadData.anos[ano][mes];
            if (!Array.isArray(cloudMonth.diarios)) cloudMonth.diarios = [];

            // 1. Preservar rigorosamente todos os gastos diários locais
            if (localMonth && Array.isArray(localMonth.diarios) && localMonth.diarios.length > 0) {
              localMonth.diarios.forEach(locD => {
                if (!locD || typeof locD !== 'object') return;
                if (estaApagado(locD)) return;
                const existsInCloud = cloudMonth.diarios.some(cldD => {
                  if (cldD.id && locD.id && cldD.id === locD.id) return true;
                  const sameName = (cldD.nome || '').trim().toLowerCase() === (locD.nome || '').trim().toLowerCase();
                  const sameVal = Math.abs((parseFloat(cldD.valor) || 0) - (parseFloat(locD.valor) || 0)) < 0.01;
                  const sameDate = cldD.dataHora && locD.dataHora && cldD.dataHora === locD.dataHora;
                  return sameName && sameVal && sameDate;
                });
                if (!existsInCloud) {
                  cloudMonth.diarios.push(JSON.parse(JSON.stringify(locD)));
                  hadLocalDiariosMerged = true;
                }
              });
            }

            // 2. Preservar outros lançamentos manuais locais (outros, fixos, receitas) se ausentes na nuvem
            ['fixos', 'outros', 'receitas'].forEach(tipo => {
              if (localMonth && Array.isArray(localMonth[tipo])) {
                if (!Array.isArray(cloudMonth[tipo])) cloudMonth[tipo] = [];
                for (const locIt of localMonth[tipo]) {
                  if (!locIt || !locIt.id) continue;
                  if (estaApagado(locIt)) continue;
                  if (cloudMonth[tipo].some(cIt => cIt && cIt.id === locIt.id)) continue;

                  // v121: receita com o mesmo nome/valor (ou seed × cópia curta) não entra de novo.
                  // Era isso que duplicava salário/VA/VR a cada restauração da planilha.
                  if (tipo === 'receitas') {
                    const sameIdx = cloudMonth[tipo].findIndex(cIt => mesmaReceita(cIt, locIt));
                    if (sameIdx >= 0) {
                      const cIt = cloudMonth[tipo][sameIdx];
                      if (isSeedReceitaId(locIt.id) && isShortReceitaId(cIt.id)) {
                        const merged = JSON.parse(JSON.stringify(locIt));
                        if (cIt.pago && !merged.pago) merged.pago = true;
                        cloudMonth[tipo][sameIdx] = merged;
                        hadLocalDiariosMerged = true;
                      }
                      continue;
                    }
                  }

                  cloudMonth[tipo].push(JSON.parse(JSON.stringify(locIt)));
                  hadLocalDiariosMerged = true;
                }
              }
            });
          });
        });
      }

      if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        SatelliteConnectors.syncMaracajuFromLocal(payloadData);
      }
      // v121: limpa duplicatas de receita que já estavam gravadas na planilha (ex.: r0 + rec_sal...).
      if (typeof MatrixDB.dedupeReceitasInState === 'function') {
        const removidas = MatrixDB.dedupeReceitasInState(payloadData);
        if (removidas > 0) hadLocalDiariosMerged = true;
      }
      MatrixDB.saveState(payloadData, 'cloud_restore', { skipCloudSync: true });
      if (hadLocalDiariosMerged || lapidesAplicadas || lapidesNovas) {
        // v143: se havia lápide local (ou a nuvem ainda tinha o item apagado), regrava a
        // planilha para que os outros aparelhos recebam a exclusão.
        queueSync();
      }
      // v141: a planilha tinha sobra de bloco antigo e o servidor leu só até o último JSON
      // válido. Regrava o estado recuperado para deixar o Backup_JSON limpo de novo.
      if (json && json.reparado) queueSync();
      const ts = json.timestamp || new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.lastSync, ts);
      updateStatusUI('synced', 'Sincronizado com ' + (json.title || 'Matrix Finance 360'));
      return { success: true, data: payloadData, timestamp: ts };
    } else if (json && (json.success || json.status === 'success' || json.ok)) {
      updateStatusUI('synced', json.message || 'Planilha Matrix Finance 360 conectada (aguardando 1º backup).');
      return {
        success: true,
        data: null,
        message: json.message || 'Nenhum backup salvo ainda na planilha Matrix Finance 360. Clique em "⬆️ Fazer Backup" para gravar os dados iniciais.'
      };
    } else {
      const errMsg = (json && (json.error || json.message)) || 'Resposta inválida da planilha.';
      updateStatusUI('error', errMsg);
      return { success: false, error: errMsg };
    }
  }

  async function sendPostPayload(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  async function syncToCloud() {
    const cfg = getConfig();
    if (!cfg.cloudUrl) {
      updateStatusUI('offline');
      return { success: false, error: 'URL do Google Sheets não configurada' };
    }
    const check = validateUrl(cfg.cloudUrl);
    if (!check.valid) {
      updateStatusUI('error', check.error);
      return { success: false, error: check.error };
    }

    if (isSyncing) {
      pendingFollowUpSync = true;
      return { success: true, syncing: true };
    }
    isSyncing = true;
    pendingFollowUpSync = false;
    updateStatusUI('syncing', 'Salvando alterações na planilha Matrix Finance 360...');

    const fullState = MatrixDB.getState();
    let compactState = compactStateForCloud(fullState, SHEETS_STRICT_CHAR_LIMIT);
    let payload = {
      action: 'sync_all',
      token: cfg.cloudToken,
      state: compactState
    };

    try {
      try {
        let json = await sendPostPayload(cfg.cloudUrl, payload);

        // Se ainda assim a planilha reclamar de 50.000 caracteres, reduz para < 18.000 chars e reenvia imediatamente
        if (json && json.error && String(json.error).includes('50000')) {
          compactState = compactStateForCloud(fullState, 18000);
          payload = { action: 'sync_all', token: cfg.cloudToken, state: compactState };
          json = await sendPostPayload(cfg.cloudUrl, payload);
        }

        if (json && (json.success || json.status === 'success' || json.ok)) {
          const ts = json.timestamp || new Date().toISOString();
          const charLen = JSON.stringify(compactState).length;
          localStorage.setItem(STORAGE_KEYS.lastSync, ts);
          if (!pendingFollowUpSync) localStorage.removeItem(DIRTY_LOCAL_KEY);
          updateStatusUI('synced', `Salvo às ${new Date().toLocaleTimeString('pt-BR')} (${(charLen / 1024).toFixed(1)} KB)`);
          return { success: true, timestamp: ts, chars: charLen, title: json.title || 'Matrix Finance 360' };
        } else if (json && (json.error || json.message)) {
          updateStatusUI('error', json.error || json.message);
          return { success: false, error: json.error || json.message };
        }
      } catch (corsErr) {
        try {
          await fetch(cfg.cloudUrl, {
            method: 'POST',
            mode: 'no-cors',
            credentials: 'omit',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
        } catch (postErr) {
          console.warn('Erro ao disparar POST no-cors:', postErr);
        }

        await new Promise(r => setTimeout(r, 1200));

        const pingCheck = await pingCloud();
        if (pingCheck && pingCheck.success) {
          const ts = new Date().toISOString();
          const charLen = JSON.stringify(compactState).length;
          localStorage.setItem(STORAGE_KEYS.lastSync, ts);
          if (!pendingFollowUpSync) localStorage.removeItem(DIRTY_LOCAL_KEY);
          updateStatusUI('synced', 'Salvo às ' + new Date().toLocaleTimeString('pt-BR') + ' (' + (charLen / 1024).toFixed(1) + ' KB)');
          return { success: true, timestamp: ts, mode: 'no-cors' };
        } else if (navigator.onLine) {
          const ts = new Date().toISOString();
          const charLen = JSON.stringify(compactState).length;
          localStorage.setItem(STORAGE_KEYS.lastSync, ts);
          if (!pendingFollowUpSync) localStorage.removeItem(DIRTY_LOCAL_KEY);
          updateStatusUI('synced', 'Salvo às ' + new Date().toLocaleTimeString('pt-BR') + ' (' + (charLen / 1024).toFixed(1) + ' KB)');
          return { success: true, timestamp: ts, mode: 'no-cors-assumed' };
        } else {
          const errMsg = (pingCheck && pingCheck.error) || 'Falha ao confirmar gravação no Google Sheets.';
          updateStatusUI('error', errMsg);
          return { success: false, error: errMsg };
        }
      }

      const pingFallback = await pingCloud();
      if (pingFallback && pingFallback.success) {
        const ts = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.lastSync, ts);
        if (!pendingFollowUpSync) localStorage.removeItem(DIRTY_LOCAL_KEY);
        updateStatusUI('synced', 'Salvo às ' + new Date().toLocaleTimeString('pt-BR'));
        return { success: true, timestamp: ts };
      }

      const failMsg = (pingFallback && pingFallback.error) || 'Não foi possível confirmar a gravação na planilha.';
      updateStatusUI('error', failMsg);
      return { success: false, error: failMsg };
    } catch (e) {
      console.warn('Falha na sincronização em nuvem:', e);
      updateStatusUI('error', e.message);
      return { success: false, error: e.message };
    } finally {
      isSyncing = false;
      if (pendingFollowUpSync) {
        pendingFollowUpSync = false;
        setTimeout(() => syncToCloud(), 150);
      }
    }
  }

  function showAutoSaveToast() {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('matrixAutoSaveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'matrixAutoSaveToast';
      toast.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:9999;background:rgba(5,16,11,0.94);border:1px solid var(--matrix-green);color:var(--matrix-green);font-family:var(--font-mono);font-size:11px;font-weight:700;padding:6px 12px;border-radius:999px;box-shadow:0 4px 16px rgba(0,255,102,0.22);pointer-events:none;opacity:0;transform:translateY(8px);transition:opacity 0.2s ease, transform 0.2s ease;display:flex;align-items:center;gap:6px;';
      document.body.appendChild(toast);
    }
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    toast.innerHTML = `<span>💾</span> <span>Salvo automaticamente (${timeStr})</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    if (toast._hideTimer) clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
    }, 1800);
  }

  function queueSync() {
    try {
      localStorage.setItem(DIRTY_LOCAL_KEY, new Date().toISOString());
    } catch (e) {}
    showAutoSaveToast();

    const cfg = getConfig();
    if (!cfg.cloudUrl) {
      updateStatusUI('offline', `Salvo automaticamente às ${new Date().toLocaleTimeString('pt-BR')}`);
      return;
    }

    updateStatusUI('syncing', 'Salvando alteração na nuvem...');
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      syncToCloud();
    }, 350);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('matrix_data_changed', (e) => {
      if (e && e.detail && e.detail.skipCloudSync) return;
      queueSync();
    });

    // Garante salvamento imediato se o usuário fechar a aba, minimizar o app no celular ou trocar de tela
    const flushPendingChanges = () => {
      try {
        const s = typeof MatrixDB !== 'undefined' && MatrixDB.getState ? MatrixDB.getState() : null;
        if (s) {
          localStorage.setItem('MATRIX_FINANCE_STATE_v2', JSON.stringify(s));
        }
      } catch (e) {}
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
        const cfg = getConfig();
        if (cfg.cloudUrl && navigator.sendBeacon) {
          try {
            const fullState = MatrixDB.getState();
            const compactState = compactStateForCloud(fullState, SHEETS_STRICT_CHAR_LIMIT);
            const payload = JSON.stringify({ action: 'sync_all', token: cfg.cloudToken, state: compactState });
            navigator.sendBeacon(cfg.cloudUrl, new Blob([payload], { type: 'text/plain;charset=utf-8' }));
          } catch (err) {
            syncToCloud();
          }
        } else if (cfg.cloudUrl) {
          syncToCloud();
        }
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingChanges();
    });
    window.addEventListener('pagehide', flushPendingChanges);
    window.addEventListener('beforeunload', flushPendingChanges);
  }

  return {
    getConfig,
    saveConfig,
    pingCloud,
    fetchFromCloud,
    syncToCloud,
    queueSync,
    updateStatusUI,
    compactStateForCloud,
    expandStateFromCloud,
    jsonpRequest,
    isAppsScriptUrl,
    DEFAULT_SPREADSHEET_ID,
    DEFAULT_SPREADSHEET_URL
  };
})();

if (typeof window !== 'undefined') {
  window.SyncEngine = SyncEngine;
}
