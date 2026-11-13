// RockShowcase — цепочка 6 “Угол C” (шаг 8.7): Sony Walkman TPS-L2, JVC RC-M90, Sharp GF-777 и истории STO-00.
// Код движений — из моушн-превью 7.24 (project/stage7/7.24-preview/index.html, D-184) без правок таймингов,
// переходы 7.22 (D-182), кадры D-183 → site/assets/cc/. Без веб-кнопок (D-006): кнопки превью заменены
// нажатиями на сам предмет; “крупно” (клавиши, наушники) — нажатие на эту часть, назад — нажатие мимо.
// Кассета бумбокса, вынутая из держателя, — ещё одна вещь “в руке” (общая рука devices.js, S.bb.hand):
// осмотр сторон A/B, вернуть — в открытый держатель своего бумбокса. Кассета Walkman лежит на столике рядом.
// Бумбоксы играют своими динамиками: в RS.world.playing() их нет — MC275 от них не зажигается (D-173, 7.22 разд. 5).
// Звук — sound.js (шаг 8.9): бумбоксы — своими динамиками, Walkman — “в наушниках”.
//
// Истории STO-00 “Журнал руками” (D-025, прототип 5.4): ручка радио выбирает тему (шкала светится, стрелка
// встаёт на тему) → посетитель сам открывает журнал рядом с радио на закладке темы → со страницы берёт кассету
// (ту же, что в кейсе) и несёт к деке на B; у аппаратов — переход к самому предмету. Тексты — утверждённые
// карточки каталога (content.story, ru). У радио и журнала своих картинок нет — временная рисованная графика.
(function () {
  'use strict';
  const RS = window.RS;
  if (!RS || !RS.kit) return;
  const K = RS.kit, S = K.S, W = K.W, H = K.H;
  const { make, place, wait, ms, flash, show } = K;
  const reduce = () => K.reduce();
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pct = (v, of) => (v / of * 100) + '%';
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  const SITE = window.__SITE__ || {};
  const G = (SITE.geo || {}).cc;
  const AC = 'assets/cc/';
  const loadImg = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
  const ok = (im) => im && im.complete && im.naturalWidth > 0;
  function zoneIn(el, w, h, x0, y0, x1, y1) { Object.assign(el.style, { left: pct((x0 + x1) / 2, w), top: pct((y0 + y1) / 2, h), width: pct(x1 - x0, w), height: pct(y1 - y0, h) }); }
  const hinted = new Set();
  function hintOnce(key, el, text) { if (hinted.has(key)) return; hinted.add(key); flash(el, text, 5); }
  const handMsg = () => K.otherInHand() || (S.vhs.cass === 'hand' ? 'You’re holding a videocassette — put it down first' : '');

  // ---------- тайминги (с) — 7.22 / превью 7.24, приняты владельцем (D-184) ----------
  const T = {
    zoom: 0.4, back: 0.4, key: 0.075, spinup: 0.3, brake: 0.2, rpsE: 0.4, rpsF: 0.12, wind: 2, windK: 6, needle: 0.15, needleFall: 0.4,
    wmDoor: 0.35, wmIns: 0.6, wmClose: 0.3, sway: 2.5, swayA: 1.5, duckDown: 0.2, duckUp: 0.3, duckLvl: 0.3, wmEject: 0.15, toTable: 0.4,
    logic: 0.2, light: 0.2, boxDoor: 0.35, holder: 0.3, boxClose: 0.3, turn: 0.4, cnt: 0.5,
    // журнал (прототип 5.4): стрелка шкалы, раскрыть / закрыть, перелистнуть, кассета со страницы
    tune: 0.35, magOpen: 0.45, magClose: 0.3, page: 0.5, take: 0.35,
  };
  const dw = (k) => (reduce() ? 0 : T[k]);

  // =====================================================================
  // Угол C: три аппарата на холсте (кадры и слои 7.24)
  // =====================================================================
  const DEV = {
    wm: { id: 'c-walkman', name: 'Sony Walkman TPS-L2', frames: ['base', 'loaded', 'open', 'open-cassette', 'keys-closeup', 'headphones'] },
    rc: { id: 'c-boombox-jvc', name: 'JVC RC-M90', frames: ['loaded', 'empty', 'open', 'open-cassette', 'keys-closeup'] },
    gf: { id: 'c-boombox-sharp', name: 'Sharp GF-777', frames: ['base', 'keys-closeup'] },
  };
  const I = {};
  const loaded = {};
  function load(dev) {
    if (loaded[dev] || !G) return; loaded[dev] = [];
    const add = (name, file) => { I[name] = loadImg(AC + file); loaded[dev].push(name); };
    for (const k of DEV[dev].frames) add(`${dev}-${k}`, `${dev}-${k}.webp`);
    for (const k of Object.keys(G.layers)) if (k.startsWith(dev + '-')) add(k, k + '.webp');
    if (dev !== 'wm') for (const x of ['A', 'B']) loadImg(`${AC}${dev}-insp-${x}.webp`); // осмотр — предзагрузка
  }
  const ready = (dev) => !!loaded[dev] && loaded[dev].every((n) => ok(I[n]));

  // ---------- состояние (часть общего автомата RS.world) ----------
  // исходное — как на героях (D-182): бумбоксы включены и с кассетами, Walkman пустой, кассета рядом на столике
  const CS = S.cc = {
    wm: { door: 'closed', cass: 'table', listen: false, v: 0, wind: null, thT: 0, thB: 0, hot: false, duck: 1, fade: null, busy: false, flash: null },
    rc: { door: 'closed', cass: 'in', playing: false, logic: null, v: 0, light: 0, wind: null, thL: 0, thR: 0, cnt: 0, fade: null, busy: false, flash: null, lv: [0, 0], vAll: 0 },
    gf: { d: { 1: { door: 'closed', cass: 'in', fade: null, th: [0, 0] }, 2: { door: 'closed', cass: 'in', fade: null, th: [0, 0] } },
      p: { 1: false, 2: false }, vd: { 1: 0, 2: 0 }, v: 0, wind: null, flash: null, lv: [0, 0], vAll: 0 },
  };
  let clock = 0;
  const isPlaying = (dev) => (dev === 'wm' ? CS.wm.listen && CS.wm.cass === 'in' && CS.wm.door === 'closed' : dev === 'rc' ? CS.rc.playing : CS.gf.p[1] || CS.gf.p[2]);
  const SC = {}; // сцены: root, hero, pv, pbox, cap, ctx, cctx, zones, view, closeKey
  const cap = (dev, t, s = 2.6) => { if (SC[dev]) flash(SC[dev].cap, t, s); };

  // ---------- рисование: общее ----------
  function L(c, name, alpha = 1) { const b = G.layers[name]; if (alpha <= 0) return; c.globalAlpha = alpha; c.drawImage(I[name], b[0], b[1]); c.globalAlpha = 1; }
  function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
  function rotLayer(c, name, cx, cy, th, alpha = 1, sx = 1, sy = 1) {
    // поворот слоя вокруг (cx, cy); sx, sy — полуоси эллипса (окошко под углом): p' = c + A·R·A⁻¹·(p − c)
    const b = G.layers[name]; if (alpha <= 0) return;
    c.save(); c.globalAlpha = alpha;
    c.translate(cx, cy); c.scale(sx, sy); c.rotate(th); c.scale(1 / sx, 1 / sy); c.translate(-cx, -cy);
    c.drawImage(I[name], b[0], b[1]); c.restore();
  }
  function pressShift(c, src, b, sh) {
    c.save(); c.beginPath(); c.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); c.clip();
    c.drawImage(src, b[0], b[1] - 2, b[2] - b[0], b[3] - b[1], b[0], b[1] - 2 + sh, b[2] - b[0], b[3] - b[1]);
    c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    c.restore();
  }
  function drawFade(c, D, frameNow) {
    const f = D.fade;
    c.drawImage(I[f ? f.a : frameNow], 0, 0);
    if (f) { c.globalAlpha = ease(ease(clamp(f.t / Math.max(f.dur, 1e-6)))); c.drawImage(I[f.b], 0, 0); c.globalAlpha = 1; }
  }
  function needle(c, p, name, ang) { // ang — градусы от вертикали
    c.save(); c.beginPath(); c.rect(p.clip[0], p.clip[1], p.clip[2] - p.clip[0], p.clip[3] - p.clip[1]); c.clip();
    rotLayer(c, name, p.pivot[0], p.pivot[1], ang * Math.PI / 180);
    c.restore();
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
      g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(0.28, 'rgba(0,0,0,0)'); g.addColorStop(0.72, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
      c.fillStyle = g; c.fillRect(x - cn.w / 2, cn.y - cn.h / 2, cn.w, cn.h);
      c.restore();
    });
    c.restore();
  }
  const flashOn = (D, k) => D.flash && D.flash.key === k && D.flash.left > 0;
  function keyFlash(D, k) { D.flash = { key: k, left: Math.max(T.key, 0.06) }; kick(); }
  function fadeTo(D, a, b, dur, extra = {}) {
    const p = new Promise((res) => { D.fade = Object.assign({ a, b, t: 0, dur: reduce() ? 0.1 : dur, res }, extra); });
    kick();
    return p;
  }
  function nudge(dev) { const h = SC[dev] && SC[dev].hero; if (!h || reduce()) return; h.animate([{ translate: '0 0' }, { translate: '4px 0' }, { translate: '-3px 0' }, { translate: '0 0' }], { duration: 150 }); }

  // =====================================================================
  // Sony Walkman TPS-L2 `c-walkman` (D-054/D-061, D-182…D-184): дверца рукой, LISTEN, STOP·EJECT, Hotline
  // =====================================================================
  const WMF = (s) => (s.door === 'closed' ? (s.cass === 'in' ? 'wm-loaded' : 'wm-base') : (s.cass === 'in' ? 'wm-open-cassette' : 'wm-open'));
  const WM_FACE = [862, 298, 1150, 890], WM_HINGE = 866;
  const WM_DOOR_POLY = [[692, 246], [848, 212], [862, 186], [866, 186], [866, 910], [858, 910], [692, 886]];
  function renderWM(c) {
    const s = CS.wm, p = G.params.wm, f = s.fade;
    const k = f ? clamp(f.t / Math.max(f.dur, 1e-6)) : 0;
    if (f && f.swing) wmSwing(c, f, ease(k));
    else if (f && f.slide) wmSlide(c, f, k);
    else drawFade(c, s, WMF(s));
    let ba = s.cass === 'table' ? 1 : 0;
    if (f && f.slide === 'in') ba = clamp(1 - k * 2.5);
    else if (f && f.slide === 'out') ba = clamp((k - 0.55) / 0.45);
    else if (f && 'ba' in f) ba = f.ba;
    if (f && f.slide && ba > 0 && ba < 1) { // 2.2 / 2.9: кассета со стола поднимается к плееру (или опускается обратно)
      const b = G.layers['wm-cassette-beside'], q = 1 - ba;
      c.save(); c.globalAlpha = ba; c.drawImage(I['wm-cassette-beside'], b[0] + 180 * q, b[1] - 140 * q); c.restore();
    } else L(c, 'wm-cassette-beside', ba);
    if (!f && s.door === 'closed' && s.cass === 'in') {
      for (const h of ['T', 'B']) {
        const q = p['hub-' + h], ax = q.axes, wb = p.window_box;
        c.save(); c.beginPath(); c.rect(wb[0], wb[1], wb[2] - wb[0], wb[3] - wb[1]); c.clip();
        rotLayer(c, 'wm-hub-' + h, q.center[0], q.center[1], h === 'T' ? s.thT : s.thB, 1, 1, ax[1] / ax[0]); c.restore();
      }
    }
    if (s.listen) L(c, 'wm-key-listen');
    for (const kk of ['ff', 'rew', 'stop']) if (flashOn(s, kk)) L(c, 'wm-key-' + kk);
    // 2.5: провод качается, пока играет (концы стоят)
    const A = reduce() ? 0 : T.swayA * s.v;
    if (A > 0.05) {
      const bgb = G.layers['wm-cable-bg'], cb = G.layers['wm-cable'], [y0, y1] = p.cable.y_range;
      c.drawImage(I['wm-cable-bg'], bgb[0], bgb[1]);
      const ph = Math.sin(2 * Math.PI * clock / T.sway), img = I['wm-cable'];
      for (let y = cb[1]; y < cb[3]; y += 3) {
        const dx = A * Math.sin(Math.PI * clamp((y - y0) / (y1 - y0))) * ph;
        c.drawImage(img, 0, y - cb[1], cb[2] - cb[0], 3, cb[0] + dx, y, cb[2] - cb[0], 3);
      }
    }
  }
  // 2.1 / 2.3: дверца поворачивается на петлях (левый край): закрытая сжимается к петлям, затем откинутая раскрывается
  function wmSwing(c, f, k) {
    const u = f.swing === 'open' ? k : 1 - k, cF = I[f.closedF], oF = I[f.openF], R = WM_FACE;
    c.drawImage(cF, 0, 0);
    c.drawImage(oF, R[0], R[1], R[2] - R[0], R[3] - R[1], R[0], R[1], R[2] - R[0], R[3] - R[1]); // отсек за дверцей
    if (u < 0.5) {
      const sc = Math.cos(u * Math.PI), w = (R[2] - R[0]) * sc;
      c.drawImage(cF, R[0], R[1], R[2] - R[0], R[3] - R[1], R[0], R[1], w, R[3] - R[1]);
      c.fillStyle = `rgba(0,0,0,${(0.45 * (1 - sc)).toFixed(3)})`; c.fillRect(R[0], R[1], w, R[3] - R[1]);
    } else {
      const sc = Math.sin((u - 0.5) * Math.PI);
      if (sc > 0.01) {
        c.save(); c.translate(WM_HINGE, 0); c.scale(sc, 1); c.translate(-WM_HINGE, 0);
        poly(c, WM_DOOR_POLY); c.clip(); c.drawImage(oF, 0, 0);
        c.fillStyle = `rgba(0,0,0,${(0.35 * (1 - sc)).toFixed(3)})`; c.fillRect(680, 180, 190, 740);
        c.restore();
      }
    }
  }
  // 2.2 / 2.9: кассета входит в отсек спереди (крупнее → на место) или выталкивается и уходит
  function wmSlide(c, f, k) {
    c.drawImage(I['wm-open'], 0, 0);
    const q = f.slide === 'in' ? ease(clamp((k - 0.25) / 0.75)) : 1 - ease(clamp(k / 0.7));
    if (f.slide === 'out' && k < 0.25) { // выталкивание: короткий рывок вперёд
      const b = G.layers['wm-cassette-in'], j = Math.sin(k / 0.25 * Math.PI) * 8;
      c.drawImage(I['wm-cassette-in'], b[0] + j, b[1] + j * 0.6); return;
    }
    const a = clamp(q * 2.2); if (a <= 0) return;
    const b = G.layers['wm-cassette-in'], cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, sc = 1.16 - 0.16 * q;
    c.save(); c.globalAlpha = a; c.translate(cx + 70 * (1 - q), cy + 50 * (1 - q)); c.scale(sc, sc); c.translate(-cx, -cy);
    c.drawImage(I['wm-cassette-in'], b[0], b[1]); c.restore();
  }
  function renderWMKeys(c) {
    const s = CS.wm;
    c.drawImage(I['wm-keys-closeup'], 0, 0);
    if (s.cass === 'in' && s.door === 'closed') L(c, 'wm-keys-closeup-window-cassette');
    if (s.listen) L(c, 'wm-keys-closeup-key-listen');
    for (const kk of ['ff', 'rew', 'stop']) if (flashOn(s, kk)) L(c, 'wm-keys-closeup-key-' + kk);
    if (s.hot) pressShift(c, I['wm-keys-closeup'], [130, 168, 330, 292], 6);
  }
  async function wmDoor() {
    const s = CS.wm; if (s.busy) return;
    if (s.door === 'closed') {
      if (s.listen) { nudge('wm'); cap('wm', 'STOP·EJECT first — the door won’t open while LISTEN is down.', 2.6); return; }
      s.busy = true;
      const to = s.cass === 'in' ? 'wm-open-cassette' : 'wm-open';
      await fadeTo(s, WMF(s), to, T.wmDoor, { swing: 'open', closedF: WMF(s), openF: to, ba: s.cass === 'table' ? 1 : 0 });
      s.door = 'open'; s.busy = false; wmUi();
      if (s.cass === 'table') cap('wm', 'Door opened by hand. The cassette is on the table at the bottom left — put it in.', 2.4);
    } else {
      s.busy = true;
      const to = s.cass === 'in' ? 'wm-loaded' : 'wm-base';
      await fadeTo(s, WMF(s), to, T.wmClose, { swing: 'close', closedF: to, openF: WMF(s), ba: s.cass === 'table' ? 1 : 0 });
      s.door = 'closed'; s.busy = false; wmUi();
    }
  }
  async function wmInsert() {
    const s = CS.wm; if (s.busy || s.cass !== 'table') return;
    if (s.door === 'closed') { cap('wm', 'Open the door first — tap it (by hand).', 2.2); return; }
    s.busy = true;
    await fadeTo(s, 'wm-open', 'wm-open-cassette', T.wmIns, { slide: 'in' });
    s.cass = 'in'; s.busy = false; wmUi(); // щелчок “до упора”
  }
  async function wmToTable(fromEject) {
    const s = CS.wm; if (s.busy || s.cass !== 'in' || s.door !== 'open') return;
    s.busy = true;
    await fadeTo(s, 'wm-open-cassette', 'wm-open', (fromEject ? T.wmEject : 0.1) + T.toTable, { slide: 'out' });
    s.cass = 'table'; s.busy = false; wmUi();
  }
  function wmListen() {
    const s = CS.wm;
    if (s.listen) { cap('wm', 'LISTEN is already down. STOP·EJECT to stop.', 1.8); return; }
    if (s.door === 'open') { cap('wm', 'Close the door first — tap it.', 2); return; }
    s.listen = true; s.wind = null;
    if (s.cass !== 'in') cap('wm', 'No cassette: the key latched, the motor spins idle, no sound.', 2.6);
    else cap('wm', 'Playing “in the headphones”. Hold Hotline (orange): the music gets quieter.', 2.6);
  }
  function wmStop() {
    const s = CS.wm; keyFlash(s, 'stop');
    if (s.listen) { s.listen = false; return; }
    if (s.wind) { s.wind = null; return; }
    if (s.door === 'open' && s.cass === 'in') { wmToTable(true); return; }
    if (s.door === 'closed') cap('wm', 'The door opens by hand — tap it.', 2.2);
  }
  function wmWind(dir) {
    const s = CS.wm; keyFlash(s, dir > 0 ? 'ff' : 'rew');
    if (s.listen) { cap('wm', 'STOP·EJECT first.', 1.6); return; }
    if (s.cass !== 'in' || s.door !== 'closed') { cap('wm', 'No cassette — nothing to wind.', 1.8); return; }
    s.wind = { left: T.wind, dir };
  }
  function wmHot(on) {
    const s = CS.wm; s.hot = on; kick();
    if (on) cap('wm', isPlaying('wm') ? 'Hotline: while you hold it, the music is quieter (for talking together).' : 'Hotline — hold while playing: the music gets quieter.', 2);
  }

  // =====================================================================
  // JVC RC-M90 `c-boombox-jvc` (BB-00 D-121, D-182…D-184): одна дека, рычажок EJECT, PLAY “full logic”
  // =====================================================================
  const RCF = (s) => (s.door === 'closed' ? (s.cass === 'in' ? 'rc-loaded' : 'rc-empty') : (s.cass === 'in' ? 'rc-open-cassette' : 'rc-open'));
  const RC_DECOR = { rec: [1068, 686, 1090, 705], pause: [1099, 686, 1119, 705], rm: [1099, 718, 1120, 739] };
  const RC_DECOR_C = { rec: [912, 504, 1056, 600], pause: [1152, 504, 1308, 600], rm: [1146, 660, 1310, 766] };
  const RC_NAME = { rec: 'REC', pause: 'PAUSE', rm: 'REC MUTE' };
  function renderRC(c) {
    const s = CS.rc, p = G.params.rc;
    drawFade(c, s, RCF(s));
    if (!s.fade && s.door === 'closed' && s.cass === 'in') {
      L(c, 'rc-deck-light', s.light);
      c.save(); poly(c, p.window_poly); c.clip();
      for (const side of ['L', 'R']) {
        const q = p['reel-' + side], th = side === 'L' ? s.thL : s.thR;
        rotLayer(c, `rc-reel-${side}-off`, q.center[0], q.center[1], th, 1);
        rotLayer(c, `rc-reel-${side}`, q.center[0], q.center[1], th, s.light);
      }
      c.restore();
      L(c, 'rc-reel-glare-off', 1 - s.light); L(c, 'rc-reel-glare', s.light);
    }
    const sw = p['needle-L'].swing_deg;
    needle(c, p['needle-L'], 'rc-needle-L', sw[0] + (sw[1] - sw[0]) * s.lv[0]);
    needle(c, p['needle-R'], 'rc-needle-R', sw[0] + (sw[1] - sw[0]) * s.lv[1]);
    for (const k of ['play', 'stop', 'review', 'cue']) if (flashOn(s, k)) L(c, 'rc-key-' + k);
    if (flashOn(s, 'eject')) L(c, 'rc-eject-lever');
    const fr = I[s.fade ? s.fade.b : RCF(s)];
    for (const k in RC_DECOR) if (flashOn(s, k)) pressShift(c, fr, RC_DECOR[k], 2);
    drawDrums(c, G.counter, s.cnt);
  }
  function renderRCKeys(c) {
    const s = CS.rc;
    c.drawImage(I['rc-keys-closeup'], 0, 0);
    for (const k of ['play', 'stop', 'review', 'cue']) if (flashOn(s, k)) L(c, 'rc-keys-closeup-key-' + k);
    if (flashOn(s, 'eject')) L(c, 'rc-keys-closeup-eject');
    for (const k in RC_DECOR_C) if (flashOn(s, k)) pressShift(c, I['rc-keys-closeup'], RC_DECOR_C[k], 6);
    drawDrums(c, G.close_counter, s.cnt);
  }
  function rcPlay() {
    const s = CS.rc; keyFlash(s, 'play');
    if (s.busy) return;
    if (s.door === 'open') { cap('rc', 'Close the door first — tap it.', 2); return; }
    if (s.cass !== 'in') { cap('rc', 'No cassette.', 1.6); return; }
    if (s.playing || s.logic) return;
    s.wind = null;
    s.logic = { left: T.logic, then: () => { s.playing = true; rcUi(); } }; // full logic: клавиша вернулась, механизм догоняет
  }
  function rcStop() {
    const s = CS.rc; keyFlash(s, 'stop');
    if (s.logic) { s.logic = null; return; }
    if (s.playing) { s.playing = false; rcUi(); }
    s.wind = null;
  }
  async function rcEject() {
    const s = CS.rc; keyFlash(s, 'eject');
    if (s.busy) return;
    if (s.door === 'open') { cap('rc', 'The door is already open. Tap the bottom of the door to close it.', 1.8); return; }
    s.busy = true;
    if (s.playing || s.logic) { // 3.5 ориентир: логика сама ставит STOP, потом дверца
      s.playing = false; s.logic = null; rcUi();
      await wait(dw('logic'));
    }
    s.wind = null;
    await fadeTo(s, RCF(s), s.cass === 'in' ? 'rc-open-cassette' : 'rc-open', T.boxDoor);
    s.door = 'open'; s.busy = false; rcUi();
    cap('rc', s.cass === 'in' ? 'Cassette in the holder: tap — take out; bottom of the door — close.' : 'The holder is empty.', 2.4);
  }
  async function rcClose() {
    const s = CS.rc; if (s.busy || s.door !== 'open') return;
    s.busy = true;
    await fadeTo(s, RCF(s), s.cass === 'in' ? 'rc-loaded' : 'rc-empty', T.boxClose);
    s.door = 'closed'; s.busy = false; rcUi();
  }
  async function rcCass() {
    const s = CS.rc; if (s.busy || s.door !== 'open') return;
    if (s.cass === 'in') {
      const m = handMsg(); if (m) { cap('rc', m, 2.4); return; }
      s.busy = true; await fadeTo(s, 'rc-open-cassette', 'rc-open', T.holder);
      s.cass = 'none'; S.bb.hand = 'rc'; s.busy = false; rcUi(); K.changed();
      bbOpen('rc', IFROM.rc);
    } else if (S.bb.hand === 'rc') {
      s.busy = true; await fadeTo(s, 'rc-open', 'rc-open-cassette', T.holder);
      s.cass = 'in'; S.bb.hand = null; s.busy = false; rcUi(); K.changed();
    } else if (S.bb.hand === 'gf') cap('rc', 'You’re holding the cassette from the Sharp GF-777 — it goes back to its own boombox.', 2.4);
    else cap('rc', 'The holder is empty. Bottom of the door — close.', 2);
  }
  function rcWind(dir) {
    const s = CS.rc; keyFlash(s, dir > 0 ? 'cue' : 'review');
    if (s.playing) { cap('rc', 'STOP first (no cueing during play here).', 1.8); return; }
    if (s.cass !== 'in' || s.door !== 'closed') { cap('rc', 'No cassette.', 1.4); return; }
    s.wind = { left: T.wind, dir };
  }
  function rcDecor(k) { keyFlash(CS.rc, k); cap('rc', `${RC_NAME[k]} — for show only.`, 1.6); }

  // =====================================================================
  // Sharp GF-777 `c-boombox-sharp` (BB-00 D-100, D-182…D-184): две деки, play фиксируется, обе играют вместе
  // =====================================================================
  const GF_DECOR = { cut: [331, 488, 359, 512], pause1: [400, 488, 424, 512], edit: [440, 488, 464, 512], pause2: [478, 488, 502, 512], record: [510, 488, 537, 512] };
  const GF_C = { '1-eject': [96, 450, 224, 590], '1-play': [238, 446, 401, 590], '1-stop': [410, 450, 544, 590], '1-rewind': [556, 450, 664, 590], cut: [676, 450, 780, 590],
    '1-ffwd': [790, 450, 896, 590], pause1: [924, 450, 1020, 590], edit: [1064, 450, 1150, 590], pause2: [1192, 450, 1296, 590], record: [1320, 450, 1430, 590],
    '2-play': [1445, 452, 1577, 590], '2-stop': [1580, 450, 1716, 590], '2-rewind': [1728, 450, 1850, 590], '2-ffwd': [1860, 450, 1976, 590], '2-eject': [1986, 450, 2110, 590] };
  const GF_NAME = { cut: 'cut', pause1: 'pause (tape 1)', edit: 'edit', pause2: 'pause (tape 2)', record: 'record' };
  const GFZ = { 1: [144, 238, 464, 465], 2: [451, 238, 753, 465] }; // рамка слоёв деки (как open)
  const deckSt = (d) => (d.door === 'closed' ? (d.cass === 'in' ? 'loaded' : 'empty') : (d.cass === 'in' ? 'openC' : 'open'));
  const GFL = { empty: 'empty', open: 'open', openC: 'open-cassette' };
  function gfDeckDraw(c, n, st, alpha, spin) {
    if (alpha <= 0) return;
    if (st === 'loaded') {
      const b = GFZ[n]; c.globalAlpha = alpha;
      c.drawImage(I['gf-base'], b[0], b[1], b[2] - b[0], b[3] - b[1], b[0], b[1], b[2] - b[0], b[3] - b[1]); c.globalAlpha = 1;
      if (spin) {
        const d = CS.gf.d[n];
        ['L', 'R'].forEach((side, i) => { const q = G.params.gf[`hub-${n}${side}`]; rotLayer(c, `gf-hub-${n}${side}`, q.center[0], q.center[1], d.th[i], alpha); });
      }
    } else L(c, `gf-deck${n}-${GFL[st]}`, alpha);
  }
  function renderGF(c) {
    const s = CS.gf, p = G.params.gf;
    c.drawImage(I['gf-base'], 0, 0);
    for (const n of [1, 2]) {
      const d = s.d[n], f = d.fade;
      if (f) { gfDeckDraw(c, n, f.a, 1, false); gfDeckDraw(c, n, f.b, ease(ease(clamp(f.t / Math.max(f.dur, 1e-6)))), false); }
      else gfDeckDraw(c, n, deckSt(d), 1, true);
    }
    const sw = p['needle-L'].swing_deg;
    needle(c, p['needle-L'], 'gf-needle-L', sw[0] + (sw[1] - sw[0]) * s.lv[0]);
    needle(c, p['needle-R'], 'gf-needle-R', sw[0] + (sw[1] - sw[0]) * s.lv[1]);
    for (const n of [1, 2]) {
      if (s.p[n] || flashOn(s, n + '-play')) L(c, `gf-key-${n}-play`);
      for (const k of ['eject', 'stop', 'rewind', 'ffwd']) if (flashOn(s, `${n}-${k}`)) L(c, `gf-key-${n}-${k}`);
    }
    for (const k in GF_DECOR) if (flashOn(s, k)) pressShift(c, I['gf-base'], GF_DECOR[k], 3);
  }
  function renderGFKeys(c) {
    const s = CS.gf;
    c.drawImage(I['gf-keys-closeup'], 0, 0);
    for (const n of [1, 2]) if (s.p[n] || flashOn(s, n + '-play')) L(c, `gf-keys-closeup-key-${n}-play`);
    for (const k in GF_C) if (!/play/.test(k) && flashOn(s, k)) pressShift(c, I['gf-keys-closeup'], GF_C[k], 14);
  }
  function gfPlay(n) {
    const s = CS.gf, d = s.d[n];
    if (s.p[n]) { cap('gf', `Deck ${n} play is already down. stop to stop.`, 1.6); return; }
    if (d.door === 'open') { keyFlash(s, n + '-play'); cap('gf', 'Close the door first — tap it.', 1.8); return; }
    if (d.cass !== 'in') { keyFlash(s, n + '-play'); cap('gf', `Deck ${n} is empty.`, 1.6); return; }
    if (s.p[3 - n]) cap('gf', 'Both decks play together, the sound mixes (tape operation “1 or & 2”).', 2.6);
    s.p[n] = true; if (s.wind && s.wind.n === n) s.wind = null; gfUi();
  }
  function gfStop(n) {
    const s = CS.gf; keyFlash(s, n + '-stop');
    if (s.p[n]) { s.p[n] = false; gfUi(); }
    if (s.wind && s.wind.n === n) s.wind = null;
  }
  function deckFade(n, a, b, dur) { const d = CS.gf.d[n]; const pr = new Promise((res) => { d.fade = { a, b, t: 0, dur: reduce() ? 0.1 : dur, res }; }); kick(); return pr; }
  async function gfEject(n) {
    const s = CS.gf, d = s.d[n]; keyFlash(s, n + '-eject');
    if (d.fade) return;
    if (s.p[n]) { cap('gf', 'stop first (mechanical keys).', 2.2); return; }
    if (d.door === 'open') { cap('gf', 'The door is already open. Tap the bottom of the door to close it.', 1.8); return; }
    if (s.wind && s.wind.n === n) s.wind = null;
    await deckFade(n, deckSt(d), d.cass === 'in' ? 'openC' : 'open', T.boxDoor);
    d.door = 'open'; gfUi();
    cap('gf', d.cass === 'in' ? `Deck ${n}: cassette in the holder on the door — tap to take it out.` : `Deck ${n}: the holder is empty.`, 2.4);
  }
  async function gfClose(n) {
    const d = CS.gf.d[n]; if (d.fade || d.door !== 'open') return;
    await deckFade(n, deckSt(d), d.cass === 'in' ? 'loaded' : 'empty', T.boxClose);
    d.door = 'closed'; gfUi();
  }
  async function gfCass(n) {
    const d = CS.gf.d[n]; if (d.fade) return;
    if (d.door !== 'open') { cap('gf', `The door of deck ${n} opens with the eject key.`, 1.8); return; }
    if (d.cass === 'in') {
      const m = handMsg(); if (m) { cap('gf', m, 2.4); return; }
      await deckFade(n, 'openC', 'open', T.holder);
      d.cass = 'none'; S.bb.hand = 'gf'; gfUi(); K.changed();
      bbOpen('gf', IFROM['gf' + n]);
    } else if (S.bb.hand === 'gf') {
      await deckFade(n, 'open', 'openC', T.holder);
      d.cass = 'in'; S.bb.hand = null; gfUi(); K.changed();
    } else if (S.bb.hand === 'rc') cap('gf', 'You’re holding the cassette from the JVC RC-M90 — it goes back to its own boombox.', 2.4);
    else gfClose(n);
  }
  function gfWind(n, dir) {
    const s = CS.gf, d = s.d[n]; keyFlash(s, `${n}-${dir > 0 ? 'ffwd' : 'rewind'}`);
    if (s.p[n]) { cap('gf', 'stop first.', 1.4); return; }
    if (d.cass !== 'in' || d.door !== 'closed') { cap('gf', `Deck ${n} is empty.`, 1.4); return; }
    s.wind = { left: T.wind, dir, n };
  }
  function gfDecor(k) { keyFlash(CS.gf, k); cap('gf', `${GF_NAME[k]} — for show only (no recording here).`, 1.8); }
  function gfKey(k) {
    const m = /^(\d)-(.+)$/.exec(k);
    if (!m) { gfDecor(k); return; }
    const n = +m[1], a = m[2];
    if (a === 'play') gfPlay(n); else if (a === 'stop') gfStop(n); else if (a === 'eject') gfEject(n); else gfWind(n, a === 'ffwd' ? 1 : -1);
  }

  // =====================================================================
  // кассета бумбокса в руке: осмотр сторон A / B (3.6 / 4.6), общий слой осмотра devices.js
  // =====================================================================
  const IFROM = { rc: [0.54, 0.68], gf1: [0.2, 0.33], gf2: [0.4, 0.33] }; // откуда кассета “выходит” в руку: держатель на дверце
  const fromT = (f) => `translate(${((f[0] - 0.5) * 116).toFixed(1)}%, ${((f[1] - 0.47) * 125).toFixed(1)}%) scale(.16)`;
  const BSIDE = [['A', 'side A'], ['B', 'side B']];
  const BI = { idx: 0, from: null, open: false };
  const bcard = document.createElement('div');
  bcard.className = 'bb-card';
  bcard.innerHTML = '<div class="vc"><img alt="" draggable="false"></div>';
  K.insp.insertBefore(bcard, K.inspHint);
  const bvc = bcard.querySelector('.vc'), bim = bcard.querySelector('img');
  const bzTurn = document.createElement('button');
  bzTurn.className = 'zone'; bzTurn.type = 'button'; bzTurn.setAttribute('aria-label', 'Turn the cassette'); bzTurn.title = 'Turn the cassette';
  zoneIn(bzTurn, 960, 640, 60, 60, 900, 580);
  bzTurn.addEventListener('click', (e) => { e.stopPropagation(); K.run(bbFlip); });
  bcard.appendChild(bzTurn);
  const bsrc = (i) => `${AC}${S.bb.hand}-insp-${BSIDE[i][0]}.webp`;
  const cssT = (el, prop, t, fn = 'ease-in-out') => { el.style.transition = `${prop} ${ms(t)}ms ${fn}`; };
  const nextFrame = () => { void bvc.offsetWidth; return new Promise((r) => setTimeout(r, 20)); };
  function bbSet() {
    K.inspLbl.textContent = 'Cassette ' + (S.bb.hand === 'rc' ? 'from the JVC RC-M90' : 'from the Sharp GF-777') + ' — ' + BSIDE[BI.idx][1];
    K.inspHint.textContent = 'tap — turn · elsewhere — the cassette stays in hand; return it to the open holder of ' + (S.bb.hand === 'rc' ? 'RC-M90' : 'either GF-777 deck');
  }
  function bbOpen(dev, from) {
    if (!S.bb.hand || BI.open) return Promise.resolve();
    return K.run(async () => {
      BI.open = true; BI.idx = 0; BI.from = from || BI.from || [0.5, 0.6];
      bim.src = bsrc(0); bbSet();
      K.inspBegin('bb');
      const t = dw('holder') + dw('turn');
      bvc.style.transition = 'none'; bvc.style.transform = fromT(BI.from);
      K.insp.style.transition = 'none'; K.insp.style.opacity = 0;
      await nextFrame();
      cssT(K.insp, 'opacity', reduce() ? 0.1 : t * 0.5, 'ease-out'); K.insp.style.opacity = 1;
      cssT(bvc, 'transform', reduce() ? 0 : t, 'cubic-bezier(.3,.7,.3,1)'); bvc.style.transform = 'none';
      await wait(reduce() ? 0.1 : t);
    });
  }
  async function bbFlip() {
    if (!BI.open) return;
    const t = dw('turn');
    BI.idx = 1 - BI.idx; bbSet();
    if (!t) { bim.src = bsrc(BI.idx); return; }
    cssT(bvc, 'transform', t / 2, 'ease-in'); bvc.style.transform = 'rotateY(90deg)';
    await wait(t / 2);
    bim.src = bsrc(BI.idx); bvc.style.transition = 'none'; bvc.style.transform = 'rotateY(-90deg)';
    await nextFrame();
    cssT(bvc, 'transform', t / 2, 'ease-out'); bvc.style.transform = 'none';
    await wait(t / 2);
  }
  async function bbClose() { // кассета остаётся в руке (маленькая в углу)
    if (!BI.open) return;
    const t = dw('holder');
    cssT(bvc, 'transform', reduce() ? 0 : t, 'ease-in'); bvc.style.transform = fromT(BI.from || [0.5, 0.6]);
    BI.open = false;
    await K.inspEnd(t);
    bvc.style.transition = 'none'; bvc.style.transform = 'none';
  }
  K.kinds.bb = {
    back: () => bbClose(),
    close: () => bbClose(),
    open: async () => { // нажатие на кассету в руке — осмотр (из угла, где рука)
      if (!S.bb.hand) return;
      BI.open = true; BI.idx = 0; BI.from = [0.1, 0.9]; bim.src = bsrc(0); bbSet();
      K.inspBegin('bb');
      const t = dw('turn');
      bvc.style.transition = 'none'; bvc.style.transform = fromT(BI.from);
      K.insp.style.transition = 'none'; K.insp.style.opacity = 0;
      await nextFrame();
      cssT(K.insp, 'opacity', reduce() ? 0.1 : t * 0.5, 'ease-out'); K.insp.style.opacity = 1;
      cssT(bvc, 'transform', reduce() ? 0 : t, 'cubic-bezier(.3,.7,.3,1)'); bvc.style.transform = 'none';
      await wait(reduce() ? 0.1 : t);
    },
  };

  // =====================================================================
  // шаг анимации (7.24): хабы, катушки, стрелки LEVEL / VU, Hotline, счётчик
  // =====================================================================
  function stepFade(D, dt) { if (D.fade) { D.fade.t += dt; if (D.fade.t >= D.fade.dur) { const r = D.fade.res; D.fade = null; r(); } } }
  function stepFlash(D, dt) { if (D.flash) { D.flash.left -= dt; if (D.flash.left <= 0) D.flash = null; } }
  function approach(v, to, dt, up, down) { if (reduce()) return to; return to > v ? Math.min(to, v + dt / Math.max(up, 0.01)) : Math.max(to, v - dt / Math.max(down, 0.01)); }
  function lvlNoise(t, seed) { // “уровень звука” заглушки 0…1: медленная волна + быстрые доли
    return clamp(0.52 + 0.18 * Math.sin(t * 1.3 + seed) + 0.14 * Math.sin(t * 4.1 + seed * 2) + 0.1 * Math.sin(t * 9.7 + seed * 3) * Math.sin(t * 2.2));
  }
  function stepLevels(D, on, dt, t) {
    for (let i = 0; i < 2; i++) {
      const target = on ? (reduce() ? 0.5 : Math.min(1, lvlNoise(t, i * 1.7) * D.vAll)) : 0;
      const tau = on ? T.needle : T.needleFall / 3;
      D.lv[i] = reduce() ? target : D.lv[i] + (target - D.lv[i]) * (1 - Math.exp(-dt / Math.max(tau, 0.01)));
    }
  }
  function step(dt) {
    clock += dt;
    const w = CS.wm; stepFade(w, dt); stepFlash(w, dt);
    const wOn = isPlaying('wm');
    w.v = approach(w.v, wOn ? 1 : 0, dt, T.spinup, T.brake);
    if (w.wind) { w.wind.left -= dt; if (w.wind.left <= 0) w.wind = null; }
    if (!reduce() && w.door === 'closed' && w.cass === 'in') {
      const k = w.v + (w.wind ? T.windK * w.wind.dir : 0);
      w.thT -= 2 * Math.PI * T.rpsE * k * dt; w.thB -= 2 * Math.PI * T.rpsF * k * dt; // против часовой (7.24-manual-checks п. 4)
    }
    w.duck = reduce() ? (w.hot ? T.duckLvl : 1) : w.hot ? Math.max(T.duckLvl, w.duck - dt * (1 - T.duckLvl) / Math.max(T.duckDown, 0.01)) : Math.min(1, w.duck + dt * (1 - T.duckLvl) / Math.max(T.duckUp, 0.01));
    const r = CS.rc; stepFade(r, dt); stepFlash(r, dt);
    if (r.logic) { r.logic.left -= dt; if (r.logic.left <= 0 || reduce()) { const fn = r.logic.then; r.logic = null; fn(); } }
    r.v = approach(r.v, r.playing ? 1 : 0, dt, T.spinup, T.brake);
    r.light = approach(r.light, r.playing ? 1 : 0, dt, T.light, T.brake);
    if (r.wind) { r.wind.left -= dt; if (r.wind.left <= 0) r.wind = null; }
    const rk = r.v + (r.wind ? T.windK * r.wind.dir : 0);
    if (!reduce() && rk) { r.thL += 2 * Math.PI * T.rpsF * rk * dt; r.thR += 2 * Math.PI * T.rpsE * rk * dt; r.cnt += T.rpsE * rk * T.cnt * dt; }
    r.vAll = r.v; stepLevels(r, r.playing, dt, clock);
    const g = CS.gf; stepFlash(g, dt);
    for (const n of [1, 2]) stepFade(g.d[n], dt);
    for (const n of [1, 2]) g.vd[n] = approach(g.vd[n], g.p[n] ? 1 : 0, dt, T.spinup, T.brake);
    g.v = Math.max(g.vd[1], g.vd[2]);
    if (g.wind) { g.wind.left -= dt; if (g.wind.left <= 0) g.wind = null; }
    if (!reduce()) for (const n of [1, 2]) {
      const k = g.vd[n] + (g.wind && g.wind.n === n ? T.windK * g.wind.dir : 0);
      if (k) { g.d[n].th[0] += 2 * Math.PI * T.rpsF * k * dt; g.d[n].th[1] += 2 * Math.PI * T.rpsE * k * dt; }
    }
    const sum = g.vd[1] + g.vd[2]; // две деки вместе — VU выше (смешение), но не за шкалу
    g.vAll = sum > 1 ? 1 + 0.25 * (sum - 1) : sum; stepLevels(g, g.p[1] || g.p[2], dt, clock + 3);
  }
  function moving() {
    const w = CS.wm, r = CS.rc, g = CS.gf;
    return !!(w.fade || w.flash || w.wind || w.v > 0.001 || w.listen || w.duck < 1 || w.hot
      || r.fade || r.flash || r.wind || r.logic || r.playing || r.v > 0.001 || r.light > 0.001 || r.lv[0] > 0.002 || r.lv[1] > 0.002
      || g.flash || g.wind || g.d[1].fade || g.d[2].fade || g.p[1] || g.p[2] || g.v > 0.001 || g.lv[0] > 0.002 || g.lv[1] > 0.002);
  }

  // =====================================================================
  // зоны нажатия: [рамка, действие, подпись, когда видна, держать (Hotline)]
  // =====================================================================
  const ZONES = {
    wm: [
      [[860, 190, 1160, 890], () => wmDoor(), 'Door — open by hand', () => CS.wm.door === 'closed'],
      [[700, 220, 860, 890], () => wmDoor(), 'Open door — close', () => CS.wm.door === 'open'],
      [[870, 300, 1100, 800], () => (CS.wm.cass === 'in' ? wmToTable(false) : wmDoor()), 'Cassette in the compartment — take it out onto the table', () => CS.wm.door === 'open'],
      [[10, 870, 400, 1015], () => wmInsert(), 'Cassette on the table — put it in', () => CS.wm.cass === 'table'],
      [[1258, 346, 1312, 460], () => wmListen(), 'LISTEN'],
      [[1258, 212, 1312, 268], () => wmWind(1), 'FF'],
      [[1258, 276, 1312, 330], () => wmWind(-1), 'REW'],
      [[1224, 296, 1258, 445], () => wmStop(), 'STOP·EJECT'],
      [[940, 170, 1020, 206], null, 'Hotline — hold', null, wmHot],
      [[1160, 150, 1320, 880], () => zoomTo('wm', 'keys'), 'Silver edge — keys close up'],
      [[70, 600, 780, 940], () => zoomTo('wm', 'phones'), 'Headphones — close up'],
    ],
    rc: [
      [[730, 600, 950, 758], () => rcCass(), 'Cassette in the holder: take out / put in', () => CS.rc.door === 'open'],
      [[706, 758, 962, 826], () => rcClose(), 'Door — close', () => CS.rc.door === 'open'],
      [[704, 584, 964, 680], () => cap('rc', 'The door opens with the EJECT lever under the keys.', 2), 'Compartment door', () => CS.rc.door === 'closed'],
      [[1006, 684, 1062, 706], () => rcStop(), 'STOP'],
      [[1004, 717, 1063, 745], () => rcPlay(), 'PLAY'],
      [[970, 717, 1003, 745], () => rcWind(-1), 'REVIEW'],
      [[1064, 717, 1094, 745], () => rcWind(1), 'CUE'],
      [[1064, 684, 1094, 707], () => rcDecor('rec'), 'REC'],
      [[1096, 684, 1122, 707], () => rcDecor('pause'), 'PAUSE'],
      [[1096, 716, 1124, 742], () => rcDecor('rm'), 'REC MUTE'],
      [[980, 760, 1034, 804], () => rcEject(), 'EJECT lever'],
      [[980, 604, 1030, 636], () => zoomTo('rc', 'keys'), 'Counter — keys close up'],
      [[1040, 600, 1140, 680], () => zoomTo('rc', 'keys'), 'Keys close up'],
      [[1050, 340, 1110, 410], () => { nudge('rc'); cap('rc', 'The knob is for show only: there’s no radio here.', 1.8); }, 'VOLUME / TUNING knob'],
      [[520, 160, 1260, 300], () => cap('rc', 'Radio dial — for show only.', 1.6), 'Radio dial'],
      [[770, 320, 1010, 385], () => cap('rc', 'The LEVEL needles swing with the sound while playing.', 1.8), 'LEVEL'],
    ],
    gf: [
      ...[1, 2].flatMap((n) => [
        [n === 1 ? [190, 280, 430, 378] : [470, 280, 745, 378], () => gfCass(n), `Deck ${n}: cassette — take out / put in`, () => CS.gf.d[n].door === 'open'],
        [n === 1 ? [150, 378, 458, 465] : [460, 378, 748, 465], () => gfClose(n), `Deck ${n}: door — close`, () => CS.gf.d[n].door === 'open'],
        [n === 1 ? [150, 244, 457, 458] : [457, 244, 746, 458], () => cap('gf', `The door of deck ${n} opens with the eject key (the far ${n === 1 ? 'left one' : 'right one'}).`, 2), `Deck ${n}`, () => CS.gf.d[n].door === 'closed'],
      ]),
      [[170, 486, 206, 516], () => gfEject(1), 'eject (tape 1)'],
      [[206, 486, 259, 516], () => gfPlay(1), 'play (tape 1)'],
      [[259, 486, 298, 516], () => gfStop(1), 'stop (tape 1)'],
      [[298, 486, 331, 516], () => gfWind(1, -1), 'rewind (tape 1)'],
      [[331, 486, 360, 516], () => gfDecor('cut'), 'cut'],
      [[360, 486, 395, 516], () => gfWind(1, 1), 'fast fwd (tape 1)'],
      [[398, 486, 428, 516], () => gfDecor('pause1'), 'pause (tape 1)'],
      [[436, 486, 468, 516], () => gfDecor('edit'), 'edit'],
      [[474, 486, 505, 516], () => gfDecor('pause2'), 'pause (tape 2)'],
      [[506, 486, 537, 516], () => gfDecor('record'), 'record'],
      [[537, 486, 577, 516], () => gfPlay(2), 'play (tape 2)'],
      [[577, 486, 616, 516], () => gfStop(2), 'stop (tape 2)'],
      [[616, 486, 651, 516], () => gfWind(2, -1), 'rewind (tape 2)'],
      [[651, 486, 687, 516], () => gfWind(2, 1), 'fast fwd (tape 2)'],
      [[687, 486, 722, 516], () => gfEject(2), 'eject (tape 2)'],
      [[150, 520, 746, 560], () => zoomTo('gf', 'keys'), 'Keys of both decks close up'],
      [[770, 280, 1040, 330], () => cap('gf', 'The VU needles show the decks that are playing.', 1.8), 'VU'],
      [[1040, 250, 1460, 330], () => cap('gf', 'Radio — for show only.', 1.6), 'Radio dial'],
      [[1320, 330, 1420, 420], () => { nudge('gf'); cap('gf', 'Tuning knob — for show only.', 1.6); }, 'TUNING'],
    ],
  };
  const CLOSE = { // крупные планы: размер кадра, рамка наезда на герое, рисование, зоны
    wm: {
      keys: { size: [1024, 1536], zr: [1150, 140, 1340, 520], render: renderWMKeys, zones: [
        [[759, 391, 940, 541], () => wmWind(1), 'FF'], [[759, 595, 940, 741], () => wmWind(-1), 'REW'],
        [[759, 812, 940, 1179], () => wmListen(), 'LISTEN'], [[600, 666, 702, 1141], () => wmStop(), 'STOP·EJECT'],
        [[130, 168, 330, 292], null, 'Hotline — hold', null, wmHot],
        [[330, 280, 560, 340], () => cap('wm', 'HEADPHONES A and B jacks: the headphone plug is in.', 2), 'HEADPHONES A / B'],
      ] },
      phones: { size: [1536, 1024], zr: [60, 580, 800, 960], render: (c) => c.drawImage(I['wm-headphones'], 0, 0), zones: [
        [[100, 100, 1436, 924], () => cap('wm', 'MDR-3L2 headphones with orange ear pads. The Walkman plays “in the headphones”.', 2.6), 'Headphones'],
      ] },
    },
    rc: {
      keys: { size: [1536, 1024], zr: [940, 580, 1140, 810], render: renderRCKeys, zones: [
        [[464, 504, 812, 600], () => rcStop(), 'STOP'], [[500, 660, 880, 766], () => rcPlay(), 'PLAY'],
        [[306, 660, 440, 766], () => rcWind(-1), 'REVIEW'], [[936, 660, 1076, 766], () => rcWind(1), 'CUE'],
        [RC_DECOR_C.rec, () => rcDecor('rec'), 'REC'], [RC_DECOR_C.pause, () => rcDecor('pause'), 'PAUSE'], [RC_DECOR_C.rm, () => rcDecor('rm'), 'REC MUTE'],
        [[616, 850, 786, 970], () => rcEject(), 'EJECT'],
        [[600, 170, 680, 240], () => { CS.rc.cnt = 0; cap('rc', 'Counter reset to 000.', 1.4); }, 'Counter reset'],
        [[850, 110, 940, 300], () => cap('rc', 'TIMER STANDBY — for show only.', 1.6), 'TIMER STANDBY'],
        [[1130, 110, 1240, 300], () => cap('rc', 'MULTI MUSIC SCANNER — for show only.', 1.6), 'MULTI MUSIC SCANNER'],
      ] },
    },
    gf: {
      keys: { size: [2172, 724], zr: [150, 440, 746, 560], render: renderGFKeys,
        zones: Object.entries(GF_C).map(([k, b]) => [b, () => gfKey(k), GF_NAME[k] || k.replace(/^(\d)-(.+)$/, '$2 (tape $1)')]) },
    },
  };
  const RENDER = { wm: renderWM, rc: renderRC, gf: renderGF };
  const UI = { wm: () => wmUi(), rc: () => rcUi(), gf: () => gfUi() };
  function wmUi() { devUi('wm'); }
  function rcUi() { devUi('rc'); }
  function gfUi() { devUi('gf'); }
  function devUi(dev) {
    const sc = SC[dev]; if (!sc) return;
    for (const [b, when, where] of sc.zones) show(b, sc.view === where && (!when || when()));
    kick();
  }

  function mkZ(parent, w, h, box, fn, label, hold, onAny) {
    const b = document.createElement('button');
    b.className = 'zone'; b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    zoneIn(b, w, h, ...box);
    if ((box[2] - box[0]) * (box[3] - box[1]) < 30000) b.style.zIndex = 9; // клавиши — поверх больших зон (торец, дверца)
    if (hold) { // Hotline: держать — пока нажато, музыка тише (2.6), на телефоне — долгое касание
      const up = () => { if (CS.wm.hot) hold(false); };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) { /* нет */ } hold(true); });
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', (e) => e.stopPropagation());
      b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold(true); } });
      b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    } else b.addEventListener('click', (e) => { e.stopPropagation(); fn(); onAny(); });
    parent.appendChild(b);
    return b;
  }
  function buildDev(dev) {
    load(dev);
    const root = make(`<div class="stage"><div class="hero"><canvas width="${W}" height="${H}" aria-label="${DEV[dev].name} close up"></canvas></div>
      <div class="pview"><div class="pbox"><canvas></canvas></div></div><div class="caption"></div></div>`);
    const sc = SC[dev] = { root, hero: root.querySelector('.hero'), pv: root.querySelector('.pview'), pbox: root.querySelector('.pbox'), cap: root.querySelector('.caption'), zones: [], view: 'hero' };
    const [c1, c2] = root.querySelectorAll('canvas');
    sc.ctx = c1.getContext('2d'); sc.ccv = c2; sc.cctx = c2.getContext('2d');
    for (const [box, fn, label, when, hold] of ZONES[dev]) {
      const b = mkZ(sc.hero, W, H, box, () => { if (sc.view === 'hero') fn(); }, label, hold, () => UI[dev]());
      sc.zones.push([b, when, 'hero']);
    }
    for (const [key, C] of Object.entries(CLOSE[dev])) {
      for (const [box, fn, label, when, hold] of C.zones) {
        const b = mkZ(sc.pbox, C.size[0], C.size[1], box, () => { if (sc.view === key) fn(); }, label, hold, () => UI[dev]());
        sc.zones.push([b, when, key]);
      }
    }
    sc.pv.addEventListener('click', (e) => { e.stopPropagation(); zoomBack(dev); }); // крупно: мимо — назад
    devUi(dev);
  }

  // ---------- крупно: наезд на часть героя, затем кадр крупного плана ----------
  function zoomT(r, k) {
    const [x0, y0, x1, y1] = r, s = 1 + (W / (x1 - x0) - 1) * k, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const X = (W / 2 - cx * s) * k, Y = (H / 2 - cy * s) * k;
    return `translate(${(X / W * 100).toFixed(3)}%, ${(Y / H * 100).toFixed(3)}%) scale(${s.toFixed(4)})`;
  }
  async function zoomTo(dev, key) {
    const sc = SC[dev], C = CLOSE[dev][key];
    if (sc.view !== 'hero' || !ready(dev)) return;
    sc.view = key; sc.closeKey = key;
    const [cw, ch] = C.size, ar = cw / ch;
    sc.ccv.width = cw; sc.ccv.height = ch;
    sc.pbox.style.aspectRatio = `${cw}/${ch}`;
    sc.pbox.style.width = ar >= W / H ? '100%' : (ar / (W / H) * 100) + '%';
    C.render(sc.cctx);
    devUi(dev);
    cap(dev, key === 'phones' ? 'Headphones close up. Elsewhere — back.' : 'Keys close up — they work here too. Elsewhere — back.', 2.2);
    const t = dw('zoom');
    sc.hero.style.transition = `transform ${ms(t)}ms ease-in-out`; sc.hero.style.transform = zoomT(C.zr, 1);
    sc.pv.style.transition = `opacity ${ms(reduce() ? 0.1 : t * 0.5)}ms ease-out ${ms(t * 0.5)}ms`; sc.pv.style.opacity = 1; sc.pv.classList.add('on');
    await wait(reduce() ? 0.1 : t);
  }
  async function zoomBack(dev) {
    const sc = SC[dev];
    if (!sc || sc.view === 'hero') return;
    const zr = CLOSE[dev][sc.view].zr, t = dw('back');
    if (CS.wm.hot) wmHot(false);
    sc.view = 'hero'; devUi(dev);
    sc.pv.style.transition = `opacity ${ms(reduce() ? 0.1 : t * 0.5)}ms ease-in`; sc.pv.style.opacity = 0; sc.pv.classList.remove('on');
    sc.hero.style.transition = `transform ${ms(t)}ms ease-in-out`; sc.hero.style.transform = zoomT(zr, 0);
    await wait(reduce() ? 0.1 : t);
  }

  // ---------- общий цикл: шаг всех трёх (играют и без посетителя), рисуем только сцену, у которой он стоит ----------
  let raf = false, last = 0;
  function kick() { if (!raf) { raf = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    let loading = false;
    try {
      step(dt);
      for (const dev of ['wm', 'rc', 'gf']) {
        const sc = SC[dev];
        if (!sc || !sc.root.isConnected) continue;
        if (!ready(dev)) { loading = true; continue; }
        sc.ctx.setTransform(1, 0, 0, 1, 0, 0);
        RENDER[dev](sc.ctx);
        if (sc.view !== 'hero') CLOSE[dev][sc.view].render(sc.cctx);
      }
    } catch (e) { console.error(e); }
    if (loading || moving()) requestAnimationFrame(loop);
    else raf = false;
  }
  // плеер “играет” видно и по состоянию автомата (world.json: c-walkman, c-boombox-jvc, c-boombox-sharp)
  RS.cornerC = {
    state: (dev) => {
      if (dev === 'wm') { const s = CS.wm; return isPlaying('wm') ? (s.hot ? 'hotline' : 'playing') : s.door === 'open' ? (s.cass === 'in' ? 'door_open_loaded' : 'door_open') : s.cass === 'in' ? 'loaded' : 'empty'; }
      if (dev === 'rc') { const s = CS.rc; return S.bb.hand === 'rc' ? 'in_hand' : s.playing ? 'playing' : s.door === 'open' ? (s.cass === 'in' ? 'door_open_loaded' : 'door_open') : 'loaded'; }
      const s = CS.gf; return S.bb.hand === 'gf' ? 'in_hand' : s.p[1] ? 'deck1_playing' : s.p[2] ? 'deck2_playing' : s.d[1].door === 'open' ? 'deck1_open' : s.d[2].door === 'open' ? 'deck2_open' : 'loaded';
    },
    playing: () => ['wm', 'rc', 'gf'].filter(isPlaying).map((d) => DEV[d].id),
  };

  function hintFor(dev) {
    if (dev === 'wm') {
      const s = CS.wm;
      if (s.door === 'open') return s.cass === 'in' ? 'Cassette in the compartment: door — close; cassette or STOP·EJECT — out onto the table.' : 'Door open: the cassette is on the table at the bottom left — put it in.';
      if (s.listen) return 'Playing “in the headphones”: hold Hotline (orange, on top) — quieter; STOP·EJECT — stop.';
      return s.cass === 'in' ? 'Cassette inside: LISTEN — play; FF / REW — wind; the door opens by hand.' : 'The player is empty, the cassette is on the table. The door opens by hand — tap it; right edge — keys close up.';
    }
    if (dev === 'rc') {
      const s = CS.rc;
      if (s.door === 'open') return s.cass === 'in' ? 'Cassette in the holder: tap — take out; bottom of the door — close.' : S.bb.hand === 'rc' ? 'Cassette in hand: tap the holder to put it in.' : 'The holder is empty.';
      if (s.playing) return 'Playing: reels, compartment light and LEVEL needles. STOP — stop; EJECT — the logic control stops the tape and opens the door by itself.';
      return 'On, cassette inside: PLAY — the key springs back and the logic control starts playback; EJECT lever under the keys — door.';
    }
    const s = CS.gf;
    if (s.p[1] && s.p[2]) return 'Both decks are playing — the sound mixes; press a deck’s stop to stop it.';
    if (s.p[1] || s.p[2]) { const n = s.p[1] ? 1 : 2; return `Deck ${n} is playing: play on deck ${3 - n} — joins in; stop — stop.`; }
    if (S.bb.hand === 'gf') return 'Cassette in hand: tap the open holder of either deck to put it in.';
    return 'Both decks are loaded: play on deck 1 or 2; eject — the door tilts forward, the cassette sits in the holder on the door.';
  }
  function device(dev) {
    return {
      mount(container) {
        if (!SC[dev]) buildDev(dev);
        container.appendChild(SC[dev].root);
        devUi(dev); kick();
        flash(SC[dev].cap, hintFor(dev), 4.5);
      },
    };
  }
  if (G) Object.assign(RS.devices, { 'c-walkman': device('wm'), 'c-boombox-jvc': device('rc'), 'c-boombox-sharp': device('gf') });

  // =====================================================================
  // Истории STO-00 “Журнал руками” `c-radio` (D-025, MECHANICS 5.4, прототип 5.4)
  // =====================================================================
  const THEMES = SITE.stories || [];
  if (!THEMES.length) return;
  const R = S.story = { theme: -1, open: false, page: 0, about: false }; // theme −1 — шкала погашена (world.json c-radio: off | tuned)
  // Кадры 9.7 (D-209): G9-story-off/-tuned (столик, радио, журнал; 1536×1024) и G9-journal-spread (разворот сверху).
  // Подписи тем на шкале, стрелка, метка на ручке и подсветка закладки — кодом поверх картинки (EN/RU, 9.9).
  const SI = SITE.storyImg || {};
  const RW = { dial: [478, 374, 708, 462], grille: [360, 178, 782, 348], knob: [709, 374, 775, 440],
    mag: [735, 436, 1226, 762], spread: [0, 0, W, H], pgL: [118, 64, 742, 862], pgR: [796, 64, 1424, 862] };
  const COVER = [[737, 622], [915, 438], [1224, 478], [1104, 724]]; // обложка журнала на кадре off
  const RIB = [[[783, 640], [742, 723]], [[827, 647], [788, 730]], [[872, 653], [837, 737]], [[917, 662], [883, 745]],
    [[965, 667], [933, 750]], [[1008, 675], [982, 757]], [[1060, 682], [1033, 758]]]; // семь закладок: верх → кончик
  const tickX = (i) => 6 + 88 * (i + 0.5) / THEMES.length; // % ширины шкалы
  let st = null; // элементы сцены
  function buildStory() {
    const ticks = THEMES.map((t, i) => `<b style="left:${tickX(i)}%">${t.short}</b>`).join('');
    const ribbons = THEMES.map((t, i) => { const r = RIB[i % RIB.length]; return `<line x1="${r[0][0]}" y1="${r[0][1]}" x2="${r[1][0]}" y2="${r[1][1]}"/>`; }).join('');
    const root = make(`<div class="stage story">
      <img class="f on" src="${SI.off || ''}" alt="" draggable="false"><img class="f st-lit" src="${SI.on || ''}" alt="" draggable="false">
      <div class="st-dial"><div class="st-scale">${ticks}</div><span class="st-name"></span><i class="st-needle"></i></div>
      <div class="st-knob"><i></i></div>
      <svg class="st-over" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polygon class="st-cover" points="${COVER.map((p) => p.join(',')).join(' ')}"/><g class="st-ribbons">${ribbons}</g></svg>
      <div class="st-spread" hidden><img class="f on" src="${SI.spread || ''}" alt="" draggable="false">
        <div class="st-pg l"><div class="st-kick"></div><h3></h3><div class="st-by"></div><p class="st-tag"></p><div class="st-txt"></div><div class="st-folio"></div></div>
        <div class="st-pg r"><div class="st-ph"><img alt="" draggable="false"><div class="st-empty"></div></div><div class="st-act"></div><div class="st-toc"></div></div>
      </div>
      <div class="caption"></div></div>`);
    st = { root, radio: root, dial: root.querySelector('.st-dial'), name: root.querySelector('.st-name'), needle: root.querySelector('.st-needle'), knob: root.querySelector('.st-knob'),
      mag: root.querySelector('.st-over'), ribbons: [...root.querySelectorAll('.st-ribbons line')], scale: [...root.querySelectorAll('.st-scale b')],
      spread: root.querySelector('.st-spread'), kick: root.querySelector('.st-kick'), h: root.querySelector('.st-spread h3'), by: root.querySelector('.st-by'),
      tag: root.querySelector('.st-tag'), txt: root.querySelector('.st-txt'), folio: root.querySelector('.st-folio'), ph: root.querySelector('.st-ph'),
      img: root.querySelector('.st-ph img'), empty: root.querySelector('.st-empty'), act: root.querySelector('.st-act'), toc: root.querySelector('.st-toc'),
      pgR: root.querySelector('.st-pg.r'), cap: root.querySelector('.caption'), zones: {} };
    place(st.dial, ...RW.dial);
    place(st.knob, ...RW.knob);
    place(st.spread, ...RW.spread);
    const SW = RW.spread[2] - RW.spread[0], SH = RW.spread[3] - RW.spread[1];
    for (const [cls, box] of [['l', RW.pgL], ['r', RW.pgR]]) { const el = root.querySelector('.st-pg.' + cls), [x0, y0, x1, y1] = box;
      Object.assign(el.style, { left: pct(x0, SW), top: pct(y0, SH), width: pct(x1 - x0, SW), height: pct(y1 - y0, SH) }); }
    const Z = (key, box, fn, label, parent = root, w = W, h = H) => {
      const b = document.createElement('button'); b.className = 'zone'; b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
      zoneIn(b, w, h, ...box); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      parent.appendChild(b); st.zones[key] = b; return b;
    };
    const [kx0, ky0, kx1, ky1] = RW.knob, kc = (kx0 + kx1) / 2;
    Z('knobL', [kx0 - 20, ky0 - 20, kc, ky1 + 20], () => K.run(() => tune(-1)), 'Tuning knob: turn left');
    Z('knobR', [kc, ky0 - 20, kx1 + 20, ky1 + 20], () => K.run(() => tune(+1)), 'Tuning knob: turn right');
    Z('dial', RW.dial, () => flash(st.cap, R.theme < 0 ? 'The dial is dark — turn the knob on the right.' : `Dial: theme “${THEMES[R.theme].name}”. This isn’t internet radio — the knob picks a journal theme.`, 2.6), 'Radio dial');
    Z('grille', RW.grille, () => flash(st.cap, 'The radio doesn’t play: the knob only picks an archive theme.', 2.2), 'Radio speaker');
    Z('mag', RW.mag, () => K.run(magOpen), 'Collection journal — open');
    // разворот на весь кадр: внешние поля страниц — листать, фото — предмет; стол вокруг журнала — закрыть журнал
    Z('prev', [RW.pgL[0] - 20, RW.pgL[1], RW.pgL[0] + 60, RW.pgL[3]], () => K.run(() => turnPage(-1)), 'Previous page', st.spread, SW, SH).classList.add('edge');
    Z('next', [RW.pgR[2] - 60, RW.pgR[1], RW.pgR[2] + 20, RW.pgR[3]], () => K.run(() => turnPage(1)), 'Next page', st.spread, SW, SH).classList.add('edge');
    Z('photo', [RW.pgR[0] + 60, RW.pgR[1] + 80, RW.pgR[2] - 70, RW.pgR[1] + 600], () => K.run(photoAct), 'Item on the page', st.spread, SW, SH);
    st.spread.addEventListener('click', (e) => { e.stopPropagation(); if (R.open && !e.target.closest('.st-pg')) K.run(magClose); });
    root.addEventListener('click', () => { if (R.open) K.run(magClose); });
    st.txt.addEventListener('click', (e) => e.stopPropagation());
    renderRadio(true);
  }
  // ---------- радио: ручка выбирает тему, шкала светится, стрелка встаёт на тему ----------
  function renderRadio(instant) {
    if (!st) return;
    const on = R.theme >= 0;
    st.radio.classList.toggle('on', on);
    st.needle.style.transition = instant || reduce() ? 'none' : `left ${ms(T.tune)}ms cubic-bezier(.3,.7,.3,1)`;
    st.needle.style.left = on ? tickX(R.theme) + '%' : '2%';
    st.knob.style.transition = instant || reduce() ? 'none' : `transform ${ms(T.tune)}ms ease-out`;
    st.knob.style.transform = `rotate(${(R.theme + 1) * 38}deg)`;
    st.scale.forEach((b, i) => b.classList.toggle('on', i === R.theme));
    if (on) st.name.textContent = THEMES[R.theme].short; // при погасании имя тает вместе со шкалой
    st.ribbons.forEach((b, i) => b.classList.toggle('on', i === R.theme));
    st.mag.classList.toggle('call', on && !R.open);
    const t = R.theme < 0 ? 'Tuning knob: turn right' : `Tuning knob (theme “${THEMES[R.theme].name}”): turn right`;
    st.zones.knobR.title = t; st.zones.knobR.setAttribute('aria-label', t);
    const m = R.theme < 0 ? 'Collection journal — open (contents)' : `Collection journal — open at the bookmark “${THEMES[R.theme].name}”`;
    st.zones.mag.title = m; st.zones.mag.setAttribute('aria-label', m);
  }
  async function tune(dir) {
    const n = R.theme + dir;
    if (n < -1 || n >= THEMES.length) { nudgeEl(st.knob); flash(st.cap, dir > 0 ? 'End of the dial.' : 'Dial dark — the start.', 1.4); return; }
    R.theme = n; R.page = 0; R.about = false; renderRadio(false);
    flash(st.cap, n < 0 ? 'The dial went dark.' : `Theme “${THEMES[n].name}”. The journal next to it opens at its bookmark.`, 2.6);
    await wait(dw('tune'));
  }
  function nudgeEl(el) { if (reduce()) return; el.animate([{ translate: '0 0' }, { translate: '3px 0' }, { translate: '-2px 0' }, { translate: '0 0' }], { duration: 150 }); }
  // ---------- журнал: раскрыть на закладке темы (или оглавление), листать, закрыть ----------
  function setLang(l) { // выбор запоминается (template.html читает rs-lang); без памяти браузера — ?lang= в адресе
    let kept = false;
    try { localStorage.setItem('rs-lang', l); kept = localStorage.getItem('rs-lang') === l; } catch (e) { /* закрытая память */ }
    const u = new URL(location.href);
    if (!kept || u.searchParams.has('lang')) u.searchParams.set('lang', l);
    u.hash = 'c-radio'; // вернуться к радио и журналу
    if (u.search === location.search) { location.hash = 'c-radio'; location.reload(); } else location.replace(u.href);
  }
  function langLine() { // язык сайта (шаг 9.9): строчка на странице журнала, не веб-кнопка поверх сцены (D-006)
    const ln = document.createElement('div'); ln.className = 'st-lang';
    [['en', 'English'], ['ru', 'Русский']].forEach(([l, nm], i) => {
      if (i) ln.appendChild(document.createTextNode(' · '));
      const b = document.createElement('button'); b.type = 'button'; b.lang = l; b.textContent = nm;
      if (l === (window.RS_LANG || 'ru')) { b.className = 'on'; b.disabled = true; }
      b.addEventListener('click', (e) => { e.stopPropagation(); setLang(l); });
      ln.appendChild(b);
    });
    return ln;
  }
  function fillAbout() { // “об этом сайте” (шаг 10.4, D-215): за оглавлением, текст и источники — SITE.about
    const A = SITE.about;
    st.kick.textContent = A.kick; st.h.textContent = A.title; st.by.textContent = ''; st.tag.textContent = A.tagline;
    st.txt.innerHTML = ''; st.folio.textContent = '';
    for (const para of A.paras) { const p = document.createElement('p'); p.textContent = para; st.txt.appendChild(p); }
    const h = document.createElement('h4'); h.className = 'st-srch'; h.textContent = A.sourcesH; st.txt.appendChild(h);
    for (const it of A.sources) {
      const d = document.createElement('div'); d.className = 'st-src';
      const b = document.createElement('b'); b.textContent = it.title; d.appendChild(b);
      for (const l of it.links) { const a = document.createElement('a'); a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = l.what; d.appendChild(a); }
      st.txt.appendChild(d);
    }
    st.txt.scrollTop = 0;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'st-tocline'; b.innerHTML = '<span></span>';
    b.firstChild.textContent = A.back;
    b.addEventListener('click', (e) => { e.stopPropagation(); K.run(async () => { R.about = false; await flipTo(); }); });
    st.toc.appendChild(b); st.toc.appendChild(langLine());
    show(st.zones.photo, false); show(st.zones.prev, true); show(st.zones.next, false);
    st.img.hidden = true; st.empty.hidden = true; st.act.textContent = '';
    if (RS.showPart) RS.showPart(RW.pgL[0] / W, RW.pgL[2] / W); // на телефоне — с начала текста
  }
  function fillPage() {
    if (R.theme >= 0) R.about = false;
    const toc = R.theme < 0;
    st.spread.classList.toggle('toc', toc);
    st.toc.innerHTML = '';
    if (toc && R.about && SITE.about) { fillAbout(); return; }
    if (toc) {
      st.kick.textContent = 'Collection journal'; st.h.textContent = 'Contents'; st.by.textContent = '';
      st.tag.textContent = 'The journal’s themes are the same as on the radio dial. Turn the knob or pick a theme here.';
      st.txt.innerHTML = ''; st.folio.textContent = '';
      THEMES.forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'st-tocline';
        b.innerHTML = `<span>${t.name}</span><em>${t.pages.length}</em>`;
        b.addEventListener('click', (e) => { e.stopPropagation(); K.run(async () => { R.theme = i; R.page = 0; renderRadio(false); await flipTo(); }); });
        st.toc.appendChild(b);
      });
      if (SITE.about) { // “об этом сайте” — последняя строчка оглавления (10.4)
        const b = document.createElement('button'); b.type = 'button'; b.className = 'st-tocline st-about'; b.innerHTML = '<span></span><em>→</em>';
        b.firstChild.textContent = SITE.about.toc;
        b.addEventListener('click', (e) => { e.stopPropagation(); K.run(async () => { R.about = true; await flipTo(); }); });
        st.toc.appendChild(b);
      }
      st.toc.appendChild(langLine());
      show(st.zones.photo, false); show(st.zones.prev, false); show(st.zones.next, true);
      st.img.hidden = true; st.empty.hidden = true; st.act.textContent = '';
      if (RS.showPart) RS.showPart(RW.pgR[0] / W, RW.pgR[2] / W); // на телефоне — оглавление и строчка языка целиком
      return;
    }
    const th = THEMES[R.theme], pg = th.pages[R.page];
    st.kick.textContent = `Theme · ${th.name}`;
    st.h.textContent = pg.title; st.by.textContent = [pg.maker, pg.year].filter(Boolean).join(' · ');
    st.tag.textContent = pg.tagline || '';
    st.txt.innerHTML = '';
    for (const para of pg.story) { const p = document.createElement('p'); p.textContent = para; st.txt.appendChild(p); }
    st.txt.scrollTop = 0;
    st.folio.textContent = `${R.page + 1} / ${th.pages.length}`;
    show(st.zones.prev, true); show(st.zones.next, true); show(st.zones.photo, true);
    photoState();
    if (RS.showPart) RS.showPart(RW.pgL[0] / W, RW.pgL[2] / W); // на телефоне — с начала истории (левая страница)
  }
  function photoState() { // что на фото: кассета на странице, пустое место (кассета у посетителя) или аппарат
    const pg = THEMES[R.theme].pages[R.page];
    let act = '', has = true, empty = '';
    if (pg.cas != null) {
      const i = pg.cas, out = S.cassette !== 'case' && S.sel === i;
      if (!out) act = 'This cassette is on the page — tap to pick it up';
      else if (S.cassette === 'hand') { has = false; empty = 'cassette’s place'; act = 'The cassette is in your hand — tap here to put it back'; }
      else { has = false; empty = 'cassette’s place'; act = S.cassette === 'deck' ? 'The cassette is in the Nakamichi Dragon deck now (console)' : 'The cassette is in the TASCAM 144 now (console)'; }
    } else act = `Tap the photo to walk over to it (${pg.where})`;
    st.img.hidden = !has; st.empty.hidden = has; st.empty.textContent = empty;
    if (has && !st.img.src.endsWith(pg.img)) { st.img.src = pg.img; st.img.alt = pg.title; }
    st.img.style.transition = 'none'; st.img.style.transform = ''; st.img.style.opacity = '';
    st.act.textContent = act;
    const lbl = pg.cas != null ? (has ? `Cassette ${pg.title}: pick up` : 'The cassette’s place on the page') : `${pg.title}: walk over to it`;
    st.zones.photo.title = lbl; st.zones.photo.setAttribute('aria-label', lbl);
  }
  async function magOpen() {
    if (R.open) return;
    R.open = true; st.mag.classList.remove('call');
    fillPage();
    const t = dw('magOpen');
    st.spread.hidden = false;
    st.spread.style.transition = 'none'; st.spread.style.transformOrigin = '64% 57%'; // от журнала на столике st.spread.style.transform = 'scale(.25)'; st.spread.style.opacity = 0;
    void st.spread.offsetWidth;
    st.spread.style.transition = `transform ${ms(t)}ms cubic-bezier(.3,.7,.3,1), opacity ${ms(reduce() ? 0.1 : t * 0.6)}ms ease-out`;
    st.spread.style.transform = 'none'; st.spread.style.opacity = 1;
    await wait(reduce() ? 0.1 : t);
    if (R.theme < 0 && !R.about) flash(st.cap, 'Contents: pick a theme (or turn the radio knob). Outside the journal — close.', 3);
  }
  async function magClose() {
    if (!R.open) return;
    const t = dw('magClose');
    st.spread.style.transition = `transform ${ms(t)}ms ease-in, opacity ${ms(reduce() ? 0.1 : t)}ms ease-in`;
    st.spread.style.transform = 'scale(.25)'; st.spread.style.opacity = 0;
    await wait(reduce() ? 0.1 : t);
    st.spread.hidden = true; R.open = false; renderRadio(true);
  }
  async function flipTo() { // перелистнуть на текущую страницу (правая страница переворачивается, как в прототипе 5.4)
    const t = dw('page');
    if (t) {
      st.spread.animate([{ opacity: 1 }, { opacity: 0.35, offset: 0.4 }, { opacity: 1 }], { duration: ms(t) });
      st.pgR.animate([{ transform: 'perspective(1600px) rotateY(-120deg)', transformOrigin: 'left center' }, { transform: 'none', transformOrigin: 'left center' }], { duration: ms(t), easing: 'cubic-bezier(.3,.7,.3,1)' });
      await wait(t * 0.4);
    }
    fillPage();
    await wait(t * 0.6);
  }
  async function turnPage(dir) { // листать: в конце темы — следующая тема, ручка радио следует за журналом
    if (R.about) { if (dir < 0) { R.about = false; await flipTo(); } else flash(st.cap, 'The last page of the journal.', 1.4); return; }
    if (R.theme < 0) { if (dir > 0) { R.theme = 0; R.page = 0; renderRadio(false); await flipTo(); } return; }
    let th = R.theme, pg = R.page + dir;
    if (pg >= THEMES[th].pages.length) { th += 1; pg = 0; }
    if (pg < 0) { th -= 1; pg = th >= 0 ? THEMES[th].pages.length - 1 : 0; }
    if (th >= THEMES.length) { flash(st.cap, 'The last page of the journal.', 1.4); return; }
    R.theme = th; R.page = pg; renderRadio(false);
    await flipTo();
  }
  async function photoAct() {
    if (R.theme < 0 || R.about) return;
    const pg = THEMES[R.theme].pages[R.page];
    if (pg.cas == null) { // аппарат или носитель на полке — подойти к нему; “назад” вернёт к журналу
      await magClose();
      if (RS.goTo) RS.goTo(pg.go);
      return;
    }
    const i = pg.cas;
    if (S.cassette === 'hand' && S.sel === i) { // положить обратно на страницу (= на место в кейсе)
      if (!K.returnFromStory()) return;
      photoState();
      const t = dw('take');
      if (t) { st.img.style.transition = 'none'; st.img.style.transform = 'translateY(-18%) scale(.7)'; st.img.style.opacity = 0; void st.img.offsetWidth;
        st.img.style.transition = `transform ${ms(t)}ms ease-out, opacity ${ms(t)}ms ease-out`; st.img.style.transform = ''; st.img.style.opacity = 1; await wait(t); }
      flash(st.cap, 'The cassette is back on the page (its home is the case on the audio wall).', 2.4);
      return;
    }
    if (S.cassette !== 'case') {
      flash(st.cap, S.sel === i ? (S.cassette === 'deck' ? 'This cassette is in the Nakamichi Dragon deck on the console now.' : 'This cassette is in the TASCAM 144 on the console now.')
        : `You’re holding ${K.SHORT[S.sel]} — one cassette at a time: put it back first.`, 2.8);
      return;
    }
    const m = handMsg(); if (m) { flash(st.cap, m, 2.4); return; }
    const t = dw('take');
    if (t) { st.img.style.transition = `transform ${ms(t)}ms ease-in, opacity ${ms(t)}ms ease-in`; st.img.style.transform = 'translateY(-18%) scale(.7)'; st.img.style.opacity = 0; await wait(t); }
    if (!K.takeFromStory(i)) { photoState(); return; }
    photoState();
    flash(st.cap, 'Cassette in hand — carry it to the deck on the console. Tap it in the corner to inspect.', 3.2);
  }
  K.world.on(() => { if (st && R.open && R.theme >= 0 && !R.about) photoState(); });
  RS.devices['c-radio'] = {
    mount(container) {
      if (!st) buildStory();
      if (R.open) { R.open = false; st.spread.hidden = true; } // ушли от радио — журнал закрыт
      container.appendChild(st.root);
      renderRadio(true);
      hintOnce('story', st.cap, 'Turn the radio knob (on the right of the set) — the dial lights up on a theme; the journal next to it opens at its bookmark.');
    },
  };

  // ---------- наушники на крючке у консоли (шаг 9.10, D-212): нажатие — надеть / снять ----------
  // Надеты — дека, TASCAM и Technics звучат в них (мимо колонок), комната стихает (sound.js, S.hp).
  // Остаются надетыми, пока их не снимут: можно отойти к деке и включить её.
  let hp = null;
  function hpUi(say) {
    hp.img.style.opacity = S.hp ? 0.35 : 1;
    hp.zone.setAttribute('aria-label', S.hp ? 'Take the headphones off' : 'Put the headphones on');
    hp.zone.title = hp.zone.getAttribute('aria-label');
    if (!say) return;
    const any = K.world.playing().some((d) => d === 'b-cassette-deck' || d === 'b-portastudio' || d === 'b-turntable');
    flash(hp.cap, S.hp ? (any ? 'Headphones on: the console plays through them, the room has gone quiet. Tap again to take them off.'
      : 'Headphones on. Start the deck, the TASCAM or the Technics and you’ll hear it through them; the room goes quiet. Tap again to take them off.')
      : 'Headphones back on the hook — sound comes from the speakers again.', 3.4);
  }
  RS.devices['b-headphones'] = {
    mount(container) {
      if (!hp) {
        const o = (SITE.objects || {})['b-headphones'] || {};
        const root = K.make(`<div class="stage hp"><img class="f on" alt=""><button class="zone" type="button"></button><div class="caption"></div></div>`);
        hp = { root, img: root.querySelector('img'), zone: root.querySelector('.zone'), cap: root.querySelector('.caption') };
        hp.img.src = o.image || ''; hp.img.style.transition = 'opacity .3s';
        zoneIn(hp.zone, W, H, W * 0.18, H * 0.08, W * 0.82, H * 0.92);
        hp.zone.addEventListener('click', (e) => { e.stopPropagation(); S.hp = !S.hp; hpUi(true); K.changed(); });
      }
      container.appendChild(hp.root);
      hpUi(false);
      hintOnce('hp', hp.cap, S.hp ? 'Headphones on. Tap to take them off.' : 'Tap the headphones to put them on: the console will play through them.');
    },
  };
})();
