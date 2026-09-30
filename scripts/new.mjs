#!/usr/bin/env node
// Cria a pasta de um filme novo com o esqueleto: film.html, engine.js, score.json, ROTEIRO.md, fonts/, assets/.
//   node new.mjs <pasta-do-filme>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dest = process.argv[2];
if (!dest) { console.log('uso: node new.mjs <pasta-do-filme>'); process.exit(1); }
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(dest);
if (fs.existsSync(path.join(out, 'film.html'))) { console.log('já existe um film.html em', out); process.exit(1); }
for (const d of ['', 'fonts', 'assets', 'out']) fs.mkdirSync(path.join(out, d), { recursive: true });
fs.copyFileSync(path.join(skill, 'templates/film.html'), path.join(out, 'film.html'));
fs.copyFileSync(path.join(skill, 'lib/engine.js'), path.join(out, 'engine.js'));
fs.copyFileSync(path.join(skill, 'templates/score.json'), path.join(out, 'score.json'));
fs.copyFileSync(path.join(skill, 'templates/ROTEIRO.md'), path.join(out, 'ROTEIRO.md'));
console.log('filme criado em', out);
