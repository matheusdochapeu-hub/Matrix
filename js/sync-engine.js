/**
 * MATRIX FINANCE - SYNC & EXTERNAL CONNECTORS ENGINE
 * Sincronização em nuvem resiliente com Google Sheets (modelo FisioFlow)
 * e leitura não-invasiva dos 3 apps satélites (Maracaju 88, Faturas e FisioFlow).
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

  function getConfig() {
    return {
      cloudUrl: localStorage.getItem(STORAGE_KEYS.cloudUrl) || '',
      cloudToken: localStorage.getItem(STORAGE_KEYS.cloudToken) || 'MatrixReloaded2026!',
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

  async function pingCloud() {
    const cfg = getConfig();
    if (!cfg.cloudUrl) return { success: false, error: 'URL do Google Sheets não configurada' };

    try {
      const sep = cfg.cloudUrl.includes('?') ? '&' : '?';
      const target = `${cfg.cloudUrl}${sep}action=ping&token=${encodeURIComponent(cfg.cloudToken)}`;
      const res = await fetch(target);
      const data = await res.json();
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function fetchFromCloud() {
    const cfg = getConfig();
    if (!cfg.cloudUrl) return { success: false, error: 'URL não configurada' };

    updateStatusUI('syncing', 'Buscando dados da planilha...');
    try {
      const sep = cfg.cloudUrl.includes('?') ? '&' : '?';
      const target = `${cfg.cloudUrl}${sep}action=get_state&token=${encodeURIComponent(cfg.cloudToken)}`;
      const res = await fetch(target);
      const json = await res.json();

      if (json.success && json.data) {
        MatrixDB.saveState(json.data);
        localStorage.setItem(STORAGE_KEYS.lastSync, json.timestamp || new Date().toISOString());
        updateStatusUI('synced', 'Dados atualizados da planilha.');
        return { success: true, data: json.data };
      } else {
        updateStatusUI('synced', json.message || 'Planilha vazia ou sem dados.');
        return { success: true, data: null, message: json.message };
      }
    } catch (err) {
      updateStatusUI('error', err.message);
      return { success: false, error: err.message };
    }
  }

  async function syncToCloud() {
    const cfg = getConfig();
    if (!cfg.cloudUrl) {
      updateStatusUI('offline');
      return;
    }

    if (isSyncing) return;
    isSyncing = true;
    updateStatusUI('syncing');

    try {
      const state = MatrixDB.getState();
      const payload = {
        action: 'sync_all',
        token: cfg.cloudToken,
        state: state
      };

      const res = await fetch(cfg.cloudUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps script CORS friendly
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        localStorage.setItem(STORAGE_KEYS.lastSync, json.timestamp || new Date().toISOString());
        updateStatusUI('synced', 'Sincronizado às ' + new Date().toLocaleTimeString());
      } else {
        updateStatusUI('error', json.error);
      }
    } catch (e) {
      console.warn('Falha na sincronização em nuvem:', e);
      updateStatusUI('error', e.message);
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
    }, 2000); // Debounce de 2 segundos
  }

  // Monitorar alterações nos dados locais para sincronizar automaticamente
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
