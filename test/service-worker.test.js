import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(rootDir, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const cacheMatch = sw.match(/const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
const listaMatch = sw.match(/const\s+ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\];/);

const cacheName = cacheMatch ? cacheMatch[1] : null;
const assets = listaMatch
  ? Array.from(listaMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1])
  : [];

test('Service Worker: declara CACHE_NAME no padrão versionado', () => {
  assert.ok(cacheName, 'sw.js deve declarar `const CACHE_NAME`.');
  assert.match(
    cacheName,
    /^matrix-finance-v\d+$/,
    `CACHE_NAME deve seguir o padrão matrix-finance-vN (encontrado: ${cacheName}).`
  );
});

test('Service Worker: toda entrada de ASSETS_TO_CACHE existe no repositório', () => {
  assert.ok(assets.length >= 10, `Esperado ao menos 10 assets precacheados, encontrado ${assets.length}.`);

  const ausentes = assets.filter((asset) => {
    if (asset === './' || asset === '.') return false;
    return !fs.existsSync(path.join(rootDir, asset.replace(/^\.\//, '')));
  });

  assert.equal(ausentes.length, 0, `Assets precacheados que não existem: ${ausentes.join(', ')}`);
});

test('Service Worker: não há entradas duplicadas na lista de cache', () => {
  const duplicadas = assets.filter((a, i) => assets.indexOf(a) !== i);
  assert.equal(duplicadas.length, 0, `Assets duplicados no precache: ${[...new Set(duplicadas)].join(', ')}`);
});

test('Service Worker: todo script carregado pelo index.html também é precacheado', () => {
  const scriptsDoHtml = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi))
    .map((m) => m[1].replace(/\?.*$/, ''))
    .filter((src) => !/^https?:/i.test(src));

  const normalizados = assets.map((a) => a.replace(/^\.\//, ''));
  const naoCacheaados = scriptsDoHtml.filter((src) => !normalizados.includes(src));

  assert.equal(
    naoCacheaados.length,
    0,
    `Estes scripts não estão no precache e faltariam no modo offline: ${naoCacheaados.join(', ')}`
  );
});

test('Service Worker: CSS do app está precacheado', () => {
  const normalizados = assets.map((a) => a.replace(/^\.\//, ''));
  const cssDoHtml = Array.from(html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)).map((m) =>
    m[1].replace(/\?.*$/, '')
  );

  const ausentes = cssDoHtml.filter((href) => !/^https?:/i.test(href) && !normalizados.includes(href));
  assert.equal(ausentes.length, 0, `CSS não precacheados: ${ausentes.join(', ')}`);
});

test('Service Worker: install faz skipWaiting e activate limpa caches antigos', () => {
  assert.match(sw, /skipWaiting\(\)/, 'O install deve chamar skipWaiting() para ativar a nova versão.');
  assert.match(sw, /caches\.keys\(\)/, 'O activate deve varrer caches antigos.');
  assert.match(sw, /caches\.delete\(/, 'O activate deve apagar caches de versões antigas.');
});
