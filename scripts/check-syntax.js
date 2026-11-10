#!/usr/bin/env node
/**
 * Verificador de sintaxe do Matrix Finance 360.
 *
 * Todo o front-end é feito de scripts clássicos (sem ES modules), carregados
 * por <script src>. Um erro de sintaxe em qualquer arquivo derruba a aba
 * inteira, então cada `push` valida todos eles com `node --check`.
 *
 * Uso:  node scripts/check-syntax.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(rootDir, 'js');

const alvos = [];

if (fs.existsSync(jsDir)) {
  for (const arquivo of fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
    alvos.push(path.join(jsDir, arquivo));
  }
}

for (const extra of ['sw.js']) {
  const caminho = path.join(rootDir, extra);
  if (fs.existsSync(caminho)) alvos.push(caminho);
}

let falhas = 0;

for (const arquivo of alvos) {
  const relativo = path.relative(rootDir, arquivo);
  try {
    execFileSync(process.execPath, ['--check', arquivo], { stdio: 'pipe' });
    console.log(`  [OK]    ${relativo}`);
  } catch (erro) {
    falhas++;
    console.error(`  [ERRO]  ${relativo}`);
    const saida = (erro.stderr || erro.stdout || '').toString().trim();
    if (saida) console.error(saida.split('\n').map((l) => `          ${l}`).join('\n'));
  }
}

if (alvos.length === 0) {
  console.error('Nenhum arquivo JavaScript encontrado para validar.');
  process.exit(1);
}

console.log(`\n${alvos.length - falhas}/${alvos.length} arquivos sem erro de sintaxe.`);
process.exit(falhas === 0 ? 0 : 1);
