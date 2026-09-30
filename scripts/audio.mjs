#!/usr/bin/env node
// Monta a trilha a partir de um score.json e normaliza em -14 LUFS.
//   node audio.mjs <score.json> [--out pasta]
//
// score.json (caminhos relativos ao próprio score):
// {
//   "duration": 15,
//   "events": "out/events-9x16-A.json",          // ou lista [[t, "nome", ganho, pan?], ...]
//   "sounds": { "whoosh": "synth:whoosh?len=0.5", "click": "sfx/mixkit-1125.mp3" },
//   "music": { "file": "music/faixa.mp3", "drop_in_song": 31.97, "drop_in_film": 8.0, "gain": 0.8,
//              "fade_in": 0.3, "source": "Mixkit #207 'Nome'", "license": "Mixkit Free License (uso comercial)" },
//   "bed": "synth:pad?len=15",                     // fundo sintetizado opcional quando não há música
//   "room": 0.14, "fade_out": 0.9, "lufs": -14,
//   "duck": { "db": 5, "attack": 0.02, "release": 0.25 },   // abaixa a música sob os efeitos (opcional)
//   "credits": ["Efeitos: Mixkit #1125 (Mixkit Free License)"]
// }
// Nome de evento sem entrada em "sounds" usa o sintetizado de mesmo nome (click, pop, whoosh...).
import fs from 'node:fs';
import path from 'node:path';
import { SR, load, save, loudnorm, measure } from './lib/ff.mjs';
import { fromSpec, room, SOUNDS } from './lib/synth.mjs';

const [, , scoreArg, ...rest] = process.argv;
if (!scoreArg) { console.log('uso: node audio.mjs <score.json> [--out pasta]'); process.exit(1); }
const scorePath = path.resolve(scoreArg), base = path.dirname(scorePath);
const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));
const outIdx = rest.indexOf('--out');
const outDir = path.resolve(outIdx >= 0 ? rest[outIdx + 1] : path.join(base, 'out'));
fs.mkdirSync(outDir, { recursive: true });
const rel = p => path.resolve(base, p);

let events = score.events;
let duration = score.duration;
if (typeof events === 'string') { const j = JSON.parse(fs.readFileSync(rel(events), 'utf8')); events = j.events; duration ||= j.duration; }
if (!duration) throw new Error('defina "duration" no score');
const N = Math.round(duration * SR);
const mk = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const music = mk(), fx = mk();
const credits = [...(score.credits || [])];

// Música: começa em drop_in_song - drop_in_film pra o drop cair no momento visual-chave.
if (score.music) {
  const m = score.music, src = load(rel(m.file));
  const g = m.gain ?? 0.8, fi = Math.round((m.fade_in ?? 0.25) * SR);
  // "segments": [[inicio, fim], ...] em segundos da faixa, emendados em sequência a partir do segundo 0 do filme
  // (cortar sempre no início de compasso). Sem segments: um trecho só, a partir de drop_in_song - drop_in_film.
  const start = m.start ?? ((m.drop_in_song ?? 0) - (m.drop_in_film ?? 0));
  const segs = m.segments || [[start, start + duration + 1]];
  const xf = Math.round(0.012 * SR);
  let pos = 0;
  segs.forEach(([a, b], si) => {
    const s0 = Math.round(a * SR), len = Math.round((b - a) * SR);
    for (let k = 0; k < len + (si < segs.length - 1 ? xf : 0) && pos + k < N; k++) {
      const j = s0 + k; if (j < 0 || j >= src.L.length) continue;
      let e = 1;
      if (si > 0 && k < xf) e = k / xf;                        // entra
      if (si < segs.length - 1 && k >= len) e = 1 - (k - len) / xf;   // sai (sobreposto ao próximo)
      music.L[pos + k] += src.L[j] * g * e; music.R[pos + k] += src.R[j] * g * e;
    }
    pos += len;
  });
  for (let i = 0; i < Math.min(fi, N); i++) { music.L[i] *= i / fi; music.R[i] *= i / fi; }
  const last = segs[segs.length - 1];
  if (Math.round(last[0] * SR) + (N - (pos - Math.round((last[1] - last[0]) * SR))) > src.L.length) console.log('aviso: a música pode acabar antes do filme');
  credits.unshift(`Música: ${m.source || m.file}${m.license ? ` (${m.license})` : ''}`);
}
if (score.bed) { const b = fromSpec(score.bed); for (let i = 0; i < Math.min(N, b.L.length); i++) { music.L[i] += b.L[i]; music.R[i] += b.R[i]; } }

// Efeitos: cada som alinhado pelo PICO no instante do evento, não pelo início do arquivo.
const cache = new Map();
function sound(name) {
  if (cache.has(name)) return cache.get(name);
  const spec = (score.sounds || {})[name] ?? (SOUNDS[name] ? `synth:${name}` : null);
  if (!spec) throw new Error(`evento "${name}" sem som: adicione em "sounds" ou use um sintetizado (${Object.keys(SOUNDS).join(', ')})`);
  const s = spec.startsWith('synth:') ? fromSpec(spec) : load(rel(spec));
  let pk = 0, at = 0;
  for (let i = 0; i < s.L.length; i++) { const v = Math.abs(s.L[i]) + Math.abs(s.R[i]); if (v > pk) { pk = v; at = i; } }
  const norm = 2 / (pk || 1);
  const r = { L: s.L.map(v => v * norm), R: s.R.map(v => v * norm), peak: at };
  cache.set(name, r);
  return r;
}
const hits = [];
for (const [t, name, gain = 0.2, pan = 0] of events) {
  const s = sound(name), i0 = Math.round(t * SR) - s.peak;
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let k = 0; k < s.L.length; k++) { const i = i0 + k; if (i < 0 || i >= N) continue; fx.L[i] += s.L[k] * gl; fx.R[i] += s.R[k] * gr; }
  hits.push(t);
}
room(fx, score.room ?? 0.14);

// Ducking opcional: a música abaixa um pouco em cada efeito.
if (score.duck && score.music) {
  const d = score.duck, depth = 1 - Math.pow(10, -(d.db ?? 5) / 20), att = d.attack ?? 0.02, rel_ = d.release ?? 0.25;
  const env = new Float32Array(N);
  for (const t of hits) { const a = Math.round((t - att) * SR), b = Math.round((t + rel_) * SR); for (let i = Math.max(0, a); i < Math.min(N, b); i++) { const u = i < t * SR ? (i - a) / (att * SR) : 1 - (i - t * SR) / (rel_ * SR); env[i] = Math.max(env[i], Math.max(0, Math.min(1, u))); } }
  for (let i = 0; i < N; i++) { const g = 1 - depth * env[i]; music.L[i] *= g; music.R[i] *= g; }
}

const mix = mk();
const fo = Math.round((score.fade_out ?? 0.9) * SR);
for (let i = 0; i < N; i++) {
  const e = i > N - fo ? Math.pow((N - i) / fo, 1.3) : 1;
  mix.L[i] = (music.L[i] + fx.L[i]) * e; mix.R[i] = (music.R[i] + fx.R[i]) * e;
}
const raw = path.join(outDir, 'audio-raw.wav'), out = path.join(outDir, 'audio.wav');
save(mix, raw);
loudnorm(raw, out, score.lufs ?? -14);
fs.rmSync(raw);
const m = measure(out);
fs.writeFileSync(path.join(outDir, 'CREDITOS.txt'), (credits.length ? credits : ['Trilha 100% sintetizada em código (sem direitos de terceiros).']).join('\n') + '\n');
console.log(`trilha -> ${out}  (${events.length} eventos, ${m.lufs.toFixed(1)} LUFS, pico ${m.tp.toFixed(1)} dBTP)`);
