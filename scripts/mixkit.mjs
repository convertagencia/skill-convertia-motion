#!/usr/bin/env node
// Busca e baixa música e efeitos gratuitos do Mixkit.
//   node mixkit.mjs music <termo ou gênero>        ex: corporate, cinematic, hip-hop, "upbeat"
//   node mixkit.mjs sfx   <termo>                  ex: whoosh, click, impact, typing
//   node mixkit.mjs get music <id> [pasta]         baixa pra ./music (padrão)
//   node mixkit.mjs get sfx   <id> [pasta]         baixa pra ./sfx (padrão)
// Licença: conferir mixkit.co/license na primeira vez. Registrar fonte e licença no "music" do score.json.
import fs from 'node:fs';
import path from 'node:path';

const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) convertia-motion' };
const [, , cmd, a, b, c] = process.argv;
const slug = s => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-'));

async function page(urls) {
  for (const u of urls) {
    const r = await fetch(u, { headers: UA });
    if (r.ok) return { url: u, html: await r.text() };
  }
  return null;
}

async function music(term) {
  const p = await page([`https://mixkit.co/free-stock-music/discover/${slug(term)}/`, `https://mixkit.co/free-stock-music/${slug(term)}/`, `https://mixkit.co/free-stock-music/tag/${slug(term)}/`]);
  if (!p) return console.log('nada encontrado pra', term);
  const items = [];
  for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const walk = o => { if (!o || typeof o !== 'object') return; if (o['@type'] === 'MusicRecording' && o.url) items.push(o); Object.values(o).forEach(walk); };
      walk(JSON.parse(m[1]));
    } catch { /* bloco não-JSON */ }
  }
  console.log(`${p.url}\n${items.length} faixas`);
  for (const it of items) {
    const id = (it.url.match(/music\/(\d+)\//) || [])[1];
    const d = (it.duration || '').replace('PT', '').toLowerCase();
    console.log(`  ${String(id).padStart(5)}  ${it.name} · ${it.byArtist || '?'} · ${it.genre || ''} · ${d}`);
  }
}

async function sfx(term) {
  const p = await page([`https://mixkit.co/free-sound-effects/discover/${slug(term)}/`, `https://mixkit.co/free-sound-effects/${slug(term)}/`]);
  if (!p) return console.log('nada encontrado pra', term);
  const ids = [...p.html.matchAll(/data-audio-player-item-id-value="(\d+)"/g)];
  console.log(`${p.url}\n${ids.length} efeitos`);
  ids.forEach((m, i) => {
    const end = i + 1 < ids.length ? ids[i + 1].index : p.html.length;
    const title = (p.html.slice(m.index, end).match(/item-grid-card__title">\s*([^<]+?)\s*</) || [])[1] || '?';
    console.log(`  ${m[1].padStart(5)}  ${title}`);
  });
}

async function get(kind, id, dir) {
  const url = kind === 'music' ? `https://assets.mixkit.co/music/${id}/${id}.mp3` : `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`falhou (${r.status}): ${url}`);
  const out = path.resolve(dir || (kind === 'music' ? 'music' : 'sfx'));
  fs.mkdirSync(out, { recursive: true });
  const f = path.join(out, `mixkit-${id}.mp3`);
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  console.log(`${f}\nfonte: Mixkit #${id} (${url}) · licença: Mixkit Free License (conferir mixkit.co/license)`);
}

if (cmd === 'music' && a) await music(a);
else if (cmd === 'sfx' && a) await sfx(a);
else if (cmd === 'get' && (a === 'music' || a === 'sfx') && b) await get(a, b, c);
else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 7).join('\n'));
