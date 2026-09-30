#!/usr/bin/env node
// Conferência do vídeo renderizado.
//   node check.mjs video  <video.mp4>                 relatório: pulos, cortes, pausas, ritmo, loudness
//   node check.mjs sheets <video.mp4> [--at 3.2,8.1]  folhas: visão geral (2 q/s), celular (360 px), tiras de 12 quadros
import fs from 'node:fs';
import path from 'node:path';
import { ff, measure, probeDuration } from './lib/ff.mjs';

const [, , cmd, file, ...rest] = process.argv;
if (!cmd || !file) { console.log('uso: node check.mjs video|sheets <video.mp4> [--at t1,t2]'); process.exit(1); }
const arg = k => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : undefined; };
const video = path.resolve(file);
const dir = path.join(path.dirname(video), path.basename(video, '.mp4') + '-check');
fs.mkdirSync(dir, { recursive: true });

function info() {
  const s = ff(['-i', video, '-f', 'null', '-t', '0.01', '-']).stderr.toString();
  const m = s.match(/Video:.*?, (\d{2,5})x(\d{2,5})[ ,\[].*?([\d.]+) fps/);
  return { w: Number(m[1]), h: Number(m[2]), fps: Number(m[3]), dur: probeDuration(video), audio: /Audio:/.test(s) };
}

if (cmd === 'sheets') {
  const { w, h, dur, fps } = info();
  const portrait = h > w;
  const cols = portrait ? 8 : 5, n = Math.ceil(dur * 2), rows = Math.ceil(n / cols);
  ff(['-v', 'error', '-y', '-i', video, '-vf', `fps=2,scale=${portrait ? 220 : 300}:-1,tile=${cols}x${rows}:padding=4:color=0x808080`, '-frames:v', '1', path.join(dir, 'visao-geral.png')]);
  const pc = portrait ? 6 : 4, pn = Math.ceil(dur), pr = Math.ceil(pn / pc);
  ff(['-v', 'error', '-y', '-i', video, '-vf', `fps=1,scale=360:-1,tile=${pc}x${pr}:padding=6:color=0x808080`, '-frames:v', '1', path.join(dir, 'celular.png')]);
  for (const t of (arg('at') || '').split(',').filter(Boolean).map(Number)) {
    const t0 = Math.max(0, t - 6 / fps);
    ff(['-v', 'error', '-y', '-ss', String(t0), '-i', video, '-vf', `scale=${portrait ? 200 : 320}:-1,tile=12x1:padding=4:color=0x808080`, '-frames:v', '1', path.join(dir, `tira-${t.toFixed(2)}.png`)]);
  }
  console.log('folhas ->', dir);
  process.exit(0);
}

if (cmd !== 'video') { console.error('comando desconhecido:', cmd); process.exit(1); }
const { w, h, fps, dur, audio } = info();
const S = 120;
const raw = ff(['-v', 'quiet', '-i', video, '-vf', `scale=${S}:${S},format=gray`, '-f', 'rawvideo', '-']).stdout;
const n = Math.floor(raw.length / (S * S));
const d = new Float32Array(n - 1);
for (let f = 1; f < n; f++) { let s = 0; const a = (f - 1) * S * S, b = f * S * S; for (let k = 0; k < S * S; k++) s += Math.abs(raw[b + k] - raw[a + k]); d[f - 1] = s / (S * S); }

// Cortes secos: diferença enorme de um quadro pro outro. Pulos: pico isolado 3x maior que os vizinhos.
const cuts = [], pops = [];
for (let i = 0; i < d.length; i++) {
  const nb = Math.max(i > 0 ? d[i - 1] : 0, i < d.length - 1 ? d[i + 1] : 0, 0.3);
  if (d[i] > 28) cuts.push(+((i + 1) / fps).toFixed(3));
  else if (d[i] > 3 * nb && d[i] > 2) pops.push({ t: +((i + 1) / fps).toFixed(3), diff: +d[i].toFixed(1) });
}
// Pausas: trechos com quase nada mudando.
const still = [...d].map(v => v < 0.12);
const stillPct = 100 * still.filter(Boolean).length / d.length;
const holds = []; let run = 0;
for (let i = 0; i <= still.length; i++) { if (i < still.length && still[i]) run++; else { if (run / fps >= 1.2) holds.push({ from: +((i - run) / fps).toFixed(2), len: +(run / fps).toFixed(2) }); run = 0; } }
// Ritmo: energia de movimento por meio segundo. Cadência uniforme = cara de slide.
const win = Math.round(fps / 2), energy = [];
for (let i = 0; i < d.length; i += win) { let s = 0; for (let k = i; k < Math.min(d.length, i + win); k++) s += d[k]; energy.push(s / win); }
const em = energy.reduce((a, b) => a + b, 0) / energy.length;
const cv = Math.sqrt(energy.reduce((a, b) => a + (b - em) ** 2, 0) / energy.length) / (em || 1);
const bars = energy.map(e => ' ▁▂▃▄▅▆▇█'[Math.min(8, Math.round(e / (Math.max(...energy) || 1) * 8))]).join('');

const warn = [];
if (pops.length) warn.push(`${pops.length} pulo(s) de quadro: conferir se são intencionais`);
if (holds.some(h => h.len > 2.5)) warn.push('trecho parado > 2,5 s: risco de perder o espectador (ok só se for a pausa planejada)');
if (stillPct < 5 && dur > 8) warn.push('quase nenhum respiro: sem pausa, os momentos fortes não se destacam');
if (cv < 0.45) warn.push(`movimento muito uniforme (variação ${cv.toFixed(2)}): tende a parecer slide, variar a duração dos planos`);
const first2 = energy.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
if (first2 < em * 0.5) warn.push('primeiros 2 s com pouco movimento: gancho fraco');
let loud = null;
if (audio) { loud = measure(video); if (Math.abs(loud.lufs + 14) > 1) warn.push(`loudness ${loud.lufs.toFixed(1)} LUFS (alvo -14)`); if (loud.tp > -1) warn.push(`true peak ${loud.tp.toFixed(1)} dBTP (alvo <= -1)`); }
else warn.push('vídeo sem áudio');

const report = { arquivo: video, formato: `${w}x${h}`, fps, duracao: +dur.toFixed(2), cortes: cuts, pulos: pops, pausas: holds, parado_pct: +stillPct.toFixed(1), variacao_ritmo: +cv.toFixed(2), loudness: loud, avisos: warn };
fs.writeFileSync(path.join(dir, 'relatorio.json'), JSON.stringify(report, null, 1));
console.log(`\n${path.basename(video)}  ${w}x${h}  ${fps} fps  ${dur.toFixed(2)} s${loud ? `  ${loud.lufs.toFixed(1)} LUFS / ${loud.tp.toFixed(1)} dBTP` : ''}`);
console.log(`movimento (0,5 s por barra): ${bars}`);
console.log(`cortes secos: ${cuts.length ? cuts.join(', ') : 'nenhum'}`);
console.log(`pulos: ${pops.length ? pops.map(p => p.t).join(', ') : 'nenhum'}`);
console.log(`pausas >= 1,2 s: ${holds.length ? holds.map(h => `${h.from}s (${h.len}s)`).join(', ') : 'nenhuma'}  | parado ${stillPct.toFixed(0)}% | variação de ritmo ${cv.toFixed(2)}`);
console.log(warn.length ? '\nAVISOS:\n- ' + warn.join('\n- ') : '\nsem avisos');
console.log(`\nrelatório -> ${path.join(dir, 'relatorio.json')}`);
