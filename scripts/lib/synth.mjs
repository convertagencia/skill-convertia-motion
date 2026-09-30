// Efeitos sonoros sintetizados em código. Cada função retorna { L, R } (Float32Array) a 48 kHz.
// Uso no score: "synth:whoosh?len=0.6&hi=7000". Todos passam pela mesma sala (room) no mixer.
import { SR } from './ff.mjs';

const TAU = Math.PI * 2;
const buf = sec => new Float32Array(Math.max(1, Math.round(sec * SR)));
function rng(seed = 7) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1; }; }
const stereo = (m, pan = 0) => { const L = new Float32Array(m.length), R = new Float32Array(m.length); const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4); for (let i = 0; i < m.length; i++) { L[i] = m[i] * gl * 1.414; R[i] = m[i] * gr * 1.414; } return { L, R }; };

// Seno com frequência variável e envelope.
function tone(len, freq, env) {
  const x = buf(len); let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; ph += TAU * freq(t) / SR; x[i] = Math.sin(ph) * env(t); }
  return x;
}
const ad = (a, decay) => t => Math.min(1, t / a) * Math.exp(-t * decay);

// Ruído filtrado por um state-variable filter com corte e ressonância variáveis. mode: 'lp' | 'bp' | 'hp'
function noise(len, cutoff, env, { q = 0.7, mode = 'bp', seed = 7 } = {}) {
  const x = buf(len), r = rng(seed); let lo = 0, bp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, u = t / len;
    const f = 2 * Math.sin(Math.PI * Math.min(0.45 * SR, cutoff(u)) / SR);
    const hp = r() - lo - q * bp; bp += f * hp; lo += f * bp;
    x[i] = (mode === 'lp' ? lo : mode === 'hp' ? hp : bp) * env(u);
  }
  return x;
}
const add = (a, b, g = 1) => { for (let i = 0; i < Math.min(a.length, b.length); i++) a[i] += b[i] * g; return a; };

export const SOUNDS = {
  click: ({ freq = 2400 } = {}) => stereo(add(tone(0.04, () => freq, ad(0.001, 120)), tone(0.04, () => freq * 0.52, ad(0.001, 90)), 0.6)),
  tick: ({ freq = 4200 } = {}) => stereo(tone(0.02, () => freq, ad(0.0005, 260))),
  key: ({ seed = 3 } = {}) => stereo(add(noise(0.035, () => 3800, u => Math.exp(-u * 9), { mode: 'hp', seed }), tone(0.03, () => 1700 + 200 * rng(seed)(), ad(0.001, 160)), 0.35)),
  pop: ({ from = 520, to = 1420 } = {}) => stereo(tone(0.1, t => from + (to - from) * Math.min(1, t / 0.05), ad(0.002, 38))),
  bubble: ({ from = 300, to = 900 } = {}) => stereo(tone(0.07, t => from + (to - from) * (t / 0.07), ad(0.003, 45))),
  whoosh: ({ len = 0.5, lo = 300, hi = 5500, seed = 11 } = {}) => {
    const m = noise(len, u => lo + (hi - lo) * Math.sin(Math.PI * u), u => Math.pow(Math.sin(Math.PI * u), 1.6), { q: 0.5, seed });
    const L = new Float32Array(m.length), R = new Float32Array(m.length);
    for (let i = 0; i < m.length; i++) { const p = i / m.length; L[i] = m[i] * Math.cos(p * Math.PI / 2) * 1.2; R[i] = m[i] * Math.sin(p * Math.PI / 2) * 1.2; }
    return { L, R };
  },
  riser: ({ len = 1, seed = 5 } = {}) => {
    const m = noise(len, u => 400 + 9000 * u * u, u => Math.pow(u, 2.2), { q: 0.4, seed });
    return stereo(add(m, tone(len, t => 180 + 900 * Math.pow(t / len, 2), t => 0.25 * Math.pow(t / len, 2)), 1));
  },
  impact: ({ seed = 9 } = {}) => stereo(add(tone(1.4, t => 38 + 50 * Math.exp(-t * 6), ad(0.002, 2.6)), noise(0.4, u => 6000 - 5000 * u, u => Math.pow(1 - u, 3), { mode: 'lp', seed }), 0.5)),
  thump: () => stereo(tone(0.32, t => 48 + 60 * Math.exp(-t * 28), ad(0.002, 11))),
  chime: ({ notes = '1318.5', decay = 2.6 } = {}) => {
    const fs = String(notes).split(',').map(Number), len = Math.min(3, 6 / decay);
    const m = buf(len);
    for (const f of fs) { add(m, tone(len, () => f, ad(0.004, decay)), 0.5); add(m, tone(len, () => f * 2.76, ad(0.004, decay * 2.2)), 0.12); }
    return stereo(m);
  },
  sparkle: ({ seed = 21 } = {}) => {
    const r = rng(seed), m = buf(0.8);
    for (let k = 0; k < 5; k++) { const f = 2600 + 2400 * Math.abs(r()), t0 = k * 0.05 + 0.02 * Math.abs(r()); const s = tone(0.5, () => f, ad(0.002, 9)); const o = Math.round(t0 * SR); for (let i = 0; i < s.length && o + i < m.length; i++) m[o + i] += s[i] * 0.3; }
    return stereo(m);
  },
  shutter: ({ seed = 13 } = {}) => stereo(add(noise(0.06, () => 2500, u => Math.exp(-u * 6), { q: 0.3, seed }), noise(0.05, () => 1800, u => Math.exp(-u * 8), { q: 0.3, seed: seed + 1 }), 0.8)),
  swell: ({ len = 2, notes = '220,329.63,440' } = {}) => {
    const fs = String(notes).split(','), m = buf(len);
    for (const f of fs) add(m, tone(len, () => Number(f), t => Math.pow(Math.sin(Math.PI * t / len), 2)), 0.25);
    return stereo(m);
  },
  // Fundo tonal pra quando não há música: acorde que respira. notes em Hz.
  pad: ({ len = 10, notes = '110,164.81,220,329.63', lfo = 0.23 } = {}) => {
    const fs = String(notes).split(',').map(Number), m = buf(len);
    for (let i = 0; i < m.length; i++) { const t = i / SR; const e = Math.min(1, t / 1.4) * Math.min(1, (len - t) / 1.2) * (0.85 + 0.15 * Math.sin(TAU * lfo * t)); let s = 0; for (let k = 0; k < fs.length; k++) s += Math.sin(TAU * fs[k] * t) * (0.05 / (1 + k * 0.4)); m[i] = s * e; }
    return stereo(m);
  },
};

// "synth:whoosh?len=0.6&hi=7000" -> { L, R }
export function fromSpec(spec) {
  const [name, qs = ''] = spec.replace(/^synth:/, '').split('?');
  if (!SOUNDS[name]) throw new Error(`som sintetizado desconhecido: ${name}. Disponíveis: ${Object.keys(SOUNDS).join(', ')}`);
  const p = Object.fromEntries(new URLSearchParams(qs));
  for (const k in p) if (!isNaN(Number(p[k])) && !String(p[k]).includes(',')) p[k] = Number(p[k]);
  return SOUNDS[name](p);
}

// Sala: reverb Schroeder curto (4 combs + 2 allpass), L e R com atrasos diferentes.
export function room(a, wet = 0.14) {
  const proc = (x, off) => {
    const n = x.length, out = new Float32Array(n);
    for (const [ms, g] of [[29.7, 0.74], [37.1, 0.72], [41.1, 0.7], [43.7, 0.68]]) {
      const d = Math.round((ms + off) * SR / 1000), y = new Float32Array(n);
      for (let i = 0; i < n; i++) y[i] = x[i] + (i >= d ? g * y[i - d] : 0);
      for (let i = 0; i < n; i++) out[i] += y[i] * 0.25;
    }
    for (const ms of [5.0, 1.7]) {
      const d = Math.round(ms * SR / 1000), g = 0.7, y = new Float32Array(n);
      for (let i = 0; i < n; i++) { const xd = i >= d ? out[i - d] : 0, yd = i >= d ? y[i - d] : 0; y[i] = -g * out[i] + xd + g * yd; }
      out.set(y);
    }
    return out;
  };
  const wl = proc(a.L, 0), wr = proc(a.R, 2.3);
  for (let i = 0; i < a.L.length; i++) { a.L[i] += wl[i] * wet; a.R[i] += wr[i] * wet; }
  return a;
}
