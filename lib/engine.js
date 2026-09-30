// convertia-motion engine. Tudo é função pura de t: nada de CSS transition, timer ou estado entre quadros.
// Expõe window.M. Springs e flood adaptados de howseen-ai/claude-motion-design (MIT), ver THIRD-PARTY.md.
(function () {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const invLerp = (a, b, x) => clamp((x - a) / (b - a));

  // Easings: retornam exatamente 0 e 1 nas pontas.
  const E = {
    linear: x => x,
    in: x => x * x * x,
    out: x => 1 - Math.pow(1 - x, 3),
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    o5: x => 1 - Math.pow(1 - x, 5),
    expoOut: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    expoIn: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    expoInOut: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
    sineInOut: x => -(Math.cos(Math.PI * x) - 1) / 2,
    backOut: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };

  // Progresso com easing entre t0 e t0+dur.
  const P = (t, t0, dur, ease = E.inOut) => (t <= t0 ? 0 : t >= t0 + dur ? 1 : ease((t - t0) / dur));

  // Spring amortecido em forma fechada (resposta ao degrau 0 -> 1), massa 1.
  // Presets em rigidez k / amortecimento d.
  const SPRING = {
    snappy: { k: 320, d: 30 },   // UI, botões, chips
    base: { k: 170, d: 26 },     // containers, câmera
    heavy: { k: 120, d: 24 },    // tipografia grande, logos
    playful: { k: 180, d: 12 },  // elementos com personalidade, overshoot visível
  };
  function step(tau, sp = SPRING.base) {
    if (tau <= 0) return 0;
    const { k, d } = typeof sp === 'string' ? SPRING[sp] : sp;
    const w = Math.sqrt(k), z = d / (2 * w);
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau));
    }
    if (z === 1) return 1 - Math.exp(-w * tau) * (1 + w * tau);
    const s = Math.sqrt(z * z - 1), r1 = -w * (z - s), r2 = -w * (z + s);
    return 1 + (r2 * Math.exp(r1 * tau) - r1 * Math.exp(r2 * tau)) / (r1 - r2);
  }
  // Valor que muda de alvo várias vezes: uma spring por mudança, somadas. changes = [[t0, alvo], ...]
  function S(t, base, changes, sp = SPRING.base) {
    let v = base, prev = base;
    for (const [t0, to] of changes) { v += (to - prev) * step(t - t0, sp); prev = to; }
    return v;
  }

  // Interpolação por chaves [[t, v], ...] com easing por segmento.
  function keys(t, ks, ease = E.inOut) {
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i][0]) {
        const [t0, a] = ks[i - 1], [t1, b, e] = ks[i];
        return lerp(a, b, (e || ease)((t - t0) / (t1 - t0)));
      }
    }
    return ks[ks.length - 1][1];
  }

  // PRNG determinístico (mulberry32). Nunca usar Math.random no filme.
  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  // Formato, variante e áreas seguras, lidos da URL (?fmt=9x16&v=A).
  const q = new URLSearchParams(location.search);
  const FORMATS = { '9x16': [1080, 1920], '4x5': [1080, 1350], '1x1': [1080, 1080], '16x9': [1920, 1080] };
  const fmt = FORMATS[q.get('fmt')] ? q.get('fmt') : (window.FILM_DEFAULT_FMT || '9x16');
  const [W, H] = FORMATS[fmt];
  // Áreas seguras conservadoras (Reels/Stories/TikTok cobrem topo e base com interface). Conferir a recomendação atual da plataforma.
  const SAFE = {
    '9x16': { top: 270, bottom: 480, left: 70, right: 120 },
    '4x5': { top: 70, bottom: 70, left: 70, right: 70 },
    '1x1': { top: 60, bottom: 60, left: 60, right: 60 },
    '16x9': { top: 80, bottom: 80, left: 110, right: 110 },
  }[fmt];
  const variant = (q.get('v') || 'A').toUpperCase();
  const pick = table => (table[variant] !== undefined ? table[variant] : table.A);
  const byFmt = table => (table[fmt] !== undefined ? table[fmt] : table.default);

  // Câmera: chaves [t, zoom, x, y, ease?]. (x, y) = ponto do mundo no centro do quadro. Zoom interpolado em escala log.
  function camera(t, ks, ease = E.sineInOut) {
    const at = i => ({ z: ks[i][1], x: ks[i][2], y: ks[i][3] });
    if (t <= ks[0][0]) return at(0);
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i][0]) {
        const u = (ks[i][4] || ease)((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]));
        const a = at(i - 1), b = at(i);
        return { z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
      }
    }
    return at(ks.length - 1);
  }
  // "Mão" do operador: flutuação lenta, some nas pausas (amp em px).
  const hand = (t, amp = 6, seed = 0) => ({ x: amp * (Math.sin(t * 0.61 + seed) + 0.5 * Math.sin(t * 1.37 + 2 * seed)), y: amp * (Math.sin(t * 0.47 + 1 + seed) + 0.5 * Math.sin(t * 1.13 + seed)) });
  // Soco de câmera no beat: soma de decaimentos exponenciais.
  // Subida de 50 ms antes do decaimento: soco instantâneo vira pulo de quadro no render.
  const punch = (t, hits, amt = 0.012, decay = 9) => hits.reduce((s, h) => s + (t >= h ? amt * Math.min(1, (t - h) / 0.05) * Math.exp(-(t - h) * decay) : 0), 0);
  function applyCam(el, c, extra = {}) {
    const z = c.z * (1 + (extra.punch || 0)), x = c.x + (extra.dx || 0), y = c.y + (extra.dy || 0);
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${W / 2}px,${H / 2}px) scale(${z}) translate(${-x}px,${-y}px)`;
  }

  // Transform de um elemento em uma chamada. p = {x, y, s, sx, sy, r, o, blur, origin}
  function set(el, p) {
    const tr = `translate(${p.x || 0}px,${p.y || 0}px) rotate(${p.r || 0}deg) scale(${(p.sx ?? p.s ?? 1)},${(p.sy ?? p.s ?? 1)})`;
    el.style.transform = tr;
    if (p.origin) el.style.transformOrigin = p.origin;
    if (p.o !== undefined) el.style.opacity = p.o;
    if (p.blur !== undefined) el.style.filter = p.blur > 0.05 ? `blur(${p.blur}px)` : 'none';
    if (p.show !== undefined) el.style.visibility = p.show ? 'inherit' : 'hidden';
  }
  const show = (el, on) => { el.style.visibility = on ? 'inherit' : 'hidden'; };

  // Texto: quebra em palavras mascaradas (uma vez) e sobe palavra por palavra.
  function words(el) {
    if (el._w) return el._w;
    const txt = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    el._w = txt.map((w, i) => {
      const mask = document.createElement('span');
      mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding:0 0.02em 0.08em;margin-bottom:-0.08em';
      const inner = document.createElement('span');
      inner.style.cssText = 'display:inline-block;will-change:transform';
      inner.textContent = w;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < txt.length - 1) el.appendChild(document.createTextNode(' '));
      return inner;
    });
    return el._w;
  }
  // rise(el, t, {at, out, stagger, dur, ease}): entra de baixo (máscara), sai pra cima se "out" for definido.
  function rise(el, t, o = {}) {
    const ws = words(el), st = o.stagger ?? 0.055, dur = o.dur ?? 0.62, ease = o.ease || E.expoOut;
    ws.forEach((w, i) => {
      const u = P(t, o.at + i * st, dur, ease);
      const v = o.out !== undefined ? P(t, o.out + i * st * 0.5, dur * 0.55, E.in) : 0;
      const y = (1 - u) * 105 - v * 105, r = (1 - u) * 4 - v * 3;
      w.style.transform = `translateY(${y}%) rotate(${r}deg)`;
      // Fora da máscara: esconder de vez (acentos e cedilha vazam pela borda).
      w.style.visibility = u <= 0 || v >= 1 ? 'hidden' : 'inherit';
    });
  }
  // Digitação: mostra os primeiros n caracteres. Retorna n (bom pra sincronizar som de tecla).
  function type(el, full, t, t0, cps = 18, caret = '') {
    const n = Math.max(0, Math.min(full.length, Math.floor((t - t0) * cps)));
    const on = t >= t0 && n < full.length && Math.floor(t * 2.2) % 2 === 0;
    el.textContent = full.slice(0, n) + (caret && (on || (t >= t0 && n < full.length)) ? caret : '');
    return n;
  }
  const typeTimes = (full, t0, cps = 18) => Array.from(full, (c, i) => (c === ' ' ? null : t0 + i / cps)).filter(x => x !== null);
  const count = (t, t0, dur, a, b, ease = E.o5) => lerp(a, b, P(t, t0, dur, ease));
  // Caixas: base das transições sem corte (um card cresce e vira a próxima cena). r = {x, y, w, h, rad}
  function box(el, r) {
    el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
    if (r.rad !== undefined) el.style.borderRadius = r.rad + 'px';
  }
  const mixRect = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u), rad: lerp(a.rad ?? 0, b.rad ?? 0, u) });
  const fullRect = (rad = 0) => ({ x: 0, y: 0, w: W, h: H, rad });
  // Raio que cobre o quadro inteiro a partir de (cx, cy), com folga.
  const floodR = (cx, cy) => 1.05 * Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));

  // Liga o filme: define window.seek, duração, eventos de som e prontidão.
  async function boot(seekFn, opt = {}) {
    const stage = document.getElementById('stage');
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    window.__duration = opt.duration;
    window.__events = () => (typeof opt.events === 'function' ? opt.events() : opt.events || []);
    window.__meta = { fmt, variant, W, H, fps: opt.fps || 60 };
    window.seek = async t => { seekFn(t); return true; };
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => (i.complete ? null : i.decode().catch(() => null))));
    if (opt.prepare) await opt.prepare();
    seekFn(0);
    window.ready = true;
    // Prévia no navegador: ?t=6.4 fixa um instante, ?play toca em loop.
    if (!q.has('render')) {
      const fit = () => { const k = Math.min(1, innerWidth / W, innerHeight / H); stage.style.transformOrigin = '0 0'; stage.style.transform = `scale(${k})`; };
      fit(); addEventListener('resize', fit);
      if (q.has('t')) seekFn(parseFloat(q.get('t')));
      else if (q.has('play')) { const t0 = performance.now(); const loop = () => { seekFn(((performance.now() - t0) / 1000) % opt.duration); requestAnimationFrame(loop); }; loop(); }
    }
  }

  window.M = { clamp, lerp, invLerp, E, P, SPRING, step, S, keys, rng, fmt, W, H, SAFE, variant, pick, byFmt, camera, hand, punch, applyCam, set, show, words, rise, type, typeTimes, count, box, mixRect, fullRect, floodR, boot };
})();
