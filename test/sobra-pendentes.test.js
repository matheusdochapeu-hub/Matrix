import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Sobra pra Mim: considera despesas e receitas pendentes cadastradas no app', () => {
  const seedCode = fs.readFileSync(path.join(rootDir, 'js', 'seed-data.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');

  // Verifica que o motor e a UI usam sobraPrevista e totalGastos completo
  assert.ok(appCode.includes('sobraMatheus = calcM.sobraPrevista;'), 'Sobra do Matheus deve usar sobraPrevista considerando pendentes.');
  assert.ok(appCode.includes('gastosTotaisMatheus = calcM.totalGastos;'), 'Gastos do Matheus no Card 3 devem contemplar totalGastos (pagos + pendentes).');
  assert.ok(appCode.includes('calcHorizonM.sobraPrevista;'), 'Horizonte mensal deve projetar a sobra com pendentes.');
  assert.ok(appCode.includes('scarletGastosPropriosTotal;'), 'Sobra Scarlet deve contemplar gastos próprios pendentes da Scarlet.');
});
