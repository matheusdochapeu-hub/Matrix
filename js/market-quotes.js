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
  // v154: quando o usuário pede "Cotação atual", o auto-sync (fechamento) não pode sobrescrever
  // o preço do momento nos 10 minutos seguintes.
  let ultimoManualAtualMs = 0;

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

  // v153: cotação AO VIVO, no momento do clique. O Yahoo não libera CORS; o r.jina.ai
  // faz a ponte e devolve o JSON do endpoint `spark` (vários tickers numa única chamada).
  let cacheVivo = { ts: 0, data: null, tickers: '' };

  function diaAnteriorUtilISO() {
    const d = new Date();
    for (let i = 1; i <= 10; i++) {
      const c = new Date(d.getTime() - i * 86400000);
      const dow = c.getDay();
      if (dow === 0 || dow === 6) continue;
      return c.toISOString().slice(0, 10);
    }
    return new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
  }

  const r2 = (v) => (v == null || !isFinite(v)) ? null : Math.round(Number(v) * 100) / 100;

  async function buscarQuotesAoVivo(tickers) {
    if (!tickers || !tickers.length) return null;
    const chave = tickers.join(',');
    if (cacheVivo.data && cacheVivo.tickers === chave && (Date.now() - cacheVivo.ts) < 60000) {
      return { ok: true, data: cacheVivo.data, aoVivo: true, cache: true };
    }

    const symbols = tickers.map(t => `${t}.SA`).join(',');
    const alvo = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=1m`;
    let json = null;
    try {
      const res = await fetch('https://r.jina.ai/' + alvo, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) json = await res.json();
    } catch (e) {
      json = null;
    }
    if (!json) return null;

    let interno = null;
    try {
      interno = typeof json.data?.content === 'string' ? JSON.parse(json.data.content) : json;
    } catch (e) {
      return null;
    }

    const linhas = (interno && interno.spark && interno.spark.result) || [];
    if (!linhas.length) return null;

    const fechData = diaAnteriorUtilISO();
    const agora = new Date().toISOString();
    const data = linhas.map(r => {
      const resp = (r.response && r.response[0]) || {};
      const meta = resp.meta || {};
      const ticker = String(r.symbol || '').replace(/\.SA$/i, '').toUpperCase();
      const atual = meta.regularMarketPrice;
      const fech = meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose;
      if (atual == null) return { ticker, ok: false, error: 'sem preço' };
      return {
        ticker,
        ok: true,
        moeda: meta.currency || 'BRL',
        fechamento: r2(fech),
        fechamentoData: fechData,
        atual: r2(atual),
        atualEm: agora,
        fonte: 'Yahoo Finance (ao vivo)'
      };
    }).filter(q => q && q.ok);

    if (!data.length) return null;
    cacheVivo = { ts: Date.now(), data, tickers: chave };
    registrarNoCache(data);
    return { ok: true, data, aoVivo: true };
  }

  // Plano B: JSON publicado pelo GitHub Actions.
  // Primário: branch `quotes` (atualizada a cada 10 min no pregão) via raw.githubusercontent.
  // Fallback: data/quotes.json na mesma origem (último retrato commitado no main).
  const RAW_QUOTES_URL = 'https://raw.githubusercontent.com/matheusdochapeu-hub/Matrix/quotes/data/quotes.json';

  async function buscarQuotesDoJson() {
    let rapido = null;
    try {
      const resp = await fetch(RAW_QUOTES_URL + '?_=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        const data = Array.isArray(json.quotes) ? json.quotes.filter(q => q && q.ok) : [];
        if (data.length) rapido = { data, geradoEm: json.geradoEm || '' };
      }
    } catch (e) {}

    let local = null;
    try {
      const resp = await fetch('data/quotes.json?_=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        const data = Array.isArray(json.quotes) ? json.quotes.filter(q => q && q.ok) : [];
        if (data.length) local = { data, geradoEm: json.geradoEm || '' };
      }
    } catch (e) {}

    const escolhido = (rapido && (!local || Date.parse(rapido.geradoEm || 0) >= Date.parse(local.geradoEm || 0)))
      ? rapido
      : local;
    if (!escolhido) return null;
    registrarNoCache(escolhido.data);
    return { ok: true, data: escolhido.data, geradoEm: escolhido.geradoEm };
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
    if (modo === 'atual') ultimoManualAtualMs = Date.now();
    atualizarStatus('Consultando cotações…', 'loading');
    try {
      const aplicar = (quotes, motivo) => {
        const mudou = aplicarQuotes(state.investimentos, quotes, modo);
        if (mudou) MatrixDB.saveState(state, motivo, { skipCloudSync: true });
        if (typeof MatrixApp !== 'undefined' && MatrixApp.renderInvestments) MatrixApp.renderInvestments();
        return mudou;
      };

      // 1) AO VIVO (Yahoo via r.jina.ai) — é o "momento" que o botão promete
      const vivo = await buscarQuotesAoVivo(tickers);
      if (vivo && vivo.ok) {
        aplicar(vivo.data, modo === 'atual' ? 'cotacao_ao_vivo' : 'fechamento_ao_vivo');
        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        atualizarStatus(`Cotações ao vivo • ${hora} — ${vivo.data.length}/${tickers.length}.`, 'ok');
        return { ok: true, data: vivo.data, fonte: 'ao-vivo' };
      }

      // 2) JSON do GitHub (fechamento do dia / última atualização do robô)
      const jsonRapido = await buscarQuotesDoJson();
      if (jsonRapido) {
        aplicar(jsonRapido.data, 'cotacao_json_github');
        let idadeTxt = '';
        if (jsonRapido.geradoEm) {
          const ms = Date.now() - Date.parse(jsonRapido.geradoEm);
          if (isFinite(ms) && ms >= 0) {
            const min = Math.round(ms / 60000);
            idadeTxt = min < 1 ? ' (agora)' : ` (há ${min} min)`;
          }
        }
        atualizarStatus(`Cotações via GitHub${idadeTxt} — ${jsonRapido.data.length}/${tickers.length}.`, 'ok');
        return { ok: true, data: jsonRapido.data, fonte: 'github' };
      }

      // 3) Apps Script (só funciona se a permissão UrlFetchApp for aceita)
      const res = await buscarQuotes(tickers);
      if (res && res.ok && res.data) {
        aplicar(res.data, modo === 'atual' ? 'cotacao_gas' : 'fechamento_gas');
        atualizarStatus(`Cotações atualizadas (${res.data.filter(q => q && q.ok).length}/${tickers.length}).`, 'ok');
        return res;
      }

      atualizarStatus((res && res.error) || 'Não foi possível obter as cotações.', 'erro');
      return res || { ok: false, error: 'Não foi possível obter as cotações.' };
    } finally {
      emAndamento = false;
    }
  }

  async function autoSincronizarFechamentos() {
    if (emAndamento) return { ok: false, ignorado: true };
    if (Date.now() - ultimoManualAtualMs < 10 * 60 * 1000) return { ok: false, ignorado: true };
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

  // Reaplica o que já está no cache local (sem rede). Usado depois de restaurar a nuvem,
  // que pode trazer precoAtual antigo por cima da cotação recém-buscada.
  function aplicarCacheNoEstado(modo = 'fechamento') {
    try {
      const cache = lerCache();
      const tickers = Object.keys(cache);
      if (!tickers.length) return false;
      const quotes = tickers.map(t => ({
        ticker: t,
        ok: true,
        fechamento: cache[t].fechamento,
        fechamentoData: cache[t].fechamentoData,
        atual: cache[t].atual,
        atualEm: cache[t].atualEm,
        moeda: cache[t].moeda,
        fonte: cache[t].fonte
      }));
      const state = MatrixDB.getState();
      const mudou = aplicarQuotes(state.investimentos, quotes, modo);
      if (mudou) MatrixDB.saveState(state, 'cotacao_cache_local', { skipCloudSync: true });
      return mudou;
    } catch (e) {
      return false;
    }
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
    buscarQuotesAoVivo,
    sincronizar,
    autoSincronizarFechamentos,
    resumo,
    aplicarCacheNoEstado,
    formatarDataCurta,
    formatarHoraCurta,
    ultimoErroMsg,
    atualizarStatus
  };
})();

if (typeof window !== 'undefined') {
  window.MarketQuotes = MarketQuotes;
}
