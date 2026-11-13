// RockShowcase — цепочки 1 “Кассета” (шаг 8.4) и 2 “Пластинка” (шаг 8.5) на сайте и общий автомат состояний предметов.
// Кассета: код движений из моушн-превью 7.4 (project/stage7/7.4-preview/index.html, D-164…D-166),
// переходы и тайминги — project/stage7/7.1-cassette-transitions.md (D-161). Кадры — site/assets/cas/.
// Пластинка: превью 7.12 (project/stage7/7.12-preview/index.html, D-172), переходы 7.7 (D-167). Кадры — site/assets/vin/.
//
// Без веб-кнопок (D-006): всё нажимается на самих предметах. Кассета, взятая из кейса, остаётся
// “в руке” (маленькая в левом нижнем углу) и ходит с посетителем между точками; нажатие на неё — осмотр.
//
// Общий автомат (пробел 4 STAGE8_PLAN): window.RS.world — одно состояние на весь сайт
// (где какая кассета, что с каждым аппаратом); world.on(fn) — подписка на изменения,
// world.playing() — какие источники сейчас играют (MC275 и колонки подключатся в 8.5–8.6).
(function () {
  'use strict';
  const W = 1536, H = 1024;
  const A = 'assets/cas/';
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  mq.addEventListener?.('change', (e) => { reduce = e.matches; syncVu(); psSyncLayers(); ttSyncLayers(); });

  // ---------- тайминги (секунды) — 7.1 / превью 7.4, подтверждены владельцем (D-164) ----------
  const T = {
    latchClick: 0.1, latchFlip: 0.18, lidOpen: 0.55, lift: 0.12, take: 0.35, putBack: 0.3, lidClose: 0.4,
    latchClose: 0.15, turn: 0.4, handBack: 0.3, key: 0.075, door: 0.22, insert: 0.28, spinUp: 0.25, naac: 1.0,
    spinDown: 0.18, psPower: 0.3, psDoor: 0.35, psInsert: 0.3, psLid: 0.25, psSpinUp: 0.25, psFader: 0.15, psVu: 0.3,
  };
  const slow = false;
  const d = (k) => (reduce ? 0 : T[k]);
  const ms = (s) => Math.round(s * 1000);
  const wait = (s) => new Promise((r) => setTimeout(r, ms(s)));
  const log = (t) => { if (window.RS_DEBUG) console.debug('[8.4]', t); };
  const fmt = (s) => (s < 0.1 ? Math.round(s * 1000) + ' ms' : s.toFixed(2).replace('.', ',') + ' s');

  // ---------- общее состояние (автомат) ----------
  const S = {
    latchL: false, latchR: false, lid: false, hover: -1,
    cassette: 'case', // case | hand | deck | ps — где кассета, вынутая из кейса (из кейса — одна за раз)
    sel: 0,           // какая: 0 Nebraska, 1 Ten, 2 XLII-S, 3 SA-X
    handIdx: 0,       // ракурс осмотра
    casSide: 1,       // 9.10 (D-212): какую сторону кассеты смотрели в руке последней (A=1, B=2) — её и играет дека
    hp: false,        // 9.10 (D-212): наушники с консоли надеты — B звучит в них, комната тише (sound.js)
    deck: 'idle',     // Dragon: idle | door | doorCas | loaded | playing | stopped
    ps: 'off',        // TASCAM: off | on | open | openCas | loaded | playing | stopped
    psCounter: 0, psMaster: 0.77, counter: 0,
    // пластинки (8.5): rows — ряд | out (конверт выдвинут) | taken (конверт в руке) | waiting (выдвинут на четверть, пластинка вне его);
    // disc — где пластинка выбранного конверта: shelf (в конверте) | hand | tt; side — какая сторона к зрителю / вверх
    vin: { rows: 'rows', sel: null, disc: 'shelf', side: 1, ins: null },
    // Technics: исходно питание вкл., крышка закрыта, диск пуст, тонарм на подставке, 33 (7.7 п. 3)
    tt: { lid: false, power: true, disc: null, side: 1, arm: 'rest', spin: false, speed: 33, pitch: 0, lamp: false },
    // видеокассета Maxell (8.6, devices-a.js): sleeve — в футляре на полке | hand | deck
    vhs: { cass: 'sleeve' },
    // кассета бумбокса в руке (8.7, devices-c.js): null | 'rc' (JVC RC-M90) | 'gf' (Sharp GF-777)
    bb: { hand: null },
  };
  const listeners = [], sources = [];
  const world = {
    state: S,
    on(fn) { listeners.push(fn); },
    playing() {
      const p = [];
      if (S.deck === 'playing') p.push('b-cassette-deck');
      if (S.ps === 'playing') p.push('b-portastudio');
      if (S.tt.arm === 'down' && S.tt.spin && S.tt.power) p.push('b-turntable');
      for (const f of sources) p.push(...f()); // 8.6: Revox, TEAC, HR-3300 (devices-a.js)
      return p;
    },
    addSource(fn) { sources.push(fn); },
  };
  function changed() { render(); for (const f of listeners) f(S); }
  let busy = false;
  async function run(fn) { if (busy) return; busy = true; try { await fn(); } finally { busy = false; changed(); } }

  // ---------- кассеты ----------
  const SLOTS = [[444, 546, 'Bruce Springsteen — Nebraska'], [546, 640, 'Pearl Jam — Ten'], [640, 736, 'Maxell XLII-S 90 (blank)'], [736, 848, 'TDK SA-X 90 (blank)']];
  const SFX = ['', '-ten', '-xlii-s', '-sa-x'];
  const SHORT = ['Nebraska', 'Ten', 'XLII-S', 'SA-X'];
  const VIEWS = [['ins-front', 'case front'], ['ins-spine', 'spine'], ['ins-back', 'case back'], ['ins-sideA', 'cassette, side A'], ['ins-sideB', 'cassette, side B'], ['ins-edge', 'cassette, edge']];

  // ---------- DOM: элементы по id (сцены живут и вне документа, пока посетитель у другого предмета) ----------
  const E = {};
  const $ = (id) => E[id];
  function make(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    const root = t.content.firstElementChild;
    for (const el of [root, ...root.querySelectorAll('[id]')]) if (el.id) E[el.id] = el;
    for (const z of root.querySelectorAll('.zone')) z.title = z.getAttribute('aria-label') || '';
    return root;
  }
  const imgs = (list, base = A) => list.map(([k, alt]) => `<img class="f${k === list[0][0] ? ' on' : ''}" data-k="${k}" src="${base}${k}.webp" alt="${alt}" draggable="false">`).join('');
  function place(el, x0, y0, x1, y1) {
    Object.assign(el.style, { left: (x0 / W * 100) + '%', top: (y0 / H * 100) + '%', width: ((x1 - x0) / W * 100) + '%', height: ((y1 - y0) / H * 100) + '%' });
  }
  function zone(el, x0, y0, x1, y1) {
    Object.assign(el.style, { left: ((x0 + x1) / 2 / W * 100) + '%', top: ((y0 + y1) / 2 / H * 100) + '%', width: ((x1 - x0) / W * 100) + '%', height: ((y1 - y0) / H * 100) + '%' });
  }
  function frame(stage, key, dur, ease = 'ease-in-out') {
    const all = stage.querySelectorAll('img.f');
    const next = stage.querySelector(`img.f[data-k="${key}"]`);
    if (next.classList.contains('on') && [...all].filter((i) => i.classList.contains('on')).length === 1) return Promise.resolve(); // тот же кадр — без мигания
    all.forEach((i) => { if (i !== next) i.style.zIndex = 0; });
    next.style.zIndex = 1;
    next.style.transition = 'none'; next.style.opacity = 0; next.classList.add('on');
    void next.offsetWidth;
    next.style.transition = reduce ? 'opacity 100ms linear' : `opacity ${ms(dur)}ms ${ease}`;
    next.style.opacity = 1;
    return wait(reduce ? 0.1 : dur).then(() => { all.forEach((i) => { if (i !== next) { i.classList.remove('on'); i.style.opacity = ''; } }); next.style.opacity = ''; });
  }
  function fade(el, on, dur, ease = 'ease-out') {
    el.style.transition = `opacity ${ms(reduce ? 0.1 : dur)}ms ${ease}`; el.style.opacity = on ? 1 : 0;
    return wait(reduce ? 0.1 : dur);
  }
  async function press(el) {
    el.style.transition = 'none'; el.style.opacity = 1;
    await wait(reduce ? 0 : d('key'));
    el.style.transition = 'opacity 60ms'; el.style.opacity = 0;
  }
  const show = (el, on) => { if (el) el.hidden = !on; };
  // подпись-подсказка на пару секунд (руки заняты и т. п.)
  const flashT = new Map();
  function flash(el, text, sec = 2.4, after) {
    el.textContent = text; el.classList.add('on');
    clearTimeout(flashT.get(el));
    flashT.set(el, setTimeout(() => { flashT.delete(el); el.classList.remove('on'); if (after) after(); }, sec * 1000));
  }
  const flashing = (el) => flashT.has(el);

  // =====================================================================
  // Кейс-хранилище `a-cassette-storage` (D-022, D-162, D-163, D-165)
  // =====================================================================
  let caseRoot = null;
  function buildCase() {
    const fr = [['case-closed', 'Cassette case closed'], ['case-lid', 'Case open, four cassettes'], ['case-lifted', 'Nebraska cassette lifted'], ['case-empty', 'Nebraska slot empty']];
    for (const k of SFX.slice(1)) fr.push(['case-lifted' + k, 'Cassette lifted'], ['case-empty' + k, 'Slot empty']);
    caseRoot = make(`<div class="stage" id="caseStage">${imgs(fr)}
      <div class="layer" id="latchL"></div><div class="layer" id="latchR"></div><div class="caption" id="caseCap"></div>
      <button class="zone" id="zLatchL" aria-label="Left latch"></button>
      <button class="zone" id="zLatchR" aria-label="Right latch"></button>
      <button class="zone" id="zLidClosed" aria-label="Lid"></button>
      <button class="zone" id="zLidOpen" aria-label="Close the lid"></button>
      ${SLOTS.map((s, i) => `<button class="zone" data-slot="${i}" aria-label="${s[2]}"></button>`).join('')}
      <button class="zone" id="zSlotBack" aria-label="Put the cassette back"></button></div>`);
    place($('latchL'), 500, 720, 660, 975); $('latchL').style.backgroundImage = `url(${A}case-latch-left.webp)`;
    place($('latchR'), 890, 710, 1045, 965); $('latchR').style.backgroundImage = `url(${A}case-latch-right.webp)`;
    $('latchL').style.opacity = 0; $('latchR').style.opacity = 0;
    zone($('zLatchL'), 530, 760, 625, 915);
    zone($('zLatchR'), 920, 750, 1012, 905);
    zone($('zLidClosed'), 430, 320, 1060, 740);
    zone($('zLidOpen'), 400, 60, 1090, 300);
    caseRoot.querySelectorAll('[data-slot]').forEach((b) => { const [x0, x1] = SLOTS[+b.dataset.slot]; zone(b, x0, 340, x1, 810); });
    placeSlotBack(S.sel);

    $('zLatchL').onclick = () => run(() => latch('L'));
    $('zLatchR').onclick = () => run(() => latch('R'));
    $('zLidClosed').onclick = () => run(async () => {
      log(`1.2 крышка поднимается ${fmt(T.lidOpen)}`);
      await frame(caseRoot, S.cassette === 'case' ? 'case-lid' : 'case-empty' + SFX[S.sel], d('lidOpen'), 'cubic-bezier(.2,.7,.3,1)');
      $('latchL').style.opacity = 0; $('latchR').style.opacity = 0; // на кадре “открыт” защёлки уже откинуты
      S.lid = true;
    });
    $('zLidOpen').onclick = () => run(async () => {
      log(`1.6 крышка закрывается ${fmt(T.lidClose)}`);
      $('latchL').style.transition = 'none'; $('latchR').style.transition = 'none';
      $('latchL').style.opacity = 1; $('latchR').style.opacity = 1;
      await frame(caseRoot, 'case-closed', d('lidClose'), 'cubic-bezier(.5,0,.8,.4)');
      S.lid = false;
    });
    let touchArmed = -1;
    caseRoot.querySelectorAll('[data-slot]').forEach((b) => {
      const i = +b.dataset.slot;
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hoverSlot(i, true); });
      b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hoverSlot(i, false); });
      b.addEventListener('focus', () => hoverSlot(i, true));
      b.addEventListener('blur', () => hoverSlot(i, false));
      b.addEventListener('click', (e) => {
        const touch = e.pointerType === 'touch' || (e.pointerType === undefined && matchMedia('(hover:none)').matches);
        if (touch && touchArmed !== i) { touchArmed = i; hoverSlot(i, true); return; } // телефон: 1-е касание — приподнять
        touchArmed = -1;
        if (S.vin.disc === 'hand') { flash($('caseCap'), 'You’re holding a record — put it down first'); return; }
        if (S.vhs.cass === 'hand') { flash($('caseCap'), 'You’re holding a videocassette — put it down first'); return; }
        if (S.bb.hand) { flash($('caseCap'), 'You’re holding a boombox cassette — put it back in the boombox first'); return; }
        if (S.cassette === 'case') run(() => takeCassette(i));
      });
    });
    $('zSlotBack').onclick = () => run(async () => {
      log(`1.5 кассета опускается на место ${fmt(T.putBack)}`);
      await frame(caseRoot, 'case-lid', d('putBack'), 'ease-out');
      S.cassette = 'case';
    });
  }
  function placeSlotBack(i) { zone($('zSlotBack'), SLOTS[i][0], 340, SLOTS[i][1], 810); }
  async function latch(side) {
    const el = side === 'L' ? $('latchL') : $('latchR');
    const key = side === 'L' ? 'latchL' : 'latchR';
    if (!S[key]) { await wait(d('latchClick')); await fade(el, true, d('latchFlip')); S[key] = true; }
    else { await fade(el, false, d('latchClose')); S[key] = false; }
  }
  function hoverSlot(i, on) {
    if (busy) return;
    const cap = $('caseCap');
    cap.textContent = SLOTS[i][2]; cap.classList.toggle('on', on);
    if (S.cassette !== 'case' || !S.lid) return;
    const key = on ? i : -1;
    if (key === S.hover) return;
    S.hover = key;
    if (!reduce) frame(caseRoot, on ? 'case-lifted' + SFX[i] : 'case-lid', d('lift'), 'ease-out'); // 1.3
  }
  async function takeCassette(i) {
    $('caseCap').classList.remove('on');
    log(`1.4 кассета вверх из ряда ${fmt(T.take)}`);
    S.hover = -1; S.sel = i; placeSlotBack(i); setHubs(i); psSetHubs(i);
    await frame(caseRoot, 'case-empty' + SFX[i], d('take'), 'ease-in');
    S.cassette = 'hand'; S.handIdx = 0; S.casSide = 1;
    openInspect();
  }

  // =====================================================================
  // Кассета в руке и осмотр INS-00 (D-023): поворот — нажатие на кассету, мимо — опустить руку
  // =====================================================================
  const hand = document.createElement('div');
  hand.id = 'hand'; hand.hidden = true; hand.setAttribute('role', 'button'); hand.tabIndex = 0;
  hand.innerHTML = '<img alt="" draggable="false"><div class="disc" hidden></div><div class="vhs" hidden></div><img class="bb" alt="" draggable="false" hidden>';
  const handBb = hand.querySelector('img.bb');
  const handImg = hand.querySelector('img'), handDisc = hand.querySelector('.disc'), handVhs = hand.querySelector('.vhs');
  const insp = document.createElement('div');
  insp.id = 'insp'; insp.hidden = true; insp.setAttribute('aria-live', 'polite');
  insp.innerHTML = '<div class="insp-lbl"></div><div class="insp-card"><img alt="Cassette in hand" draggable="false"></div>'
    + '<div class="vin-card"><img class="va" alt="" draggable="false"><img class="vb" alt="" aria-hidden="true" draggable="false">'
    + '<button class="zone" data-z="0"></button><button class="zone" data-z="1"></button><button class="zone" data-z="2"></button></div>'
    + '<div class="insp-hint"></div>';
  const inspImg = insp.querySelector('.insp-card img'), inspLbl = insp.querySelector('.insp-lbl'), inspHint = insp.querySelector('.insp-hint');
  document.body.append(hand, insp);
  let inspOpen = false;
  let inspKind = 'cas'; // cas — кассета, vin — пластинка (осмотр VIN-00, шаг 8.5), vhs — видеокассета (8.6)
  const kinds = {};     // другие виды осмотра (devices-a.js): kind → { back() — мимо, close() — Esc и уход, open() — нажатие на руку }

  function setInspImg(i) {
    inspImg.src = A + VIEWS[i][0] + SFX[S.sel] + '.webp';
    inspLbl.textContent = SHORT[S.sel] + ' — ' + VIEWS[i][1];
    // 9.10 (D-212): сторона, на которую смотрели последней, — та, что заиграет в деке
    const v = VIEWS[i][0];
    if (v === 'ins-sideA') { S.casSide = 1; inspHint.textContent = 'The cassette goes into the deck this way up — side A will play.'; }
    else if (v === 'ins-sideB') { S.casSide = 2; inspHint.textContent = 'The cassette goes into the deck this way up — side B will play.'; }
    else if (inspKind === 'cas') inspHint.textContent = '';
  }
  function renderHand() {
    const cas = S.cassette === 'hand', vin = S.vin.disc === 'hand', vhs = S.vhs.cass === 'hand', bb = S.bb.hand;
    handImg.hidden = !cas; handDisc.hidden = !vin; handVhs.hidden = !vhs; handBb.hidden = !bb;
    if (bb) { const src = 'assets/cc/' + bb + '-insp-A.webp'; if (!handBb.src.endsWith(src)) handBb.src = src; }
    if (cas) {
      const src = A + 'ins-front' + SFX[S.sel] + '.webp';
      if (!handImg.src.endsWith(src)) handImg.src = src;
      hand.title = 'Cassette ' + SHORT[S.sel] + ' in hand — inspect';
    } else if (vin) { // пластинка в руке — кругом, вырезанным из кадра осмотра
      const v = S.vin.side === 2 ? 'disc2' : 'disc1', [cx, cy, r] = DISC[v];
      handDisc.style.backgroundImage = `url(${vSrc(v)})`;
      handDisc.style.backgroundSize = `${W / (2 * r) * 100}% auto`;
      handDisc.style.backgroundPosition = `${(cx - r) / (W - 2 * r) * 100}% ${(cy - r) / (H - 2 * r) * 100}%`;
      hand.title = 'Record ' + REC[S.vin.sel].short + ' in hand — inspect';
    } else if (vhs) hand.title = 'Maxell T-120 videocassette in hand — inspect';
    else if (bb) hand.title = 'Cassette ' + (bb === 'rc' ? 'from the JVC RC-M90' : 'from the Sharp GF-777') + ' in hand — inspect';
    hand.setAttribute('aria-label', hand.title);
    hand.hidden = !((cas || vin || vhs || bb) && !inspOpen);
  }
  async function openInspect() {
    if (S.cassette !== 'hand') return;
    inspKind = 'cas'; insp.classList.remove('vin'); inspHint.textContent = '';
    inspOpen = true; S.handIdx = 0; setInspImg(0);
    insp.hidden = false; renderHand();
    insp.style.opacity = 0; void insp.offsetWidth;
    await fade(insp, true, 0.2);
  }
  async function closeInspect() {
    if (!inspOpen) return;
    inspOpen = false;
    await fade(insp, false, d('handBack'));
    insp.hidden = true;
    changed();
  }
  async function turn() {
    const t = d('turn');
    const n = (S.handIdx + 1) % VIEWS.length;
    if (reduce) { S.handIdx = n; setInspImg(n); return; }
    inspImg.style.transition = `transform ${ms(t / 2)}ms ease-in`; inspImg.style.transform = 'rotateY(90deg)';
    await wait(t / 2); S.handIdx = n; setInspImg(n);
    inspImg.style.transition = 'none'; inspImg.style.transform = 'rotateY(-90deg)'; void inspImg.offsetWidth;
    inspImg.style.transition = `transform ${ms(t / 2)}ms ease-out`; inspImg.style.transform = 'rotateY(0)';
    await wait(t / 2);
  }
  inspImg.addEventListener('click', (e) => { e.stopPropagation(); run(turn); });
  // мимо: кассета остаётся в руке, маленькая в углу; пластинка — шаг назад (vinBack)
  insp.addEventListener('click', () => run(() => (kinds[inspKind] ? kinds[inspKind].back() : inspKind === 'vin' ? vinBack() : closeInspect())));
  const openHand = () => (S.bb.hand && kinds.bb ? kinds.bb.open() : S.vhs.cass === 'hand' && kinds.vhs ? kinds.vhs.open() : S.vin.disc === 'hand' ? vinShow(S.vin.side === 2 ? 'disc2' : 'disc1') : openInspect());
  hand.addEventListener('click', (e) => { e.stopPropagation(); run(openHand); });
  hand.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(openHand); } });

  // =====================================================================
  // Nakamichi Dragon `b-cassette-deck` (D-024, D-046, D-050, D-163…D-165)
  // =====================================================================
  let deckRoot = null;
  const G = {
    vuBox: [734, 432, 798, 674], cols: { L: [738, 763], R: [769, 794] },
    segY: [440, 452, 464, 476, 488, 500, 512.5, 525, 537, 549, 561, 573, 585, 597, 609, 620.5, 632, 643, 654, 665],
    arrowR: [557, 388, 590, 414], counter: [724, 382, 20, 26],
  };
  const HUB_C = { L: [437.1, 492.2], R: [553.6, 490.9] }, HUB_RAD = [13, 16, 16, 16];
  function buildDeck() {
    const fr = [['dragon-idle', 'Nakamichi Dragon, compartment empty'], ['dragon-door', 'Door open, compartment empty']];
    for (let i = 0; i < 4; i++) fr.push(['dragon-door-cas' + SFX[i], SHORT[i] + ' in the compartment'], ['dragon-loaded' + SFX[i], SHORT[i] + ' loaded'], ['dragon-playing' + SFX[i], SHORT[i] + ' playing']);
    deckRoot = make(`<div class="stage" id="deckStage">${imgs(fr)}
      <div class="layer" id="vuOff"></div><div class="layer" id="vuL"></div><div class="layer" id="vuR"></div>
      <div class="layer" id="pkL"></div><div class="layer" id="pkR"></div>
      <div class="layer rot" id="hubL"></div><div class="layer rot" id="hubR"></div>
      <div class="layer" id="arrowOff"></div><div class="layer" id="counter"></div>
      <div class="press" id="pressEject"></div><div class="press" id="pressPlay"></div><div class="press" id="pressStop"></div>
      <button class="zone" id="zEject" aria-label="⏏ key"></button>
      <button class="zone" id="zPlay" aria-label="PLAY"></button>
      <button class="zone" id="zStop" aria-label="STOP"></button>
      <button class="zone" id="zBay" aria-label="Cassette compartment" style="z-index:9"></button>
      <button class="zone" id="zDoor" aria-label="Door"></button></div>`);
    place($('vuOff'), ...G.vuBox); $('vuOff').style.backgroundImage = `url(${A}vu-off.webp)`;
    for (const s of ['L', 'R']) {
      const [x0, x1] = G.cols[s];
      place($('vu' + s), x0, G.vuBox[1], x1, G.vuBox[3]); $('vu' + s).style.backgroundImage = `url(${A}vu-lit-${s}.webp)`;
      place($('pk' + s), x0, G.vuBox[1], x1, G.vuBox[3]); $('pk' + s).style.backgroundImage = `url(${A}vu-lit-${s}.webp)`;
    }
    setHubs(S.sel);
    place($('arrowOff'), ...G.arrowR); $('arrowOff').style.backgroundImage = `url(${A}arrow-off.webp)`; $('arrowOff').style.opacity = 0;
    { const [x, y, cw, ch] = G.counter; place($('counter'), x, y, x + cw * 4, y + ch);
      for (let i = 0; i < 4; i++) { const s = document.createElement('span');
        Object.assign(s.style, { position: 'absolute', top: 0, height: '100%', left: (i * 25) + '%', width: '25%', backgroundImage: `url(${A}digits.webp)`, backgroundSize: '1000% 100%', backgroundRepeat: 'no-repeat' });
        $('counter').appendChild(s); } }
    setCounter(S.counter);
    place($('pressEject'), 193, 572, 248, 628); place($('pressPlay'), 1013, 340, 1086, 397); place($('pressStop'), 935, 340, 1010, 397);
    zone($('zEject'), 193, 572, 248, 628); zone($('zPlay'), 1013, 340, 1086, 397); zone($('zStop'), 935, 340, 1010, 397);
    zone($('zBay'), 330, 440, 700, 625); zone($('zDoor'), 300, 632, 700, 770);
    ['L', 'R'].forEach((s) => { clipCol($('vu' + s), 0); clipSeg($('pk' + s), 0); });

    $('zEject').onclick = () => run(async () => {
      if (S.deck === 'playing') await stop(); // 3.7: до проверки (GAPS п. 3) — сначала STOP
      await press($('pressEject'));
      if (S.deck === 'idle') { await frame(deckRoot, 'dragon-door', d('door'), 'ease-out'); S.deck = 'door'; }
      else if (S.deck === 'loaded' || S.deck === 'stopped') { await frame(deckRoot, 'dragon-door-cas' + SFX[S.sel], d('door'), 'ease-out'); S.deck = 'doorCas'; }
      syncVu();
    });
    $('zBay').onclick = () => run(async () => {
      if (S.deck === 'door' && S.cassette === 'hand') { // 3.2
        await closeInspect();
        await frame(deckRoot, 'dragon-door-cas' + SFX[S.sel], d('insert'), 'ease-out'); S.deck = 'doorCas'; S.cassette = 'deck';
      } else if (S.deck === 'doorCas') { // 3.6: кассета в руку
        await frame(deckRoot, 'dragon-door', d('insert'), 'ease-in'); S.deck = 'door'; S.cassette = 'hand';
      }
      syncVu();
    });
    $('zDoor').onclick = () => run(async () => {
      if (S.deck === 'doorCas') { await frame(deckRoot, 'dragon-loaded' + SFX[S.sel], d('door'), 'ease-in'); S.deck = 'loaded'; }
      else if (S.deck === 'door') { await frame(deckRoot, 'dragon-idle', d('door'), 'ease-in'); S.deck = 'idle'; }
      syncVu();
    });
    $('zPlay').onclick = () => run(async () => {
      await press($('pressPlay'));
      if (S.deck !== 'loaded' && S.deck !== 'stopped') return;
      S.deck = 'playing'; syncVu();
      if (reduce) await frame(deckRoot, 'dragon-playing' + SFX[S.sel], 0.1);
      startPlay();
    });
    $('zStop').onclick = () => run(async () => { await press($('pressStop')); if (S.deck === 'playing') await stop(); });
    syncVu();
  }
  function setHubs(i) {
    if (!deckRoot) return;
    for (const s of ['L', 'R']) {
      const [cx, cy] = HUB_C[s], r = HUB_RAD[i], hx = Math.round(cx) - r - 1, hy = Math.round(cy) - r - 1, hs = r * 2 + 2;
      place($('hub' + s), hx, hy, hx + hs, hy + hs); $('hub' + s).style.backgroundImage = `url(${A}hub-${s}${SFX[i]}.webp)`;
    }
  }
  let vuIdle = false;
  function vuOffVisible() {
    const dk = S.deck;
    if (dk === 'playing') return !reduce;
    if (dk === 'idle' || dk === 'door' || dk === 'doorCas') return !vuIdle; // D-164: в покое VU погашены
    return false;
  }
  function syncVu() { if (deckRoot) $('vuOff').style.opacity = vuOffVisible() ? 1 : 0; }
  async function stop() {
    stopPlay();
    if (reduce) await frame(deckRoot, 'dragon-loaded' + SFX[S.sel], 0.1);
    await wait(reduce ? 0 : d('spinDown'));
    S.deck = 'stopped'; syncVu();
  }
  // Лента 4,76 см/с. В окошке кассета перевёрнута: справа полный рулон стороны A, слева — хаб.
  const V_TAPE = 47.6, R_FULL = 24.8, R_EMPTY = 11.5;
  const W_FULL = V_TAPE / R_FULL * 180 / Math.PI, W_EMPTY = V_TAPE / R_EMPTY * 180 / Math.PI;
  let playing = false, speed = 0, target = 0, angL = 0, angR = 0, lastT = 0, rampDur = 0.25, rafOn = false;
  const vu = { L: 0, R: 0 }, pk = { L: 0, R: 0 }, pkHold = { L: 0, R: 0 }, noise = { L: 0, R: 0 };
  let naacUntil = 0, cntAcc = 0;
  function setCounter(n) { if (!deckRoot) return; const s = String(n % 10000).padStart(4, '0'); [...$('counter').children].forEach((el, i) => { el.style.backgroundPosition = `${(+s[i]) / 9 * 100}% 0`; }); }
  function startPlay() {
    playing = true; target = 1; rampDur = d('spinUp') || 0.001;
    naacUntil = performance.now() + ms(reduce ? 0 : d('naac'));
    cntAcc = 0;
    if (!rafOn) { rafOn = true; lastT = performance.now(); requestAnimationFrame(tick); }
  }
  function stopPlay() { playing = false; target = 0; rampDur = d('spinDown') || 0.001; }
  function clipCol(el, segs) {
    const top = segs <= 0 ? G.vuBox[3] : G.segY[G.segY.length - segs] - 6;
    el.style.clipPath = `inset(${(top - G.vuBox[1]) / (G.vuBox[3] - G.vuBox[1]) * 100}% 0 0 0)`;
  }
  function clipSeg(el, idx) {
    if (idx <= 0) { el.style.clipPath = 'inset(100% 0 0 0)'; return; }
    const y = G.segY[G.segY.length - idx], h = G.vuBox[3] - G.vuBox[1];
    el.style.clipPath = `inset(${(y - 6 - G.vuBox[1]) / h * 100}% 0 ${(G.vuBox[3] - (y + 6)) / h * 100}% 0)`;
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const slowK = slow ? 4 : 1;
    const step = dt / Math.max(rampDur, 0.001);
    speed = target > speed ? Math.min(target, speed + step) : Math.max(target, speed - step);
    if (!reduce) {
      angL -= W_EMPTY * speed * dt / slowK; angR -= W_FULL * speed * dt / slowK;
      $('hubL').style.transform = `rotate(${angL}deg)`; $('hubR').style.transform = `rotate(${angR}deg)`;
    }
    const N = G.segY.length;
    for (const s of ['L', 'R']) {
      if (playing && speed > 0.5 && !reduce) {
        noise[s] += (Math.random() - 0.5) * 0.9; noise[s] *= 0.92;
        const base = 11 + 2.5 * Math.sin(now / 1700 + (s === 'L' ? 0 : 1.3)) + 2.2 * Math.sin(now / 310 + (s === 'L' ? 0.4 : 2.1));
        const tgt = Math.max(0, Math.min(N, base + noise[s] * 4 + (Math.random() < 0.06 ? 3 : 0)));
        vu[s] = tgt > vu[s] ? vu[s] + (tgt - vu[s]) * Math.min(1, dt * 40 / slowK) : Math.max(tgt, vu[s] - dt * 26 / slowK);
      } else vu[s] = Math.max(0, vu[s] - dt * 40 / slowK);
      const lvl = Math.round(vu[s]);
      if (lvl >= pk[s]) { pk[s] = lvl; pkHold[s] = 0.8; } else { pkHold[s] -= dt / slowK; if (pkHold[s] <= 0) { pk[s] = Math.max(lvl, pk[s] - 1); pkHold[s] = 0.08; } }
      const on = (S.deck === 'playing' && !reduce) || vu[s] > 0.4;
      clipCol($('vu' + s), on ? lvl : 0); clipSeg($('pk' + s), on && !reduce ? pk[s] : 0);
    }
    const blinking = playing && now < naacUntil; // стрелка Direction мигает, пока NAAC подстраивает (D-050)
    $('arrowOff').style.opacity = blinking && (Math.floor((naacUntil - now) / (125 * slowK)) % 2 === 0) ? 1 : 0;
    if (playing) { cntAcc += dt / slowK; if (cntAcc >= 1) { cntAcc -= 1; S.counter++; setCounter(S.counter); } }
    if (playing || speed > 0 || vu.L > 0 || vu.R > 0 || pk.L > 0 || pk.R > 0) requestAnimationFrame(tick); else rafOn = false;
  }

  // =====================================================================
  // TASCAM 144 `b-portastudio` (D-107, D-166)
  // =====================================================================
  let psRoot = null, cx2 = null, cv = null;
  const PS = {"vu":[160,112,1004,254],"meters":[[[245.0,243.3],[203.3,200.7],[295.7,175.7],[346.7,191.7]],[[469.3,230.7],[432.3,190.0],[514.0,170.0],[561.7,180.7]],[[678.7,218.0],[640.3,178.7],[722.0,155.7],[767.0,169.7]],[[876.7,205.0],[843.3,167.3],[919.0,146.0],[961.7,159.3]]],"faces":[[176,150,368,246],[406,142,584,236],[622,130,790,224],[826,122,990,212]],"play":[1262,708,1336,754],"hubs":{"nebraska":{"L":{"c":[1013.2,572.9],"half":15,"m":[1.0962,-0.0769,0.2133,0.8973]},"R":{"c":[1127.8,564.9],"half":15,"m":[1.0837,-0.076,0.2438,0.9056]}},"ten":{"L":{"c":[1015.2,572.5],"half":18,"m":[1.1019,-0.0772,0.2127,0.8926]},"R":{"c":[1125.8,564.8],"half":17,"m":[1.0898,-0.0764,0.242,0.9007]}},"xlii-s":{"L":{"c":[1017.5,570.6],"half":18,"m":[1.0848,-0.0757,0.2168,0.9067]},"R":{"c":[1122.1,563.3],"half":17,"m":[1.0735,-0.0749,0.2449,0.9144]}},"sa-x":{"L":{"c":[1013.7,572.3],"half":17,"m":[1.1012,-0.0771,0.2125,0.8933]},"R":{"c":[1125.1,564.5],"half":17,"m":[1.089,-0.0763,0.242,0.9013]}}},"counter":[[1236.5,498.5],[1251.0,497.5],[1266.5,496.5]],"cell":[14,18],"fader":{"top":[788.0,650.0],"bot":[822.0,827.0],"cap":[762,665,831,715],"capc":[796.0,690.0],"bg":[756,640,846,840]}};
  const KEYS = ['nebraska', 'ten', 'xlii-s', 'sa-x'];
  const FT = PS.fader.top, FB = PS.fader.bot, CAPB = PS.fader.cap, CAPC = PS.fader.capc;
  const tCap0 = (CAPC[1] - FT[1]) / (FB[1] - FT[1]);
  S.psMaster = 1 - (tCap0 - 0.06) / 0.86; // как на герое
  const MASTER0 = S.psMaster;
  function buildPs() {
    const fr = [['ps-off', 'TASCAM 144 off, cassette well empty'], ['ps-on', 'TASCAM 144 on, cassette well empty'], ['ps-well-open', 'Well lid up, empty']];
    for (let i = 0; i < 4; i++) fr.push(['ps-open-cas' + SFX[i], SHORT[i] + ' in the well'], ['ps-loaded' + SFX[i], SHORT[i] + ' under the lid'], ['ps-playing' + SFX[i], SHORT[i] + ' playing']);
    psRoot = make(`<div class="stage" id="psStage">${imgs(fr)}
      <div class="layer" id="psVuOff"></div><div class="layer" id="psVuClean"></div><canvas class="layer" id="psNeedles"></canvas>
      <div class="layer rot" id="psHubL"></div><div class="layer rot" id="psHubR"></div>
      <div class="layer" id="psCounter"></div><div class="layer" id="psKeyPlay"></div>
      <div class="layer" id="psFaderBg"></div><div class="layer" id="psFaderCap"></div>
      <div class="press" id="pressPsPower"></div><div class="press" id="pressPsDoor"></div><div class="press" id="pressPsPlay"></div><div class="press" id="pressPsStop"></div>
      <button class="zone" id="zPsPower" aria-label="POWER"></button>
      <button class="zone" id="zPsDoor" aria-label="DOOR"></button>
      <button class="zone" id="zPsPlay" aria-label="PLAY"></button>
      <button class="zone" id="zPsStop" aria-label="STOP"></button>
      <button class="zone" id="zPsWell" aria-label="Cassette well" style="z-index:9"></button>
      <button class="zone" id="zPsLid" aria-label="Well lid"></button>
      <button class="zone" id="zPsFader" aria-label="MASTER fader: tap the scale or use the up and down arrow keys"></button></div>`);
    place($('psVuOff'), ...PS.vu); $('psVuOff').style.backgroundImage = `url(${A}ps-vu-off.webp)`; $('psVuOff').style.opacity = 0;
    place($('psVuClean'), ...PS.vu); $('psVuClean').style.backgroundImage = `url(${A}ps-vu-clean.webp)`;
    cv = $('psNeedles'); place(cv, ...PS.vu);
    cv.width = (PS.vu[2] - PS.vu[0]) * 2; cv.height = (PS.vu[3] - PS.vu[1]) * 2;
    cx2 = cv.getContext('2d');
    place($('psKeyPlay'), ...PS.play); $('psKeyPlay').style.backgroundImage = `url(${A}ps-key-play.webp)`;
    place($('psFaderBg'), ...PS.fader.bg); $('psFaderBg').style.backgroundImage = `url(${A}ps-fader-bg.webp)`;
    $('psFaderCap').style.backgroundImage = `url(${A}ps-fader-cap.webp)`;
    PS.counter.forEach(([x, y]) => { const [cw, ch] = PS.cell; const sp = document.createElement('span'); sp.className = 'layer'; sp.dataset.cnt = 1;
      place(sp, x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2); Object.assign(sp.style, { backgroundImage: `url(${A}ps-digits.webp)`, backgroundSize: '1000% 100%' }); $('psCounter').appendChild(sp); });
    place($('psCounter'), 0, 0, W, H);
    psSetCounter(S.psCounter);
    psSetHubs(S.sel);
    psFaderPlace(S.psMaster);
    place($('pressPsPower'), 1268, 390, 1316, 412); place($('pressPsDoor'), 1390, 770, 1450, 800);
    place($('pressPsPlay'), 1266, 714, 1332, 748); place($('pressPsStop'), 1208, 780, 1270, 812);
    zone($('zPsPower'), 1260, 380, 1324, 420); zone($('zPsDoor'), 1384, 762, 1456, 806);
    zone($('zPsPlay'), 1262, 706, 1336, 754); zone($('zPsStop'), 1204, 772, 1274, 818);
    zone($('zPsWell'), 900, 480, 1240, 665); zone($('zPsLid'), 830, 290, 1400, 470);
    zone($('zPsFader'), 768, 640, 840, 835);
    drawNeedles();

    $('zPsPower').onclick = () => run(async () => {
      if (S.ps === 'playing') await psStop();
      await press($('pressPsPower'));
      if (S.ps === 'off') {
        const cas = S.cassette === 'ps';
        S.ps = cas ? 'loaded' : 'on'; psSyncLayers(d('psPower'));
        await frame(psRoot, cas ? 'ps-loaded' + SFX[S.sel] : 'ps-on', d('psPower'), 'ease-out');
      } else {
        if (S.ps === 'open' || S.ps === 'openCas') return; // сначала закрыть крышку колодца
        S.ps = 'off'; psSyncLayers(d('psPower'));
        await frame(psRoot, S.cassette === 'ps' ? 'ps-loaded' + SFX[S.sel] : 'ps-off', d('psPower'), 'ease-in');
      }
    });
    $('zPsDoor').onclick = () => run(async () => {
      if (S.ps === 'off') { await press($('pressPsDoor')); return; }
      if (S.ps === 'playing') await psStop(); // 5.8: DOOR во время игры — сначала STOP (проверить)
      await press($('pressPsDoor'));
      if (S.ps === 'on') { await frame(psRoot, 'ps-well-open', d('psDoor'), 'cubic-bezier(.2,.7,.3,1)'); S.ps = 'open'; }
      else if (S.ps === 'loaded' || S.ps === 'stopped') { await frame(psRoot, 'ps-open-cas' + SFX[S.sel], d('psDoor'), 'cubic-bezier(.2,.7,.3,1)'); S.ps = 'openCas'; }
      psSyncLayers();
    });
    $('zPsWell').onclick = () => run(async () => {
      if (S.ps === 'open' && S.cassette === 'hand') { // 5.3
        await closeInspect();
        psSetHubs(S.sel);
        await frame(psRoot, 'ps-open-cas' + SFX[S.sel], d('psInsert'), 'ease-out'); S.ps = 'openCas'; S.cassette = 'ps';
      } else if (S.ps === 'openCas') { // 5.8: кассета в руку
        await frame(psRoot, 'ps-well-open', d('psInsert'), 'ease-in'); S.ps = 'open'; S.cassette = 'hand';
      }
      psSyncLayers();
    });
    $('zPsLid').onclick = () => run(async () => {
      if (S.ps === 'openCas') { await frame(psRoot, 'ps-loaded' + SFX[S.sel], d('psLid'), 'cubic-bezier(.5,0,.8,.4)'); S.ps = 'loaded'; }
      else if (S.ps === 'open') { await frame(psRoot, 'ps-on', d('psLid'), 'cubic-bezier(.5,0,.8,.4)'); S.ps = 'on'; }
      psSyncLayers();
    });
    $('zPsPlay').onclick = () => run(async () => {
      await press($('pressPsPlay'));
      if (S.ps !== 'loaded' && S.ps !== 'stopped') return;
      S.ps = 'playing'; psSyncLayers();
      if (reduce) await frame(psRoot, 'ps-playing' + SFX[S.sel], 0.1);
      psStart();
    });
    $('zPsStop').onclick = () => run(async () => { await press($('pressPsStop')); if (S.ps === 'playing') await psStop(); });
    $('zPsFader').addEventListener('click', (e) => {
      const r = $('zPsFader').getBoundingClientRect();
      const yFrame = 640 + (e.clientY - r.top) / r.height * (835 - 640);
      const t = (yFrame - FT[1]) / (FB[1] - FT[1]);
      psFaderTo(1 - (t - 0.06) / 0.86);
    });
    $('zPsFader').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); psFaderTo(S.psMaster + 0.1); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); psFaderTo(S.psMaster - 0.1); }
    });
    psSyncLayers();
  }
  const psCells = () => [...psRoot.querySelectorAll('[data-cnt]')];
  function psSetCounter(n) { if (!psRoot) return; const s = String(n % 1000).padStart(3, '0'); psCells().forEach((el, i) => { el.style.backgroundPosition = `${(+s[i]) / 9 * 100}% 0`; }); }
  function psSetHubs(i) {
    if (!psRoot) return;
    for (const s of ['L', 'R']) {
      const h = PS.hubs[KEYS[i]][s], el = $('psHub' + s), [x, y] = h.c, r = h.half;
      place(el, x - r, y - r, x + r, y + r); el.style.backgroundImage = `url(${A}ps-hub-${s}${SFX[i]}.webp)`; el.dataset.m = h.m.join(',');
      el.style.transform = `matrix(${el.dataset.m}, 0, 0)`;
    }
  }
  function psFaderPlace(level) {
    const t = 0.06 + (1 - level) * 0.86;
    const dx = (FB[0] - FT[0]) * (t - tCap0), dy = (FB[1] - FT[1]) * (t - tCap0);
    place($('psFaderCap'), CAPB[0] + dx, CAPB[1] + dy, CAPB[2] + dx, CAPB[3] + dy);
  }
  function psFaderTo(v) {
    v = Math.max(0, Math.min(1, v)); S.psMaster = v;
    const el = $('psFaderCap'), t = ms(reduce ? 0 : d('psFader'));
    el.style.transition = `left ${t}ms ease-out, top ${t}ms ease-out`;
    psFaderPlace(v);
    changed();
  }
  // стрелки VU: ось P, покой R, “0” Z, конец красной E (tascam_vu.py); f: 0 покой, 1 = 0 VU
  function tipOf(i, f) {
    const [P, R, Z, E2] = PS.meters[i];
    const pol = (Q) => [Math.atan2(Q[1] - P[1], Q[0] - P[0]), Math.hypot(Q[0] - P[0], Q[1] - P[1])];
    const [a0, l0] = pol(R), [a1, l1] = pol(Z), [a2, l2] = pol(E2);
    let a, l;
    if (f <= 1) { a = a0 + (a1 - a0) * f; l = l0 + (l1 - l0) * f * 0.97; }
    else { const t = Math.min(1, (f - 1) / 0.4); a = a1 + (a2 - a1) * t; l = (l1 + (l2 - l1) * t) * 0.97; }
    if (f > 0) l = Math.min(l, l0 + (l1 - l0) * 0.97);
    return [P[0] + l * Math.cos(a), P[1] + l * Math.sin(a)];
  }
  const ndl = [0, 0, 0, 0], ndv = [0, 0, 0, 0];
  function drawNeedles() {
    if (!cx2) return;
    const k = 2, ox = PS.vu[0], oy = PS.vu[1];
    cx2.clearRect(0, 0, cv.width, cv.height);
    PS.meters.forEach((m, i) => {
      const [x0, y0, x1, y1] = PS.faces[i];
      cx2.save(); cx2.beginPath(); cx2.rect((x0 - ox) * k, (y0 - oy) * k, (x1 - x0) * k, (y1 - y0) * k); cx2.clip();
      const P = m[0], T2 = tipOf(i, ndl[i]);
      cx2.lineCap = 'round';
      cx2.strokeStyle = 'rgba(60,40,20,.22)'; cx2.lineWidth = 2.2 * k;
      cx2.beginPath(); cx2.moveTo((P[0] + 2 - ox) * k, (P[1] + 2.5 - oy) * k); cx2.lineTo((T2[0] + 2 - ox) * k, (T2[1] + 2.5 - oy) * k); cx2.stroke();
      cx2.strokeStyle = 'rgb(34,28,24)'; cx2.lineWidth = 1.7 * k;
      cx2.beginPath(); cx2.moveTo((P[0] - ox) * k, (P[1] - oy) * k); cx2.lineTo((T2[0] - ox) * k, (T2[1] - oy) * k); cx2.stroke();
      cx2.restore();
    });
  }
  function psSyncLayers(dur = 0) {
    if (!psRoot) return;
    const lit = S.ps !== 'off';
    for (const id of ['psVuClean', 'psNeedles']) { const el = $(id); el.style.transition = `opacity ${ms(dur)}ms ease-out`; el.style.opacity = lit && !(reduce && S.ps === 'playing') ? 1 : 0; }
    { const el = $('psVuOff'); el.style.transition = `opacity ${ms(dur)}ms ease-out`; el.style.opacity = S.ps === 'off' && S.cassette === 'ps' ? 1 : 0; }
    const loaded = S.ps === 'loaded' || S.ps === 'stopped' || S.ps === 'playing' || (S.ps === 'off' && S.cassette === 'ps');
    for (const s of ['L', 'R']) $('psHub' + s).style.opacity = loaded && !reduce ? 1 : 0;
    $('psCounter').style.opacity = (S.ps === 'open' || S.ps === 'openCas') ? 0 : 1;
    $('psKeyPlay').style.opacity = S.ps === 'playing' && !reduce ? 1 : 0;
  }
  async function psStop() {
    psRun = false; psTarget = 0; psRamp = d('spinDown') || 0.001;
    if (reduce) await frame(psRoot, 'ps-loaded' + SFX[S.sel], 0.1);
    S.ps = 'stopped'; psSyncLayers();
    await wait(reduce ? 0 : d('spinDown'));
  }
  // лента 9,5 см/с (3¾ ips), сторона A сверху, плёнкой к клавишам — оба хаба против часовой
  const PS_V = 95.3, PS_RF = 24.8, PS_RE = 11.5;
  const PS_WL = PS_V / PS_RF * 180 / Math.PI, PS_WR = PS_V / PS_RE * 180 / Math.PI;
  let psRun = false, psSpeed = 0, psTarget = 0, psRamp = 0.25, psAngL = 0, psAngR = 0, psLast = 0, psRaf = false, psCnt = 0;
  const psNoise = [0, 0, 0, 0];
  function psStart() { psRun = true; psTarget = 1; psRamp = d('psSpinUp') || 0.001; if (!psRaf) { psRaf = true; psLast = performance.now(); requestAnimationFrame(psTick); } }
  function psTick(now) {
    const dt = Math.min(0.05, (now - psLast) / 1000); psLast = now;
    const sk = slow ? 4 : 1;
    const step = dt / Math.max(psRamp, 0.001);
    psSpeed = psTarget > psSpeed ? Math.min(psTarget, psSpeed + step) : Math.max(psTarget, psSpeed - step);
    psAngL -= PS_WL * psSpeed * dt / sk; psAngR -= PS_WR * psSpeed * dt / sk;
    for (const [s, a] of [['L', psAngL], ['R', psAngR]]) { const el = $('psHub' + s); el.style.transform = `matrix(${el.dataset.m}, 0, 0) rotate(${a}deg)`; }
    const tr = Math.max(0.05, T.psVu) * sk, w0 = 2.2 / tr, z = 0.72;
    for (let i = 0; i < 4; i++) {
      let tgt = 0;
      if (psRun && psSpeed > 0.5) {
        psNoise[i] = psNoise[i] * 0.93 + (Math.random() - 0.5) * 0.35;
        const base = 0.78 + 0.12 * Math.sin(now / 1500 + i * 1.1) + 0.08 * Math.sin(now / 290 + i * 2.3) + psNoise[i] * 0.5 + (Math.random() < 0.03 ? 0.18 : 0);
        tgt = Math.max(0, Math.min(1.35, base * (i < 2 ? S.psMaster / MASTER0 : 1))); // 1–2 (BUSS L/R) следуют за MASTER
      }
      const acc = w0 * w0 * (tgt - ndl[i]) - 2 * z * w0 * ndv[i];
      ndv[i] += acc * dt; ndl[i] += ndv[i] * dt;
      if (ndl[i] < 0) { ndl[i] = 0; ndv[i] = Math.max(0, ndv[i]) * 0.3; }
    }
    drawNeedles();
    if (psRun) { psCnt += dt / sk * 2; if (psCnt >= 1) { psCnt -= 1; S.psCounter++; psSetCounter(S.psCounter); } } // ~2 в секунду — проверить
    const moving = psRun || psSpeed > 0 || ndl.some((v) => v > 0.002) || ndv.some((v) => Math.abs(v) > 0.002);
    if (moving) requestAnimationFrame(psTick); else { psRaf = false; ndl.fill(0); ndv.fill(0); drawNeedles(); }
  }

  // =====================================================================
  // Цепочка 2 “Пластинка” (шаг 8.5): ряд `a-vinyl-rows` → осмотр VIN-00 → пластинка в руке → Technics `b-turntable`
  // Превью 7.12 (D-172) без веб-кнопок (D-006): всё — нажатием на сам конверт, его края и части проигрывателя.
  // В руке одна вещь: кассета или пластинка (что держим — общий слот #hand).
  // =====================================================================
  const AV = 'assets/vin/';
  // тайминги 7.7 / превью 7.12 (D-167, D-172), секунды
  const TV = {
    hover: 0.12, slideOut: 0.45, takeOut: 0.35, pushIn: 0.3, putBack: 0.4, turn: 0.4, gate: 0.45, innerHalf: 0.45, innerWhole: 0.3,
    discHalf: 0.4, discWhole: 0.3, discTurn: 0.4, stepBack: 0.3, lid: 0.55, lidClose: 0.4, place: 0.4, key: 0.075, spinUp: 0.7,
    brake: 0.5, arm: 0.7, lift: 0.65, raise: 0.3, take: 0.4, flip: 0.5, pitch: 0.15, lamp: 0.15,
  };
  const dv = (k) => (reduce ? 0 : TV[k]);
  const REC = {
    btr: { name: 'Bruce Springsteen — Born to Run', short: 'Born to Run', gate: true, spine: [595, 80, 665, 970], out: [580, 40, 695, 1000] },
    nvm: { name: 'Nirvana — Nevermind', short: 'Nevermind', gate: false, spine: [800, 70, 865, 950], out: [790, 40, 905, 1000] },
  };
  const VIEW = { // вид в руке → кадр и подпись
    front: ['ins-front', 'sleeve front'], back: ['ins-back', 'sleeve back'], spine: ['ins-spine', 'spine'],
    gate: ['ins-gatefold', 'gatefold'], innerHalf: ['ins-inner-half', 'inner sleeve half out'],
    inner: ['ins-inner', 'inner sleeve'], discHalf: ['ins-disc-half', 'record half out'],
    disc1: ['ins-disc-hand', 'record, side 1'], disc2: ['ins-disc-s2', 'record, side 2'],
  };
  const JACKET = ['front', 'back', 'spine'];
  const DISC = { disc1: [818, 531, 430], disc2: [768, 511, 392] }; // круг пластинки на кадре осмотра: центр и радиус
  const JK = [370, 110, 1165, 910]; // конверт на кадрах лица и оборота
  const vSrc = (v) => `${AV}${VIEW[v][0]}-${S.vin.sel}.webp`;
  const isDisc = (v) => v === 'disc1' || v === 'disc2';
  const handBusyMsg = () => (S.cassette === 'hand' ? 'You’re holding the cassette ' + SHORT[S.sel] + ' — put it down first'
    : S.vhs.cass === 'hand' ? 'You’re holding a videocassette — put it down first'
    : S.bb.hand ? 'You’re holding a boombox cassette — put it back in the boombox first' : '');

  // ---------- места нажатия на кадре осмотра: [действие, рамка в пикселях кадра, подпись, край?] ----------
  function vinZones(v) {
    const r = REC[S.vin.sel];
    if (v === 'front') {
      const z = [['turn', [450, 110, 1085, 910], 'Turn the sleeve'], ['out', [1085, 110, 1205, 910], 'Pull out the inner sleeve', 1]];
      if (r.gate) z.push(['gate', [330, 110, 450, 910], 'Open the gatefold', 1]);
      return z;
    }
    if (v === 'back') return [['turn', JK, 'Turn the sleeve']];
    if (v === 'spine') return [['turn', [690, 0, 850, 1010], 'Turn the sleeve']];
    if (v === 'gate') return [['gate', [78, 165, 1458, 855], 'Close the gatefold']];
    if (v === 'inner') return [['turn', [375, 200, 1155, 897], 'Turn the inner sleeve'], ['out', [375, 70, 1155, 200], 'Take out the record', 1]];
    if (isDisc(v)) { const [cx, cy, rr] = DISC[v]; return [['turn', [cx - rr, cy - rr, cx + rr, cy + rr], 'Flip the record']]; }
    return [];
  }
  function vinHint(v) {
    const r = REC[S.vin.sel];
    if (v === 'front') return 'tap the sleeve — turn · right edge — pull out the inner sleeve' + (r.gate ? ' · left edge — open' : '') + ' · elsewhere — back to the shelf';
    if (v === 'back' || v === 'spine') return 'tap — turn · elsewhere — back to the shelf';
    if (v === 'gate') return 'tap — close';
    if (v === 'inner') return 'tap — turn · top edge — take out the record · elsewhere — back into the sleeve';
    if (isDisc(v)) return 'tap — flip · elsewhere — keep it in hand and carry it to the turntable';
    return '';
  }
  const vinCard = insp.querySelector('.vin-card');
  let vFront = vinCard.querySelector('.va'), vBack = vinCard.querySelector('.vb');
  const vZones = [...vinCard.querySelectorAll('.zone')];
  function setVin(v) {
    S.vin.ins = v;
    inspLbl.textContent = REC[S.vin.sel].short + ' — ' + VIEW[v][1];
    inspHint.textContent = vinHint(v);
    const z = vinZones(v);
    vZones.forEach((b, i) => {
      const it = z[i];
      b.hidden = !it;
      if (!it) return;
      zone(b, ...it[1]); b.dataset.act = it[0];
      b.setAttribute('aria-label', it[2]); b.title = it[2];
      b.classList.toggle('edge', !!it[3]);
    });
  }
  vZones.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); run(() => vinAct(b.dataset.act)); }));

  async function vinShow(v) {
    inspKind = 'vin'; insp.classList.add('vin'); inspOpen = true;
    vFront.src = vSrc(v); vFront.style.opacity = 1; vFront.style.transform = ''; vBack.style.opacity = 0;
    setVin(v); insp.hidden = false; renderHand();
    insp.style.opacity = 0; void insp.offsetWidth;
    await fade(insp, true, 0.2);
  }
  async function vinHide(dur) {
    inspOpen = false; S.vin.ins = null;
    await fade(insp, false, dur);
    insp.hidden = true; insp.classList.remove('vin'); inspKind = 'cas';
  }
  function insGo(v, dur) { // смена вида переходом кадров
    setVin(v);
    const a = vFront, b = vBack;
    b.src = vSrc(v); b.style.transition = 'none'; b.style.opacity = 0; b.style.transform = ''; b.style.zIndex = 1; a.style.zIndex = 0;
    return new Promise((res) => {
      const go = () => {
        void b.offsetWidth; b.style.transition = `opacity ${ms(reduce ? 0.1 : dur)}ms ease-in-out`; b.style.opacity = 1;
        wait(reduce ? 0.1 : dur).then(() => { a.style.opacity = 0; vFront = b; vBack = a; res(); });
      };
      if (b.complete && b.naturalWidth) go(); else { b.onload = go; b.onerror = go; }
    });
  }
  async function insTurn(v, dur) { // поворот: половина — ребром, смена кадра, половина обратно
    if (reduce) { vFront.src = vSrc(v); setVin(v); return; }
    const img = vFront;
    img.style.transition = `transform ${ms(dur / 2)}ms ease-in`; img.style.transform = 'rotateY(90deg)';
    await wait(dur / 2);
    img.src = vSrc(v); setVin(v);
    await new Promise((r) => { if (img.complete) r(); else { img.onload = r; img.onerror = r; } });
    img.style.transition = 'none'; img.style.transform = 'rotateY(-90deg)'; void img.offsetWidth;
    img.style.transition = `transform ${ms(dur / 2)}ms ease-out`; img.style.transform = 'rotateY(0)';
    await wait(dur / 2);
  }
  async function vinAct(a) {
    const v = S.vin.ins;
    log(`осмотр: ${a} (${v})`);
    if (a === 'turn') {
      if (JACKET.includes(v)) await insTurn(JACKET[(JACKET.indexOf(v) + 1) % 3], dv('turn')); // 2.1
      else if (v === 'inner') await insTurn('inner', dv('turn')); // 2.4: у Born to Run чистая бумага, у Nevermind оборот не собран
      else if (isDisc(v)) { const n = v === 'disc1' ? 'disc2' : 'disc1'; await insTurn(n, dv('discTurn')); S.vin.side = n === 'disc2' ? 2 : 1; } // 2.6
    } else if (a === 'gate') {
      await insGo(v === 'gate' ? 'front' : 'gate', dv('gate')); // 2.2
    } else if (a === 'out') {
      if (v === 'inner') { // 2.5
        await insGo('discHalf', dv('discHalf')); await wait(dv('discHalf') * 0.5); await insGo('disc1', dv('discWhole')); S.vin.side = 1;
      } else { // 2.3
        await insGo('innerHalf', dv('innerHalf')); await wait(dv('innerHalf') * 0.5); await insGo('inner', dv('innerWhole'));
      }
    }
  }
  async function vinBack() { // мимо — шаг назад (2.8)
    const v = S.vin.ins;
    if (v === 'gate') await insGo('front', dv('gate'));
    else if (v === 'inner') { await insGo('innerHalf', dv('stepBack')); await insGo('front', dv('stepBack')); }
    else if (isDisc(v)) await lowerDisc();
    else if (JACKET.includes(v)) await jacketToRow();
  }
  async function vinClose() { // Esc и уход к другой точке: пластинка — в руку, конверт — на полку
    const v = S.vin.ins;
    if (!v) return;
    if (isDisc(v)) await lowerDisc(); else await jacketToRow();
  }
  async function lowerDisc() { // пластинка остаётся в руке; конверт с внутренним — выдвинут из ряда на четверть (D-167, ответ 2)
    S.vin.disc = 'hand'; S.vin.rows = 'waiting';
    if (rowsRoot) frame(rowsRoot, 'rows-out-' + S.vin.sel, 0.01);
    await vinHide(TV.stepBack);
  }
  async function jacketToRow() { // 1.5
    await vinHide(TV.stepBack);
    if (rowsRoot) await frame(rowsRoot, 'rows-hero', dv('putBack'), 'ease-out');
    S.vin.rows = 'rows'; S.vin.sel = null; S.vin.disc = 'shelf'; S.vin.side = 1;
  }

  // ---------- ряд пластинок на полке A ----------
  let rowsRoot = null;
  function buildRows() {
    const fr = [['rows-hero', 'Row of records on the shelf']];
    for (const k of Object.keys(REC)) fr.push(['rows-out-' + k, REC[k].short + ' pulled out of the row'], ['rows-empty-' + k, 'Slot for ' + REC[k].short + ' empty']);
    rowsRoot = make(`<div class="stage" id="vrStage">${imgs(fr, AV)}<div class="caption" id="vrCap"></div>
      <button class="zone quiet" id="zVrMiss" aria-label="Push the sleeve back" style="z-index:7"></button>
      ${Object.keys(REC).map((k) => `<button class="zone" data-rec="${k}" aria-label="${REC[k].name}"></button>`).join('')}
      <button class="zone" id="zVrSleeve" aria-label="Pulled-out sleeve"></button></div>`);
    zone($('zVrMiss'), 0, 0, W, H);
    rowsRoot.querySelectorAll('[data-rec]').forEach((b) => zone(b, ...REC[b.dataset.rec].spine));
    const cap = $('vrCap');
    const capShow = (k, on) => { if (flashing(cap)) return; cap.textContent = REC[k].name; cap.style.transition = `opacity ${ms(dv('hover'))}ms`; cap.classList.toggle('on', on); };
    let touchArmed = null;
    rowsRoot.querySelectorAll('[data-rec]').forEach((b) => {
      const k = b.dataset.rec;
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') capShow(k, true); }); // 1.1
      b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') capShow(k, false); });
      b.addEventListener('focus', () => capShow(k, true));
      b.addEventListener('blur', () => capShow(k, false));
      b.addEventListener('click', (e) => {
        const touch = e.pointerType === 'touch' || (e.pointerType === undefined && matchMedia('(hover:none)').matches);
        if (touch && touchArmed !== k) { touchArmed = k; capShow(k, true); return; } // телефон: 1-е касание — подпись
        touchArmed = null;
        if (handBusyMsg()) { flash(cap, handBusyMsg()); return; }
        run(async () => { // 1.2
          cap.classList.remove('on');
          log(`1.2 конверт выдвигается ${fmt(TV.slideOut)}`);
          S.vin.sel = k;
          await frame(rowsRoot, 'rows-out-' + k, dv('slideOut'), 'cubic-bezier(.2,.7,.3,1)');
          S.vin.rows = 'out';
        });
      });
    });
    $('zVrMiss').onclick = () => run(async () => { // 1.4
      if (S.vin.rows !== 'out') return;
      await frame(rowsRoot, 'rows-hero', dv('pushIn'), 'ease-in');
      S.vin.rows = 'rows'; S.vin.sel = null;
    });
    $('zVrSleeve').onclick = () => {
      if (handBusyMsg()) { flash(cap, handBusyMsg()); return; }
      if (S.vin.rows === 'waiting' && S.vin.disc !== 'hand') { flash(cap, 'The record is on the turntable — take it off the platter first'); return; }
      run(async () => {
        const k = S.vin.sel;
        if (S.vin.rows === 'out') { // 1.3 → осмотр
          await frame(rowsRoot, 'rows-empty-' + k, dv('takeOut'), 'ease-in');
          S.vin.rows = 'taken';
          await vinShow('front');
        } else if (S.vin.rows === 'waiting') { // 4.2: пластинка во внутренний конверт, внутренний — в конверт
          await frame(rowsRoot, 'rows-empty-' + k, dv('takeOut'), 'ease-in');
          S.vin.rows = 'taken';
          await vinShow(S.vin.side === 2 ? 'disc2' : 'disc1');
          S.vin.disc = 'shelf';
          await insGo('discHalf', dv('stepBack')); await insGo('innerHalf', dv('stepBack')); await insGo('front', dv('stepBack'));
          S.vin.side = 1;
        }
      });
    };
  }

  // ---------- Technics SL-1200MK2 на консоли B (TT-00, D-063, D-064, D-171) ----------
  let ttRoot = null;
  const TG = { // assets/geometry.json превью 7.12
    label: { cx: 657.6, cy: 493.2, ax: 141.4, ay: 61.0 }, spindle: [640, 458, 678, 502], lamp: [850, 650, 1015, 800],
    speed33: [390, 765, 440, 795], speed45dx: 83, pitchLamp: [1280, 585, 1390, 650],
    pitch: { cap: [1324, 593, 1386, 648], k: 0.575, zeroY: 619, pxPerPct: 8.75 },
  };
  let om = 0, th = 0, flipScale = 1; // скорость диска °/с, угол этикетки
  function buildTt() {
    const fr = [['tt-closed', 'Technics, lid closed'], ['tt-off-closed', 'Technics off, lid closed'],
      ['tt-open-empty', 'Lid up, platter empty'], ['tt-off-open-empty', 'Off, lid up, platter empty']];
    for (const r of ['btr', 'btr-s2', 'nvm', 'nvm-s2']) {
      const nm = (r.startsWith('btr') ? 'Born to Run' : 'Nevermind') + (r.endsWith('s2') ? ', side 2' : '');
      fr.push(['tt-record-' + r, nm + ' on the platter'], ['tt-off-record-' + r, nm + ' on the platter, power off'],
        ['tt-arm-over-' + r, nm + ': tonearm over the record'], ['tt-playing-' + r, nm + ': needle on the record']);
    }
    ttRoot = make(`<div class="stage" id="ttStage">${imgs(fr, AV)}
      <div class="layer" id="ttPitchLampOff"></div><div class="layer" id="ttPitchBg"></div><div class="layer" id="ttPitchCap"></div>
      <div class="layer" id="ttLamp33off"></div><div class="layer" id="ttLamp45on"></div>
      <div class="layer" id="ttLabel"></div><div class="layer" id="ttSpindle"></div><div class="layer" id="ttNeedleLamp"></div>
      <div class="press" id="ttPressStart"></div><div class="press" id="ttPress33"></div><div class="press" id="ttPress45"></div>
      <div class="caption" id="ttCap"></div>
      <button class="zone" id="zTtLidClosed" aria-label="Lid"></button>
      <button class="zone" id="zTtLidOpen" aria-label="Close the lid"></button>
      <button class="zone" id="zTtPlatter" aria-label="Put the record on the platter"></button>
      <button class="zone" id="zTtRecord" aria-label="Take the record off the platter"></button>
      <button class="zone" id="zTtLabel" aria-label="Flip the record" style="z-index:9"></button>
      <button class="zone" id="zTtArm" aria-label="Tonearm"></button>
      <button class="zone" id="zTtLift" aria-label="Cue lever"></button>
      <button class="zone" id="zTtStart" aria-label="start·stop"></button>
      <button class="zone" id="zTt33" aria-label="33"></button>
      <button class="zone" id="zTt45" aria-label="45"></button>
      <button class="zone" id="zTtPower" aria-label="power"></button>
      <button class="zone" id="zTtLamp" aria-label="Stylus light"></button>
      <button class="zone" id="zTtPitch" aria-label="Pitch: tap the scale or use the up and down arrow keys"></button></div>`);
    const L = TG.label;
    place($('ttLabel'), L.cx - L.ax, L.cy - L.ax, L.cx + L.ax, L.cy + L.ax);
    Object.assign($('ttLabel').style, { transformOrigin: '50% 50%', display: 'none' });
    const lay = (id, box, png) => { place($(id), ...box); $(id).style.backgroundImage = `url(${AV}${png}.webp)`; $(id).style.opacity = 0; };
    lay('ttSpindle', TG.spindle, 'tt-spindle');
    lay('ttNeedleLamp', TG.lamp, 'tt-lamp-on');
    lay('ttLamp33off', TG.speed33, 'tt-lamp33-off');
    { const [x0, y0, x1, y1] = TG.speed33, dx = TG.speed45dx; lay('ttLamp45on', [x0 + dx, y0, x1 + dx, y1], 'tt-lamp45-on'); }
    lay('ttPitchLampOff', TG.pitchLamp, 'tt-pitchlamp-off');
    lay('ttPitchBg', TG.pitch.cap, 'tt-pitch-bg');
    lay('ttPitchCap', TG.pitch.cap, 'tt-pitch-cap');
    place($('ttPressStart'), 190, 735, 335, 802); place($('ttPress33'), 355, 775, 430, 798); place($('ttPress45'), 435, 775, 510, 798);
    zone($('zTtLidClosed'), 250, 250, 1060, 560);
    zone($('zTtLidOpen'), 110, 10, 1420, 290);
    zone($('zTtPlatter'), 244, 337, 1062, 703);
    zone($('zTtRecord'), 300, 360, 1000, 690);
    zone($('zTtLabel'), L.cx - L.ax, L.cy - L.ay, L.cx + L.ax, L.cy + L.ay);
    zone($('zTtLift'), 1148, 395, 1218, 470);
    zone($('zTtStart'), 190, 735, 335, 802);
    zone($('zTt33'), 355, 768, 430, 805);
    zone($('zTt45'), 435, 768, 510, 805);
    zone($('zTtPower'), 180, 610, 270, 710);
    zone($('zTtLamp'), 905, 722, 985, 795);
    zone($('zTtPitch'), 1285, 540, 1405, 700);
    drawLabel(); setLabel();

    $('zTtLidClosed').onclick = () => run(async () => { // 3.1
      S.tt.lid = true; await ttFrame(dv('lid'), 'cubic-bezier(.2,.7,.3,1)');
    });
    $('zTtLidOpen').onclick = () => run(async () => { // 3.11: только на пустом диске (кадра “закрыта с пластинкой” нет)
      if (S.tt.disc) return;
      S.tt.lid = false; await ttFrame(dv('lidClose'), 'cubic-bezier(.5,0,.8,.4)');
    });
    $('zTtPlatter').onclick = () => run(async () => { // 3.2
      const t = S.tt;
      if (S.vin.disc !== 'hand' || t.disc) return;
      log(`3.2 пластинка на шпиндель ${fmt(TV.place)}, сторона ${S.vin.side} вверх`);
      t.disc = S.vin.sel; t.side = S.vin.side; th = 0; drawLabel(); setLabel();
      S.vin.disc = 'tt';
      const lb = $('ttLabel'); lb.style.display = 'block'; lb.style.transition = 'none'; lb.style.opacity = 0;
      ttLayer('ttSpindle', true, 0.01);
      fade(lb, true, dv('place'), 'ease-out');
      await ttFrame(dv('place'), 'ease-out');
    });
    $('zTtRecord').onclick = () => { // 3.10: пластинка с диска в руку
      if (handBusyMsg()) { flash($('ttCap'), handBusyMsg(), 2.4, ttCapSync); return; }
      run(async () => {
        const t = S.tt;
        log(`3.10 пластинка с диска в руку ${fmt(TV.take)}`);
        S.vin.side = t.side;
        fade($('ttLabel'), false, dv('take'), 'ease-in');
        t.disc = null; S.vin.disc = 'hand';
        await ttFrame(dv('take'), 'ease-in');
        $('ttLabel').style.display = 'none'; $('ttLabel').style.opacity = 1;
        ttLayer('ttSpindle', false, 0.01);
      });
    };
    $('zTtLabel').onclick = () => run(async () => { // 3.10 / MOT-025: переворот на диске
      const t = S.tt, dur = dv('flip');
      log(`MOT-025 переворот на сторону ${t.side === 1 ? 2 : 1} ${fmt(TV.flip)}`);
      t.side = t.side === 1 ? 2 : 1;
      if (reduce) { setLabel(); await ttFrame(0.1); return; }
      const t0 = performance.now();
      const p = ttFrame(dur);
      await new Promise((res) => {
        let swapped = false;
        const step = (now) => {
          const u = Math.min((now - t0) / (dur * 1000), 1);
          flipScale = Math.abs(Math.cos(u * Math.PI)); if (!swapped && u >= 0.5) { swapped = true; setLabel(); }
          drawLabel(); if (u < 1) requestAnimationFrame(step); else { flipScale = 1; drawLabel(); res(); }
        };
        requestAnimationFrame(step);
      });
      await p;
    });
    $('zTtArm').onclick = () => run(async () => {
      const t = S.tt;
      if (t.arm === 'rest') { if (!t.disc) return; log(`3.4 тонарм дугой ${fmt(TV.arm)}`); t.arm = 'over'; await ttFrame(dv('arm')); }
      else if (t.arm === 'over') { log(`3.7 тонарм на подставку ${fmt(TV.arm)}`); t.arm = 'rest'; await ttFrame(dv('arm')); }
      else flash($('ttCap'), 'The needle is on the record — raise it with the cue lever first', 2.4, ttCapSync);
    });
    $('zTtLift').onclick = () => run(async () => {
      const t = S.tt;
      if (t.arm === 'over') { log(`3.5 лифт опускает иглу ${fmt(TV.lift)}`); t.arm = 'down'; await ttFrame(dv('lift'), 'cubic-bezier(.3,0,.4,1)'); }
      else if (t.arm === 'down') { log(`3.6 подъём иглы ${fmt(TV.raise)}`); t.arm = 'over'; await ttFrame(dv('raise'), 'ease-out'); }
    });
    $('zTtStart').onclick = () => run(async () => { // 3.3 / 3.8 / 3.9
      const t = S.tt;
      await ttPress('ttPressStart');
      if (!t.power) return;
      t.spin = !t.spin; ttKick();
    });
    const speed = (v) => run(async () => { // 3.12
      await ttPress(v === 33 ? 'ttPress33' : 'ttPress45');
      if (!S.tt.power) return;
      S.tt.speed = v; ttKick();
    });
    $('zTt33').onclick = () => speed(33);
    $('zTt45').onclick = () => speed(45);
    $('zTtPower').onclick = () => {
      const t = S.tt;
      if (t.arm !== 'rest') { flash($('ttCap'), 'Put the tonearm on its rest first', 2.4, ttCapSync); return; } // кадров “выключен, тонарм над пластинкой” нет
      run(async () => {
        t.power = !t.power;
        if (!t.power) t.spin = false;
        ttKick();
        await ttFrame(0.15, 'ease-out');
      });
    };
    $('zTtLamp').onclick = () => run(async () => { S.tt.lamp = !S.tt.lamp; ttSyncLayers(); await wait(dv('lamp')); });
    $('zTtPitch').onclick = (e) => {
      const r = ttRoot.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H;
      run(() => setPitch((y - TG.pitch.zeroY) / TG.pitch.pxPerPct));
    };
    $('zTtPitch').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); run(() => setPitch(S.tt.pitch + (e.key === 'ArrowDown' ? 0.5 : -0.5))); }
    });
    ttSyncLayers();
  }
  function ttKey() {
    const t = S.tt, off = !t.power;
    if (!t.lid) return off ? 'tt-off-closed' : 'tt-closed';
    if (!t.disc) return off ? 'tt-off-open-empty' : 'tt-open-empty';
    const r = t.disc + (t.side === 2 ? '-s2' : '');
    if (t.arm === 'rest') return (off ? 'tt-off-record-' : 'tt-record-') + r;
    return (t.arm === 'over' ? 'tt-arm-over-' : 'tt-playing-') + r;
  }
  const ttFrame = (dur, ease) => frame(ttRoot, ttKey(), dur, ease).then(ttSyncLayers);
  function setLabel() { const t = S.tt; if (ttRoot && t.disc) $('ttLabel').style.backgroundImage = `url(${AV}tt-label-${t.disc}${t.side}.webp)`; }
  function drawLabel() { if (ttRoot) $('ttLabel').style.transform = `scale(${flipScale}, ${TG.label.ay / TG.label.ax}) rotate(${th}deg)`; }
  async function ttPress(id) {
    const el = $(id);
    el.style.transition = 'none'; el.style.opacity = 1;
    await wait(reduce ? 0.03 : dv('key'));
    el.style.transition = 'opacity 60ms'; el.style.opacity = 0;
  }
  function ttLayer(id, on, dur) { const el = $(id); el.style.transition = `opacity ${ms(reduce ? 0.1 : dur)}ms ease-out`; el.style.opacity = on ? 1 : 0; }
  function ttSyncLayers() {
    if (!ttRoot) return;
    const t = S.tt;
    ttLayer('ttNeedleLamp', t.lamp && t.power && t.lid, TV.lamp);
    ttLayer('ttLamp45on', t.speed === 45 && t.power, 0.06);
    ttLayer('ttLamp33off', t.speed === 45 && t.power, 0.06);
    ttLayer('ttPitchLampOff', Math.abs(t.pitch) > 0.05 && t.power, 0.06);
    ttLayer('ttSpindle', !!t.disc, 0.01);
    $('ttLabel').style.display = t.disc ? 'block' : 'none';
    ttCapSync();
  }
  function ttCapSync() { // подпись “играет”, пока игла на пластинке (звук — sound.js, 8.9)
    if (!ttRoot) return;
    const cap = $('ttCap'), t = S.tt;
    if (flashing(cap)) return;
    const txt = t.arm === 'down' ? (t.spin && t.power ? '▶ playing' : 'needle on the record, platter stopped') : '';
    cap.textContent = txt; cap.classList.toggle('on', !!txt);
  }
  async function setPitch(p) { // 3.12: колпачок едет по пазу, зелёная лампа “0” гаснет вне нуля
    const t = S.tt; p = Math.max(-8, Math.min(8, Math.round(p * 10) / 10)); if (Math.abs(p) < 0.25) p = 0;
    const from = t.pitch; t.pitch = p; ttKick();
    const el = $('ttPitchCap'), bg = $('ttPitchBg'), [x0, y0, x1, y1] = TG.pitch.cap;
    if (from === 0 && p !== 0) { el.style.transition = 'none'; el.style.transform = 'translate(0,0)'; el.style.opacity = 1; bg.style.transition = 'none'; bg.style.opacity = 1; void el.offsetWidth; }
    const dy = p * TG.pitch.pxPerPct, dx = dy * TG.pitch.k;
    el.style.transition = `transform ${ms(reduce ? 0 : dv('pitch'))}ms ease-out`;
    el.style.transform = `translate(${dx / (x1 - x0) * 100}%, ${dy / (y1 - y0) * 100}%)`;
    await wait(reduce ? 0 : dv('pitch'));
    if (p === 0) { el.style.opacity = 0; bg.style.opacity = 0; } // в нуле колпачок — на самом кадре
    ttSyncLayers();
  }
  // вращение: 33⅓ = 200°/с (1,8 с на оборот), 45 = 270°/с, pitch ±8 %; разгон 0,7 с (паспорт MK2), тормоз
  let ttRaf = false, ttLast = 0;
  function ttKick() { if (!ttRaf) { ttRaf = true; ttLast = performance.now(); requestAnimationFrame(ttTick); } }
  function ttTick(now) {
    const dt = Math.min((now - ttLast) / 1000, 0.1); ttLast = now;
    const t = S.tt;
    const target = t.spin && t.power ? (t.speed === 33 ? 200 : 270) * (1 + t.pitch / 100) : 0;
    if (reduce) om = target;
    else if (om < target) om = Math.min(target, om + 200 / TV.spinUp * dt);
    else if (om > target) om = Math.max(target, om - 200 / TV.brake * dt);
    if (!reduce && om > 0) { th = (th + om * dt) % 360; drawLabel(); }
    if (target > 0 || om > 0) requestAnimationFrame(ttTick);
    else { ttRaf = false; changed(); } // диск встал — можно снять или перевернуть пластинку
  }

  function renderVin() {
    if (rowsRoot) {
      const r = S.vin.rows;
      rowsRoot.querySelectorAll('[data-rec]').forEach((b) => show(b, r === 'rows' && !inspOpen));
      show($('zVrSleeve'), (r === 'out' || r === 'waiting') && !inspOpen);
      if (S.vin.sel) zone($('zVrSleeve'), ...REC[S.vin.sel].out);
      show($('zVrMiss'), r === 'out' && !inspOpen);
    }
    if (ttRoot) {
      const t = S.tt, still = t.lid && !!t.disc && t.arm === 'rest' && !t.spin && om === 0;
      show($('zTtLidClosed'), !t.lid);
      show($('zTtLidOpen'), t.lid && !t.disc);
      show($('zTtPlatter'), t.lid && !t.disc && S.vin.disc === 'hand');
      show($('zTtRecord'), still);
      show($('zTtLabel'), still);
      if (t.arm === 'rest') zone($('zTtArm'), 1095, 290, 1245, 690); else zone($('zTtArm'), 900, 300, 1240, 640);
      show($('zTtArm'), t.lid && t.power && (!!t.disc || t.arm !== 'rest'));
      show($('zTtLift'), t.lid && t.arm !== 'rest');
      show($('zTtLamp'), t.lid && t.power);
      show($('zTtPitch'), t.lid);
      ttCapSync();
    }
  }


  // ---------- что нажимается сейчас ----------
  function render() {
    renderHand();
    if (caseRoot) {
      show($('zLatchL'), !S.lid && !inspOpen);
      show($('zLatchR'), !S.lid && !inspOpen);
      show($('zLidClosed'), !S.lid && S.latchL && S.latchR);
      show($('zLidOpen'), S.lid && S.cassette !== 'hand');
      caseRoot.querySelectorAll('[data-slot]').forEach((b) => show(b, S.lid && !inspOpen && S.cassette === 'case'));
      show($('zSlotBack'), S.lid && S.cassette === 'hand' && !inspOpen);
    }
    if (deckRoot) {
      show($('zBay'), S.deck === 'door' || S.deck === 'doorCas');
      show($('zDoor'), S.deck === 'door' || S.deck === 'doorCas');
    }
    if (psRoot) {
      show($('zPsWell'), S.ps === 'open' || S.ps === 'openCas');
      show($('zPsLid'), S.ps === 'open' || S.ps === 'openCas');
    }
    renderVin();
  }

  // ---------- предметы с механикой: app.js ставит сцену вместо картинки “подойти” ----------
  function device(build, getRoot) {
    return {
      mount(container) {
        if (!getRoot()) build();
        container.appendChild(getRoot());
        render();
      },
    };
  }
  window.RS = {
    world,
    devices: {
      'a-cassette-storage': device(buildCase, () => caseRoot),
      'b-cassette-deck': device(buildDeck, () => deckRoot),
      'b-portastudio': device(buildPs, () => psRoot),
      'a-vinyl-rows': device(buildRows, () => rowsRoot),
      'b-turntable': device(buildTt, () => ttRoot),
    },
    inspecting: () => inspOpen,
    closeInspect: () => run(() => (kinds[inspKind] ? kinds[inspKind].close() : inspKind === 'vin' ? vinClose() : closeInspect())),
    // для цепочек 3–5 (devices-a.js, шаг 8.6): общие помощники, рука и осмотр
    kit: {
      S, world, W, H, make, place, zone, frame, fade, wait, ms, flash, flashing, show, run, changed, log,
      reduce: () => reduce, insp, inspLbl, inspHint, hand, handVhs, kinds, handBusyMsg,
      busy: () => busy,
      inspBegin(kind) { inspKind = kind; insp.classList.remove('vin'); insp.classList.add(kind); inspOpen = true; insp.hidden = false; renderHand(); },
      async inspEnd(dur) { inspOpen = false; await fade(insp, false, dur); insp.hidden = true; insp.classList.remove(inspKind); inspKind = 'cas'; },
      otherInHand: () => (S.cassette === 'hand' ? 'You’re holding the cassette ' + SHORT[S.sel] + ' — put it down first' : S.vin.disc === 'hand' ? 'You’re holding a record — put it down first'
        : S.bb.hand ? 'You’re holding a boombox cassette — put it back in the boombox first' : ''),
      // журнал STO-00 (8.7, devices-c.js): кассета со страницы — та же, что в кейсе (из кейса — одна за раз)
      SHORT,
      takeFromStory(i) {
        if (S.cassette !== 'case') return false;
        S.sel = i; setHubs(i); psSetHubs(i);
        if (caseRoot) { placeSlotBack(i); if (S.lid) frame(caseRoot, 'case-empty' + SFX[i], 0); }
        S.cassette = 'hand'; S.handIdx = 0; S.casSide = 1; changed();
        return true;
      },
      returnFromStory() { // кассета из руки — на страницу журнала, то есть на своё место в кейсе
        if (S.cassette !== 'hand') return false;
        if (caseRoot && S.lid) frame(caseRoot, 'case-lid', 0);
        S.cassette = 'case'; changed();
        return true;
      },
    },
  };
})();
