/**
 * MATRIX FINANCE - SYNC & EXTERNAL CONNECTORS ENGINE
 * Sincronização em nuvem resiliente com Google Sheets (Planilha Matrix Finance 360)
 * com suporte a CORS (credentials: omit), fallback JSONP validado e trava anti-loop.
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

  const DEFAULT_SPREADSHEET_ID = '1imbffaHJJIIZDqFbTwCJS7_TPUJAvRhcBWPtURYoMwU';
  const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1imbffaHJJIIZDqFbTwCJS7_TPUJAvRhcBWPtURYoMwU/edit';

  let debounceTimer = null;
  let isSyncing = false;

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
      cloudUrl: (localStorage.getItem(STORAGE_KEYS.cloudUrl) || '').trim(),
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
      el.textContent = '🟡 Sincronizando...';
      el.title = message || 'Enviando alterações para a planilha Matrix Finance 360';
    } else if (status === 'synced') {
      el.className = 'status-badge pago';
      el.textContent = '🟢 Sincronizado';
      el.title = message || 'Dados salvos na planilha Matrix Finance 360';
    } else if (status === 'error') {
      el.className = 'status-badge danger';
      el.textContent = '🔴 Erro de Conexão';
      el.title = message || 'Falha ao sincronizar com a planilha Matrix Finance 360';
    } else {
      el.className = 'status-badge';
      el.textContent = '⚪ Modo Offline';
      el.title = message || 'Backup local ativo • Configure a URL /exec da planilha Matrix Finance 360 para nuvem';
    }
  }

  function jsonpRequest(url, params, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return reject(new Error('Sem DOM'));
      const cbName = '_matrix_gas_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout JSONP ao conectar ao Google Apps Script'));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
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

    // 1. Tentativa GET com credentials: 'omit' (evita conflito de múltiplas contas Google logadas no navegador)
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

    // 2. Tentativa via JSONP (contorna bloqueios de CORS em redirecionamentos 302 do Google Apps Script)
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

    // 3. Tentativa via POST CORS (text/plain)
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

  async function fetchFromCloud() {
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
    // 1. Tenta GET CORS com credentials: 'omit'
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

    // 2. Fallback para JSONP (suportado pelo apps_script.gs v2.0)
    if (!json) {
      try {
        json = await jsonpRequest(cfg.cloudUrl, { action: 'get_state', token: cfg.cloudToken });
      } catch (err) {
        updateStatusUI('error', err.message);
        return {
          success: false,
          error: 'Não foi possível ler os dados da planilha "Matrix Finance 360". Atualize o código em Extensões > Apps Script (botão "📋 Copiar Código Apps Script") e publique uma Nova Implantação com acesso para "Qualquer pessoa".'
        };
      }
    }

    const payloadData = json && (json.data || json.state);
    if (json && (json.success || json.status === 'success' || json.ok) && payloadData) {
      // Importante: skipCloudSync = true evita disparar syncToCloud de volta logo após restaurar da nuvem
      MatrixDB.saveState(payloadData, 'cloud_restore', { skipCloudSync: true });
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

    if (isSyncing) return { success: true, syncing: true };
    isSyncing = true;
    updateStatusUI('syncing', 'Gravando backup na planilha Matrix Finance 360...');

    const state = MatrixDB.getState();
    const payload = {
      action: 'sync_all',
      token: cfg.cloudToken,
      state: state,
      data: state
    };

    try {
      // 1. Tenta POST padrão com credentials: 'omit' e text/plain (evita preflight OPTIONS no Apps Script)
      try {
        const res = await fetch(cfg.cloudUrl, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const json = await res.json();
          if (json && (json.success || json.status === 'success' || json.ok)) {
            const ts = json.timestamp || new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.lastSync, ts);
            updateStatusUI('synced', 'Sincronizado às ' + new Date().toLocaleTimeString('pt-BR'));
            return { success: true, timestamp: ts, title: json.title || 'Matrix Finance 360' };
          } else if (json && (json.error || json.message)) {
            updateStatusUI('error', json.error || json.message);
            return { success: false, error: json.error || json.message };
          }
        }
      } catch (corsErr) {
        // 2. Fallback para POST no-cors seguido de verificação real via pingCloud
        await fetch(cfg.cloudUrl, {
          method: 'POST',
          mode: 'no-cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const pingCheck = await pingCloud();
        if (pingCheck && pingCheck.success) {
          const ts = new Date().toISOString();
          localStorage.setItem(STORAGE_KEYS.lastSync, ts);
          updateStatusUI('synced', 'Enviado ao Sheets às ' + new Date().toLocaleTimeString('pt-BR'));
          return { success: true, timestamp: ts, mode: 'no-cors' };
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
        updateStatusUI('synced', 'Sincronizado às ' + new Date().toLocaleTimeString('pt-BR'));
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
    }
  }

  function queueSync() {
    const cfg = getConfig();
    if (!cfg.cloudUrl) {
      updateStatusUI('offline');
      return;
    }

    updateStatusUI('syncing', 'Alteração pendente de envio...');
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      syncToCloud();
    }, 2000);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('matrix_data_changed', (e) => {
      if (e && e.detail && e.detail.skipCloudSync) return;
      queueSync();
    });
  }

  return {
    getConfig,
    saveConfig,
    pingCloud,
    fetchFromCloud,
    syncToCloud,
    queueSync,
    updateStatusUI,
    DEFAULT_SPREADSHEET_ID,
    DEFAULT_SPREADSHEET_URL
  };
})();

if (typeof window !== 'undefined') {
  window.SyncEngine = SyncEngine;
}
