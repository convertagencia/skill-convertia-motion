#!/usr/bin/env node
// Renderizador quadro a quadro do convertia-motion.
//
//   node render.mjs stills <film.html> --times 0.5,2,4.2 [--fmt 9x16] [--v A] [--out dir]
//   node render.mjs beats  <film.html> --bpm 120 [--offset 0] [--dur 15] [--fmt] [--v]
//   node render.mjs full   <film.html> [--fmt 9x16] [--v A] [--fps 60] [--sub 8] [--shutter 0.5] [--workers N] [--from s --to s] [--out video.mp4]
//   node render.mjs draft  <film.html> [...]         (30 fps, sem motion blur, meia resolução: pra conferir ritmo rápido)
//   node render.mjs events <film.html> [--out events.json]
//   node render.mjs mux    <video.mp4> <audio.wav> [--out final.mp4]
//
// O filme precisa expor window.seek(t), window.ready e window.__duration (lib/engine.js faz isso via M.boot).
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FORMATS = { '9x16': [1080, 1920], '4x5': [1080, 1350], '1x1': [1080, 1080], '16x9': [1920, 1080] };
const [, , cmd, target, ...rest] = process.argv;
const opt = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) { const k = rest[i].slice(2); const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true; opt[k] = v; }
  else (opt._ ||= []).push(rest[i]);
}
if (!cmd || !target) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(1); }

const fmt = opt.fmt || '9x16';
if (!FORMATS[fmt]) throw new Error(`formato desconhecido: ${fmt}`);
const [W, H] = FORMATS[fmt];
const variant = opt.v || 'A';
const film = path.resolve(target);
const filmDir = path.dirname(film);
const outDir = path.join(filmDir, 'out');
fs.mkdirSync(outDir, { recursive: true });

function ff(args, input) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-v', 'error', '-y', ...args], { input, maxBuffer: 2 ** 31 });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr.toString());
  return r;
}

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const url = pathToFileURL(film).href + `?fmt=${fmt}&v=${variant}&render=1`;
  await page.goto(url);
  await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
  return { page, errs };
}
const seek = (page, t) => page.evaluate(t => window.seek(t), t);
const grab = (page, type = 'jpeg') => page.screenshot({ type, clip: { x: 0, y: 0, width: W, height: H }, ...(type === 'jpeg' ? { quality: 93 } : {}) });

function sheet(files, out, cols = 4, width = 360) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmsheet-'));
  files.forEach((f, i) => fs.symlinkSync(f, path.join(tmp, `${String(i).padStart(4, '0')}.png`)));
  const rows = Math.ceil(files.length / cols);
  ff(['-v', 'error', '-y', '-i', path.join(tmp, '%04d.png'), '-vf', `scale=${width}:-1,tile=${cols}x${rows}:padding=8:color=0x808080`, '-frames:v', '1', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function stills(times, name) {
  const dir = path.resolve(opt.out || path.join(outDir, `${name}-${fmt}-${variant}`));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const { page, errs } = await openPage(browser);
  const files = [];
  for (const t of times) {
    await seek(page, t);
    const f = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
    fs.writeFileSync(f, await grab(page, 'png'));
    files.push(f);
  }
  await browser.close();
  sheet(files, path.join(dir, 'sheet.png'), W > H ? 3 : 4, W > H ? 480 : 300);
  if (errs.length) console.log('ERROS NA PÁGINA:', errs.slice(0, 8));
  console.log(`${times.length} stills -> ${dir}/sheet.png`);
}

async function duration() {
  if (opt.dur) return Number(opt.dur);
  const browser = await chromium.launch();
  const { page } = await openPage(browser);
  const d = await page.evaluate(() => window.__duration);
  await browser.close();
  if (!d) throw new Error('defina a duração em M.boot(seek, {duration}) ou passe --dur');
  return d;
}

// Um segmento de quadros [f0, f1) numa página, encodado direto num mp4.
async function renderSegment(browser, f0, f1, fps, sub, shutter, segPath, scale, linear, progress) {
  const { page, errs } = await openPage(browser);
  const vf = [];
  if (sub > 1) {
    // Média em luz linear (16 bits) evita rastros escuros em elemento claro sobre fundo escuro.
    const lut = g => `lutrgb=r='pow(val/65535\\,${g})*65535':g='pow(val/65535\\,${g})*65535':b='pow(val/65535\\,${g})*65535'`;
    if (linear) vf.push('format=rgb48le', lut(2.2));
    vf.push(`tmix=frames=${sub}`, `select='eq(mod(n\\,${sub})\\,${sub - 1})'`);
    if (linear) vf.push(lut(1 / 2.2));
  }
  vf.push(`setpts=N/${fps}/TB`);
  if (scale !== 1) vf.push(`scale=trunc(iw*${scale}/2)*2:-2`);
  vf.push('scale=out_color_matrix=bt709:out_range=tv', 'format=yuv420p');
  const proc = spawn(ffmpegPath, ['-hide_banner', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps * sub), '-i', '-',
    '-vf', vf.join(','), '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', segPath], { stdio: ['pipe', 'ignore', 'inherit'] });
  const write = async buf => { if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r)); };
  // Obturador: sub capturas espalhadas por shutter/fps em torno do instante do quadro.
  const offs = sub > 1 ? Array.from({ length: sub }, (_, j) => (j / (sub - 1) - 0.5) * shutter / fps) : [0];
  const T = await page.evaluate(() => window.__duration);
  const tc = t => Math.min(T - 1e-4, Math.max(0, t));
  for (let i = f0; i < f1; i++) {
    const t = i / fps;
    if (sub > 1) {
      await seek(page, tc(t + offs[0])); const a = await grab(page);
      await seek(page, tc(t + offs[sub - 1])); const b = await grab(page);
      if (a.equals(b)) { for (let j = 0; j < sub; j++) await write(a); }   // quadro parado: não precisa das capturas do meio
      else {
        await write(a);
        for (let j = 1; j < sub - 1; j++) { await seek(page, tc(t + offs[j])); await write(await grab(page)); }
        await write(b);
      }
    } else { await seek(page, tc(t)); await write(await grab(page)); }
    progress();
  }
  proc.stdin.end();
  await new Promise(r => proc.on('close', r));
  await page.close();
  return errs;
}

async function full(draft) {
  const fps = Number(opt.fps || (draft ? 30 : 60));
  const sub = Number(opt.sub || (draft ? 1 : 8));
  const shutter = Number(opt.shutter || 0.5);
  const scale = Number(opt.scale || (draft ? 0.5 : 1));
  const linear = !opt['no-linear'];
  const T = await duration();
  const from = Number(opt.from || 0), to = Math.min(T, Number(opt.to || T));
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps), n = F1 - F0;
  const workers = Math.max(1, Math.min(n, Number(opt.workers || Math.max(1, Math.min(6, os.cpus().length - 2)))));
  const out = path.resolve(opt.out || path.join(outDir, `${draft ? 'draft' : 'video'}-${fmt}-${variant}${from || to < T ? `-${from}-${to}` : ''}.mp4`));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmotion-'));
  console.log(`${draft ? 'rascunho' : 'render'} ${fmt} v${variant}: ${n} quadros, ${fps} fps, ${sub} subquadros, ${workers} workers -> ${out}`);
  const browser = await chromium.launch();
  let done = 0; const t0 = Date.now();
  const progress = () => {
    done++;
    if (done % Math.max(1, Math.round(fps / 2)) === 0 || done === n) {
      const el = (Date.now() - t0) / 1000, eta = el / done * (n - done);
      process.stdout.write(`\r  ${done}/${n} quadros  ${el.toFixed(0)}s  faltam ~${eta.toFixed(0)}s   `);
    }
  };
  const chunk = Math.ceil(n / workers);
  const segs = [];
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = F0 + w * chunk, b = Math.min(F1, a + chunk);
    if (a >= b) break;
    const seg = path.join(tmp, `seg${String(w).padStart(2, '0')}.mp4`);
    segs.push(seg);
    jobs.push(renderSegment(browser, a, b, fps, sub, shutter, seg, scale, linear, progress));
  }
  const errs = (await Promise.all(jobs)).flat();
  await browser.close();
  process.stdout.write('\n');
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (errs.length) console.log('ERROS NA PÁGINA:', [...new Set(errs)].slice(0, 8));
  console.log(`pronto em ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`);
}

async function events() {
  const browser = await chromium.launch();
  const { page } = await openPage(browser);
  const ev = await page.evaluate(() => ({ duration: window.__duration, events: window.__events ? window.__events() : [] }));
  await browser.close();
  const out = path.resolve(opt.out || path.join(outDir, `events-${fmt}-${variant}.json`));
  fs.writeFileSync(out, JSON.stringify(ev, null, 1));
  console.log(`${ev.events.length} eventos -> ${out}`);
}

function mux() {
  const video = path.resolve(target), audio = path.resolve(opt._[0]);
  const out = path.resolve(opt.out || video.replace(/\.mp4$/, '') + '-final.mp4');
  ff(['-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  console.log('final ->', out);
}

if (cmd === 'stills') await stills(String(opt.times).split(',').map(Number), 'stills');
else if (cmd === 'beats') {
  const bpm = Number(opt.bpm), off = Number(opt.offset || 0), T = await duration();
  const times = []; for (let t = off; t < T; t += 60 / bpm) times.push(+t.toFixed(3));
  await stills(times, 'beats');
}
else if (cmd === 'full') await full(false);
else if (cmd === 'draft') await full(true);
else if (cmd === 'events') await events();
else if (cmd === 'mux') mux();
else { console.error('comando desconhecido:', cmd); process.exit(1); }
