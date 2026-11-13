// RockShowcase — цепочка 7 «Гитарные усилители» (шаг 8.8): Fender Twin Reverb `a-amp-fender` и Ampeg SVT `a-amp-svt`.
// Код движений — из моушн-превью 7.27 (project/stage7/7.27-preview/index.html, D-187/D-188) без правок таймингов,
// переходы 7.25 (D-185), кадры D-186 → site/assets/amp/. Механика AMP-00 «Всё руками» (D-086, D-093; MOT-037, MOT-038).
// Без веб-кнопок (D-006): кнопки превью и «← Назад» убраны — всё нажимается на самом усилителе;
// панель крупно и задняя планка — нажатие на эту часть, назад — нажатие мимо органов.
// Звук — sound.js (шаг 8.9): гитара и бас в общем такте, решётка дрожит по настоящей громкости (до первого нажатия — по такту общей сетки)
// (гитара и бас по одному такту, как в превью: включённый позже вступает в ту же долю).
// Усилители играют своими динамиками: в RS.world.playing() их нет — MC275 от них не зажигается.
(function () {
  'use strict';
  const RS = window.RS;
  if (!RS || !RS.kit) return;
  const K = RS.kit, S = K.S;
  const { make, flash } = K;
  const reduce = () => K.reduce();
  const GEO = ((window.__SITE__ || {}).geo || {}).amp;
  if (!GEO) return;
  const AA = 'assets/amp/';
  const FW = 1536, FH = 1024, PW = 2172, PH = 724;
  const pct = (v, of) => (v / of * 100) + '%';

  // ---------- тайминги (с) — 7.25 / превью 7.27, приняты владельцем (D-187) ----------
  const T = {
    panel: 0.4, rear: 0.6, back: 0.4, lift: 0.3, plugin: 0.2, unplug: 0.3, toggle: 0.06, warm: 1.7, cool: 3.5,
    step: 0.15, pedal: 0.08, key: 0.075, jitter: 1,
  };
  const dur = (k) => (reduce() ? 0 : T[k] * 1000);

  // ---------- органы ----------
  const KN = {
    fe: [['normal-volume', 'NORMAL volume'], ['normal-treble', 'NORMAL treble'], ['normal-middle', 'NORMAL middle'], ['normal-bass', 'NORMAL bass'],
      ['vibrato-volume', 'VIBRATO volume'], ['vibrato-treble', 'VIBRATO treble'], ['vibrato-middle', 'VIBRATO middle'], ['vibrato-bass', 'VIBRATO bass'],
      ['vibrato-reverb', 'REVERB'], ['vibrato-speed', 'SPEED'], ['vibrato-intensity', 'INTENSITY']],
    svt: [['one-volume', 'ONE volume'], ['one-treble', 'ONE treble'], ['one-midrange', 'ONE midrange'], ['one-bass', 'ONE bass'],
      ['two-volume', 'TWO volume'], ['two-treble', 'TWO treble'], ['two-bass', 'TWO bass']],
  };
  const RANGE = { fe: [1, 10, 36], svt: [0, 10, 30] }; // мин, макс, градусов на деление
  const JACKS = {
    fe: { N1: [97, 360, 'NORMAL 1'], N2: [173, 360, 'NORMAL 2'], V1: [741, 360, 'VIBRATO 1'], V2: [816, 360, 'VIBRATO 2'] },
    svt: { '1B': [150, 355, 'ONE bright'], '2B': [265, 355, 'TWO bright'], '1N': [150, 447, 'ONE normal'], '2N': [265, 447, 'TWO normal'] },
  };
  const DEFJACK = { fe: 'V1', svt: '1N' };
  const SVTKEYS = [['one-uhi', 'ONE ultra hi'], ['one-mid', 'ONE midrange 1·2·3'], ['one-ulo', 'ONE ultra lo'], ['two-uhi', 'TWO ultra hi'], ['two-ulo', 'TWO ultra lo']];
  const MIDF = [220, 800, 3000];
  const DEV = { fe: { id: 'a-amp-fender', name: 'Fender Twin Reverb' }, svt: { id: 'a-amp-svt', name: 'Ampeg SVT' } };
  const INFO = {
    fe: { ground: 'GROUND — только для вида (тумблер «земли»).', fuse: 'FUSE 2.5 AMP. SLO-BLO — только для вида.', speaker: 'SPEAKER — динамики уже подключены.', ac: 'Шнур питания — уже в розетке.' },
    svt: { fuse: 'FUSE 10 AMP. — только для вида.', ac: 'AC OUTLET — только для вида.', ext: 'EXT. AMP — только для вида.', speaker: 'SPEAKER — кабель к кабинету уже воткнут.', polarity: 'POLARITY не трогаем.' },
  };

  // ---------- состояние (часть общего автомата RS.world): оба выключены, кабели на полу (как на кадрах D-186) ----------
  function fresh(d) {
    const knobs = Object.fromEntries(KN[d].map(([n]) => [n, n.endsWith('volume') ? RANGE[d][0] : 5]));
    return d === 'fe'
      ? { power: false, standby: false, heat: 0, cable: null, view: 'main', knobs, bright: { normal: false, vibrato: false }, pedal: { reverb: true, vibrato: false } }
      : { power: false, standby: false, heat: 0, cable: null, view: 'main', knobs, keys: { 'one-uhi': false, 'one-ulo': false, 'two-uhi': false, 'two-ulo': false }, mid: 2 };
  }
  const AS = S.amp = { fe: fresh('fe'), svt: fresh('svt') };
  const SC = {}; // сцены: root, amp, cap, ready

  // ---------- сцена: разметка превью (кадры и слои D-186) ----------
  const HTML = {
    fe: `<div class="view v-main on" data-view="main">
        <img class="full" src="${AA}fe-floor.webp" alt="Fender Twin Reverb, кабель и педаль на полу" draggable="false">
        <img class="lay" data-l="fe-grille" data-k="grille" src="${AA}fe-grille.webp" alt="">
        <img class="lay" data-l="fe-jewel-lit" data-k="jewel" src="${AA}fe-jewel-lit.webp" alt="">
        <img class="lay" data-l="fe-pedal-vibrato-down" data-k="pedal-vibrato" src="${AA}fe-pedal-vibrato-down.webp" alt="">
        <img class="lay" data-l="fe-pedal-reverb-down" data-k="pedal-reverb" src="${AA}fe-pedal-reverb-down.webp" alt="">
        <button class="zone" data-z="cable" data-at="1000,955,300,110" aria-label="Кабель на полу: подключить"></button>
        <button class="zone" data-z="unplug" data-at="697,250,60,60" aria-label="Штекер: вынуть"></button>
        <button class="zone" data-z="panel" data-at="840,222,1080,90" aria-label="Лицевая панель крупно"></button>
        <button class="zone" data-z="rear" data-at="815,95,420,60" aria-label="Ручка сверху: к задней планке"></button>
        <button class="zone" data-z="pedal-vibrato" data-at="545,956,56,56" aria-label="Педаль: кнопка VIBRATO"></button>
        <button class="zone" data-z="pedal-reverb" data-at="621,946,56,56" aria-label="Педаль: кнопка REVERB"></button>
      </div>
      <div class="view v-panel" data-view="panel">
        <div class="apbox">
          <img class="full" src="${AA}fe-panel.webp" alt="Лицевая панель Fender крупно" draggable="false">
          <div class="bright" data-bright="normal" data-src="${AA}fe-panel.webp" data-at="236,365,26,48"></div>
          <div class="bright" data-bright="vibrato" data-src="${AA}fe-panel.webp" data-at="887,363,26,48"></div>
          <img class="lay" data-l="fe-panel-jewel-lit" data-k="jewel" src="${AA}fe-panel-jewel-lit.webp" alt="">
          <img class="lay" data-l="fe-panel-plug" data-k="plug" src="${AA}fe-panel-plug.webp" alt="">
          <img class="lay" data-l="fe-panel-plug-clean" data-k="plugclean" src="${AA}fe-panel-plug-clean.webp" alt="">
        </div>
      </div>
      <div class="view v-rear" data-view="rear">
        <img class="full" src="${AA}fe-rear-off.webp" alt="Задняя планка Fender: ON, STANDBY, лампы" draggable="false">
        <img class="lay" data-l="fe-rear-glow" data-k="glow" src="${AA}fe-rear-glow.webp" alt="">
        <img class="lay" data-l="fe-rear-on-up" data-k="sw-power" src="${AA}fe-rear-on-up.webp" alt="">
        <img class="lay" data-l="fe-rear-standby-up" data-k="sw-standby" src="${AA}fe-rear-standby-up.webp" alt="">
        <div class="bright" data-flip="ground" data-src="${AA}fe-rear-off.webp" data-at="495,305,80,100"></div>
        <button class="zone" data-z="power" data-at="1018,345,90,140" aria-label="Тумблер ON"></button>
        <button class="zone" data-z="standby" data-at="1152,345,90,140" aria-label="Тумблер STANDBY"></button>
        <button class="zone" data-z="info:ground" data-at="493,315,90,120" aria-label="Тумблер GROUND"></button>
        <button class="zone" data-z="info:fuse" data-at="770,300,90,90" aria-label="Предохранитель"></button>
        <button class="zone" data-z="info:speaker" data-at="1365,310,200,90" aria-label="Гнёзда SPEAKER"></button>
        <button class="zone" data-z="info:ac" data-at="280,315,160,140" aria-label="Шнур питания"></button>
      </div>`,
    svt: `<div class="view v-main on" data-view="main">
        <img class="full" src="${AA}svt-floor.webp" alt="Ampeg SVT, кабель на полу" draggable="false">
        <img class="lay" data-l="svt-grille-cab" data-k="grille" src="${AA}svt-grille-cab.webp" alt="">
        <img class="lay" data-l="svt-grille-head" data-k="grille" src="${AA}svt-grille-head.webp" alt="">
        <img class="lay" data-l="svt-jewel-lit" data-k="jewel" src="${AA}svt-jewel-lit.webp" alt="">
        <img class="lay" data-l="svt-power-up" data-k="sw-power" src="${AA}svt-power-up.webp" alt="">
        <button class="zone" data-z="cable" data-at="380,945,300,100" aria-label="Кабель на полу: подключить"></button>
        <button class="zone" data-z="unplug" data-at="626,128,44,44" aria-label="Штекер: вынуть"></button>
        <button class="zone" data-z="power" data-at="960,120,44,44" aria-label="Тумблер POWER"></button>
        <button class="zone" data-z="panel" data-at="790,100,330,90" aria-label="Лицевая панель крупно"></button>
        <button class="zone" data-z="rear" data-at="797,30,380,40" aria-label="Верх головы: к задней планке"></button>
      </div>
      <div class="view v-panel" data-view="panel">
        <div class="apbox">
          <img class="full" src="${AA}svt-panel.webp" alt="Лицевая панель Ampeg SVT крупно" draggable="false">
          <img class="lay" data-l="svt-panel-jewel-lit" data-k="jewel" src="${AA}svt-panel-jewel-lit.webp" alt="">
          <img class="lay" data-l="svt-panel-power-up" data-k="sw-power" src="${AA}svt-panel-power-up.webp" alt="">
          <img class="lay" data-l="svt-panel-plug-bright" data-k="plugbright" src="${AA}svt-panel-plug-bright.webp" alt="">
          <img class="lay" data-l="svt-panel-plug" data-k="plug" src="${AA}svt-panel-plug.webp" alt="">
          <img class="lay" data-l="svt-panel-plug-clean" data-k="plugclean" src="${AA}svt-panel-plug-clean.webp" alt="">
        </div>
      </div>
      <div class="view v-rear" data-view="rear">
        <img class="full" src="${AA}svt-rear-off.webp" alt="Задняя планка Ampeg SVT: STANDBY, лампы сквозь перфорацию" draggable="false">
        <img class="lay" data-l="svt-rear-glow" data-k="glow" src="${AA}svt-rear-glow.webp" alt="">
        <img class="lay" data-l="svt-rear-standby-up" data-k="sw-standby" src="${AA}svt-rear-standby-up.webp" alt="">
        <button class="zone" data-z="standby" data-at="647,725,90,120" aria-label="Тумблер STANDBY"></button>
        <button class="zone" data-z="info:fuse" data-at="395,715,90,90" aria-label="Предохранитель"></button>
        <button class="zone" data-z="info:ac" data-at="527,705,110,110" aria-label="AC OUTLET"></button>
        <button class="zone" data-z="info:ext" data-at="871,708,200,80" aria-label="Гнёзда EXT. AMP"></button>
        <button class="zone" data-z="info:speaker" data-at="1053,708,80,80" aria-label="Гнездо SPEAKER"></button>
      </div>`,
  };

  const $ = (d, s) => SC[d].root.querySelector(s), $$ = (d, s) => [...SC[d].root.querySelectorAll(s)];
  function placeBox(el, bb, W, H) { el.style.left = pct(bb[0], W); el.style.top = pct(bb[1], H); el.style.width = pct(bb[2] - bb[0], W); el.style.height = pct(bb[3] - bb[1], H); }
  function placeAt(el, W, H) { const [x, y, w, h] = el.dataset.at.split(',').map(Number); el.style.left = pct(x, W); el.style.top = pct(y, H); el.style.width = pct(w, W); el.style.height = pct(h, H); }
  function zone(parent, z, label, x, y, w, h) {
    const b = document.createElement('button');
    b.className = 'zone'; b.type = 'button'; b.dataset.z = z; b.setAttribute('aria-label', label); b.title = label;
    b.style.left = pct(x, PW); b.style.top = pct(y, PH); b.style.width = pct(w, PW); b.style.height = pct(h, PH);
    parent.appendChild(b); return b;
  }
  function img(cls, src) { const im = document.createElement('img'); im.className = cls; im.src = src; im.alt = ''; im.draggable = false; return im; }

  function build(d) {
    const root = make(`<div class="stage amp-st" data-amp="${d}"><div class="amp">${HTML[d]}</div><div class="caption"></div></div>`);
    SC[d] = { root, amp: root.querySelector('.amp'), cap: root.querySelector('.caption'), ready: false, anims: [] };
    const box = $(d, '.apbox');
    for (const v of $$(d, '.view')) {
      const inPanel = v.classList.contains('v-panel'), W = inPanel ? PW : FW, H = inPanel ? PH : FH;
      for (const el of v.querySelectorAll('[data-l]')) placeBox(el, GEO.layers[el.dataset.l], W, H);
      for (const el of v.querySelectorAll('.zone[data-at]')) { placeAt(el, W, H); el.title = el.getAttribute('aria-label'); }
    }
    // панель: ручки (правая половина «+», левая «−»), гнёзда
    for (const [n, label] of KN[d]) {
      const id = `${d}-panel-knob-${n}`, bb = GEO.layers[id], c = GEO.knobs[id];
      const im = img('lay knob', `${AA}${id}.webp`); im.dataset.knob = n;
      placeBox(im, bb, PW, PH);
      im.style.transformOrigin = `${(c.cx - bb[0]) / (bb[2] - bb[0]) * 100}% ${(c.cy - bb[1]) / (bb[3] - bb[1]) * 100}%`;
      box.appendChild(im);
      zone(box, `knob:${n}`, `${label}: правая половина +, левая −`, c.cx, c.cy, 2 * c.r + 6, 2 * c.r + 6);
    }
    for (const [j, [x, y, nm]] of Object.entries(JACKS[d])) zone(box, `jack:${j}`, `Гнездо ${nm}`, x, y, 70, 70);
    // тумблеры кусочком кадра, переворот по вертикали (BRIGHT на панели, GROUND сзади)
    for (const el of $$(d, '.bright')) {
      const inPanel = !!el.closest('.apbox'), W = inPanel ? PW : FW, H = inPanel ? PH : FH;
      const [x, y, w, h] = el.dataset.at.split(',').map(Number);
      placeAt(el, W, H);
      el.style.backgroundImage = `url(${el.dataset.src})`;
      el.style.backgroundSize = `${W / w * 100}% ${H / h * 100}%`;
      el.style.backgroundPosition = `${(x - w / 2) / (W - w) * 100}% ${(y - h / 2) / (H - h) * 100}%`;
      el.style.left = pct(x - w / 2, W); el.style.top = pct(y - h / 2, H);
    }
    if (d === 'fe') for (const el of $$(d, '[data-bright]')) {
      const [x, y] = el.dataset.at.split(',').map(Number);
      zone(box, `bright:${el.dataset.bright}`, `Тумблер BRIGHT ${el.dataset.bright.toUpperCase()}`, x, y, 50, 70);
    }
    // общий кадр (7.27б): кабель из каждого гнезда — слой поверх кадра; ручки общего кадра поворачиваются вместе с панелью
    const main = $(d, '[data-view="main"]'), grilles = main.querySelectorAll('[data-k="grille"]'), ref = grilles[grilles.length - 1].nextSibling;
    for (const j of Object.keys(JACKS[d])) {
      const id = `${d}-cable-${j}`, im = img('lay', `${AA}${id}.webp`);
      im.dataset.l = id; im.dataset.k = `cable-${j}`;
      placeBox(im, GEO.layers[id], FW, FH); main.insertBefore(im, ref);
    }
    for (const [n] of KN[d]) {
      const id = `${d}-main-knob-${n}`, bb = GEO.layers[id], c = GEO.mknobs[id];
      const im = img('lay knob', `${AA}${id}.webp`); im.dataset.mknob = n;
      placeBox(im, bb, FW, FH);
      im.style.transformOrigin = `${(c.cx - bb[0]) / (bb[2] - bb[0]) * 100}% ${(c.cy - bb[1]) / (bb[3] - bb[1]) * 100}%`;
      main.insertBefore(im, main.querySelector('.zone'));
    }
    if (d === 'svt') {
      SVTKEYS.forEach(([k, label], i) => {
        const id = `svt-panel-key-${i + 1}-down`, bb = GEO.layers[id], im = img('lay', `${AA}${id}.webp`);
        im.dataset.key = k; placeBox(im, bb, PW, PH); box.appendChild(im);
        zone(box, `key:${k}`, `Клавиша ${label}`, (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, bb[2] - bb[0], bb[3] - bb[1] + 20);
      });
      zone(box, 'power', 'Тумблер POWER', 1988, 438, 110, 150);
      zone(box, 'info:polarity', 'Тумблер POLARITY', 1736, 438, 110, 150);
    }
    // нажатия: по органу — его действие; мимо (на панели крупно и сзади) — назад к общему кадру
    SC[d].amp.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const z = ev.target.closest('.zone');
      if (!SC[d].ready) { cap(d, 'Загружается…', 1.2); return; }
      if (!z) { if (AS[d].view !== 'main') go(d, 'main'); return; }
      onZone(d, z.dataset.z, { currentTarget: z, clientX: ev.clientX, detail: ev.detail });
      ui(d);
    });
    // текущее состояние (посетитель мог уйти и вернуться — сцена строится один раз, но на всякий случай)
    for (const [n] of KN[d]) setKnob(d, n, true);
    if (d === 'svt') setMid(true);
    const imgs = [...root.querySelectorAll('img')];
    Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))).then(() => { SC[d].ready = true; });
    ui(d);
  }

  const cap = (d, t, s = 1.8) => { if (SC[d]) flash(SC[d].cap, t, s); };

  // ---------- камера: панель крупно — наезд, задняя планка — «через верх» (7.25: 0.2–0.5) ----------
  const FOCUS = { fe: [840, 228, 1.38], svt: [797, 100, 3.4] };
  function go(d, to) {
    const A = AS[d], from = A.view; if (from === to) return;
    const sc = SC[d], vf = $(d, `[data-view="${from}"]`), vt = $(d, `[data-view="${to}"]`);
    sc.anims.forEach((a) => a.cancel()); sc.anims = [];
    A.view = to;
    const back = to === 'main';
    const ms = dur(back ? 'back' : (to === 'panel' ? 'panel' : 'rear')) || 100;
    vf.classList.remove('on'); vt.classList.add('on');
    if (reduce()) {
      sc.anims.push(vt.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 }));
      sc.anims.push(vf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100 }));
    } else {
      const main = $(d, '[data-view="main"]'), other = back ? vf : vt;
      let zoomed, otherIn;
      if ((back ? from : to) === 'panel') {
        const [cx, cy, s] = FOCUS[d];
        zoomed = `translate(${(768 - s * cx) / FW * 100}%, ${(512 - s * cy) / FH * 100}%) scale(${s})`;
        otherIn = 'scale(1)';
      } else {
        zoomed = 'translate(0, 28%) scale(1.12)'; // камера уходит вверх — предмет «съезжает» вниз
        otherIn = 'translate(0, -14%)';
      }
      const mainK = [{ transform: 'none', opacity: 1, offset: 0 }, { transform: zoomed, opacity: 1, offset: 0.55 }, { transform: zoomed, opacity: 0, offset: 1 }];
      const othK = [{ opacity: 0, transform: otherIn, offset: 0 }, { opacity: 0, transform: otherIn, offset: 0.4 }, { opacity: 1, transform: 'none', offset: 1 }];
      const rev = (ks) => ks.map((k) => ({ ...k, offset: 1 - k.offset })).reverse();
      const o = { duration: ms, easing: 'cubic-bezier(.4,0,.2,1)' };
      sc.anims.push(main.animate(back ? rev(mainK) : mainK, o));
      sc.anims.push(other.animate(back ? rev(othK) : othK, o));
    }
    if (to === 'panel') cap(d, 'Панель крупно: гнёзда, ручки (правая половина «+», левая «−»). Мимо — назад.', 2.6);
    else if (to === 'rear') cap(d, d === 'fe' ? 'Задняя планка: ON, STANDBY, лампы. Мимо — назад.' : 'Задняя планка: STANDBY, лампы сквозь перфорацию. Мимо — назад.', 2.6);
  }

  // ---------- звук на сайте пока не играет: «звучит» — по состоянию, решётка дрожит в такт общей сетки ----------
  const TEMPO = 100, SPB = 60 / TEMPO;
  const GTR = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
  const BAS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
  const kv = (d, n) => AS[d].knobs[n];
  function channel(d) { const j = AS[d].cable; if (!j) return null; return d === 'fe' ? (j[0] === 'V' ? 'vibrato' : 'normal') : (j[0] === '1' ? 'one' : 'two'); }
  function sounding(d) { const A = AS[d], ch = channel(d); return !!(A.power && A.standby && ch && kv(d, ch + '-volume') > RANGE[d][0]); }
  function level(d, t) { // огибающая партии по общему такту (гитара — Fender, бас — SVT)
    const pat = d === 'fe' ? GTR : BAS, st = SPB / 4, k = Math.floor(t / st);
    for (let i = 0; i < 4; i++) {
      const s = ((k - i) % 16 + 16) % 16;
      if (pat[s]) return Math.exp(-(t - (k - i) * st) / (d === 'fe' ? 0.12 : 0.2)) * (s % 4 === 0 ? 1 : 0.65);
    }
    return 0;
  }
  const gate = { fe: 0, svt: 0 }; // «ворота» — звук нарастает после STANDBY (0,3 с) и пропадает (0,2 с)

  // ---------- действия (из превью 7.27 без правок) ----------
  const lay = (d, k) => $$(d, `[data-k="${k}"]`);
  function fadeLay(els, on, ms) { for (const el of els) { el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: on ? 1 : 0 }], { duration: Math.max(ms, 1), fill: 'none' }); el.classList.toggle('vis', on); } }
  // штекер на панели: в своём гнезде — слой D-186 как есть, в других — «чистый», сдвинутый к гнезду; у SVT в верхнем ряду — свой слой
  const PLUGHOME = { plug: null, plugclean: null, plugbright: '1B' };
  function plugKind(d, j) { return j === DEFJACK[d] ? 'plug' : (d === 'svt' && j[1] === 'B') ? 'plugbright' : 'plugclean'; }
  const plugEl = (d, j) => $(d, `.apbox [data-k="${plugKind(d, j)}"]`);
  function plugTx(el, d, j) {
    const bb = GEO.layers[el.dataset.l], [bx, by] = JACKS[d][PLUGHOME[el.dataset.k] || DEFJACK[d]], [x, y] = JACKS[d][j];
    return `translate(${(x - bx) / (bb[2] - bb[0]) * 100}%, ${(y - by) / (bb[3] - bb[1]) * 100}%)`;
  }
  const mainCable = (d, j) => lay(d, 'cable-' + j);
  function plugTo(d, j) {
    const A = AS[d], prev = A.cable;
    if (prev === j) return unplug(d);
    A.cable = j;
    const el = plugEl(d, j);
    for (const k of Object.keys(PLUGHOME)) { const o = $(d, `.apbox [data-k="${k}"]`); if (o && o !== el) o.classList.remove('vis'); }
    const tx = plugTx(el, d, j);
    el.style.transform = tx; el.classList.add('vis');
    if (prev) { // из гнезда в гнездо (2.2): штекер переезжает; на общем кадре кабель перетекает в новое гнездо
      const ms = dur('unplug');
      el.animate([{ transform: plugTx(el, d, prev) + ' translateY(4%)' }, { transform: tx + ' translateY(6%)', offset: 0.7 }, { transform: tx }], { duration: Math.max(ms, 1), easing: 'ease-in-out' });
      fadeLay(mainCable(d, prev), false, ms); fadeLay(mainCable(d, j), true, ms);
    } else { // с пола: подъём, вход, щелчок (2.1)
      const lift = dur('lift'), ins = dur('plugin');
      el.animate([{ transform: tx + ' translateY(30%)', opacity: 0 }, { transform: tx + ' translateY(6%)', opacity: 1, offset: lift / ((lift + ins) || 1) }, { transform: tx, opacity: 1 }], { duration: Math.max(lift + ins, 1), easing: 'ease-out' });
      fadeLay([...mainCable(d, j), ...lay(d, 'grille')], true, lift + ins);
    }
    cap(d, `Кабель: ${JACKS[d][j][2]}`);
    changed();
  }
  function unplug(d) {
    const A = AS[d]; if (!A.cable) return;
    const prev = A.cable, el = plugEl(d, prev);
    A.cable = null;
    const ms = dur('unplug');
    el.animate([{ transform: el.style.transform, opacity: 1 }, { transform: el.style.transform + ' translateY(30%)', opacity: 0 }], { duration: Math.max(ms, 1) });
    el.classList.remove('vis');
    fadeLay([...mainCable(d, prev), ...lay(d, 'grille')], false, ms);
    cap(d, 'Кабель вынут — на полу');
    changed();
  }
  function toggle(d, sw) {
    const A = AS[d];
    A[sw] = !A[sw];
    fadeLay(lay(d, 'sw-' + sw), A[sw], dur('toggle'));
    if (sw === 'power') fadeLay(lay(d, 'jewel'), A.power, Math.min(dur('toggle'), 40));
    const names = { fe: { power: 'ON', standby: 'STANDBY' }, svt: { power: 'POWER', standby: 'STANDBY' } };
    cap(d, `${names[d][sw]}: ${A[sw] ? 'вкл.' : 'выкл.'}${sw === 'power' && A.power ? ' — лампы разогреваются' : ''}${sw === 'power' && !A.power ? ' — лампы остывают' : ''}`);
    changed();
  }
  function knob(d, n, dir) {
    const [lo, hi] = RANGE[d], A = AS[d], v = Math.min(hi, Math.max(lo, A.knobs[n] + dir));
    if (v === A.knobs[n]) { cap(d, dir > 0 ? 'Уже на максимуме' : 'Уже на минимуме', 0.9); return; }
    A.knobs[n] = v; setKnob(d, n);
    cap(d, `${KN[d].find((k) => k[0] === n)[1]}: ${v}`, 0.9);
    changed();
  }
  function setKnob(d, n, instant) { // панель крупно и общий кадр (7.27б) — одним поворотом
    for (const im of $$(d, `[data-knob="${n}"], [data-mknob="${n}"]`)) {
      im.style.transition = instant || reduce() ? 'none' : `transform ${T.step}s ease-out`;
      im.style.transform = `rotate(${(AS[d].knobs[n] - 5) * RANGE[d][2]}deg)`;
    }
  }
  function pedal(which) {
    const A = AS.fe; A.pedal[which] = !A.pedal[which];
    const el = lay('fe', 'pedal-' + which)[0];
    el.classList.add('vis');
    setTimeout(() => el.classList.remove('vis'), Math.max(dur('pedal'), 60));
    cap('fe', `Педаль: ${which === 'reverb' ? 'реверб' : 'вибрато'} ${A.pedal[which] ? 'вкл.' : 'выкл.'}${channel('fe') === 'normal' ? ' (кабель в NORMAL — педаль не слышна)' : ''}`);
    changed();
  }
  // частота midrange — качалка на три положения: 1 — нажат левый край, 2 — ровно (как на кадре), 3 — правый край
  function setMid(instant) {
    const im = $('svt', '[data-key="one-mid"]'), m = AS.svt.mid;
    const set = () => { im.style.clipPath = m === 1 ? 'inset(0 50% 0 0)' : m === 3 ? 'inset(0 0 0 50%)' : ''; im.classList.toggle('vis', m !== 2); };
    if (instant) return set();
    im.style.clipPath = ''; im.classList.add('vis'); // миг: клавиша уходит целиком, потом встаёт в положение
    setTimeout(set, Math.max(dur('key'), 40));
  }
  function key(k, pos) {
    const A = AS.svt, im = $('svt', `[data-key="${k}"]`);
    if (k === 'one-mid') {
      A.mid = pos || A.mid % 3 + 1;
      setMid();
      cap('svt', `ONE midrange: ${A.mid} — ${MIDF[A.mid - 1]} Гц`);
    } else {
      A.keys[k] = !A.keys[k];
      setTimeout(() => im.classList.toggle('vis', A.keys[k]), dur('key') / 2);
      cap('svt', `${SVTKEYS.find((x) => x[0] === k)[1]}: ${A.keys[k] ? 'нажата' : 'отжата'}`);
    }
    changed();
  }
  function bright(ch) {
    const A = AS.fe; A.bright[ch] = !A.bright[ch];
    const el = $('fe', `.bright[data-bright="${ch}"]`);
    el.style.transition = reduce() ? 'none' : `transform ${T.toggle}s`;
    el.style.transform = A.bright[ch] ? 'scaleY(-1)' : 'none';
    cap('fe', `BRIGHT ${ch.toUpperCase()}: ${A.bright[ch] ? 'вкл.' : 'выкл.'}`);
    changed();
  }
  function onZone(d, z, ev) {
    const [kind, arg] = z.split(':');
    switch (kind) {
      case 'cable': return plugTo(d, DEFJACK[d]);
      case 'unplug': return unplug(d);
      case 'panel': return go(d, 'panel');
      case 'rear': return go(d, 'rear');
      case 'power': return toggle(d, 'power');
      case 'standby': return toggle(d, 'standby');
      case 'jack': return plugTo(d, arg);
      case 'knob': {
        const r = ev.currentTarget.getBoundingClientRect();
        return knob(d, arg, ev.detail === 0 ? 1 : (ev.clientX - r.left > r.width / 2 ? 1 : -1)); // с клавиатуры — «+»
      }
      case 'pedal-vibrato': return pedal('vibrato');
      case 'pedal-reverb': return pedal('reverb');
      case 'key': {
        if (arg === 'one-mid' && ev.detail !== 0) { // нажатие по краю качалки — положение 1 / 2 / 3
          const r = ev.currentTarget.getBoundingClientRect();
          return key(arg, Math.min(3, 1 + Math.floor((ev.clientX - r.left) / r.width * 3)));
        }
        return key(arg);
      }
      case 'bright': return bright(arg);
      case 'info': {
        // 2.13: только для вида. GROUND — рычаг щёлкает и возвращается (7.27б); остальное — подсветка и подпись
        if (arg === 'ground') {
          const el = $('fe', '[data-flip="ground"]'), ms = Math.max(dur('toggle'), 30);
          el.animate([{ transform: 'none' }, { transform: 'scaleY(-1)', offset: 0.2 }, { transform: 'scaleY(-1)', offset: 0.8 }, { transform: 'none' }], { duration: reduce() ? 1 : ms * 3 + 60 });
        } else {
          ev.currentTarget.animate([{ boxShadow: 'inset 0 0 0 0 transparent' }, { boxShadow: 'inset 0 0 0 3px rgba(255,214,150,.8)', offset: 0.3 }, { boxShadow: 'inset 0 0 0 0 transparent' }], { duration: 600 });
        }
        return cap(d, INFO[d][arg], 2.2);
      }
    }
  }
  function changed() { ui('fe'); ui('svt'); kick(); K.changed(); }

  // ---------- что видно: кабель на полу / штекер; подсказка ----------
  function ui(d) {
    if (!SC[d]) return;
    const A = AS[d];
    for (const z of $$(d, '[data-z="cable"]')) z.hidden = !!A.cable;
    for (const z of $$(d, '[data-view="main"] [data-z="unplug"]')) {
      z.hidden = !A.cable;
      if (A.cable) { const [x, y] = GEO.main_jacks[d][A.cable], h = Number(z.dataset.at.split(',')[3]); z.style.left = pct(x, FW); z.style.top = pct(y + h / 3, FH); }
    }
  }
  function hint(d) {
    const A = AS[d], fe = d === 'fe';
    if (!A.cable) return 'Кабель на полу — нажмите на него: штекер войдёт в гнездо.';
    if (!A.power) return fe ? 'Ручка сверху — к задней планке, там тумблер ON.' : 'Тумблер POWER справа на голове (или на панели крупно).';
    if (!A.standby) return fe ? 'Ручка сверху — к задней планке, там тумблер STANDBY.' : 'Верх головы — к задней планке, там тумблер STANDBY.';
    const ch = channel(d);
    if (kv(d, ch + '-volume') <= RANGE[d][0]) return `Панель крупно — VOLUME канала ${ch.toUpperCase()}: правая половина ручки «+».`;
    const other = fe ? 'svt' : 'fe';
    return sounding(other) ? 'Играют оба, как группа, в одном такте. ' + (fe ? 'Ручки и педаль — меняют звук.' : 'Ручки и клавиши ultra — меняют звук.')
      : `Играет — решётка дрожит под звук. Включите и ${fe ? 'Ampeg SVT' : 'Fender'} — вступит в тот же такт.`;
  }

  // ---------- кадровый цикл: нагрев (D-086: 1,4–2 с), остывание (3,5 с), свечение, «ворота», дрожь решётки ----------
  const narrow = matchMedia('(max-width:640px)');
  let raf = false, last = 0;
  function kick() { if (!raf) { raf = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    let more = false;
    try {
      for (const d of ['fe', 'svt']) {
        const A = AS[d], h0 = A.heat;
        if (reduce()) A.heat = A.power ? 1 : 0;
        else if (A.power) A.heat = Math.min(1, A.heat + dt / T.warm);
        else A.heat = Math.max(0, A.heat - dt / T.cool);
        const h = A.heat, on = sounding(d);
        const g0 = gate[d], gT = on ? h * h : 0, tc = (on ? 0.3 : (A.cable ? 0.2 : 0.02)) / 3;
        gate[d] = gT + (g0 - gT) * Math.exp(-dt / tc);
        if (Math.abs(gate[d] - gT) < 0.002) gate[d] = gT;
        if (h !== h0 || gate[d] !== g0 || gate[d] !== gT || gate[d] > 0) more = true; // 8.9: первый кадр с dt=0 не должен гасить цикл
        const sc = SC[d];
        if (h0 < 1 && h >= 1 && A.power) { if (sc && sc.root.isConnected) cap(d, A.standby ? 'Лампы прогрелись.' : 'Лампы прогрелись — теперь STANDBY.', 1.8); }
        if (!sc || !sc.root.isConnected) continue;
        // нити сначала тёмно-красные, потом ровный тёплый свет
        for (const el of lay(d, 'glow')) {
          el.style.opacity = Math.min(1, h * 1.25).toFixed(3);
          el.style.filter = `brightness(${(0.45 + 0.55 * h).toFixed(3)}) saturate(${(1 + 0.9 * (1 - h)).toFixed(3)}) hue-rotate(${(-16 * (1 - h)).toFixed(1)}deg)`;
        }
        const ch = channel(d), vol = ch ? (kv(d, ch + '-volume') - RANGE[d][0]) / (10 - RANGE[d][0]) : 0;
        const lv = RS.sound ? RS.sound.level(d) : null; // 8.9: настоящая громкость; звука нет — по такту, как в 8.8
        const r = lv === null ? gate[d] * vol * level(d, now / 1000) : lv;
        const j = reduce() ? 0 : T.jitter * Math.min(1, r * 1.6) * (narrow.matches ? 0.7 : 1); // телефон: дрожь включена (8.10), чуть слабее
        for (const el of lay(d, 'grille')) el.style.transform = j > 0.05 ? `translate(${((Math.random() * 2 - 1) * j).toFixed(2)}px, ${((Math.random() * 2 - 1) * j).toFixed(2)}px)` : 'none';
      }
    } catch (e) { console.error(e); }
    if (more) requestAnimationFrame(loop);
    else raf = false;
  }

  // усилитель «играет» видно и по состоянию автомата (world.json: off | warming | standby | ready | playing | cooling | cable_in)
  RS.amps = {
    state(dev) {
      const d = dev === 'a-amp-svt' || dev === 'svt' ? 'svt' : 'fe', A = AS[d];
      if (!A.power) return A.heat > 0 ? 'cooling' : A.cable ? 'cable_in' : 'off';
      if (A.heat < 1) return 'warming';
      if (!A.standby) return 'standby';
      return sounding(d) ? 'playing' : 'ready';
    },
    sounding: () => ['fe', 'svt'].filter(sounding).map((d) => DEV[d].id),
    gate: (d) => gate[d === 'a-amp-svt' ? 'svt' : d === 'a-amp-fender' ? 'fe' : d], // 8.9: звук нарастает и гаснет вместе с «воротами»
  };

  function device(d) {
    return {
      mount(container) {
        if (!SC[d]) build(d);
        container.appendChild(SC[d].root);
        ui(d); kick();
        flash(SC[d].cap, hint(d), 4.5);
      },
    };
  }
  Object.assign(RS.devices, { 'a-amp-fender': device('fe'), 'a-amp-svt': device('svt') });
})();
