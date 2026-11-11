#!/usr/bin/env node
/**
 * MATRIX FINANCE - GERA data/quotes.json
 *
 * Roda no GitHub Actions (servidor), então não sofre com CORS.
 * 1. Lê os tickers da carteira no backup da planilha (action=get_state).
 * 2. Busca fechamento do dia anterior + preço atual no Yahoo Finance.
 * 3. Escreve data/quotes.json, servido pelo GitHub Pages junto com o app.
 *
 * Uso local: node scripts/fetch-quotes.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const BACKUP_URL = 'https://script.google.com/macros/s/AKfycbyTXjWm4651tmwl4AujcG299cHBYGmECtLKoTruRaI7y9kzNOKr58QeKp0O46Erxb7DFQ/exec';
const TOKEN = process.env.MATRIX_TOKEN || 'MatrixReloaded2026!';
const FALLBACK_TICKERS = ['CSNA3', 'MGLU3'];
const OUT = path.join(process.cwd(), 'data', 'quotes.json');

const log = (...a) => console.log('[quotes]', ...a);

function tickerDe(item) {
  if (!item) return null;
  if (item.ticker) {
    const t = String(item.ticker).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (t) return t;
  }
  const m = String(item.ativo || '').toUpperCase().match(/\b([A-Z]{4}\d{1,2})\b/);
  return m ? m[1] : null;
}

async function tickersDaCarteira() {
  try {
    const url = `${BACKUP_URL}?action=get_state&token=${encodeURIComponent(TOKEN)}&_t=${Date.now()}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'matrix-quotes-bot' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const inv = json && json.data && Array.isArray(json.data.investimentos) ? json.data.investimentos : [];
    const set = new Set();
    inv.forEach((it) => {
      const t = tickerDe(it);
      if (t) set.add(t);
    });
    if (set.size) return Array.from(set).slice(0, 12);
    log('carteira sem tickers; usando fallback');
  } catch (e) {
    log('não consegui ler a carteira:', e.message);
  }
  return FALLBACK_TICKERS;
}

async function cotacao(ticker) {
  const symbol = `${ticker}.SA`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d&includePrePost=false`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error('sem resultado');

  const meta = result.meta || {};
  const ts = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

  let fechamento = null;
  let fechamentoData = null;
  for (let i = ts.length - 1; i >= 0; i--) {
    if (closes[i] == null) continue;
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(ts[i] * 1000));
    if (dia < hoje) {
      fechamento = closes[i];
      fechamentoData = dia;
      break;
    }
  }
  if (fechamento == null) fechamento = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const atual = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : (closes.length ? closes[closes.length - 1] : fechamento);

  const r2 = (v) => (v == null || !isFinite(v)) ? null : Math.round(Number(v) * 100) / 100;
  return {
    ticker,
    ok: true,
    moeda: meta.currency || 'BRL',
    fechamento: r2(fechamento),
    fechamentoData,
    atual: r2(atual),
    atualEm: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    fonte: 'Yahoo Finance (GitHub Actions)'
  };
}

async function main() {
  const tickers = await tickersDaCarteira();
  log('tickers:', tickers.join(', '));
  const quotes = [];
  for (const t of tickers) {
    try {
      quotes.push(await cotacao(t));
      log('ok', t);
    } catch (e) {
      quotes.push({ ticker: t, ok: false, error: e.message });
      log('falhou', t, e.message);
    }
  }

  const payload = { geradoEm: new Date().toISOString(), quotes };
  mkdirSync(path.dirname(OUT), { recursive: true });

  // só regrava se algo mudou, para não gerar commit à toa
  if (existsSync(OUT)) {
    try {
      const atual = JSON.parse(readFileSync(OUT, 'utf8'));
      const igual = JSON.stringify(atual.quotes) === JSON.stringify(quotes);
      if (igual) {
        log('sem mudança nas cotações; nada a gravar');
        return;
      }
    } catch (e) {}
  }

  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  log('gravado', OUT);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('[quotes] erro fatal:', e);
  process.exit(1);
});
