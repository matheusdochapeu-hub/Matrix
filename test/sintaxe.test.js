import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Sintaxe: todo arquivo de js/ compila sem SyntaxError', () => {
  const jsDir = path.join(rootDir, 'js');
  assert.ok(fs.existsSync(jsDir), 'A pasta js/ deve existir.');

  const arquivos = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
  assert.ok(arquivos.length >= 5, `Esperado ao menos 5 módulos em js/, encontrado ${arquivos.length}.`);

  for (const arquivo of arquivos) {
    const caminho = path.join(jsDir, arquivo);
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', caminho], { stdio: 'pipe' }),
      `O arquivo js/${arquivo} deve compilar sem erro de sintaxe.`
    );
  }
});

test('Sintaxe: sw.js e apps_script.gs não podem ter erro de sintaxe', () => {
  assert.doesNotThrow(
    () => execFileSync(process.execPath, ['--check', path.join(rootDir, 'sw.js')], { stdio: 'pipe' }),
    'sw.js deve compilar sem erro de sintaxe.'
  );

  // apps_script.gs tem extensão .gs, que o `node --check` recusa por não ser
  // um formato reconhecido. Compilamos o fonte em memória com vm.Script, que
  // valida a sintaxe sem executar nada.
  const gs = path.join(rootDir, 'apps_script.gs');
  if (fs.existsSync(gs)) {
    const fonte = fs.readFileSync(gs, 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(fonte, { filename: 'apps_script.gs' }),
      'apps_script.gs deve compilar sem erro de sintaxe.'
    );
  }
});
