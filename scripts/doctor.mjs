#!/usr/bin/env node
// Confere se a skill está pronta: Node, ffmpeg e Chromium do Playwright.
import { spawnSync } from 'node:child_process';

let ok = true;
const major = Number(process.versions.node.split('.')[0]);
console.log(`node ${process.versions.node} ${major >= 18 ? 'ok' : 'PRECISA 18+'}`);
if (major < 18) ok = false;
try {
  const { default: ff } = await import('ffmpeg-static');
  const r = spawnSync(ff, ['-version']);
  console.log(r.status === 0 ? `ffmpeg ok (${r.stdout.toString().split('\n')[0].split(' ').slice(0, 3).join(' ')})` : 'ffmpeg FALHOU');
  if (r.status !== 0) ok = false;
} catch { console.log('ffmpeg-static ausente: rode bash setup.sh'); ok = false; }
try {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(); await b.close();
  console.log('chromium ok');
} catch (e) { console.log('chromium FALHOU:', e.message.split('\n')[0], '-> npx playwright install chromium'); ok = false; }
console.log(ok ? 'convertia-motion pronto.' : 'faltam dependências.');
process.exit(ok ? 0 : 1);
