/**
 * MATRIX FINANCE - DAILY AUTOMATED SCRAPING SCRIPT (CLI / TASK SCHEDULER)
 * Executado diariamente ou sob demanda via Node.js para buscar dados dos 3 apps.
 * Uso: node scripts/daily-scrape.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'satellite-config.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'satellites-latest.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {}
  }
  return {
    fisioflow: { url: '', token: '' },
    faturas: { url: '', token: '' },
    maracaju88: { url: '', token: '' }
  };
}

async function scrapeApp(name, url, token, action) {
  if (!url) {
    console.log(`[PULADO] ${name}: URL não configurada.`);
    return null;
  }
  try {
    const sep = url.includes('?') ? '&' : '?';
    let target = `${url}${sep}token=${encodeURIComponent(token || '')}`;
    if (action) target += `&action=${action}`;

    console.log(`[SCRAPING] Buscando dados de ${name}...`);
    const res = await fetch(target);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    console.log(`[SUCESSO] ${name}: dados obtidos com êxito.`);
    return json.data || json;
  } catch (err) {
    console.error(`[FALHA] ${name}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== MATRIX FINANCE: SCRAPING DIÁRIO AUTOMÁTICO ===');
  console.log('Timestamp:', new Date().toISOString());

  const cfg = loadConfig();
  const results = {
    scrapedAt: new Date().toISOString(),
    fisioflow: await scrapeApp('FisioFlow', cfg.fisioflow.url, cfg.fisioflow.token),
    faturas: await scrapeApp('Faturas', cfg.faturas.url, cfg.faturas.token, 'restore'),
    maracaju88: await scrapeApp('Maracaju88', cfg.maracaju88.url, cfg.maracaju88.token, 'restore')
  };

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Dados consolidados salvos em: ${OUTPUT_PATH}`);
  console.log('=== SCRAPING CONCLUÍDO ===');
}

main().catch(err => {
  console.error('Erro geral no scraping:', err);
  process.exit(1);
});
