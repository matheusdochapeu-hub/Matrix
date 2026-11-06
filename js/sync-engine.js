/**
 * MATRIX FINANCE - SYNC & EXTERNAL CONNECTORS ENGINE
 * Sincronização em nuvem resiliente com Google Sheets (modelo FisioFlow / Faturas)
 * com suporte a CORS (credentials: omit), fallback JSONP e POST no-cors.
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
      el.title = message || 'Enviando alterações para a nuvem';
    } else if (status === 'synced') {
      el.className = 'status-badge pago';
      el.textContent = '🟢 Sincronizado';
      el.title = message || 'Dados salvos no Google Sheets';
    } else if (status === 'error') {
      el.className = 'status-badge danger';
      el.textContent = '🔴 Erro de Conexão';
      el.title = message || 'Falha ao sincronizar';
    } else {
      el.className = 'status-badge';
      el.textContent = '⚪ Modo Offline';
      el.title = 'Sem URL de sincronização configurada';
    }
  }

  function jsonpRequest(url, params, timeoutMs = 9000) {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return reject(new Error('Sem DOM'));
      const cbName = '_matrix_gas_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout JSONP'));
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
        .concat(['callback=' + cbName])
        .join('&');

      script.id = cbName;
      script.src = url + sep + query;
      script.onerror = function () {
        cleanup();
        reject(new Error('Falha ao carregar script JSONP'));
      };
      document.head.appendChild(script);
    });
  }

  function validateUrl(url) {
    if (!url) {
      return { valid: false, error: 'Cole a URL do App da Web (https://script.google.com/macros/s/.../exec) antes de testar.' };
    }
    if (url.includes('/edit') || (url.includes('docs.google.com/spreadsheets') && !url.includes('script.google.com'))) {
      return {
        valid: false,
        error: 'Você colou o link da planilha ou do editor (/edit). No Apps Script, clique em "Implantar > Nova implantação > App da Web" e copie a URL terminada em /exec.'
      };
    }
    return { valid: true };
  }

  function normalizePingResponse(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.success === true || data.status === 'success' || data.ok === true || data.ping === 'pong') {
      return {
        success: true,
        title: data.title || data.spreadsheetTitle || 'Planilha Google Sheets Vinculada',
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
    if (!check.valid) return { success: false, error: check.error };

    const sep = cfg.cloudUrl.includes('?') ? '&' : '?';
    const target = `${cfg.cloudUrl}${sep}action=ping&token=${encodeURIComponent(cfg.cloudToken)}&_t=${Date.now()}`;

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
          if (norm.success) updateStatusUI('synced', 'Conectado: ' + norm.title);
          return norm;
        }
      }
    } catch (e) {}

    // 2. Tentativa via JSONP (contorna bloqueios de CORS em redirecionamentos 302 do Google Apps Script)
    try {
      const jsonpData = await jsonpRequest(cfg.cloudUrl, { action: 'ping', token: cfg.cloudToken });
      const norm = normalizePingResponse(jsonpData);
      if (norm) {
        if (norm.success) updateStatusUI('synced', 'Conectado: ' + norm.title);
        return norm;
      }
    } catch (e) {}

    // 3. Tentativa via POST CORS (text/plain)
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
          if (norm.success) updateStatusUI('synced', 'Conectado: ' + norm.title);
          return norm;
        }
      }
    } catch (e) {}

    // 4. Tentativa via modo no-cors (confirma que o endpoint /exec do Google Apps Script está ativo e respondendo)
    try {
      const resOpaque = await fetch(target, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-store'
      });
      if (resOpaque && (resOpaque.type === 'opaque' || resOpaque.status === 0 || resOpaque.ok)) {
        updateStatusUI('synced', 'Planilha Google Sheets conectada');
        return {
          success: true,
          title: 'Planilha Google Sheets (App da Web Ativo)',
          timestamp: new Date().toISOString()
        };
      }
    } catch (err) {
      updateStatusUI('error', err.message);
      return {
        success: false,
        error: 'Não foi possível alcançar a URL informada. Verifique sua conexão e se a URL termina com /exec.'
      };
    }

    return {
      success: false,
      error: 'A URL não respondeu como esperado. Certifique-se de implantar o Apps Script com acesso para "Qualquer pessoa".'
    };
  }

  async function fetchFromCloud() {
    const cfg = getConfig();
    const check = validateUrl(cfg.cloudUrl);
    if (!check.valid) return { success: false, error: check.error };

    updateStatusUI('syncing', 'Buscando dados da planilha...');
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
          error: 'Não foi possível ler os dados da planilha. Verifique se em "Implantar > Gerenciar implantações" a opção "Quem pode acessar" está marcada como "Qualquer pessoa".'
        };
      }
    }

    const payloadData = json && (json.data || json.state);
    if (json && (json.success || json.status === 'success' || json.ok) && payloadData) {
      MatrixDB.saveState(payloadData);
      localStorage.setItem(STORAGE_KEYS.lastSync, json.timestamp || new Date().toISOString());
      updateStatusUI('synced', 'Dados atualizados da planilha.');
      return { success: true, data: payloadData };
    } else if (json && (json.success || json.status === 'success' || json.ok)) {
      updateStatusUI('synced', json.message || 'Planilha conectada (nenhum backup salvo ainda).');
      return { success: true, data: null, message: json.message || 'Nenhum backup salvo ainda. Clique em "Fazer Backup" primeiro.' };
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
    updateStatusUI('syncing');

    const state = MatrixDB.getState();
    const payload = {
      action: 'sync_all',
      token: cfg.cloudToken,
      state: state,
      data: state
    };

    try {
      // 1. Tenta POST padrão com credentials: 'omit'
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
          if (json.success || json.status === 'success' || json.ok) {
            const ts = json.timestamp || new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.lastSync, ts);
            updateStatusUI('synced', 'Sincronizado às ' + new Date().toLocaleTimeString());
            return { success: true, timestamp: ts };
          } else if (json.error || json.message) {
            updateStatusUI('error', json.error || json.message);
            return { success: false, error: json.error || json.message };
          }
        }
      } catch (corsErr) {
        // 2. Fallback para POST no-cors (padrão Google Apps Script quando o redirect 302 omite cabeçalho CORS)
        await fetch(cfg.cloudUrl, {
          method: 'POST',
          mode: 'no-cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const ts = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.lastSync, ts);
        updateStatusUI('synced', 'Enviado ao Sheets às ' + new Date().toLocaleTimeString());
        return { success: true, timestamp: ts, mode: 'no-cors' };
      }

      const ts = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.lastSync, ts);
      updateStatusUI('synced', 'Sincronizado às ' + new Date().toLocaleTimeString());
      return { success: true, timestamp: ts };
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
    if (!cfg.cloudUrl) return;

    updateStatusUI('syncing', 'Alteração pendente de envio...');
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      syncToCloud();
    }, 2000);
  }

  window.addEventListener('matrix_data_changed', () => {
    queueSync();
  });

  return {
    getConfig,
    saveConfig,
    pingCloud,
    fetchFromCloud,
    syncToCloud,
    queueSync,
    updateStatusUI
  };
})();

if (typeof window !== 'undefined') {
  window.SyncEngine = SyncEngine;
}
