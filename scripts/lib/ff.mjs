// Utilitários comuns: ffmpeg da skill, leitura/escrita de áudio em Float32 estéreo intercalado, loudness.
import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';

export const SR = 48000;
export const FF = ffmpegPath;

export function ff(args, input) {
  const r = spawnSync(FF, ['-hide_banner', ...args], { input, maxBuffer: 2 ** 31 });
  if (r.status !== 0) throw new Error('ffmpeg falhou: ' + r.stderr.toString().slice(-2000));
  return r;
}

// Áudio: objeto { L: Float32Array, R: Float32Array }.
export function load(file, sr = SR) {
  const raw = ff(['-v', 'quiet', '-i', file, '-ac', '2', '-ar', String(sr), '-f', 'f32le', '-']).stdout;
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const n = all.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = all[2 * i]; R[i] = all[2 * i + 1]; }
  return { L, R };
}

export function save(a, file, sr = SR) {
  const n = a.L.length, buf = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) { buf[2 * i] = a.L[i]; buf[2 * i + 1] = a.R[i]; }
  ff(['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '2', '-i', '-', file], Buffer.from(buf.buffer));
}

export function loadMono(file, sr = 22050) {
  const raw = ff(['-v', 'quiet', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-']).stdout;
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

function loudJson(file, af) {
  const r = ff(['-i', file, '-af', af, '-f', 'null', '-']).stderr.toString();
  return JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
}

// Normalização em duas passadas (EBU R128).
export function loudnorm(src, dst, lufs = -14, tp = -1.5, sr = SR) {
  const j = loudJson(src, `loudnorm=I=${lufs}:TP=${tp}:LRA=11:print_format=json`);
  const af = `loudnorm=I=${lufs}:TP=${tp}:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  ff(['-v', 'error', '-y', '-i', src, '-af', af, '-ar', String(sr), dst]);
  return Number(j.input_i);
}

export function measure(file) {
  const j = loudJson(file, 'loudnorm=print_format=json');
  return { lufs: Number(j.input_i), tp: Number(j.input_tp) };
}

export function probeDuration(file) {
  const r = ff(['-i', file, '-f', 'null', '-']).stderr.toString();
  const m = [...r.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].at(-1);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
