// RockShowcase — цепочки 3–5 на точке A (шаг 8.6): лампы McIntosh MC275, катушки Revox A77 и TEAC A-4010S,
// видео JVC HR-3300 и Maxell T-120. Код движений — из моушн-превью этапа 7 без правок таймингов:
//   MC275 — project/stage7/7.15-preview (D-175), переходы 7.13 (D-173), кадры site/assets/mc/;
//   катушки — project/stage7/7.18-preview (D-178), переходы 7.16 (D-176), кадры site/assets/rr/;
//   видео — project/stage7/7.21-preview (D-181), переходы 7.19 (D-179), кадры site/assets/vd/.
// Без веб-кнопок (D-006): кнопки превью заменены нажатиями на сам предмет; “крупно” (панель MC275,
// головки и клавиши, клавиши HR-3300) — нажатие на эту часть, назад — нажатие мимо.
// Лампы MC275 горят от PLAY любого источника: общий автомат RS.world.playing() (Dragon, TASCAM, Technics,
// Revox, TEAC, HR-3300). Аппараты играют и когда посетитель ушёл к другому предмету.
// Видеокассета — третья вещь “в руке” (общая рука devices.js): в руке одна вещь.
(function () {
  'use strict';
  const RS = window.RS;
  if (!RS || !RS.kit) return;
  const K = RS.kit, S = K.S, world = K.world, W = K.W, H = K.H;
  const { make, place, zone, wait, ms, flash, show } = K;
  const reduce = () => K.reduce();
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pct = (v, of) => (v / of * 100) + '%';
  const GEO = (window.__SITE__ || {}).geo || {};
  const loadImg = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
  const ok = (im) => im && im.complete && im.naturalWidth > 0;
  function zoneIn(el, w, h, x0, y0, x1, y1) { Object.assign(el.style, { left: pct((x0 + x1) / 2, w), top: pct((y0 + y1) / 2, h), width: pct(x1 - x0, w), height: pct(y1 - y0, h) }); }
  function zoomT(r, k) { // k: 0 — общий кадр, 1 — рамка r на весь кадр
    const [x0, y0, x1, y1] = r, s = 1 + (W / (x1 - x0) - 1) * k, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const X = (W / 2 - cx * s) * k, Y = (H / 2 - cy * s) * k;
    return `translate(${(X / W * 100).toFixed(3)}%, ${(Y / H * 100).toFixed(3)}%) scale(${s.toFixed(4)})`;
  }
  async function zoomIn(hero, pv, r, t) {
    t = reduce() ? 0 : t;
    hero.style.transition = `transform ${ms(t)}ms ease-in-out`; hero.style.transform = zoomT(r, 1);
    pv.style.transition = `opacity ${ms(reduce() ? 0.1 : t * 0.5)}ms ease-out ${ms(t * 0.5)}ms`; pv.style.opacity = 1; pv.classList.add('on');
    await wait(reduce() ? 0.1 : t);
  }
  async function zoomOut(hero, pv, r, t) {
    t = reduce() ? 0 : t;
    pv.style.transition = `opacity ${ms(reduce() ? 0.1 : t * 0.5)}ms ease-in`; pv.style.opacity = 0; pv.classList.remove('on');
    hero.style.transition = `transform ${ms(t)}ms ease-in-out`; hero.style.transform = zoomT(r, 0);
    await wait(reduce() ? 0.1 : t);
  }
  // кнопка-зона в сцене: [рамка, действие, подпись, когда видна]
  function mkZone(parent, w, h, box, fn, label, cls = '') {
    const b = document.createElement('button');
    b.className = 'zone' + (cls ? ' ' + cls : ''); b.type = 'button';
    b.setAttribute('aria-label', label); b.title = label;
    zoneIn(b, w, h, ...box);
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
    parent.appendChild(b);
    return b;
  }
  // подсказка при первом подходе к предмету (строки внизу кадра, как подписи превью)
  const hinted = new Set();
  function hintOnce(key, el, text) { if (hinted.has(key)) return; hinted.add(key); flash(el, text, 5); }

  // марево над KT88 (7.15): SVG-фильтр один на страницу
  document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rsHeat" x="-5%" y="-5%" width="110%" height="110%">'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="2" seed="3" result="n">'
    + '<animate attributeName="baseFrequency" dur="7s" values="0.012 0.045;0.014 0.052;0.012 0.045" repeatCount="indefinite"/>'
    + '<animate attributeName="seed" dur="0.9s" values="1;2;3;4;5;6;7;8" repeatCount="indefinite"/></feTurbulence>'
    + '<feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter></svg>');

  // ---------- свечение ламп (7.15): накал 0…1 → прозрачность, тон, яркость ----------
  function look(x, red = 0.25) {
    const r = clamp(red, 0.02, 0.9);
    if (x <= 0) return [0, -22, 0.8];
    if (x < r) return [0.28 * x / r, -22, 0.8];
    const k = (x - r) / (1 - r), e = k * k * (3 - 2 * k);
    return [0.28 + 0.72 * e, -22 * (1 - e), 0.8 + 0.2 * e];
  }
  function setGlow(el, [o, hue, br], mul = 1) {
    el.style.opacity = (o * mul).toFixed(3);
    el.style.filter = `hue-rotate(${hue.toFixed(1)}deg) brightness(${br.toFixed(3)}) saturate(${(1 + (-hue) / 60).toFixed(3)})`;
  }

  // =====================================================================
  // McIntosh MC275 `a-receivers` (PA-00 D-128, D-173…D-175)
  // =====================================================================
  const AM = 'assets/mc/';
  const PW = 1774, PH = 887;
  const CAGE = [483, 122, 1456, 663];
  const KN = {
    balance: { cx: 1171, cy: 363, box: [1087, 279, 168, 168] }, 'gain-l': { cx: 1325, cy: 363, box: [1241, 279, 168, 168] },
    'gain-r': { cx: 1474, cy: 363, box: [1390, 279, 168, 168] }, 'gain-mono': { cx: 1624, cy: 363, box: [1540, 279, 168, 168] },
  };
  const KNAME = { balance: 'BALANCE', 'gain-l': 'GAIN L', 'gain-r': 'GAIN R', 'gain-mono': 'GAIN MONO' };
  const PANEL_IN_HERO = [70, 455, 885, 1000];
  const KT88_TOPS = [[688, 292], [878, 252], [1060, 216], [1232, 182]];
  const TM = { warm: 2.0, red: 0.5, lead: 0.3, cool: 3.5, cageUp: 0.45, cageDown: 0.45, thud: 0.05, zoom: 0.4, back: 0.4, knob: 0.15 };
  const MC = S.mc = { p: 0, caged: false, cagePos: 0, cageAnim: null, bump: 0, view: 'hero', knob: { balance: 0, 'gain-l': 0, 'gain-r': 0, 'gain-mono': 0 } };
  let mcRoot = null;
  const mq = {}; // элементы сцены MC275
  function buildMc() {
    mcRoot = make(`<div class="stage">
      <div class="hero">
        <img src="${AM}off.webp" alt="McIntosh MC275, cage off" draggable="false">
        <img class="mcglow" data-g="big" src="${AM}glow-big.webp" alt="" aria-hidden="true">
        <img class="mcglow" data-g="small" src="${AM}glow-small.webp" alt="" aria-hidden="true">
        <div class="heat"></div><div class="heat"></div><div class="heat"></div><div class="heat"></div>
        <img class="cage" src="${AM}cage.webp" alt="Tube cage" draggable="false">
        <img class="mcglow" data-g="caged" src="${AM}glow-caged.webp" alt="" aria-hidden="true">
      </div>
      <div class="pview"><div class="pbox" style="aspect-ratio:2/1"><img src="${AM}panel.webp" alt="MC275 connection panel, close up" draggable="false"></div></div>
      <div class="caption"></div></div>`);
    const hero = mcRoot.querySelector('.hero'), pv = mcRoot.querySelector('.pview'), pbox = mcRoot.querySelector('.pbox');
    Object.assign(mq, { hero, pv, pbox, cap: mcRoot.querySelector('.caption'), cage: hero.querySelector('.cage'),
      big: hero.querySelector('[data-g=big]'), small: hero.querySelector('[data-g=small]'), caged: hero.querySelector('[data-g=caged]'), heat: [...hero.querySelectorAll('.heat')] });
    place(mq.cage, ...CAGE);
    mq.heat.forEach((el, i) => {
      const [x, y] = KT88_TOPS[i], w = 170, h = 150, top = y - h + 5;
      place(el, x - w / 2, top, x + w / 2, top + h);
      el.style.backgroundImage = `url(${AM}off.webp)`;
      el.style.backgroundSize = `${W / w * 100}% ${H / h * 100}%`;
      el.style.backgroundPosition = `${(x - w / 2) / (W - w) * 100}% ${top / (H - h) * 100}%`;
    });
    mq.zCageOff = mkZone(hero, W, H, [500, 140, 1450, 640], () => K.run(async () => { flash(mq.cap, 'Cage off.', 1.4); await cageTo(false); }), 'Cage: take off');
    mq.zCageOn = mkZone(hero, W, H, [500, 140, 1450, 440], () => K.run(async () => { flash(mq.cap, 'Cage on.', 1.4); await cageTo(true); }), 'Tubes: put the cage on');
    mq.zPanel = mkZone(hero, W, H, [90, 480, 860, 980], () => K.run(async () => { MC.view = 'panel'; mcUi(); await zoomIn(hero, pv, PANEL_IN_HERO, TM.zoom); }), 'Connection panel close up');
    // панель: мимо — назад к усилителю
    pv.addEventListener('click', (e) => { e.stopPropagation(); mcBack(); });
    mkZone(pbox, PW, PH, [0, 0, PW, PH], mcBack, 'Back to the amplifier', 'quiet').style.zIndex = 2;
    mq.knob = {};
    for (const [k, g] of Object.entries(KN)) {
      const [bx, by, bw, bh] = g.box;
      const mk = (part) => { const im = document.createElement('img'); im.className = 'kn'; im.src = `${AM}knob-${k}-${part}.webp`; im.alt = ''; im.draggable = false;
        Object.assign(im.style, { left: pct(bx, PW), top: pct(by, PH), width: pct(bw, PW), height: pct(bh, PH), transformOrigin: `${(g.cx - bx) / bw * 100}% ${(g.cy - by) / bh * 100}%` });
        pbox.appendChild(im); return im; };
      const body = mk('body'), fin = mk('fin');
      body.style.zIndex = 2;
      mq.knob[k] = { body, fin };
      mkZone(pbox, PW, PH, [bx - 10, by - 10, g.cx, by + bh + 50], () => turnKnob(k, -1), KNAME[k] + ': turn left');
      mkZone(pbox, PW, PH, [g.cx, by - 10, bx + bw + 10, by + bh + 50], () => turnKnob(k, +1), KNAME[k] + ': turn right');
      applyKnob(k, 0);
    }
    const info = (t, s) => () => flash(mq.cap, t, s);
    for (const [b, fn, lbl] of [ // 3.4, 3.5: что подключено
      [[1150, 150, 1600, 280], info('The STEREO / TWIN AMP / MONO switch is set to STEREO and stays there.', 3.2), 'Mode switch'],
      [[1085, 630, 1300, 800], info('STEREO INPUT L / R — cables from the sources (already connected, they don’t come out).', 3.2), 'STEREO INPUT jacks'],
      [[1330, 640, 1690, 760], info('TWIN INPUT and MONO INPUT are unused — not needed in STEREO.', 2.8), 'Unused inputs'],
      [[650, 150, 1090, 560], info('Output terminals — wires to the speakers on the wall.', 2.8), 'Speaker terminals'],
      [[100, 630, 270, 800], info('Power cord — plugged in. The MC275 has no power switch: PLAY on any source lights the tubes.', 3.4), 'Power cord'],
      [[100, 230, 290, 410], info('Fuse 5.0 A SLO-BLO.', 2.2), 'Fuse'],
      [[360, 150, 570, 440], info('70 V / 600 OHM output — not used.', 2.2), '70 V output'],
    ]) mkZone(pbox, PW, PH, b, fn, lbl);
    mcUi();
  }
  function mcBack() {
    if (MC.view !== 'panel') return;
    K.run(async () => { MC.view = 'hero'; mcUi(); await zoomOut(mq.hero, mq.pv, PANEL_IN_HERO, TM.back); });
  }
  function knobLabel(k, v) { return k === 'balance' ? ['L ◀◀', 'L ◀', 'center', 'R ▶', 'R ▶▶'][v + 2] : ['−2', '−1', '0', '+1', '+2'][v + 2]; }
  function applyKnob(k, dur) {
    const v = MC.knob[k], { fin } = mq.knob[k], a = 225 + v * 30; // плавник: в покое ~7:30
    fin.style.transition = dur ? `transform ${ms(dur)}ms ease-out` : 'none';
    fin.style.transform = `rotate(${v * 30}deg)`;
    fin.style.zIndex = (a >= 90 && a <= 270) ? 3 : 1;
  }
  function turnKnob(k, dir) { // 3.1–3.3
    const v = clamp(MC.knob[k] + dir, -2, 2);
    if (v === MC.knob[k]) { flash(mq.cap, `${KNAME[k]} — end of travel.`, 1.4); return; }
    MC.knob[k] = v; applyKnob(k, reduce() ? 0 : TM.knob);
    if (k === 'balance') flash(mq.cap, `BALANCE: ${knobLabel(k, v)} — the speaker sound shifts left or right.`, 2.6);
    else flash(mq.cap, `${KNAME[k]}: ${knobLabel(k, v)} — speaker volume: ${v > 0 ? 'louder' : v < 0 ? 'quieter' : 'as before'}.`, 2.6);
  }
  function cageTo(on) {
    return new Promise((res) => {
      if (on) { MC.caged = true; MC.cagePos = 1; MC.cageAnim = { from: 1, to: 0, t0: performance.now(), dur: reduce() ? 0 : TM.cageDown, thud: reduce() ? 0 : TM.thud, done: res }; }
      else MC.cageAnim = { from: 0, to: 1, t0: performance.now(), dur: reduce() ? 0 : TM.cageUp, thud: 0, done: () => { MC.caged = false; MC.cagePos = 0; res(); } };
      kick();
    });
  }
  function mcUi() {
    if (!mcRoot) return;
    const hero = MC.view === 'hero';
    show(mq.zCageOff, hero && MC.caged); show(mq.zCageOn, hero && !MC.caged); show(mq.zPanel, hero);
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3), easeIn = (t) => t * t * t;
  function mcStep(dt, now) {
    const target = world.playing().length ? 1 : 0;
    if (reduce()) MC.p = target;
    else if (MC.p < target) MC.p = Math.min(1, MC.p + dt / TM.warm);
    else if (MC.p > target) MC.p = Math.max(0, MC.p - dt / TM.cool);
    if (MC.cageAnim) {
      const A = MC.cageAnim, t = clamp((now - A.t0) / 1000 / Math.max(A.dur, 0.001));
      MC.cagePos = A.from + (A.to - A.from) * (A.to > A.from ? easeOut(t) : easeIn(t));
      MC.bump = 0;
      if (t >= 1) {
        MC.cagePos = A.to;
        const tt = (now - A.t0) / 1000 - A.dur;
        if (A.thud && tt < A.thud) MC.bump = Math.sin(Math.PI * tt / A.thud) * 0.004; else { MC.cageAnim = null; A.done(); }
      }
    } else MC.bump = 0;
    if (!mcRoot || !mcRoot.isConnected) return;
    const ls = clamp(TM.lead / TM.warm, 0, 0.6), red = TM.red / TM.warm;
    const xs = clamp(MC.p / (1 - ls)), xb = clamp((MC.p - ls) / (1 - ls));
    const cv = MC.caged ? 1 - MC.cagePos : 0, cageVisible = MC.caged || !!MC.cageAnim;
    mq.cage.style.display = mq.caged.style.display = cageVisible ? '' : 'none';
    const ty = -MC.cagePos * 1.35 + MC.bump * (H / (CAGE[3] - CAGE[1]));
    mq.cage.style.transform = `translateY(${(ty * 100).toFixed(2)}%)`;
    mq.caged.style.transform = `translateY(${(ty * (CAGE[3] - CAGE[1]) / H * 100).toFixed(2)}%)`;
    const bare = cageVisible ? clamp(MC.cagePos * 1.6) : 1;
    setGlow(mq.small, look(xs, red), bare); setGlow(mq.big, look(xb, red), bare);
    setGlow(mq.caged, look(0.3 * xs + 0.7 * xb, red), clamp(1 - MC.cagePos * 1.3));
    const heat = !reduce() && MC.view === 'hero' ? clamp((xb - 0.6) / 0.4) * clamp(1 - cv * 2) * (cageVisible ? clamp(MC.cagePos) : 1) : 0;
    mq.heat.forEach((h) => { h.style.opacity = heat.toFixed(3); h.style.display = heat > 0 ? '' : 'none'; });
  }

  // =====================================================================
  // Катушечники Revox A77 `a-reel-to-reel` и TEAC A-4010S `a-reel-to-reel-2` (RR-00 D-070/D-072, D-176…D-178)
  // =====================================================================
  const AR = 'assets/rr/';
  const GR = GEO.rr;
  const TR = { lid: 0.3, thread: 1.4, windon: 0.6, key: 0.075, roller: 0.1, spinup: 1.2, brake: 0.4, windAcc: 0.5, wind: 4.0, windBrake: 0.65, end: 0.3, zoom: 0.4, back: 0.4 };
  const dr = (k) => (reduce() ? 0 : TR[k]);
  const HUB = 0.38;      // радиус ступицы (единица — обод), с него начинается рулон
  const DEV = {
    rx: { id: 'a-reel-to-reel', name: 'Revox A77', rmax: 0.86, reelIn: 5.25, keys: { rew: [326, 690, 354, 748], ffw: [375, 692, 403, 750], play: [425, 691, 453, 752], stop: [474, 694, 502, 752], rec: [524, 697, 552, 755] } },
    tc: { id: 'a-reel-to-reel-2', name: 'TEAC A-4010S', rmax: 0.95, reelIn: 3.5, keys: { rev: [333, 576, 387, 603], fast: [393, 579, 444, 606], play: [453, 582, 506, 608], stop: [381, 627, 456, 656] } },
  };
  const TLEN = 1800;     // длина плёнки в секундах на 7½ — условность (D-178)
  const CAP_W = 16;      // предел вращения на экране, рад/с (~2,5 об/с)
  function mkRr(id) {
    return { id, threaded: false, p: 0, mode: 'stop', dir: 1, v: 0, vT: 0, rate: 1, thL: 0, thR: 0, lid: 0, lidT: 0, roller: 0, power: true, speed: 7.5,
      cntOff: 0, vu: [0, 0], anim: null, flash: null, lastDir: 1, rev: null, wL: 0, wR: 0, coast: null, view: 'hero' };
  }
  const ST = S.rr = { rx: mkRr('rx'), tc: mkRr('tc') };
  const RR = { rx: null, tc: null }; // сцены: root, canvas, ctx, zones, cap, hero, pv, pbox
  const IM = { rx: null, tc: null };
  const REEL = {};
  if (GR) for (const dv of ['rx', 'tc']) {
    REEL[dv] = {};
    const P = GR.devices[dv].params, tp = GR.devices[dv].tape_path.path;
    for (const side of ['L', 'R']) {
      const p = P[`reel-${side}`], A = p.A, Ai = inv2(A), det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      REEL[dv][side] = { A, Ai, c: p.center, hc: p.hub_center, hub: p.hub_r, sg: Math.sign(det), dir: tp.find((it) => it.reel === side).dir };
    }
  }
  function inv2(A) { const det = A[0][0] * A[1][1] - A[0][1] * A[1][0]; return [[A[1][1] / det, -A[0][1] / det], [-A[1][0] / det, A[0][0] / det]]; }
  function rrLoad(dv) {
    if (IM[dv]) return;
    const I = IM[dv] = {}, lay = GR.devices[dv].layers;
    const list = [['base', `${dv}-base.webp`], ['pack-L', `${dv}-pack-L.webp`], ['pack-R', `${dv}-pack-R.webp`], ['heads', `${dv}-heads.webp`], ['keys', `${dv}-keys.webp`], ['keys-play', `${dv}-keys-play.webp`]];
    if (dv === 'rx') list.push(['lid', 'rx-lid.webp'], ['lidmask', 'rx-lidmask.webp'], ['lever-375', 'rx-lever-375.webp']);
    for (const k of Object.keys(lay)) if (/^(reel-|needle-|off-patch|key-play|roller)/.test(k)) list.push([k, `${dv}-${k}.webp`]);
    for (const [k, f] of list) I[k] = loadImg(AR + f);
  }
  const rrReady = (dv) => IM[dv] && Object.values(IM[dv]).every(ok);

  // ---------- путь плёнки (порт rr_tape.py, как в превью 7.18) ----------
  const perp = (v) => [-v[1], v[0]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], norm = (a) => Math.hypot(a[0], a[1]);
  function circTangent(c1, r1, s1, c2, r2, s2) {
    let best = null;
    const D = sub(c2, c1), L = norm(D);
    for (const k1 of [-1, 1]) for (const k2 of [-1, 1]) {
      const cosv = (k2 * r2 - k1 * r1) / L;
      if (Math.abs(cosv) > 1) continue;
      const ba = Math.atan2(D[1], D[0]);
      for (const sg of [-1, 1]) {
        const ang = ba + sg * Math.acos(cosv), n = [Math.cos(ang), Math.sin(ang)];
        const t1 = sub(c1, mul(n, k1 * r1)), t2 = sub(c2, mul(n, k2 * r2));
        let dd = sub(t2, t1); const ln = norm(dd); if (ln < 1e-6) continue; dd = mul(dd, 1 / ln);
        const e1 = r1 === 0 ? 0 : dot(dd, mul(perp(mul(sub(t1, c1), 1 / r1)), s1)) - 1;
        const e2 = r2 === 0 ? 0 : dot(dd, mul(perp(mul(sub(t2, c2), 1 / r2)), s2)) - 1;
        const err = e1 * e1 + e2 * e2;
        if (!best || err < best[0]) best = [err, t1, t2];
      }
    }
    return [best[1], best[2]];
  }
  const mv = (A, q) => [A[0][0] * q[0] + A[0][1] * q[1], A[1][0] * q[0] + A[1][1] * q[1]];
  function ellTangent(p, rd, rr, s, first) {
    const q = mv(rd.Ai, sub(p, rd.c)), sp = s * rd.sg;
    const t = first ? circTangent([0, 0], rr, sp, q, 0, 0)[0] : circTangent(q, 0, 0, [0, 0], rr, sp)[1];
    return add(rd.c, mv(rd.A, t));
  }
  function arcPts(c, r, a0, a1, s, n = 20) {
    if (s > 0) while (a1 < a0) a1 += 2 * Math.PI; else while (a1 > a0) a1 -= 2 * Math.PI;
    const out = []; for (let i = 0; i < n; i++) { const t = a0 + (a1 - a0) * i / (n - 1); out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); } return out;
  }
  const LIFT = { rx: [0, 4], tc: [0, 3] }; // в стопе плёнка отведена от головок и вала, px
  function tapePoly(dv, rl, rr, lift = 0) {
    const tp = GR.devices[dv].tape_path, R = REEL[dv], rad = { L: rl, R: rr };
    const items = tp.path.map((it) => (it.point && /головк|вал/.test(it.name || '') && lift > 0 ? { ...it, point: [it.point[0] + LIFT[dv][0] * lift, it.point[1] + LIFT[dv][1] * lift] } : it));
    const tang = [];
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i], b = items[i + 1];
      if (a.reel || b.reel) {
        const reelIt = a.reel ? a : b, other = a.reel ? b : a, rd = R[reelIt.reel];
        let p = (other.circle || other.point).slice(0, 2), t;
        for (let k = 0; k < 6; k++) {
          t = ellTangent(p, rd, rad[reelIt.reel], reelIt.dir, !!a.reel);
          if (other.circle) { const c = other.circle; p = a.reel ? circTangent(t, 0, 0, c.slice(0, 2), c[2], other.dir)[1] : circTangent(c.slice(0, 2), c[2], other.dir, t, 0, 0)[0]; }
        }
        tang.push(a.reel ? [t, p] : [p, t]);
      } else {
        const c1 = a.point ? [...a.point, 0] : a.circle, c2 = b.point ? [...b.point, 0] : b.circle;
        tang.push(circTangent(c1.slice(0, 2), c1[2], a.dir || 0, c2.slice(0, 2), c2[2], b.dir || 0));
      }
    }
    const poly = [], hid = new Set();
    items.forEach((it, i) => {
      const pin = i > 0 ? tang[i - 1][1] : null, pout = i < items.length - 1 ? tang[i][0] : null;
      if (i === 0) poly.push(pout);
      else if (i === items.length - 1) poly.push(pin);
      else if (it.circle) { const [cx, cy, r] = it.circle; poly.push(...arcPts([cx, cy], r, Math.atan2(pin[1] - cy, pin[0] - cx), Math.atan2(pout[1] - cy, pout[0] - cx), it.dir)); }
      else poly.push(pin);
      if (it.hide_next) hid.add(poly.length - 1);
    });
    const cum = [0]; for (let k = 1; k < poly.length; k++) cum.push(cum[k - 1] + (hid.has(k - 1) ? 0 : norm(sub(poly[k], poly[k - 1]))));
    return { poly, hid, cum, total: cum[cum.length - 1] };
  }
  function strokeTape(ctx, dv, P, f0, f1) {
    const tp = GR.devices[dv].tape_path, wd = tp.width, s0 = P.total * f0, s1 = P.total * f1, segs = [];
    let curS = null;
    for (let k = 0; k < P.poly.length - 1; k++) {
      const a = P.cum[k], b = P.cum[k + 1];
      if (b <= s0 || a >= s1 || P.hid.has(k) || b - a < 1e-9) { curS = null; continue; }
      const pa = P.poly[k], pb = P.poly[k + 1];
      const u0 = clamp((s0 - a) / (b - a)), u1 = clamp((s1 - a) / (b - a));
      const q0 = add(pa, mul(sub(pb, pa), u0)), q1 = add(pa, mul(sub(pb, pa), u1));
      if (!curS || u0 > 0) { curS = [q0]; segs.push(curS); }
      curS.push(q1);
    }
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    for (const [col, w, oy] of [[tp.color, wd, 0], [tp.shine, Math.max(1, wd * 0.3), -wd * 0.28]]) {
      ctx.strokeStyle = `rgb(${col.join(',')})`; ctx.lineWidth = w;
      for (const s of segs) { ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1] + oy); for (const q of s.slice(1)) ctx.lineTo(q[0], q[1] + oy); ctx.stroke(); }
    }
    ctx.restore();
  }
  const packR = (dv, f) => { const rm = DEV[dv].rmax; return f <= 0.0005 ? 0 : Math.sqrt(HUB * HUB + clamp(f) * (rm * rm - HUB * HUB)); };
  const vPlay = (dv, speed) => speed / DEV[dv].reelIn; // ободов в секунду
  const Ltot = (dv) => vPlay(dv, 7.5) * TLEN;

  // ---------- холст ----------
  const oc = document.createElement('canvas'), octx = oc.getContext('2d');
  const tcv = document.createElement('canvas'); tcv.width = W; tcv.height = H; const tctx = tcv.getContext('2d');
  const Lr = (dv, k) => GR.devices[dv].layers[k];
  function drawAt(c, im, box, alpha = 1) { if (alpha <= 0) return; c.globalAlpha = alpha; c.drawImage(im, box[0], box[1]); c.globalAlpha = 1; }
  function rotM(rd, th, cx, cy) {
    const co = Math.cos(th), si = Math.sin(th), A = rd.A, Ai = rd.Ai;
    const RA = [[co * Ai[0][0] - si * Ai[1][0], co * Ai[0][1] - si * Ai[1][1]], [si * Ai[0][0] + co * Ai[1][0], si * Ai[0][1] + co * Ai[1][1]]];
    const Km = [[A[0][0] * RA[0][0] + A[0][1] * RA[1][0], A[0][0] * RA[0][1] + A[0][1] * RA[1][1]], [A[1][0] * RA[0][0] + A[1][1] * RA[1][0], A[1][0] * RA[0][1] + A[1][1] * RA[1][1]]];
    return [Km[0][0], Km[1][0], Km[0][1], Km[1][1], cx - Km[0][0] * cx - Km[0][1] * cy, cy - Km[1][0] * cx - Km[1][1] * cy];
  }
  function composeReel(dv, side, th, box) {
    const rd = REEL[dv][side], I = IM[dv];
    const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
    if (oc.width !== w || oc.height !== h) { oc.width = w; oc.height = h; } else { octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, w, h); }
    const M = rotM(rd, th * rd.sg, rd.c[0], rd.c[1]);
    const draw = (im, Mx) => { octx.setTransform(Mx[0], Mx[1], Mx[2], Mx[3], Mx[4] - x0, Mx[5] - y0); octx.drawImage(im, x0, y0); };
    octx.globalCompositeOperation = 'source-over'; draw(I[`reel-${side}-flat`], M);
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'hard-light'; octx.drawImage(I[`reel-${side}-light`], 0, 0);
    octx.globalCompositeOperation = 'destination-in'; draw(I[`reel-${side}-flat`], M);
    octx.globalCompositeOperation = 'source-over';
    draw(I[`reel-${side}-hub`], rotM(rd, th * rd.sg, rd.hc[0], rd.hc[1]));
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.drawImage(I[`reel-${side}-rim`], 0, 0);
  }
  function drawReel(ctx, dv, side, th, pr, blur = 0) {
    const rd = REEL[dv][side], I = IM[dv], box = Lr(dv, `reel-${side}-rim`);
    if (pr > 0) { // рулон (радиус намотки) — под фланцем
      ctx.save();
      ctx.setTransform(rd.A[0][0], rd.A[1][0], rd.A[0][1], rd.A[1][1], rd.c[0], rd.c[1]);
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, 2 * Math.PI); ctx.arc(0, 0, rd.hub - 0.05, 0, 2 * Math.PI, true); ctx.clip();
      ctx.drawImage(I['pack-' + side], -1, -1, 2, 2);
      ctx.restore();
    }
    const N = blur > 0.05 ? 6 : 1; // размытие на перемотке: копии фланца по дуге поворота за кадр
    for (let i = 0; i < N; i++) {
      ctx.globalAlpha = 1 / (i + 1);
      composeReel(dv, side, th - (N > 1 ? blur * i / (N - 1) : 0), box);
      ctx.drawImage(oc, box[0], box[1]);
    }
    ctx.globalAlpha = 1;
  }
  function drawNeedle(ctx, dv, k, deg) {
    const pr = GR.devices[dv].params[k], box = Lr(dv, k);
    ctx.save();
    ctx.beginPath(); pr.clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    ctx.translate(pr.pivot[0], pr.pivot[1]); ctx.rotate(deg * Math.PI / 180); ctx.translate(-pr.pivot[0], -pr.pivot[1]);
    ctx.drawImage(IM[dv][k], box[0], box[1]);
    ctx.restore();
  }
  function drawCounter(ctx, dv, s) {
    let vf = s.p * TLEN - s.cntOff; vf = ((vf % 10000) + 10000) % 10000;
    if (vf < 0.02 || vf > 9999.98) return; // 0000 — как на кадре
    const c = GR.devices[dv].counter, vi = Math.floor(vf), fr = vf - vi;
    ctx.save();
    ctx.font = `600 ${c.font}px "DejaVu Sans Mono", Consolas, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    c.x.forEach((x, i) => {
      const k = 3 - i, pw = 10 ** k, dgt = Math.floor(vi / pw) % 10;
      const roll = (vi % pw) === pw - 1 ? fr : 0; // барабан едет, когда младшие на 9
      ctx.save(); ctx.beginPath(); ctx.rect(x - c.w / 2, c.y - c.h / 2, c.w, c.h); ctx.clip();
      ctx.fillStyle = `rgb(${c.bg.join(',')})`; ctx.fillRect(x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      ctx.fillStyle = `rgb(${c.ink.join(',')})`;
      const step = c.h * 1.05;
      ctx.fillText(String(dgt), x, c.y + 1 - roll * step);
      if (roll > 0) ctx.fillText(String((dgt + 1) % 10), x, c.y + 1 + (1 - roll) * step);
      const g = ctx.createLinearGradient(0, c.y - c.h / 2, 0, c.y + c.h / 2);
      g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = g; ctx.fillRect(x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      ctx.restore();
    });
    ctx.restore();
  }
  function rrRender(dv) {
    const s = ST[dv], I = IM[dv], sc = RR[dv], ctx = sc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(I.base, 0, 0);
    const lidA = dv === 'rx' ? s.lid : 1; // TEAC: ролик и место ролика всегда (крышки нет)
    if (dv === 'rx') drawAt(ctx, I.lid, [0, 0], s.lid);
    drawAt(ctx, I['roller-hole'], Lr(dv, 'roller-hole'), lidA);
    const fL = 1 - s.p, fR = s.p, rl = packR(dv, fL), rr = packR(dv, fR);
    let seg = null;
    if (s.threaded) seg = [0, 1];
    if (s.anim && s.anim.kind === 'thread') seg = s.anim.from === 'L' ? [0, s.anim.u] : [1 - s.anim.u, 1];
    if (s.anim && s.anim.kind === 'tail') seg = s.anim.to === 'R' ? [s.anim.u, 1] : [0, 1 - s.anim.u];
    let P = null;
    if (seg && seg[1] > seg[0]) {
      P = tapePoly(dv, Math.max(rl, HUB), Math.max(rr, HUB), 1 - s.roller);
      tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, W, H);
      strokeTape(tctx, dv, P, seg[0], seg[1]);
      if (dv === 'rx' && s.lid < 1) { // под поднятой крышкой плёнку не видно
        tctx.globalCompositeOperation = 'destination-out'; tctx.globalAlpha = 1 - s.lid;
        tctx.drawImage(I.lidmask, Lr(dv, 'lidmask')[0], Lr(dv, 'lidmask')[1]);
        tctx.globalCompositeOperation = 'source-over'; tctx.globalAlpha = 1;
      }
      ctx.drawImage(tcv, 0, 0);
    }
    const blurOn = !reduce() && sc.root.clientWidth >= 700;
    const bl = (w) => (blurOn && Math.abs(w) > 5 ? clamp(Math.abs(w) / 30, 0, 0.9) * Math.sign(w) : 0);
    drawReel(ctx, dv, 'L', s.thL, rl, bl(s.wL));
    drawReel(ctx, dv, 'R', s.thR, rr, bl(s.wR));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const rs = GR.devices[dv].roller_shift, rb = Lr(dv, 'roller'); // ролик: в игре сдвиг к валу
    drawAt(ctx, I.roller, [rb[0] + rs[0] * s.roller, rb[1] + rs[1] * s.roller], lidA);
    if (P && dv === 'tc') { ctx.save(); ctx.beginPath(); ctx.rect(860, 530, 140, 70); ctx.clip(); ctx.drawImage(tcv, 0, 0); ctx.restore(); }
    if (!s.power) drawAt(ctx, I['off-patch'], Lr(dv, 'off-patch'));
    else if (dv === 'rx' && s.speed === 3.75) drawAt(ctx, I['lever-375'], Lr(dv, 'lever-375'));
    drawNeedle(ctx, dv, 'needle-1', s.vu[0]); drawNeedle(ctx, dv, 'needle-2', s.vu[1]);
    if (s.mode === 'play' && s.dir > 0 && s.roller > 0.5) drawAt(ctx, I['key-play'], Lr(dv, 'key-play'));
    if (s.flash && performance.now() < s.flash.until) { const k = DEV[dv].keys[s.flash.key]; ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(k[0], k[1] + 2, k[2] - k[0], k[3] - k[1] - 2); }
    drawCounter(ctx, dv, s);
    const kp = sc.pbox.querySelector('.kp'); if (kp) kp.style.opacity = rrPlaying(dv) && s.dir > 0 ? 1 : 0;
  }

  // ---------- физика ----------
  function setV(s, vT, ramp) { s.vT = vT; const ref = Math.max(Math.abs(vT), Math.abs(s.v), 1e-6); s.rate = ramp <= 0 ? Infinity : ref / ramp; }
  const isWinding = (s) => s.mode === 'ff' || s.mode === 'rew';
  function rrStep(dv, dt, now) {
    const s = ST[dv];
    if (dv === 'rx' && s.lid !== s.lidT) { const r = dr('lid'); s.lid = r <= 0 ? s.lidT : (s.lidT > s.lid ? Math.min(s.lidT, s.lid + dt / r) : Math.max(s.lidT, s.lid - dt / r)); }
    const rT = (s.mode === 'play' && s.power) ? 1 : 0, rd = dr('roller');
    s.roller = rd <= 0 ? rT : (rT > s.roller ? Math.min(1, s.roller + dt / rd) : Math.max(0, s.roller - dt / rd));
    if (reduce()) s.v = s.vT;
    else if (s.v !== s.vT) { const dv_ = s.rate * dt; s.v = Math.abs(s.vT - s.v) <= dv_ ? s.vT : s.v + Math.sign(s.vT - s.v) * dv_; }
    if (s.anim) {
      const A = s.anim, dur = Math.max(1e-3, A.dur);
      A.el += dt; A.u = clamp(A.el / dur);
      if (A.kind === 'thread' && A.phase === 'wind') { // приёмная делает 2–3 оборота, плёнка натягивается
        const k = A.u, turns = 2.5 * 2 * Math.PI;
        if (A.from === 'L') { s.thR = A.th0 + turns * k * REEL[dv].R.dir; s.p = 0.006 * k; } else { s.thL = A.th0 - turns * k * REEL[dv].L.dir; s.p = 1 - 0.006 * k; }
      }
      if (A.u >= 1) { s.anim = null; if (A.done) A.done(); }
    }
    if (s.mode === 'rev-wait' && s.rev) { s.rev.left -= dt; if (s.rev.left <= 0) { const dir = s.rev.dir; s.rev = null; s.mode = 'play'; s.dir = dir; s.lastDir = dir; setV(s, dir * vPlay(dv, s.speed), dr('spinup')); K.changed(); } }
    s.wL = s.wR = 0;
    if (s.threaded && s.v !== 0) {
      s.p = s.p + s.v * dt / Ltot(dv);
      const wL = s.v / Math.max(packR(dv, 1 - s.p), HUB), wR = s.v / Math.max(packR(dv, s.p), HUB);
      s.wL = clamp(wL, -CAP_W, CAP_W) * REEL[dv].L.dir; s.wR = clamp(wR, -CAP_W, CAP_W) * REEL[dv].R.dir;
      if (!reduce()) { s.thL += s.wL * dt; s.thR += s.wR * dt; }
      if (s.p >= 1 && s.v > 0) endForward(dv);
      else if (s.p <= 0 && s.v < 0) endReverse(dv);
    } else if (!s.threaded && s.v !== 0 && s.coast) { // хвост ушёл — катушка докручивается
      const side = s.coast, f = side === 'R' ? s.p : 1 - s.p;
      const ww = clamp(s.v / Math.max(packR(dv, f), HUB), -CAP_W, CAP_W) * REEL[dv][side].dir;
      s[side === 'R' ? 'wR' : 'wL'] = ww;
      if (!reduce()) s[side === 'R' ? 'thR' : 'thL'] += ww * dt;
    }
    const lvlK = s.mode === 'play' && s.power && s.threaded ? clamp(Math.abs(s.v) / vPlay(dv, s.speed)) : 0;
    for (let c = 0; c < 2; c++) {
      const n = 0.55 + 0.25 * Math.sin(now / 1000 * (2.1 + c * 0.7) + c) + 0.15 * Math.sin(now / 1000 * 7.3 + c * 2) + 0.1 * Math.sin(now / 1000 * 13.1 + c);
      const target = lvlK * (reduce() ? 0.6 : clamp(n)) * 62;
      s.vu[c] += (target - s.vu[c]) * (reduce() ? 1 : clamp(dt / 0.15));
    }
  }
  const rrMoving = (dv) => { const s = ST[dv]; return s.v !== 0 || s.vT !== 0 || !!s.anim || s.lid !== s.lidT || s.roller % 1 !== 0 || s.vu[0] > 0.05 || s.vu[1] > 0.05 || s.mode === 'rev-wait' || (s.flash && performance.now() < s.flash.until + 50); };
  function cap(dv, t, sec = 2.8) { if (RR[dv]) flash(RR[dv].cap, t, sec); }
  function endForward(dv) {
    const s = ST[dv]; s.p = 1;
    if (s.mode === 'rev-wait') return;
    if (dv === 'tc' && s.mode === 'play') { autoReverse(dv, -1); return; }
    tailOff(dv, 'R', dv === 'rx' ? 'End of tape: the tail passed the photo sensor — the Revox stopped.' : 'End of tape while winding: the tape ran off, the auto-stop arm dropped — stop.');
  }
  function endReverse(dv) {
    const s = ST[dv]; s.p = 0;
    if (s.mode === 'rev-wait') return;
    if (dv === 'tc' && s.mode === 'play') { autoReverse(dv, 1); return; }
    tailOff(dv, 'L', 'The tape ran off the right reel onto the left — the machine stopped, back to the start.');
  }
  function autoReverse(dv, dir) {
    const s = ST[dv];
    s.mode = 'rev-wait'; s.v = 0; s.vT = 0;
    cap(dv, dir < 0 ? 'Foil at the end — auto-reverse: playing the other way.' : 'Foil at the start — forward again.', 3);
    s.rev = { dir, left: dr('end') };
    K.changed();
  }
  function tailOff(dv, to, msg) {
    const s = ST[dv];
    s.threaded = false; s.mode = 'stop'; s.coast = to;
    setV(s, 0, dr('end'));
    s.anim = { kind: 'tail', to, u: 0, el: 0, dur: dr('end'), done: () => { s.coast = null; K.changed(); } };
    cap(dv, msg, 3.2); K.changed();
  }

  // ---------- действия ----------
  function keyFlash(dv, key) { ST[dv].flash = { key, until: performance.now() + ms(Math.max(reduce() ? 0.075 : TR.key, 0.075)) }; kick(); }
  function needPower(dv) { if (!ST[dv].power) { cap(dv, 'Power is off — press POWER first.', 2); return false; } return true; }
  function rrPlay(dv, dir = 1) {
    const s = ST[dv]; keyFlash(dv, dv === 'tc' && dir < 0 ? 'rev' : 'play');
    if (!needPower(dv) || s.anim) return;
    if (!s.threaded) { cap(dv, dv === 'rx' ? 'Tape isn’t threaded: lower the cover and tap the left reel.' : 'Tape isn’t threaded: tap the left reel to thread it.', 3); return; }
    if ((dir > 0 && s.p >= 1) || (dir < 0 && s.p <= 0)) { cap(dv, 'Tape is at the end — rewind it.', 2); return; }
    const was = s.mode;
    s.mode = 'play'; s.dir = dir; s.lastDir = dir;
    setV(s, dir * vPlay(dv, s.speed), was === 'ff' || was === 'rew' ? dr('windBrake') : dr('spinup'));
    if (was !== 'play') cap(dv, dv === 'tc' && dir < 0 ? '◀ — playing in reverse: pinch roller engaged, reels speeding up.' : 'PLAY: the pinch roller presses the tape against the capstan, reels speed up; the MC275 tubes glow.', 2.6);
  }
  function rrStop(dv) {
    const s = ST[dv]; keyFlash(dv, 'stop');
    if (!s.power || s.anim) return;
    if (s.mode === 'stop' && s.v === 0) { cap(dv, 'Stop.', 1); return; }
    const wasWind = isWinding(s);
    s.mode = 'stop'; setV(s, 0, wasWind ? dr('windBrake') : dr('brake'));
    cap(dv, wasWind ? 'STOP: the reels brake after winding.' : 'STOP: the pinch roller releases, reels brake; the MC275 cools down in 3–4 s.', 2.2);
  }
  function rrWind(dv, dir) {
    const s = ST[dv]; keyFlash(dv, dv === 'rx' ? (dir > 0 ? 'ffw' : 'rew') : 'fast');
    if (!needPower(dv) || s.anim) return;
    if (!s.threaded) { cap(dv, 'Tape isn’t threaded.', 1.6); return; }
    if ((dir > 0 && s.p >= 1) || (dir < 0 && s.p <= 0)) { cap(dv, dir > 0 ? 'All the tape is already on the right reel.' : 'Tape is already at the start.', 2); return; }
    s.mode = dir > 0 ? 'ff' : 'rew';
    const vff = Ltot(dv) / TR.wind;
    if (reduce()) { s.p = dir > 0 ? 1 : 0; s.v = dir * vff; if (dir > 0) endForward(dv); else endReverse(dv); s.v = 0; s.vT = 0; return; }
    setV(s, dir * vff, dr('windAcc'));
    cap(dv, dv === 'rx' ? (dir > 0 ? 'FFW: pinch roller off, fast forward, no sound.' : 'REW: rewinding, no sound.') : `FAST: winding ${dir > 0 ? 'forward' : 'back'} (in the last play direction — to be checked).`, 2.4);
  }
  async function rrThread(dv, from) {
    const s = ST[dv];
    if (s.anim) return;
    if (dv === 'rx' && s.lidT < 1) { cap(dv, 'Lower the front cover first — tap it (above the keys).', 2.6); return; }
    if (!s.power) { cap(dv, 'Power is off — press POWER first.', 2.2); return; }
    if (from === 'L' && s.p > 0.5) { cap(dv, 'The left reel is empty — all the tape is on the right: tap the right reel.', 2.6); return; }
    if (from === 'R' && s.p < 0.5) { cap(dv, 'The tape end is on the left (full) reel.', 2.2); return; }
    cap(dv, from === 'L' ? (dv === 'rx' ? 'Threading: behind the tension arm, across the heads, between capstan and roller…' : 'Threading: into the slot under the head cover, past the roller, through the auto-stop arm…') : 'Threading from the right reel — then REW to rewind.', 2.6);
    kick();
    await new Promise((res) => { s.anim = { kind: 'thread', from, phase: 'path', u: 0, el: 0, dur: dr('thread'), done: res }; });
    // вторая фаза ставится из микрозадачи, когда цикл уже мог решить “стоп” — будим его снова
    await new Promise((res) => { s.anim = { kind: 'thread', from, phase: 'wind', u: 0, el: 0, dur: dr('windon'), th0: from === 'L' ? s.thR : s.thL, done: res }; kick(); });
    s.anim = null; s.threaded = true; s.mode = 'stop';
    if (from === 'L') s.cntOff = s.p * TLEN; // заправили с начала — счётчик 0000
    cap(dv, 'Threaded: a few turns on the reel, tape tensioned.' + (dv === 'rx' ? ' You can raise the cover now.' : ''), 2.4);
    K.changed();
  }
  function rrLid() {
    const s = ST.rx; if (s.anim) return;
    s.lidT = s.lidT ? 0 : 1;
    cap('rx', s.lidT ? 'Cover lowered: heads exposed, SPEAKERS OFF, REEL MOTORS OFF.' : 'Cover raised back in place.', 2.4);
    if (reduce()) s.lid = s.lidT;
  }
  function rrPower(dv, on) {
    const s = ST[dv];
    if (on === undefined) on = !s.power;
    if (on === s.power) return;
    s.power = on;
    if (!on) { const w = isWinding(s); s.mode = 'stop'; setV(s, 0, w ? dr('windBrake') : dr('brake')); }
    cap(dv, on ? `Power on — VU meters lit${dv === 'tc' ? ', POWER lamp lit' : ''}.` : 'Power off: VU meters and lamp go dark, the reels stop.', 2.2);
  }
  function rrSpeed(dv, sp) {
    const s = ST[dv], nm = sp === 7.5 ? '7½' : '3¾';
    if (dv === 'rx' && !s.power) { s.power = true; s.speed = sp; cap(dv, `Power on, speed ${nm}.`, 2); return; }
    if (s.speed === sp) { cap(dv, `Already at ${nm}.`, 1.2); return; }
    s.speed = sp;
    if (s.mode === 'play') setV(s, s.dir * vPlay(dv, sp), dr('spinup') * 0.5);
    cap(dv, `Speed ${nm} ips — reels and counter run ${sp === 7.5 ? 'twice as fast' : 'half as fast'}.${dv === 'rx' ? '' : ' There’s no frame of the pressed button.'}`, 3.2);
  }
  function rrReel(dv, side) {
    const s = ST[dv];
    if (s.anim) return;
    if (s.threaded) { cap(dv, `Tape is threaded — the reel won’t come off: wind the tape back first. ${dv === 'rx' ? 'The NAB adapter cap is locked by a 60° turn.' : 'A three-arm retainer holds the reel.'}`, 3.4); return; }
    rrThread(dv, side);
  }
  const rrPlaying = (dv) => { const s = ST[dv]; return s.mode === 'play' && s.power && s.threaded && Math.abs(s.v) > 0.02; };
  world.addSource(() => ['rx', 'tc'].filter(rrPlaying).map((dv) => DEV[dv].id));
  const cntReset = (dv) => { const s = ST[dv]; s.cntOff = s.p * TLEN; cap(dv, 'Counter reset to 0000.', 1.4); };
  const RZ = { // [рамка, действие, подпись, когда видна]
    rx: [
      [[245, 86, 681, 570], () => rrReel('rx', 'L'), 'Left reel: tape end — thread it'],
      [[736, 100, 1213, 608], () => rrReel('rx', 'R'), 'Right reel'],
      [[300, 545, 1190, 705], rrLid, 'Front cover: lower', (s) => s.lidT === 0],
      [[530, 555, 970, 655], () => rrZoom('rx', 'heads'), 'Heads close up', (s) => s.lidT === 1, 9],
      [[300, 656, 1190, 705], rrLid, 'Front cover: raise', (s) => s.lidT === 1],
      [[326, 690, 354, 748], () => rrWind('rx', -1), 'REW'],
      [[375, 692, 403, 750], () => rrWind('rx', 1), 'FFW'],
      [[425, 691, 453, 752], () => rrPlay('rx', 1), 'PLAY'],
      [[474, 694, 502, 752], () => rrStop('rx'), 'STOP'],
      [[524, 697, 552, 755], () => { keyFlash('rx', 'rec'); cap('rx', 'REC: no recording here.', 2); }, 'REC'],
      [[757, 705, 1035, 790], () => rrZoom('rx', 'keys'), 'VU meters and keys close up'],
      [[664, 498, 748, 526], () => rrZoom('rx', 'keys'), 'Counter'],
      [[752, 498, 784, 528], () => cntReset('rx'), 'Counter reset'],
      [[1043, 812, 1077, 842], () => rrSpeed('rx', 3.75), 'Speed 3¾'],
      [[1084, 812, 1116, 842], () => rrPower('rx', false), 'Power off'],
      [[1121, 830, 1155, 860], () => { if (!ST.rx.power) rrPower('rx', true); else rrSpeed('rx', 7.5); }, 'Speed 7½'],
      [[1060, 870, 1140, 935], () => rrPower('rx'), 'POWER lever: on / off'],
      [[315, 795, 560, 935], () => cap('rx', 'VOLUME, BALANCE, MONITOR — label only: speaker volume is set by the GAIN knobs on the MC275.', 2.4), 'VOLUME and BALANCE knobs'],
      [[755, 835, 1025, 945], () => cap('rx', 'LEVEL — recording levels: no recording here.', 2), 'LEVEL knobs'],
    ],
    tc: [
      [[303, 119, 675, 515], () => rrReel('tc', 'L'), 'Left reel: tape end — thread it'],
      [[697, 131, 1086, 523], () => rrReel('tc', 'R'), 'Right reel'],
      [[525, 515, 840, 640], () => rrZoom('tc', 'heads'), 'Heads close up', null, 9],
      [[333, 576, 387, 603], () => rrPlay('tc', -1), '◀ — play in reverse'],
      [[393, 579, 444, 606], () => rrWind('tc', ST.tc.lastDir), 'FAST'],
      [[453, 582, 506, 608], () => rrPlay('tc', 1), '▶ — play'],
      [[381, 627, 456, 656], () => rrStop('tc'), 'STOP'],
      [[1000, 652, 1036, 688], () => rrPower('tc'), 'POWER'],
      [[1072, 588, 1108, 624], () => rrSpeed('tc', 7.5), 'TAPE SPEED 7½'],
      [[1072, 633, 1108, 669], () => rrSpeed('tc', 3.75), 'TAPE SPEED 3¾'],
      [[517, 742, 885, 900], () => rrZoom('tc', 'keys'), 'VU meters and keys close up'],
      [[642, 127, 714, 170], () => cap('tc', 'TEAC counter: no close-up frame. The button on the right resets it.', 2.4), 'Counter'],
      [[722, 130, 762, 166], () => cntReset('tc'), 'Counter reset'],
      [[670, 455, 720, 505], () => cap('tc', 'TAPE TENSION — tension for the reel size: label only.', 2.2), 'TAPE TENSION'],
      [[990, 500, 1090, 570], () => cap('tc', 'Auto-stop arm: drops when the tape runs off.', 2.6), 'Auto-stop arm'],
      [[330, 700, 500, 900], () => cap('tc', 'AR-40S: LINE, MIC, MIC IN — recording levels, label only.', 2.2), 'AR-40S knobs'],
    ],
  };
  const ZR = { rx: { heads: [380, 520, 1140, 700], keys: [292, 600, 1185, 940] }, tc: { heads: [270, 435, 1155, 705], keys: [270, 510, 1155, 945] } };
  function buildRr(dv) {
    rrLoad(dv);
    const root = make(`<div class="stage"><div class="hero"><canvas width="${W}" height="${H}" aria-label="${DEV[dv].name} close up"></canvas></div>
      <div class="pview"><div class="pbox"></div></div><div class="caption"></div></div>`);
    const sc = RR[dv] = { root, hero: root.querySelector('.hero'), pv: root.querySelector('.pview'), pbox: root.querySelector('.pbox'), cap: root.querySelector('.caption'), zones: [] };
    sc.ctx = root.querySelector('canvas').getContext('2d');
    for (const [box, fn, label, when, z] of RZ[dv]) {
      const b = mkZone(sc.hero, W, H, box, () => { if (ST[dv].view !== 'hero') return; fn(); kick(); K.changed(); }, label);
      if (z) b.style.zIndex = z;
      sc.zones.push([b, when]);
    }
    sc.pv.addEventListener('click', (e) => { e.stopPropagation(); rrBack(dv); }); // крупно: мимо — назад
    rrUi(dv);
  }
  async function rrZoom(dv, kind) {
    const s = ST[dv], sc = RR[dv], im = IM[dv][kind], pb = sc.pbox;
    if (!ok(im)) return;
    pb.innerHTML = ''; pb.style.aspectRatio = `${im.naturalWidth}/${im.naturalHeight}`;
    const ar = im.naturalWidth / im.naturalHeight;
    pb.style.width = ar >= 1.5 ? '100%' : (ar / 1.5 * 100) + '%';
    const main = document.createElement('img'); main.src = im.src; main.alt = `${DEV[dv].name}: ${kind === 'heads' ? 'heads' : 'keys and meters'} close up`; main.draggable = false;
    pb.appendChild(main);
    if (kind === 'keys') {
      const kp = document.createElement('img'), b = Lr(dv, 'keys-play'); kp.src = IM[dv]['keys-play'].src; kp.alt = ''; kp.className = 'kp kn';
      Object.assign(kp.style, { left: pct(b[0], im.naturalWidth), top: pct(b[1], im.naturalHeight), width: pct(b[2] - b[0], im.naturalWidth), height: pct(b[3] - b[1], im.naturalHeight), opacity: 0 });
      pb.appendChild(kp);
    }
    s.view = 'close'; rrUi(dv);
    if (kind === 'heads') cap(dv, s.threaded ? 'Heads close up: tape path, tension arm, capstan and roller (static). Elsewhere — back.' : 'Heads close up — a frame with tape threaded (there’s no frame without tape). Elsewhere — back.', 3);
    else cap(dv, 'Keys and meters close up. Elsewhere — back.', 2);
    await zoomIn(sc.hero, sc.pv, ZR[dv][kind], TR.zoom);
  }
  async function rrBack(dv) {
    const s = ST[dv], sc = RR[dv];
    if (s.view === 'hero') return;
    s.view = 'hero'; rrUi(dv);
    await zoomOut(sc.hero, sc.pv, ZR[dv].keys, TR.back);
  }
  function rrUi(dv) {
    const sc = RR[dv]; if (!sc) return;
    for (const [b, when] of sc.zones) show(b, ST[dv].view === 'hero' && (!when || when(ST[dv])));
  }
  function rrHint(dv) {
    const s = ST[dv];
    if (!s.power) return dv === 'rx' ? 'Power is off: the POWER lever is at the bottom right.' : 'Power is off: the POWER button is by the lamp.';
    if (s.threaded) return dv === 'rx' ? 'Keys at the bottom left: REW, FFW, PLAY, STOP. Heads and meters — tap them.' : 'Keys under the heads: ◀, FAST, ▶, STOP. Heads and meters — tap them.';
    if (s.p > 0.5) return 'All the tape is on the right reel: tap the right reel to thread, then rewind.';
    return dv === 'rx' ? 'Lower the front cover (above the keys), then tap the left reel to thread.' : 'Tap the left reel to thread; then ▶ under the heads.';
  }

  // =====================================================================
  // Видео: JVC HR-3300 `a-video-deck` и Maxell T-120 `a-vhs-media` (VD-00 D-135, D-179…D-181)
  // =====================================================================
  const AV = 'assets/vd/';
  const GV = GEO.vd;
  const CW = 2172, CH = 724;
  const TVd = { zoom: 0.4, back: 0.4, sleeveUp: 0.35, turn: 0.4, pull: 0.4, sleeveBack: 0.3, key: 0.075, lidUp: 0.3, insert: 0.3, lidDown: 0.38,
    thread: 2.5, spinup: 0.5, rpsE: 0.4, rpsF: 0.12, cnt: 0.5, brake: 0.3, unthread: 1.5 };
  const VD = S.vd = { deck: 'idle', fade: null, busy: false, playKey: false, flash: null, v: 0, thL: 0, thR: 0, cnt: 0, phase: 0, view: 'hero' };
  // deck: idle (пусто, отсек опущен) · open (поднят пустой) · openC (поднят с кассетой) · loaded · threading · playing · unthreading
  const FRAME = { idle: 'base', open: 'open', openC: 'open-cassette', loaded: 'loaded', threading: 'loaded', playing: 'loaded', unthreading: 'loaded' };
  const vdRunning = () => ['threading', 'playing', 'unthreading'].includes(VD.deck);
  const VI = {}; // кадры деки
  const VREEL = {};
  if (GV) for (const side of ['L', 'R']) {
    const p = GV.params['reel-' + side], t = p.tilt_deg * Math.PI / 180, [a, b] = p.axes;
    const A = [[Math.cos(t) * a, -Math.sin(t) * b], [Math.sin(t) * a, Math.cos(t) * b]];
    VREEL[side] = { A, Ai: inv2(A), c: p.center, clip: p.clip, sg: Math.sign(A[0][0] * A[1][1] - A[0][1] * A[1][0]) };
  }
  let vdLoaded = false;
  function vdLoad() {
    if (vdLoaded) return; vdLoaded = true;
    const list = ['vd-base.webp', 'vd-loaded.webp', 'vd-open.webp', 'vd-open-cassette.webp', 'vd-close.webp'];
    for (const k of Object.keys(GV.layers)) list.push(k + '.webp');
    for (const k of Object.keys(GV.close_layers)) list.push(k + '.webp');
    for (const f of list) VI[f.replace(/\.(jpg|webp|png)$/, '')] = loadImg(AV + f);
  }
  const vdReady = () => vdLoaded && Object.values(VI).every(ok);
  function vRotM(rd, th) {
    const co = Math.cos(th), si = Math.sin(th), A = rd.A, Ai = rd.Ai, [cx, cy] = rd.c;
    const RA = [[co * Ai[0][0] - si * Ai[1][0], co * Ai[0][1] - si * Ai[1][1]], [si * Ai[0][0] + co * Ai[1][0], si * Ai[0][1] + co * Ai[1][1]]];
    const Km = [[A[0][0] * RA[0][0] + A[0][1] * RA[1][0], A[0][0] * RA[0][1] + A[0][1] * RA[1][1]], [A[1][0] * RA[0][0] + A[1][1] * RA[1][0], A[1][0] * RA[0][1] + A[1][1] * RA[1][1]]];
    return [Km[0][0], Km[1][0], Km[0][1], Km[1][1], cx - Km[0][0] * cx - Km[0][1] * cy, cy - Km[1][0] * cx - Km[1][1] * cy];
  }
  function vdReel(ctx, side, th) {
    const rd = VREEL[side], b = GV.layers['vd-reel-' + side];
    ctx.save();
    ctx.beginPath(); rd.clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    const M = vRotM(rd, th * rd.sg);
    ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    ctx.drawImage(VI['vd-reel-' + side], b[0], b[1]);
    ctx.restore();
    const p = GV.layers[`vd-reel-${side}-pin`];
    ctx.drawImage(VI[`vd-reel-${side}-pin`], p[0], p[1]);
  }
  function drawDrums(c, cn, val) {
    const vf = ((val % 1000) + 1000) % 1000, vi = Math.floor(vf), fr = vf - vi;
    c.save();
    c.font = `600 ${cn.font}px "DejaVu Sans", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    cn.x.forEach((x, i) => {
      const k = 2 - i, pw = 10 ** k, dgt = Math.floor(vi / pw) % 10;
      const roll = (vi % pw) === pw - 1 ? fr : 0;
      c.save(); c.beginPath(); c.rect(x - cn.w / 2, cn.y - cn.h / 2, cn.w, cn.h); c.clip();
      c.fillStyle = `rgb(${cn.bg.join(',')})`; c.fillRect(x - cn.w / 2, cn.y - cn.h / 2, cn.w, cn.h);
      c.fillStyle = `rgb(${cn.ink.join(',')})`;
      const st = cn.h * 0.9;
      c.fillText(String(dgt), x, cn.y + 1 - roll * st);
      if (roll > 0) c.fillText(String((dgt + 1) % 10), x, cn.y + 1 + (1 - roll) * st);
      const g = c.createLinearGradient(0, cn.y - cn.h / 2, 0, cn.y + cn.h / 2);
      g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(0.28, 'rgba(0,0,0,0)'); g.addColorStop(0.72, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
      c.fillStyle = g; c.fillRect(x - cn.w / 2, cn.y - cn.h / 2, cn.w, cn.h);
      c.restore();
    });
    c.restore();
  }
  // клавиши “для вида” — сдвиг куска того же кадра вниз (слоёв нет)
  const VKEYS = { pause: [524, 575, 576, 665], adub: [594, 568, 646, 656], rec: [654, 560, 706, 648], rew: [718, 553, 770, 642], stop: [783, 548, 836, 642], play: [838, 533, 913, 664], ff: [908, 533, 962, 624], eject: [970, 527, 1025, 620] };
  const VZK = { pause: [520, 575, 585, 665], adub: [585, 568, 650, 656], rec: [650, 560, 712, 648], rew: [712, 553, 777, 642], stop: [777, 548, 842, 642], play: [842, 533, 905, 664], ff: [905, 533, 967, 624], eject: [967, 527, 1030, 620] };
  const CKX = { pause: 536, adub: 706, rec: 874, rew: 1046, stop: 1220, play: 1386, ff: 1550, eject: 1720 };
  const VKN = { pause: 'PAUSE', adub: 'AUDIO DUB', rec: 'REC', rew: 'REW', stop: 'STOP', play: 'PLAY', ff: 'FF', eject: 'EJECT' };
  function pressShift(c, src, b, sh) {
    c.save(); c.beginPath(); c.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); c.clip();
    c.drawImage(src, b[0], b[1] - 2, b[2] - b[0], b[3] - b[1], b[0], b[1] - 2 + sh, b[2] - b[0], b[3] - b[1]);
    c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    c.restore();
  }
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  const flashOn = (k) => VD.flash && VD.flash.key === k && VD.flash.left > 0;
  let vdSc = null; // сцена деки: root, ctx, cctx, hero, pv, cap, zones, czones
  function vdRender() {
    const ctx = vdSc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const f = VD.fade, fa = f ? VI['vd-' + f.a] : VI['vd-' + FRAME[VD.deck]];
    ctx.drawImage(fa, 0, 0);
    if (f) { ctx.globalAlpha = ease(ease(clamp(f.t / Math.max(f.dur, 1e-6)))); ctx.drawImage(VI['vd-' + f.b], 0, 0); ctx.globalAlpha = 1; }
    const fr = f ? VI['vd-' + f.b] : fa;
    if (!f && ['loaded', 'threading', 'playing', 'unthreading'].includes(VD.deck)) { vdReel(ctx, 'L', VD.thL); vdReel(ctx, 'R', VD.thR); }
    if (VD.playKey || flashOn('play')) { const b = GV.layers['vd-key-play']; ctx.drawImage(VI['vd-key-play'], b[0], b[1]); }
    for (const k of ['stop', 'eject']) if (flashOn(k)) { const b = GV.layers['vd-key-' + k]; ctx.drawImage(VI['vd-key-' + k], b[0], b[1]); }
    for (const k of ['pause', 'adub', 'rec', 'rew', 'ff']) if (flashOn(k)) pressShift(ctx, fr, VKEYS[k], 5);
    drawDrums(ctx, GV.counter, VD.cnt); // часы RT-3300 — “0:01”, как на кадре (D-181)
    if (VD.view === 'close') {
      const c = vdSc.cctx, L = GV.close_layers;
      c.drawImage(VI['vd-close'], 0, 0);
      if (VD.playKey || flashOn('play')) { const b = L['vd-close-key-play']; c.drawImage(VI['vd-close-key-play'], b[0], b[1]); }
      for (const k of ['stop', 'eject']) if (flashOn(k)) { const b = L['vd-close-key-' + k]; c.drawImage(VI['vd-close-key-' + k], b[0], b[1]); }
      for (const k of ['pause', 'adub', 'rec', 'rew', 'ff']) if (flashOn(k)) pressShift(c, VI['vd-close'], [CKX[k] - 62, 352, CKX[k] + 62, 600], 12);
      drawDrums(c, GV.close_counter, VD.cnt);
    }
  }
  const vcap = (t, s = 2.8) => { if (vdSc) flash(vdSc.cap, t, s); };
  function fadeTo(a, b, dur) { kick(); return new Promise((res) => { VD.fade = { a, b, t: 0, dur: reduce() ? 0.1 : dur, res }; }); }
  function vFlash(k) { VD.flash = { key: k, left: Math.max(TVd.key, 0.06) }; kick(); }
  async function vdEject() {
    vFlash('eject');
    if (VD.busy) return;
    if (VD.deck === 'playing' || VD.deck === 'threading') { vcap('STOP first — the cassette comes out once stopped.', 2.6); return; }
    if (VD.deck === 'unthreading') { vcap('The tape is still unthreading from the drum — wait.', 1.8); return; }
    if (VD.deck === 'open' || VD.deck === 'openC') { vcap('The holder is already up.', 1.4); return; }
    VD.busy = true;
    const to = VD.deck === 'loaded' ? 'openC' : 'open';
    await fadeTo(FRAME[VD.deck], FRAME[to], TVd.lidUp);
    VD.deck = to; VD.busy = false; K.changed();
    if (to === 'open' && S.vhs.cass === 'hand') vcap('The holder is up — tap it and the cassette goes in.', 2.2);
  }
  async function vdInsert() {
    if (VD.busy || VD.deck !== 'open') return;
    if (S.vhs.cass !== 'hand') { vcap(S.vhs.cass === 'sleeve' ? 'The videocassette is in its sleeve on the shelf to the right of the deck.' : 'No cassette.', 2.4); return; }
    VD.busy = true;
    await fadeTo('open', 'open-cassette', TVd.insert);
    VD.deck = 'openC'; S.vhs.cass = 'deck'; VD.busy = false; K.changed();
    vcap('Cassette in the holder. Tap the top of the holder (above the window) to lower it until it clicks; tap the cassette to take it out.', 3.4);
  }
  async function vdClose() {
    if (VD.busy || !(VD.deck === 'open' || VD.deck === 'openC')) return;
    VD.busy = true;
    const to = VD.deck === 'openC' ? 'loaded' : 'idle';
    await fadeTo(FRAME[VD.deck], FRAME[to], TVd.lidDown);
    VD.deck = to; VD.busy = false; K.changed();
  }
  async function vdTakeOut() {
    if (VD.busy || VD.deck !== 'openC') return;
    const m = K.otherInHand(); if (m) { vcap(m, 2.4); return; }
    VD.busy = true;
    await fadeTo('open-cassette', 'open', TVd.insert);
    VD.deck = 'open'; S.vhs.cass = 'hand'; VD.busy = false; K.changed();
    vcap('Cassette in hand: put it back in the sleeve on the shelf to the right, or into the holder again.', 2.6);
  }
  function vdPlay() {
    if (VD.deck === 'loaded' && !VD.busy) { VD.playKey = true; VD.deck = 'threading'; VD.phase = 0; kick(); K.changed(); return; }
    vFlash('play');
    if (VD.deck === 'unthreading') { vcap('The tape is still unthreading from the drum — wait.', 1.6); return; }
    if (vdRunning()) return;
    if (VD.deck === 'open' || VD.deck === 'openC') vcap('Lower the holder first — tap the lid.', 2);
    else if (VD.deck === 'idle') vcap('Insert a cassette first: EJECT (the blue key) raises the holder.', 2.6);
  }
  function vdStop() {
    vFlash('stop');
    if (VD.deck === 'threading' || VD.deck === 'playing') { VD.playKey = false; VD.deck = 'unthreading'; VD.phase = 0; K.changed(); }
  }
  function vdKey(k) { if (k === 'play') vdPlay(); else if (k === 'stop') vdStop(); else if (k === 'eject') vdEject(); else { vFlash(k); vcap(`${VKN[k]} — for show only.`, 1.6); } }
  function vdStep(dt) {
    if (VD.fade) { VD.fade.t += dt; if (VD.fade.t >= VD.fade.dur) { const r = VD.fade.res; VD.fade = null; r(); } }
    if (VD.flash) { VD.flash.left -= dt; if (VD.flash.left <= 0) VD.flash = null; }
    if (VD.deck === 'threading') { VD.phase += dt; if (VD.phase >= (reduce() ? 0 : TVd.thread)) { VD.deck = 'playing'; K.changed(); } }
    const vT = VD.deck === 'playing' ? 1 : 0;
    if (reduce()) VD.v = vT;
    else if (vT > VD.v) VD.v = Math.min(vT, VD.v + dt / Math.max(TVd.spinup, 0.01));
    else VD.v = Math.max(vT, VD.v - dt / Math.max(TVd.brake, 0.01));
    if (VD.deck === 'unthreading') { VD.phase += dt; if (VD.phase >= (reduce() ? 0 : TVd.unthread) && VD.v <= 0) { VD.deck = 'loaded'; K.changed(); } }
    if (VD.v > 0 && !reduce()) {
      VD.thL -= 2 * Math.PI * TVd.rpsF * VD.v * dt; VD.thR -= 2 * Math.PI * TVd.rpsE * VD.v * dt;
      VD.cnt += TVd.rpsE * VD.v * TVd.cnt * dt;
    }
  }
  const vdMoving = () => !!VD.fade || !!VD.flash || VD.v > 0 || vdRunning();
  world.addSource(() => (VD.deck === 'playing' && VD.v > 0.02 ? ['a-video-deck'] : []));
  const VZ = [ // [рамка, действие, подпись, когда видна]
    [[330, 170, 1090, 420], () => vcap(S.vhs.cass === 'deck' ? 'The compartment opens with the EJECT key (STOP first if playing).' : 'The holder rises with the EJECT key (blue).', 2.2), 'Compartment lid', () => !['open', 'openC'].includes(VD.deck)],
    [[340, 50, 1110, 250], () => (VD.deck === 'open' && S.vhs.cass === 'hand' ? vdInsert() : vdClose()), 'Raised holder: insert a cassette or lower it', () => ['open', 'openC'].includes(VD.deck)],
    [[520, 100, 940, 215], () => vdTakeOut(), 'Cassette in the holder: take out', () => VD.deck === 'openC'],
    [[420, 250, 1040, 430], () => (VD.deck === 'openC' ? vdTakeOut() : S.vhs.cass === 'hand' ? vdInsert() : vcap('The holder is empty. Tap the lid to lower it.', 2)), 'Cassette in the holder', () => ['open', 'openC'].includes(VD.deck)],
    [[416, 736, 624, 804], () => vcap('RT-3300 clock — “0:01”, not set.', 2.2), 'Clock'],
    [[645, 734, 735, 780], () => vcap('HOUR, MIN — clock setting: label only.', 1.8), 'HOUR, MIN'],
    [[340, 730, 400, 810], () => vcap('SELECT (TIMER SET / TIME ADJ) — label only.', 1.8), 'SELECT'],
    [[1185, 470, 1315, 610], () => vcap('UHF — channel knob: label only (there’s no TV).', 2), 'UHF'],
    [[1330, 460, 1470, 600], () => vcap('VHF — channel knob: label only.', 1.8), 'VHF'],
    [[1058, 582, 1104, 624], () => vcap('SEARCH — label only.', 1.6), 'SEARCH'],
    [[1070, 676, 1134, 744], () => vcap('REC SELECT — label only.', 1.6), 'REC SELECT'],
    [[1220, 660, 1282, 722], () => vcap('VIDEO/TV — label only (no picture, sound through the speakers).', 2), 'VIDEO/TV'],
    [[1318, 648, 1372, 700], () => vcap('TIMER/SLEEP — label only.', 1.6), 'TIMER/SLEEP'],
    [[1392, 636, 1456, 722], () => vcap('POWER — the deck is always on, the clock is lit.', 2), 'POWER'],
    [[1046, 514, 1118, 566], () => vdZoom(), 'Counter — keys and counter close up'],
    [[1118, 516, 1156, 564], () => { VD.cnt = 0; vcap('Counter reset to 000.', 1.4); }, 'Counter reset'],
    ...Object.keys(VKEYS).map((k) => [VZK[k], () => vdKey(k), VKN[k]]),
  ];
  const ZRV = [500, 470, 1190, 700];
  function buildVd() {
    vdLoad();
    const root = make(`<div class="stage"><div class="hero"><canvas width="${W}" height="${H}" aria-label="JVC HR-3300 video recorder close up"></canvas></div>
      <div class="pview"><div class="pbox" style="aspect-ratio:${CW}/${CH}"><canvas width="${CW}" height="${CH}" aria-label="Keys and counter close up"></canvas></div></div><div class="caption"></div></div>`);
    vdSc = { root, hero: root.querySelector('.hero'), pv: root.querySelector('.pview'), pbox: root.querySelector('.pbox'), cap: root.querySelector('.caption'), zones: [] };
    const [c1, c2] = root.querySelectorAll('canvas');
    vdSc.ctx = c1.getContext('2d'); vdSc.cctx = c2.getContext('2d');
    for (const [box, fn, label, when] of VZ) {
      const b = mkZone(vdSc.hero, W, H, box, () => { if (VD.view !== 'hero') return; fn(); kick(); K.changed(); }, label);
      vdSc.zones.push([b, when]);
    }
    for (const k of Object.keys(CKX)) mkZone(vdSc.pbox, CW, CH, [CKX[k] - 62, 352, CKX[k] + 62, 600], () => { vdKey(k); kick(); K.changed(); }, VKN[k]);
    mkZone(vdSc.pbox, CW, CH, [2050, 360, 2130, 446], () => { VD.cnt = 0; vcap('Counter reset to 000.', 1.4); kick(); }, 'Counter reset');
    vdSc.pv.addEventListener('click', (e) => { e.stopPropagation(); vdBack(); }); // крупно: мимо — назад
    vdUi();
  }
  async function vdZoom() {
    if (VD.view === 'close') return;
    VD.view = 'close'; vdUi(); kick();
    vcap('Keys and counter close up — the keys work here too. Elsewhere — back.', 2.4);
    await zoomIn(vdSc.hero, vdSc.pv, ZRV, TVd.zoom);
  }
  async function vdBack() {
    if (VD.view !== 'close') return;
    VD.view = 'hero'; vdUi();
    await zoomOut(vdSc.hero, vdSc.pv, ZRV, TVd.back);
  }
  function vdUi() { if (vdSc) for (const [b, when] of vdSc.zones) show(b, VD.view === 'hero' && (!when || when())); }
  function vdHint() {
    if (VD.deck === 'idle') return S.vhs.cass === 'hand' ? 'Cassette in hand: EJECT (the blue key on the right) raises the holder.' : S.vhs.cass === 'sleeve' ? 'The deck is empty. The videocassette is in its sleeve on the shelf to the right of the deck.' : 'The deck is empty.';
    if (VD.deck === 'loaded') return 'Cassette inside: PLAY — threads the tape and plays; EJECT — holder up.';
    if (VD.deck === 'playing') return 'Playing: STOP to stop.';
    if (VD.deck === 'openC') return 'Cassette in the holder: top of the holder — lower; cassette — take out.';
    if (VD.deck === 'open') return S.vhs.cass === 'hand' ? 'The holder is up — tap it and the cassette goes in.' : 'Holder up and empty: tap it to lower.';
    return '';
  }

  // ---------- полка с футляром Maxell T-120 и осмотр (2.1–2.6) ----------
  const VW = 1152, VH = 768;
  const SV = [['sleeve-front', 'sleeve, front'], ['sleeve-spine', 'sleeve, spine'], ['sleeve-back', 'sleeve, back']];
  const CV = [['cassette-top', 'cassette, top'], ['cassette-bottom', 'cassette, bottom'], ['cassette-front-edge', 'cassette, front edge'], ['cassette-back-edge', 'cassette, back edge']];
  const vsrc = (k) => `${AV}vhs-${k}.webp`;
  const VSI = { view: null, idx: 0, sleeveOut: false }; // view: sleeve | pulled | cassette
  const vcard = document.createElement('div');
  vcard.className = 'vhs-card';
  vcard.innerHTML = '<div class="vc"><img class="a" alt="" draggable="false"><img class="b" alt="" aria-hidden="true" draggable="false" style="opacity:0"></div>';
  K.insp.insertBefore(vcard, K.inspHint);
  const vc = vcard.querySelector('.vc'), imA = vcard.querySelector('img.a'), imB = vcard.querySelector('img.b');
  const vzTurn = mkZone(vcard, VW, VH, [420, 60, 700, 675], () => K.run(vhsTurn), 'Turn');
  const vzPull = mkZone(vcard, VW, VH, [700, 60, 800, 675], () => K.run(vhsPull), 'Slide the cassette out of the open end', 'edge');
  // кассета в руке — уменьшенный вид сверху (как пластинка — кругом, D-194)
  const HC = [117, 147, 1035, 615];
  Object.assign(K.handVhs.style, { backgroundImage: `url(${vsrc('cassette-top')})`, backgroundSize: `${VW / (HC[2] - HC[0]) * 100}% auto`,
    backgroundPosition: `${HC[0] / (VW - (HC[2] - HC[0])) * 100}% ${HC[1] / (VH - (HC[3] - HC[1])) * 100}%` });
  function vhsSet() {
    const v = VSI.view, L = v === 'sleeve' ? SV : CV;
    K.inspLbl.textContent = 'Maxell T-120 — ' + (v === 'pulled' ? 'cassette sliding out' : L[VSI.idx][1]);
    let turnBox = null, pull = false;
    if (v === 'sleeve') {
      turnBox = [[420, 60, 700, 675], [520, 40, 630, 690], [417, 60, 735, 675]][VSI.idx];
      pull = VSI.idx === 0 && S.vhs.cass === 'sleeve';
      K.inspHint.textContent = 'tap — turn' + (pull ? ' · right edge — take out the cassette' : S.vhs.cass === 'deck' ? ' · the sleeve is empty — the cassette is in the deck' : '') + ' · elsewhere — sleeve back in place';
    } else if (v === 'cassette') {
      turnBox = VSI.idx < 2 ? [117, 147, 1035, 615] : [114, 300, 1035, 470];
      K.inspHint.textContent = 'tap — turn · elsewhere — the cassette stays in hand, carry it to the deck (EJECT raises the holder)';
    } else K.inspHint.textContent = '';
    show(vzTurn, !!turnBox); if (turnBox) zoneIn(vzTurn, VW, VH, ...turnBox);
    show(vzPull, pull);
  }
  const nextFrame = () => { void vc.offsetWidth; return new Promise((r) => setTimeout(r, 20)); };
  const cssT = (el, prop, t, fn = 'ease-in-out') => { el.style.transition = `${prop} ${ms(t)}ms ${fn}`; };
  async function flipTo(k) {
    const t = reduce() ? 0 : TVd.turn;
    if (!t) { imA.src = vsrc(k); return; }
    cssT(vc, 'transform', t / 2, 'ease-in'); vc.style.transform = 'rotateY(90deg)';
    await wait(t / 2);
    imA.src = vsrc(k); imB.style.transition = 'none'; imB.style.opacity = 0;
    vc.style.transition = 'none'; vc.style.transform = 'rotateY(-90deg)';
    await nextFrame();
    cssT(vc, 'transform', t / 2, 'ease-out'); vc.style.transform = 'none';
    await wait(t / 2);
  }
  async function vhsShowCard(view, idx, firstImg) { // футляр выходит с места и поворачивается лицом (2.1)
    VSI.view = view; VSI.idx = idx;
    imA.src = vsrc(firstImg); imB.style.transition = 'none'; imB.style.opacity = 0;
    K.inspBegin('vhs'); vhsSet();
    const up = reduce() ? 0 : TVd.sleeveUp, tn = reduce() ? 0 : TVd.turn;
    vc.style.transition = 'none'; vc.style.transform = 'translateY(30%) scale(.5) rotateY(75deg)';
    K.insp.style.transition = 'none'; K.insp.style.opacity = 0;
    await nextFrame();
    cssT(K.insp, 'opacity', reduce() ? 0.1 : up * 0.6, 'ease-out'); K.insp.style.opacity = 1;
    cssT(vc, 'transform', up + tn, 'cubic-bezier(.3,.7,.3,1)'); vc.style.transform = 'none';
    await wait(reduce() ? 0.1 : up + tn);
  }
  async function vhsCloseCard() { // 2.5–2.6: футляр на место
    const t = reduce() ? 0 : TVd.sleeveBack;
    cssT(vc, 'transform', t, 'ease-in'); vc.style.transform = 'translateY(30%) scale(.5) rotateY(75deg)';
    VSI.view = null;
    await K.inspEnd(t);
    vc.style.transition = 'none'; vc.style.transform = 'none';
    if (VSI.sleeveOut) { VSI.sleeveOut = false; await shelfFull(true); }
  }
  async function vhsOpenSleeve() {
    VSI.sleeveOut = true; shelfFull(false);
    await vhsShowCard('sleeve', 0, 'sleeve-front');
  }
  async function vhsTurn() {
    if (!VSI.view || VSI.view === 'pulled') return;
    const L = VSI.view === 'sleeve' ? SV : CV;
    VSI.idx = (VSI.idx + 1) % L.length; vhsSet();
    await flipTo(L[VSI.idx][0]);
  }
  async function vhsPull() { // 2.3: кассета выдвигается из открытой стороны, потом сверху
    if (VSI.view !== 'sleeve' || S.vhs.cass !== 'sleeve') return;
    VSI.view = 'pulled'; vhsSet();
    const t = reduce() ? 0 : TVd.pull;
    imB.src = vsrc('open-end'); imB.style.transition = 'none'; imB.style.opacity = 0; imB.style.transform = 'translateX(-4%)';
    await nextFrame();
    imB.style.transition = `opacity ${ms(reduce() ? 0.1 : t)}ms ease-out, transform ${ms(t)}ms ease-out`; imB.style.opacity = 1; imB.style.transform = 'none';
    await wait(reduce() ? 0.1 : t + 0.5);
    S.vhs.cass = 'hand'; VSI.view = 'cassette'; VSI.idx = 0; vhsSet();
    await flipTo('cassette-top');
    imB.style.transition = 'none'; imB.style.opacity = 0;
  }
  async function vhsHome() { // кассета из руки в футляр: выдвинутая — задвигается, футляр на место
    VSI.sleeveOut = true; shelfFull(false);
    await vhsShowCard('pulled', 0, 'open-end');
    await wait(reduce() ? 0.1 : TVd.pull);
    S.vhs.cass = 'sleeve'; VSI.view = 'sleeve'; vhsSet();
    imB.src = vsrc('sleeve-front'); imB.style.transition = `opacity ${ms(reduce() ? 0.1 : TVd.pull)}ms ease-in-out`; imB.style.opacity = 1;
    await wait(reduce() ? 0.1 : TVd.pull);
    imA.src = vsrc('sleeve-front'); imB.style.transition = 'none'; imB.style.opacity = 0;
    await vhsCloseCard();
  }
  K.kinds.vhs = {
    back: () => (VSI.view === 'pulled' ? Promise.resolve() : vhsCloseCard()), // мимо: футляр на место; кассета — остаётся в руке
    close: () => vhsCloseCard(),
    open: () => vhsShowCard('cassette', 0, 'cassette-top'), // нажатие на кассету в руке — осмотр
  };
  let shelfSc = null;
  function shelfFull(on) {
    if (!shelfSc) return Promise.resolve();
    return K.fade(shelfSc.empty, !on, reduce() ? 0.1 : (on ? TVd.sleeveBack : TVd.sleeveUp));
  }
  function buildShelf() {
    const root = make(`<div class="stage dark"><div class="shelfpic"><img src="${AV}vhs-shelf.webp" alt="Maxell T-120 sleeve on the shelf to the right of the deck" draggable="false">
      <img class="e" src="${AV}vhs-shelf-empty.webp" alt="" aria-hidden="true" draggable="false" style="opacity:0"></div><div class="caption"></div></div>`);
    shelfSc = { root, empty: root.querySelector('img.e'), cap: root.querySelector('.caption') };
    if (VSI.sleeveOut) shelfSc.empty.style.opacity = 1;
    shelfSc.zone = mkZone(root, W, H, [640, 60, 890, 990], () => {
      if (VSI.view) return;
      if (S.vhs.cass === 'hand') { K.run(vhsHome); return; }
      const m = K.otherInHand(); if (m) { flash(shelfSc.cap, m); return; }
      K.run(async () => { await vhsOpenSleeve(); if (S.vhs.cass === 'deck') flash(shelfSc.cap, 'The sleeve is empty — the cassette is in the deck.', 2); });
    }, 'Maxell T-120 sleeve: pick up');
  }
  world.on(() => { // подпись зоны полки — по тому, что в руке
    if (!shelfSc) return;
    const t = S.vhs.cass === 'hand' ? 'Sleeve: slip the cassette in and put it back' : 'Maxell T-120 sleeve: pick up';
    shelfSc.zone.title = t; shelfSc.zone.setAttribute('aria-label', t);
  });

  // =====================================================================
  // общий цикл: накал MC275, катушки, дека; рисуем только сцену, у которой стоит посетитель
  // =====================================================================
  let raf = false, last = 0;
  function kick() { if (!raf) { raf = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    try {
      if (GR) { rrStep('rx', dt, now); rrStep('tc', dt, now); }
      if (GV) vdStep(dt);
      mcStep(dt, now);
      for (const dv of ['rx', 'tc']) if (RR[dv] && RR[dv].root.isConnected && rrReady(dv)) rrRender(dv);
      if (vdSc && vdSc.root.isConnected && vdReady()) vdRender();
    } catch (e) { console.error(e); }
    const busyMc = MC.p > 0 && MC.p < 1 || !!MC.cageAnim || (MC.p > 0 && !world.playing().length) || (world.playing().length && MC.p < 1);
    const loading = (['rx', 'tc'].some((dv) => RR[dv] && RR[dv].root.isConnected && !rrReady(dv))) || (vdSc && vdSc.root.isConnected && !vdReady());
    if (busyMc || loading || (GR && (rrMoving('rx') || rrMoving('tc'))) || (GV && vdMoving())) requestAnimationFrame(loop);
    else { raf = false; }
  }
  world.on(() => { rrUi('rx'); rrUi('tc'); vdUi(); mcUi(); kick(); });

  // ---------- предметы с механикой: app.js ставит сцену вместо картинки “подойти” ----------
  function device(build, getRoot, onMount) {
    return {
      mount(container) {
        if (!getRoot()) build();
        container.appendChild(getRoot());
        K.changed(); kick();
        if (onMount) onMount();
      },
    };
  }
  const mcHint = () => hintOnce('mc', mq.cap, 'The tubes light up with PLAY on any source · mesh over the tubes — take off / put on the cage · panel bottom left — connections');
  Object.assign(RS.devices, {
    'a-receivers': device(buildMc, () => mcRoot, mcHint),
    'a-reel-to-reel': device(() => buildRr('rx'), () => RR.rx && RR.rx.root, () => flash(RR.rx.cap, rrHint('rx'), 4.5)),
    'a-reel-to-reel-2': device(() => buildRr('tc'), () => RR.tc && RR.tc.root, () => flash(RR.tc.cap, rrHint('tc'), 4.5)),
    'a-video-deck': device(buildVd, () => vdSc && vdSc.root, () => { const h = vdHint(); if (h) flash(vdSc.cap, h, 4); }),
    'a-vhs-media': device(buildShelf, () => shelfSc && shelfSc.root, () => hintOnce('vhs', shelfSc.cap, 'The Maxell T-120 sleeve stands spine out — tap to pick it up')),
  });
})();
