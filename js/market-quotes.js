/**
 * MATRIX FINANCE - MARKET QUOTES (v129)
 * Cotações de ações da B3 para a aba Investimentos.
 *
 * - Fechamento do dia anterior: puxado automaticamente ao abrir a aba (uma vez por dia/sessão).
 * - Cotação do momento: botão "Cotação atual" — busca o preço intradiário.
 *
 * A busca roda no Google Apps Script (`action=quotes`), porque o Yahoo Finance não libera
 * CORS para o navegador. O Apps Script devolve `Access-Control-Allow-Origin: *`.
 * Se a planilha ainda não tiver a ação publicada, o módulo devolve uma mensagem clara.
 */
const MarketQuotes = (function () {
  const CACHE_KEY = 'matrix_market_quotes_v1';
  const CACHE_TTL_MS = 12 * 60 * 1000; // 12 min para não bater no endpoint a cada render
  const AUTO_INTERVALO_MS = 10 * 60 * 1000;

  let emAndamento = false;
  let ultimoAutoMs = 0;
  let ultimoErro = '';
  // v136: quando o Apps Script falha (sem permissão/planilha sem calcular), não insistimos
  // a cada clique — vamos direto para o data/quotes.json por alguns minutos.
  let gasIndisponivelAte = 0;

  // ---------------------------------------------------------------- utilidades
  function tickerDe(item) {
    if (!item) return null;
    if (item.ticker) {
      const t = String(item.ticker).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (t) return t;
    }
    // "CSNA3 (Cia Siderúrgica Nacional)" -> "CSNA3"
    const m = String(item.ativo || '').toUpperCase().match(/\b([A-Z]{4}\d{1,2})\b/);
    return m ? m[1] : null;
  }

  function tickersDaCarteira(invList) {
    const set = new Set();
    (invList || []).forEach(it => {
      const t = tickerDe(it);
      if (t) set.add(t);
    });
    return Array.from(set);
  }

  function hojeISO() {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
  }

  function formatarDataCurta(iso) {
    if (!iso) return '';
    const p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
  }

  function formatarHoraCurta(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------------------------------------------------------------- cache local
  function lerCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function gravarCache(cache) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  function registrarNoCache(quotes) {
    const cache = lerCache();
    const agora = Date.now();
    (quotes || []).forEach(q => {
      if (!q || !q.ok || !q.ticker) return;
      cache[q.ticker] = {
        fechamento: q.fechamento,
        fechamentoData: q.fechamentoData,
        atual: q.atual,
        atualEm: q.atualEm,
        moeda: q.moeda,
        fonte: q.fonte,
        ts: agora
      };
    });
    gravarCache(cache);
  }

  // ---------------------------------------------------------------- rede
  function config() {
    return (typeof SyncEngine !== 'undefined' && SyncEngine.getConfig) ? SyncEngine.getConfig() : null;
  }

  async function buscarQuotes(tickers) {
    if (!tickers || !tickers.length) return { ok: true, data: [] };
    const cfg = config();
    if (!cfg || !cfg.cloudUrl) {
      return { ok: false, error: 'Backup do Matrix não configurado (Backup & Conexões).' };
    }

    const params = {
      action: 'quotes',
      symbols: tickers.join(','),
      token: cfg.cloudToken || ''
    };

    if (Date.now() < gasIndisponivelAte) {
      return { ok: false, error: 'Apps Script temporariamente indisponível para cotações.', pulado: true };
    }

    let json = null;
    let erroFetch = '';
    try {
      const qs = new URLSearchParams(Object.assign({}, params, { _: String(Date.now()) }));
      const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 9000) : null;
      const resp = await fetch(`${cfg.cloudUrl}?${qs.toString()}`, controller
        ? { method: 'GET', cache: 'no-store', signal: controller.signal }
        : { method: 'GET', cache: 'no-store' });
      if (timer) clearTimeout(timer);
      if (resp.ok) {
        json = await resp.json();
      } else {
        erroFetch = `HTTP ${resp.status}`;
      }
    } catch (e) {
      erroFetch = String((e && e.message) || e);
    }

    if (!json) {
      gasIndisponivelAte = Date.now() + 10 * 60 * 1000;
      ultimoErro = erroFetch || 'Falha ao consultar as cotações';
      return { ok: false, error: ultimoErro };
    }

    // A planilha pode ainda estar calculando o GOOGLEFINANCE.
    if (json && json.pendente) {
      gasIndisponivelAte = Date.now() + 5 * 60 * 1000;
      return { ok: false, pendente: true, data: json.data || [] };
    }

    if (json.success === false) {
      const msg = String(json.error || '');
      // A versão publicada do Apps Script ainda não conhece a ação "quotes".
      if (/a[cç][aã]o inv[aá]lida|unknown action/i.test(msg)) {
        ultimoErro = 'O Apps Script publicado ainda não tem a ação de cotações. Reimplante o script do Matrix (Implantar → Gerenciar implantações → Editar → Versão: Nova versão → Implantar) e tente de novo.';
        return { ok: false, error: ultimoErro, precisaReimplantar: true };
      }
      ultimoErro = msg || 'O Apps Script recusou a consulta de cotações.';
      return { ok: false, error: ultimoErro };
    }

    const data = Array.isArray(json.data) ? json.data : null;
    if (data && data.length) {
      const oks = data.filter(q => q && q.ok);
      if (!oks.length) {
        const primeiro = data.map(q => (q && q.error) || '').filter(Boolean)[0] || '';
        ultimoErro = mapearErroProvedor(primeiro);
        return { ok: false, error: ultimoErro, precisaAutorizar: /UrlFetchApp|external_request/i.test(primeiro) };
      }
    }

    if (!data) {
      // Planilha publicada ainda sem a ação "quotes": devolve o estado, não as cotações.
      ultimoErro = 'O Apps Script publicado ainda não tem a ação de cotações. Reimplante o script do Matrix (Implantar → Gerenciar implantações → Nova versão).';
      return { ok: false, error: ultimoErro, precisaReimplantar: true };
    }

    ultimoErro = '';
    gasIndisponivelAte = 0;
    registrarNoCache(data);
    return { ok: true, data };
  }

  function mapearErroProvedor(msg) {
    const bruto = String(msg || '');
    if (/UrlFetchApp|external_request|permiss[ãa]o para chamar/i.test(bruto)) {
      return 'O script do Matrix ainda não está autorizado a acessar serviços externos (UrlFetchApp).\n\n' +
        'No editor do Apps Script: rode a função testarCotacoes uma vez e aceite a permissão; ' +
        'depois Implantar → Gerenciar implantações → Editar → Versão: "Nova versão" → Implantar.';
    }
    if (/HTTP 429|Too Many Requests|rate limit/i.test(bruto)) {
      return 'O Yahoo Finance limitou as consultas (HTTP 429). Tente de novo em alguns minutos.';
    }
    if (/HTTP 4\d\d|HTTP 5\d\d/i.test(bruto)) {
      return 'O provedor de cotações respondeu com erro: ' + bruto + '. Tente de novo em alguns minutos.';
    }
    return bruto ? 'Não foi possível obter as cotações: ' + bruto : 'Nenhuma cotação foi retornada.';
  }

  // Plano B: data/quotes.json publicado pelo GitHub Actions (mesma origem, sem CORS).
  async function buscarQuotesDoJson() {
    try {
      const resp = await fetch('data/quotes.json?_=' + Date.now(), { cache: 'no-store' });
      if (!resp.ok) return null;
      const json = await resp.json();
      const data = Array.isArray(json.quotes) ? json.quotes.filter(q => q && q.ok) : [];
      if (!data.length) return null;
      registrarNoCache(data);
      return { ok: true, data, geradoEm: json.geradoEm || '' };
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------- aplicação no estado
  function aplicarQuotes(invList, quotes, modo) {
    let mudou = false;
    const porTicker = {};
    (quotes || []).forEach(q => {
      if (q && q.ok && q.ticker) porTicker[q.ticker] = q;
    });

    (invList || []).forEach(item => {
      const t = tickerDe(item);
      if (!t || !porTicker[t]) return;
      const q = porTicker[t];
      const qtd = parseFloat(item.quantidade) || 0;
      const preco = modo === 'atual' ? q.atual : q.fechamento;
      if (!preco || !isFinite(preco)) return;

      item.precoAtual = preco;
      if (qtd > 0) item.valorAtual = Math.round(qtd * preco * 100) / 100;
      item.cotacaoFechamento = q.fechamento;
      item.cotacaoFechamentoData = q.fechamentoData;
      item.cotacaoAtual = q.atual;
      item.cotacaoAtualEm = q.atualEm;
      item.cotacaoModo = modo;
      item.cotacaoFonte = q.fonte || 'Yahoo Finance';
      item.cotacaoAtualizadaEm = new Date().toISOString();
      mudou = true;
    });

    return mudou;
  }

  function precisaSincronizar(invList) {
    const tickers = tickersDaCarteira(invList);
    if (!tickers.length) return false;
    const cache = lerCache();
    const hoje = hojeISO();
    const limite = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
    return tickers.some(t => {
      const c = cache[t];
      if (!c) return true;
      if (!c.fechamentoData) return true;
      if (c.fechamentoData < limite) return true; // fechamento velho (fim de semana/feriado fica dentro do limite)
      return c.fechamentoData > hoje;
    });
  }

  // ---------------------------------------------------------------- API pública
  async function sincronizar(modo = 'atual') {
    if (emAndamento) return { ok: false, error: 'Consulta já em andamento.' };
    const state = (typeof MatrixDB !== 'undefined') ? MatrixDB.getState() : null;
    if (!state) return { ok: false, error: 'Estado indisponível.' };

    const tickers = tickersDaCarteira(state.investimentos);
    if (!tickers.length) return { ok: true, vazio: true, data: [] };

    emAndamento = true;
    atualizarStatus('Consultando cotações…', 'loading');
    try {
      // v137: se o data/quotes.json responde rápido, aplica na hora e deixa o Apps Script
      // tentar em segundo plano (quando ele funciona, o preço intradiário substitui o do JSON).
      const jsonRapido = await buscarQuotesDoJson();
      if (jsonRapido) {
        const mudouJson = aplicarQuotes(state.investimentos, jsonRapido.data, modo);
        if (mudouJson) MatrixDB.saveState(state, 'cotacao_json_github', { skipCloudSync: true });
        if (typeof MatrixApp !== 'undefined' && MatrixApp.renderInvestments) MatrixApp.renderInvestments();
        const quandoJson = jsonRapido.geradoEm ? new Date(jsonRapido.geradoEm).toLocaleString('pt-BR') : '';
        atualizarStatus(`Cotações via GitHub${quandoJson ? ' (' + quandoJson + ')' : ''} — ${jsonRapido.data.length}/${tickers.length}.`, 'ok');

        // tenta o Apps Script sem bloquear a interface
        buscarQuotes(tickers).then(res => {
          if (res && res.ok && res.data) {
            const mudouGas = aplicarQuotes(state.investimentos, res.data, modo);
            if (mudouGas) MatrixDB.saveState(state, 'cotacao_gas', { skipCloudSync: true });
            if (typeof MatrixApp !== 'undefined' && MatrixApp.renderInvestments) MatrixApp.renderInvestments();
            atualizarStatus(`Cotações de ${modo === 'atual' ? 'agora' : 'fechamento'} atualizadas (${res.data.filter(q => q && q.ok).length}/${tickers.length}).`, 'ok');
          }
        }).catch(() => {});

        return { ok: true, data: jsonRapido.data, fonte: 'github' };
      }

      const res = await buscarQuotes(tickers);
      if (!res.ok) {
        // Apps Script fora do ar / sem permissão / planilha calculando: usa o JSON do GitHub.
        const fb = await buscarQuotesDoJson();
        if (fb) {
          const mudouFb = aplicarQuotes(state.investimentos, fb.data, modo);
          if (mudouFb) {
            MatrixDB.saveState(state, 'cotacao_fallback_github', { skipCloudSync: true });
          }
          if (typeof MatrixApp !== 'undefined' && MatrixApp.renderInvestments) {
            MatrixApp.renderInvestments();
          }
          const quandoFb = fb.geradoEm ? new Date(fb.geradoEm).toLocaleString('pt-BR') : '';
          atualizarStatus(`Cotações via GitHub${quandoFb ? ' (' + quandoFb + ')' : ''} — ${fb.data.length}/${tickers.length}.`, 'ok');
          return { ok: true, data: fb.data, fonte: 'github' };
        }
        atualizarStatus(res.error || 'Não foi possível obter as cotações.', 'erro');
        return res;
      }

      const mudou = aplicarQuotes(state.investimentos, res.data, modo);
      if (mudou) {
        MatrixDB.saveState(state, modo === 'atual' ? 'cotacao_intradiaria' : 'cotacao_fechamento', { skipCloudSync: true });
      }
      if (typeof MatrixApp !== 'undefined' && MatrixApp.renderInvestments) {
        MatrixApp.renderInvestments();
      }
      const quando = modo === 'atual' ? 'agora' : 'fechamento';
      const okCount = res.data.filter(q => q && q.ok).length;
      const total = tickers.length;
      if (okCount === 0) {
        const msg = 'Nenhuma cotação foi atualizada (0/' + total + ').';
        atualizarStatus(msg, 'erro');
        return { ok: false, error: msg, data: res.data };
      }
      atualizarStatus(`Cotações de ${quando} atualizadas (${okCount}/${total}).`, okCount === total ? 'ok' : 'loading');
      return res;
    } finally {
      emAndamento = false;
    }
  }

  async function autoSincronizarFechamentos() {
    if (emAndamento) return { ok: false, ignorado: true };
    if (Date.now() - ultimoAutoMs < AUTO_INTERVALO_MS) return { ok: false, ignorado: true };
    const state = (typeof MatrixDB !== 'undefined') ? MatrixDB.getState() : null;
    if (!state) return { ok: false };
    if (!precisaSincronizar(state.investimentos)) return { ok: false, ignorado: true };
    ultimoAutoMs = Date.now();
    const res = await sincronizar('fechamento');
    if (!res || !res.ok) {
      const fb = await buscarQuotesDoJson();
      if (fb) {
        const mudou = aplicarQuotes(state.investimentos, fb.data, 'fechamento');
        if (mudou) MatrixDB.saveState(state, 'cotacao_fallback_github', { skipCloudSync: true });
        if (typeof MatrixApp !== 'undefined' && MatrixApp.renderInvestments) MatrixApp.renderInvestments();
        return { ok: true, data: fb.data, fonte: 'github' };
      }
    }
    return res;
  }

  function atualizarStatus(texto, tipo) {
    const el = document.getElementById('invQuoteStatus');
    if (!el) return;
    el.textContent = texto || '';
    el.style.color = tipo === 'erro' ? 'var(--rose)' : (tipo === 'ok' ? 'var(--matrix-green)' : 'var(--text-muted)');
  }

  function resumo(item) {
    if (!item) return null;
    const fech = item.cotacaoFechamento != null ? parseFloat(item.cotacaoFechamento) : null;
    const atual = item.cotacaoAtual != null ? parseFloat(item.cotacaoAtual) : null;
    return {
      fechamento: fech,
      fechamentoData: item.cotacaoFechamentoData || '',
      atual,
      atualEm: item.cotacaoAtualEm || '',
      modo: item.cotacaoModo || '',
      atualizadaEm: item.cotacaoAtualizadaEm || ''
    };
  }

  function ultimoErroMsg() { return ultimoErro; }

  return {
    tickerDe,
    tickersDaCarteira,
    buscarQuotes,
    sincronizar,
    autoSincronizarFechamentos,
    resumo,
    formatarDataCurta,
    formatarHoraCurta,
    ultimoErroMsg,
    atualizarStatus
  };
})();

if (typeof window !== 'undefined') {
  window.MarketQuotes = MarketQuotes;
}
