#!/usr/bin/env node
// Analisa uma música: BPM estimado, perfil de energia por segundo e o drop medido pela energia do grave.
//   node analyze-song.mjs <musica.mp3> [--near 31.9] [--bpm 120]
// Nunca confiar em grade de batida automática: o drop é o salto de energia do grave, refinado em janelas de 20 ms.
import { loadMono } from './lib/ff.mjs';

const [, , file, ...rest] = process.argv;
if (!file) { console.log('uso: node analyze-song.mjs <musica> [--near seg] [--bpm n]'); process.exit(1); }
const arg = k => { const i = rest.indexOf('--' + k); return i >= 0 ? Number(rest[i + 1]) : undefined; };
const SR = 22050, x = loadMono(file, SR), dur = x.length / SR;

// Passa-baixas (~200 Hz) por média móvel dupla.
const lp = (() => { const w = 55, a = new Float32Array(x.length), b = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { s += x[i] - (i >= w ? x[i - w] : 0); a[i] = s / w; } s = 0; for (let i = 0; i < a.length; i++) { s += a[i] - (i >= w ? a[i - w] : 0); b[i] = s / w; } return b; })();
const db = (arr, a, b) => { let s = 0; a = Math.max(0, a); b = Math.min(arr.length, b); for (let i = a; i < b; i++) s += arr[i] * arr[i]; return 10 * Math.log10(s / Math.max(1, b - a) + 1e-12); };

// BPM: autocorrelação do envelope de ataques.
const hop = 256, fr = Math.floor(x.length / hop), env = new Float32Array(fr);
for (let i = 0; i < fr; i++) { let s = 0; for (let k = i * hop; k < (i + 1) * hop; k++) s += x[k] * x[k]; env[i] = Math.sqrt(s / hop); }
const on = new Float32Array(fr); let mean = 0;
for (let i = 1; i < fr; i++) { on[i] = Math.max(0, Math.log(env[i] + 1e-6) - Math.log(env[i - 1] + 1e-6)); mean += on[i]; }
mean /= fr; for (let i = 0; i < fr; i++) on[i] -= mean;
const fps = SR / hop, M = Math.min(fr, 6000);
// Peso pra andamentos perto de 115 BPM: a autocorrelação empata entre o tempo real, a metade e 2/3 dele.
let best = { bpm: 0, v: -Infinity };
const cands = [];
for (let lag = Math.ceil(0.25 * fps); lag <= Math.floor(1.3 * fps); lag++) {
  let s = 0; for (let i = 0; i + lag < M; i++) s += on[i] * on[i + lag];
  const bpm = 60 * fps / lag, w = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.6) ** 2);
  cands.push({ bpm, s });
  if (s * w > best.v) best = { bpm, v: s * w };
}
const alts = cands.sort((a, b) => b.s - a.s).slice(0, 4).map(c => c.bpm.toFixed(1)).join(', ');
const bpm = arg('bpm') ?? best.bpm;
console.log(`\n${file.split('/').pop()}  duração ${dur.toFixed(1)}s  BPM ~${best.bpm.toFixed(1)}${arg('bpm') ? ` (usando ${bpm})` : ''}  beat ${(60 / bpm).toFixed(3)}s`);
console.log(`  outros picos: ${alts} (conferir: ataques fortes depois do drop devem cair a cada 4 beats)`);

console.log('\nenergia por segundo (total / grave, dB):');
const row = [];
for (let s = 0; s < Math.floor(dur); s++) row.push(`${String(s).padStart(3)}:${db(x, s * SR, (s + 1) * SR).toFixed(1).padStart(6)}/${db(lp, s * SR, (s + 1) * SR).toFixed(1).padStart(6)}`);
for (let i = 0; i < row.length; i += 6) console.log('  ' + row.slice(i, i + 6).join('  '));

// Drop grosso: maior salto de energia do grave entre compassos (4 beats) consecutivos.
function refine(center, span = 0.5) {
  const w = Math.round(0.02 * SR); let bestJ = { t: center, d: -Infinity }; let prev = null;
  for (let t = center - span; t <= center + span; t += 0.02) {
    const v = db(lp, Math.round(t * SR), Math.round(t * SR) + w);
    if (prev !== null && v - prev > bestJ.d) bestJ = { t, d: v - prev };
    prev = v;
  }
  return bestJ;
}
if (arg('near') !== undefined) {
  const r = refine(arg('near'), 1.0);
  console.log(`\ndrop perto de ${arg('near')}s: ${r.t.toFixed(3)}s (salto de ${r.d.toFixed(1)} dB no grave)`);
} else {
  const bar = 4 * 60 / bpm, jumps = [];
  for (let t = bar; t < dur - bar; t += bar / 2) jumps.push({ t, d: db(lp, Math.round(t * SR), Math.round((t + bar) * SR)) - db(lp, Math.round((t - bar) * SR), Math.round(t * SR)) });
  jumps.sort((a, b) => b.d - a.d);
  console.log('\ncandidatos a drop (maior salto de grave entre compassos), refinados em 20 ms:');
  for (const j of jumps.slice(0, 4)) { const r = refine(j.t); console.log(`  ~${j.t.toFixed(2)}s (+${j.d.toFixed(1)} dB)  ->  ${r.t.toFixed(3)}s`); }
}
console.log('\nPra o drop cair no instante D do filme: "music": { "drop_in_song": <drop>, "drop_in_film": D } no score.json.');
