// RockShowcase — каркас сайта (шаг 8.2), зоны предметов (шаг 8.3), предметы с механикой (8.4, devices.js), телефон (8.10, D-199).
// Точки обзора на фонах D-021, переходы между ними (D-190), без веб-кнопок (D-006):
// куда идти — нажимаешь на саму комнату. Данные — window.__SITE__ (собирает build_site.py).
//
// Адрес:   #VP-A           — точка обзора (работает «назад» браузера и телефона)
//          #b-cassette-deck — подошли к предмету (герой крупно); выход — «назад», Esc, нажатие мимо
// Параметры (для пробы):  ?fit=contain  — вписать картинку целиком (по умолчанию cover — заполнить экран)
//                         ?debug=1      — показать зоны и коробки болванки поверх фона (проверка совпадения)
(function () {
  'use strict';
  const S = window.__SITE__;
  const RS = window.RS || null; // автомат и предметы с механикой (devices.js)
  const params = new URLSearchParams(location.search);
  const FIT = params.get('fit') === 'contain' ? 'contain' : 'cover';
  const DEBUG = params.get('debug') === '1';
  const DUR = 1000; // мс, «камера летит ~1 с» (D-190)
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';

  const scene = document.getElementById('scene');
  const edges = document.getElementById('edges');
  const near = document.getElementById('near');
  const nearObj = document.getElementById('near-obj');
  document.body.classList.toggle('fit-contain', FIT === 'contain');
  document.body.classList.toggle('debug', DEBUG);

  let current = null;      // id точки на экране
  let currentVariant = null;
  let currentFrame = null; // DOM-кадр на экране
  let pendingOrigin = null; // откуда «летим» (центр нажатой зоны), если переход начат нажатием
  let depth = 0;           // сколько переходов сделано внутри сайта — для Esc
  let busy = false;
  let nearId = null;       // предмет, к которому подошли (или null)

  // ---------- какой вариант фона показывать (телефон — свой кадр 2:3, если есть) ----------
  function variantOf(id) {
    const v = S.views[id];
    const portrait = window.innerWidth / window.innerHeight < 0.8;
    if (portrait && v.mobile) return { key: id + ':mobile', ...v.mobile };
    return { key: id, image: v.image, size: v.size, focus: v.focus, go: v.go, items: v.items, cam: v.cam };
  }

  // ---------- размер и место картинки на экране ----------
  function placeRect(variant) {
    const W = scene.clientWidth, H = scene.clientHeight;
    const [iw, ih] = variant.size;
    const k = FIT === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
    const w = iw * k, h = ih * k;
    const [fx, fy] = variant.focus || [0.5, 0.5];
    // точка фокуса картинки — как можно ближе к центру экрана, без пустых полос (cover)
    let x = W / 2 - fx * w, y = H / 2 - fy * h;
    if (FIT === 'cover') {
      x = Math.min(0, Math.max(W - w, x));
      y = Math.min(0, Math.max(H - h, y));
    } else {
      x = (W - w) / 2; y = (H - h) / 2;
    }
    return { x, y, w, h };
  }

  // ---------- один кадр: фон + зоны ----------
  function buildFrame(id, variant) {
    const f = document.createElement('div');
    f.className = 'frame';
    f.dataset.view = id;
    const img = document.createElement('img');
    img.src = variant.image;
    img.alt = '';
    img.draggable = false;
    f.appendChild(img);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1 1');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('zones');
    for (const g of variant.go || []) {
      if (!g.poly) continue;
      const p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', g.poly.map((q) => q.join(',')).join(' '));
      p.classList.add('zone');
      p.dataset.to = g.to;
      // подпись только для экранного диктора и подсказки браузера, не кнопка
      const t = document.createElementNS(NS, 'title');
      t.textContent = g.label_ru || g.to;
      p.appendChild(t);
      p.addEventListener('click', (e) => { e.stopPropagation(); goFromZone(g.to, centroid(g.poly), f); });
      svg.appendChild(p);
    }
    // предметы — поверх переходов: нажатие на аппарат важнее, чем «идти к стене»
    for (const it of variant.items || []) {
      const o = S.objects[it.id];
      const p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', it.poly.map((q) => q.join(',')).join(' '));
      p.classList.add('zone', 'item');
      if (it.ghost) p.classList.add('ghost');
      p.dataset.obj = it.id;
      const t = document.createElementNS(NS, 'title');
      t.textContent = o.name;
      p.appendChild(t);
      p.addEventListener('pointerenter', () => preload(it.id));
      p.addEventListener('click', (e) => { e.stopPropagation(); approachFromZone(it.id, it.poly, f); });
      svg.appendChild(p);
    }
    if (DEBUG && variant.cam) drawBlockout(svg, variant);
    f.appendChild(svg);
    // подписи для долгого нажатия (D-199): названия предметов и куда ведут переходы
    const lbls = document.createElement('div');
    lbls.className = 'lbls';
    for (const it of variant.items || []) {
      const b = document.createElement('b'), c = centroid(it.poly);
      b.textContent = S.objects[it.id].name;
      b.style.left = c[0] * 100 + '%'; b.style.top = c[1] * 100 + '%';
      lbls.appendChild(b);
    }
    for (const g of variant.go || []) {
      if (!g.poly) continue;
      const b = document.createElement('b'), c = centroid(g.poly);
      b.className = 'go';
      b.textContent = '→ ' + (S.names[g.to] || g.to);
      b.style.left = c[0] * 100 + '%'; b.style.top = c[1] * 100 + '%';
      lbls.appendChild(b);
    }
    f.appendChild(lbls);
    scene.appendChild(f);
    layoutFrame(f, variant);
    f._variant = variant;
    return f;
  }

  // кадр на экране: место по точке фокуса + сдвиг пальцем (f._dx, f._dy), без пустых полос
  function panLimits(r) {
    const W = scene.clientWidth, H = scene.clientHeight;
    return { x0: Math.min(0, W - r.w), y0: Math.min(0, H - r.h), W, H };
  }
  function clampPan(f, variant) {
    const r = placeRect(variant), L = panLimits(r);
    const x = r.w > L.W ? Math.min(0, Math.max(L.x0, r.x + (f._dx || 0))) : r.x;
    const y = r.h > L.H ? Math.min(0, Math.max(L.y0, r.y + (f._dy || 0))) : r.y;
    f._dx = x - r.x; f._dy = y - r.y;
    return { x, y, w: r.w, h: r.h };
  }
  function layoutFrame(f, variant) {
    const r = clampPan(f, variant);
    Object.assign(f.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    fingerZones(f, variant, r);
  }
  // мелкие предметы (Walkman, картриджи, VHS, наушники) — невидимая зона не меньше 46 px под палец (D-199);
  // кладётся под настоящие обводки, так что соседний предмет своей обводкой важнее
  function fingerZones(f, variant, r) {
    const svg = f.querySelector('svg.zones');
    svg.querySelectorAll('.hit').forEach((n) => n.remove());
    if (!r.w || !r.h) return; // экран ещё без размера — посчитаем при следующей раскладке
    const first = svg.querySelector('.item');
    const MIN = 46;
    for (const it of variant.items || []) {
      const xs = it.poly.map((q) => q[0]), ys = it.poly.map((q) => q[1]);
      const bw = (Math.max(...xs) - Math.min(...xs)) * r.w, bh = (Math.max(...ys) - Math.min(...ys)) * r.h;
      if (bw >= MIN && bh >= MIN) continue;
      const c = centroid(it.poly);
      const w = Math.max(MIN, bw) / r.w, h = Math.max(MIN, bh) / r.h;
      const q = document.createElementNS(NS, 'rect');
      q.setAttribute('x', c[0] - w / 2); q.setAttribute('y', c[1] - h / 2);
      q.setAttribute('width', w); q.setAttribute('height', h);
      q.classList.add('zone', 'item', 'hit');
      q.addEventListener('click', (e) => { e.stopPropagation(); approachFromZone(it.id, it.poly, f); });
      svg.insertBefore(q, first);
    }
  }

  function centroid(poly) {
    let x = 0, y = 0;
    for (const [a, b] of poly) { x += a; y += b; }
    return [x / poly.length, y / poly.length];
  }

  // ---------- края экрана: «повернуть голову» к соседней точке ----------
  // Зона, которая почти ушла за край экрана (узкий экран, кадр обрезан), тоже становится полосой у края —
  // иначе на телефоне ориентир возврата (край консоли на A) не нажать.
  function edgeSide(g, r) {
    if (g.edge) return g.edge;
    const W = scene.clientWidth;
    const xs = g.poly.map((q) => r.x + q[0] * r.w);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const vis = Math.max(0, Math.min(W, x1) - Math.max(0, x0)) / (x1 - x0);
    if (vis >= 0.5) return null;
    return (x0 + x1) / 2 < W / 2 ? 'left' : 'right';
  }

  function buildEdges(variant) {
    edges.innerHTML = '';
    const r = currentFrame ? clampPan(currentFrame, variant) : placeRect(variant);
    const used = {};
    for (const g of variant.go || []) {
      const side = edgeSide(g, r);
      if (!side || used[side]) continue;
      used[side] = true;
      const d = document.createElement('div');
      d.className = 'edge edge-' + side;
      d.title = g.label_ru || g.to;
      d.addEventListener('click', (e) => {
        // предмет под полосой важнее перехода (как зоны предметов поверх переходов): на телефоне полоса
        // ложится на аппарат у края экрана (8.11) — касание открывает его, а не соседнюю точку
        const it = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.classList?.contains('item') && currentFrame?.contains(n));
        if (it) { it.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
        goFromZone(g.to, [side === 'left' ? 0 : 1, 0.5], currentFrame, true);
      });
      edges.appendChild(d);
    }
  }

  // ---------- переходы ----------
  function goFromZone(to, originInFrame, frame, isEdge) {
    if (busy || to === current) return;
    pendingOrigin = { x: originInFrame[0], y: originInFrame[1], edge: !!isEdge };
    depth += 1;
    location.hash = to; // запись в историю: «назад» вернёт на прошлую точку
  }

  function show(id, mode) {
    // mode: 'enter' (первый показ), 'forward' (нажали на комнату), 'back' (назад/Esc)
    const variant = variantOf(id);
    const old = currentFrame;
    const fresh = buildFrame(id, variant);
    current = id;
    currentVariant = variant;
    currentFrame = fresh;
    buildEdges(variant);
    scene.style.setProperty('--bg-img', 'url("' + variant.image + '")');
    document.title = S.title + ' — ' + (S.names[id] || id);

    if (!old || mode === 'enter' || reduceMQ.matches) {
      // «Меньше движения»: смена кадра без полёта
      if (old) old.remove();
      fresh.classList.add('on');
      busy = false;
      return;
    }
    busy = true;
    scene.classList.add('moving');
    const o = pendingOrigin || { x: 0.5, y: 0.5 };
    const ease = 'cubic-bezier(.45,.05,.25,1)';
    if (mode === 'forward') {
      // камера летит к нажатому месту: старый кадр приближается к нему и тает, новый «подъезжает»
      const pull = o.edge ? 'translateX(' + (o.x < 0.5 ? 18 : -18) + '%) scale(1.15)' : 'scale(1.45)';
      old.style.transformOrigin = (o.x * 100) + '% ' + (o.y * 100) + '%';
      old.animate([{ transform: 'none', opacity: 1 }, { transform: pull, opacity: 0 }], { duration: DUR, easing: ease, fill: 'forwards' });
      const from = o.edge ? 'translateX(' + (o.x < 0.5 ? -14 : 14) + '%) scale(1.06)' : 'scale(1.12)';
      fresh.animate([{ transform: from, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DUR, easing: ease, fill: 'forwards', delay: DUR * 0.15 });
    } else {
      // назад: камера отъезжает — старый кадр уменьшается, новый приходит из чуть ближнего плана
      old.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(0.86)', opacity: 0 }], { duration: DUR * 0.85, easing: ease, fill: 'forwards' });
      fresh.animate([{ transform: 'scale(1.18)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DUR, easing: ease, fill: 'forwards', delay: DUR * 0.1 });
    }
    fresh.classList.add('on');
    setTimeout(() => {
      old.remove();
      fresh.getAnimations().forEach((a) => { a.commitStyles?.(); a.cancel(); });
      fresh.style.transform = ''; fresh.style.opacity = '';
      scene.classList.remove('moving');
      busy = false;
    }, DUR * 1.2);
  }

  function hashName() { return decodeURIComponent((location.hash || '').slice(1)); }
  function idFromHash() {
    const h = hashName();
    return S.views[h] ? h : null;
  }
  function objFromHash() {
    const h = hashName();
    return S.objects[h] ? h : null;
  }
  // точка, за которой стоит предмет: текущая, если он на ней обведён, иначе его «домашняя»
  function viewForObj(oid) {
    if (current && (currentVariant.items || []).some((it) => it.id === oid)) return current;
    return S.objects[oid].home;
  }

  window.addEventListener('hashchange', () => {
    if (RS && RS.inspecting()) RS.closeInspect();
    const forward = !!pendingOrigin;
    if (!forward && depth > 0) depth -= 1;
    const oid = objFromHash();
    if (oid) {
      if (oid === nearId) { pendingOrigin = null; return; }
      const vid = viewForObj(oid);
      if (nearId) closeNear(true);
      if (vid !== current) show(vid, 'enter');
      openNear(oid, forward ? pendingOrigin : null);
    } else {
      const id = idFromHash() || S.entry;
      if (nearId) {
        closeNear(false);
        if (id !== current) show(id, 'enter');
      } else if (id !== current) {
        show(id, forward ? 'forward' : 'back');
      }
    }
    pendingOrigin = null;
  });

  // Esc — шаг назад (как «назад» браузера); если ходов не было — к точке предмета или ко входу
  function stepBack() {
    if (busy) return;
    if (depth > 0) history.back();
    else if (nearId) location.hash = current;
    else if (current !== S.entry) location.hash = S.entry;
  }
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (RS && RS.inspecting()) RS.closeInspect(); // сначала опустить кассету, потом отойти
    else stepBack();
  });
  // нажатие мимо предмета — отойти назад
  near.addEventListener('click', (e) => { if (!nearObj.contains(e.target)) stepBack(); });
  nearObj.addEventListener('click', (e) => e.stopPropagation()); // сам предмет — его механика (devices.js)

  // ---------- подойти к предмету (шаг 8.3) ----------
  const loaded = {};
  function preload(oid) {
    const o = S.objects[oid];
    if (!o.image || loaded[oid]) return;
    loaded[oid] = new Image();
    loaded[oid].src = o.image;
  }

  function approachFromZone(oid, poly, frame) {
    if (busy) return;
    const r = frame.getBoundingClientRect();
    const xs = poly.map((q) => r.left + q[0] * r.width), ys = poly.map((q) => r.top + q[1] * r.height);
    const c = centroid(poly);
    pendingOrigin = {
      x: c[0], y: c[1],
      rect: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
    };
    depth += 1;
    location.hash = oid;
  }

  function fillNear(oid) {
    const o = S.objects[oid];
    nearObj.innerHTML = '';
    const dev = RS && RS.devices[oid];
    nearObj.classList.toggle('dev', !!dev);
    nearObj.classList.toggle('ph', !o.image && !dev);
    nearObj.setAttribute('role', dev ? 'group' : 'img');
    if (dev) {
      // предмет с механикой (8.4): живая сцена из кадров этапа 7, состояние общее на весь сайт
      dev.mount(nearObj);
    } else if (o.image) {
      const img = document.createElement('img');
      img.src = o.image;
      img.alt = o.name;
      img.draggable = false;
      nearObj.appendChild(img);
    } else {
      // картинки нет (пробел 3 STAGE8_PLAN) — серая коробка, как в болванке
      const b = document.createElement('div');
      b.className = 'ph-box';
      const n = document.createElement('div');
      n.className = 'ph-name';
      n.textContent = o.name;
      nearObj.append(b, n);
    }
    nearObj.setAttribute('aria-label', o.name);
  }

  function openNear(oid, origin) {
    nearId = oid;
    setSlide(nearObj, 0);
    preload(oid);
    fillNear(oid);
    document.title = S.title + ' — ' + S.objects[oid].name;
    const fr = currentFrame;
    fr.style.transformOrigin = origin ? (origin.x * 100) + '% ' + (origin.y * 100) + '%' : '50% 50%';
    near.hidden = false;
    scene.classList.add('near');
    edges.classList.add('off');
    near.classList.add('on');
    if (reduceMQ.matches || !origin || !origin.rect) return;
    // предмет «вырастает» из своего места на фоне к центру экрана
    const b = nearObj.getBoundingClientRect();
    const o = origin.rect;
    const k = Math.max(0.08, (o.x1 - o.x0) / b.width);
    const dx = (o.x0 + o.x1) / 2 - (b.left + b.width / 2), dy = (o.y0 + o.y1) / 2 - (b.top + b.height / 2);
    busy = true;
    const a = nearObj.animate(
      [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')', opacity: 0 },
       { transform: 'translate(' + dx * 0.25 + 'px,' + dy * 0.25 + 'px) scale(' + (0.75 + k * 0.25) + ')', opacity: 1, offset: 0.55 },
       { transform: 'none', opacity: 1 }],
      { duration: DUR * 0.8, easing: 'cubic-bezier(.3,.1,.2,1)' });
    a.onfinish = a.oncancel = () => { busy = false; };
  }

  function closeNear(instant) {
    nearId = null;
    scene.classList.remove('near');
    edges.classList.remove('off');
    document.title = S.title + ' — ' + (S.names[current] || current);
    near.classList.remove('on'); // CSS: предмет тает, комната проясняется
    // шаг 9.8: закрытую сцену вынимаем из страницы — её canvas перестают рисоваться (циклы сцен проверяют isConnected),
    // браузер может выгрузить расжатые кадры; состояние аппарата живёт в автомате, при возврате сцена ставится снова
    const unload = () => { if (!nearId) { near.hidden = true; nearObj.replaceChildren(); } };
    if (instant || reduceMQ.matches) { unload(); return; }
    busy = true;
    setTimeout(() => { unload(); busy = false; }, DUR * 0.5);
  }

  // поворот телефона / окно сменило размер
  window.addEventListener('resize', () => {
    if (!current) return;
    const v = variantOf(current);
    if (v.key !== currentVariant.key) { show(current, 'enter'); return; }
    layoutFrame(currentFrame, currentVariant);
    buildEdges(currentVariant);
  });

  // ---------- проверка совпадения с болванкой (?debug=1, пробел 2) ----------
  function drawBlockout(svg, variant) {
    const cam = variant.cam;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
    const fw = norm(sub(cam.target, cam.pos));
    const rt = norm(cross(fw, [0, 1, 0]));
    const up = cross(rt, fw);
    const tx = cam.tan_h, ty = cam.tan_h / (variant.size[0] / variant.size[1]);
    const proj = (p) => {
      const d = sub(p, cam.pos);
      const z = dot(d, fw);
      if (z < 0.05) return null;
      return [0.5 + 0.5 * dot(d, rt) / (z * tx), 0.5 - 0.5 * dot(d, up) / (z * ty)];
    };
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const b of S.boxes) {
      const pts = b.corners.map(proj);
      let d = '';
      for (const [i, j] of E) if (pts[i] && pts[j]) d += 'M' + pts[i].join(',') + 'L' + pts[j].join(',');
      if (!d) continue;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.classList.add('bo', 'bo-' + b.zone);
      const t = document.createElementNS(NS, 'title');
      t.textContent = b.id;
      path.appendChild(t);
      svg.insertBefore(path, svg.firstChild);
    }
  }

  // ---------- телефон (8.10, D-199): водить пальцем, долгое нажатие ----------
  // Комната: тянешь вбок — видна вся стена; у края тянешь дальше — переход к соседней точке.
  // Сцена предмета и осмотр (стоя они шире экрана) — тянешь вбок. Короткое касание — как раньше.
  // Долгое нажатие — подсвечены все места нажатия, у предметов в комнате названия.
  const SLOP = 10, OVER = 70, LONG = 480;
  let g = null;              // текущий жест
  let swallowUntil = 0;      // после жеста касание — не нажатие
  const insp = () => document.getElementById('insp');

  // куда ведёт «тянуть дальше края» на текущей точке: явный край, иначе по месту зоны; свободная сторона — оставшийся переход
  function sideTargets(variant) {
    const out = {}, rest = [];
    for (const z of variant.go || []) if (z.edge) out[z.edge] = out[z.edge] || z.to;
    for (const z of variant.go || []) {
      if (z.edge || Object.values(out).includes(z.to)) continue;
      const side = centroid(z.poly)[0] < 0.5 ? 'left' : 'right';
      if (!out[side]) out[side] = z.to; else rest.push(z.to);
    }
    for (const to of rest) { if (!out.left) out.left = to; else if (!out.right) out.right = to; }
    return out;
  }

  function panTarget() {
    const ins = insp();
    if (ins && !ins.hidden) {
      return [...ins.querySelectorAll('.vin-card, .vhs-card, .bb-card')].find((c) => c.offsetParent) || null;
    }
    if (nearId) return nearObj;
    return null; // комната — кадр двигается своим способом
  }
  // пределы сдвига элемента, отцентрованного на экране и шире экрана
  function slideLimits(el) {
    const W = innerWidth, r = el.getBoundingClientRect(), cur = el._px || 0;
    const left0 = r.left - cur, right0 = r.right - cur;
    if (r.width <= W + 1) return [0, 0];
    return [W - right0, -left0];
  }
  // --px: подписи сцены держатся по центру видимой части, а не всей сцены
  function setSlide(el, x) { el._px = x; el.style.translate = x ? x + 'px 0' : ''; el.style.setProperty('--px', x + 'px'); }
  function snap(el) { el.classList.add('snap'); setTimeout(() => el.classList.remove('snap'), 380); }
  const rubber = (x, a, b) => (x < a ? a + (x - a) * 0.35 : x > b ? b + (x - b) * 0.35 : x);

  function reveal(on) {
    if (on && currentFrame && !nearId) placeLabels(currentFrame);
    document.body.classList.toggle('reveal', on);
  }
  // подписи не наезжают друг на друга и не уходят за край; предмет за краем экрана — без подписи
  function placeLabels(f) {
    const W = innerWidth, H = innerHeight, placed = [];
    for (const b of f.querySelectorAll('.lbls b')) {
      b.style.translate = ''; b.hidden = false;
      const r = b.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      if (cx < 0 || cx > W || cy < 0 || cy > H) { b.hidden = true; continue; }
      const dx = r.left < 6 ? 6 - r.left : r.right > W - 6 ? W - 6 - r.right : 0;
      const box = { l: r.left + dx, r: r.right + dx, t: r.top, b: r.bottom };
      let dy = 0;
      for (let i = 0; i < 12; i++) {
        const hit = placed.find((p) => box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t);
        if (!hit) break;
        const sh = hit.b - box.t + 4; box.t += sh; box.b += sh; dy += sh;
      }
      placed.push(box);
      b.style.translate = dx + 'px ' + dy + 'px';
    }
  }

  function onDown(e) {
    if (e.button > 0 || g || busy && !nearId) return;
    const el = panTarget();
    const room = !el && !nearId && currentFrame && !(insp() && !insp().hidden);
    g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, long: false, el, room };
    if (el) g.base = el._px || 0, g.lim = slideLimits(el);
    if (room) {
      const r = placeRect(currentVariant), L = panLimits(r);
      g.r = r; g.base = currentFrame._dx || 0; g.baseY = currentFrame._dy || 0;
      g.lim = r.w > L.W ? [L.x0 - r.x, -r.x] : [0, 0];
      g.limY = r.h > L.H ? [L.y0 - r.y, -r.y] : [0, 0];
    }
    g.timer = setTimeout(() => { if (g && !g.moved) { g.long = true; reveal(true); navigator.vibrate?.(12); } }, LONG);
  }
  function onMove(e) {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < SLOP || g.long) return;
      if (g.el && Math.abs(dx) < Math.abs(dy)) { clearTimeout(g.timer); g = null; return; } // сцену водят только вбок
      g.moved = true; clearTimeout(g.timer);
    }
    if (g.el) {
      const [a, b] = g.lim;
      setSlide(g.el, rubber(g.base + dx, a, b));
    } else if (g.room) {
      const [a, b] = g.lim, [c, d] = g.limY;
      const x = g.base + dx, y = g.baseY + dy;
      g.over = x < a ? 'right' : x > b ? 'left' : null; // ушёл за правый край картинки → к точке справа
      g.overBy = x < a ? a - x : x > b ? x - b : 0;
      currentFrame.style.left = g.r.x + rubber(x, a, b) + 'px';
      currentFrame.style.top = g.r.y + Math.min(d, Math.max(c, y)) + 'px';
      currentFrame._dx = Math.min(b, Math.max(a, x)); currentFrame._dy = Math.min(d, Math.max(c, y));
      edges.dataset.pull = g.overBy > OVER * 0.6 ? g.over : '';
    }
  }
  function onUp(e) {
    if (!g || e.pointerId !== g.id) return;
    const done = g; g = null;
    clearTimeout(done.timer);
    if (done.long) { swallowUntil = performance.now() + 600; setTimeout(() => reveal(false), 120); }
    if (!done.moved) return;
    swallowUntil = performance.now() + 400;
    if (done.el) {
      const [a, b] = done.lim, x = done.el._px || 0;
      if (x < a || x > b) { snap(done.el); setSlide(done.el, Math.min(b, Math.max(a, x))); }
    } else if (done.room) {
      edges.dataset.pull = '';
      const to = done.over && done.overBy > OVER && e.type === 'pointerup' ? sideTargets(currentVariant)[done.over] : null;
      if (to) { goFromZone(to, [done.over === 'left' ? 0 : 1, 0.5], currentFrame, true); return; }
      snap(currentFrame);
      layoutFrame(currentFrame, currentVariant);
      buildEdges(currentVariant);
    }
  }
  addEventListener('pointerdown', onDown, true);
  addEventListener('pointermove', onMove, true);
  addEventListener('pointerup', onUp, true);
  addEventListener('pointercancel', onUp, true);
  // касание после жеста (сдвиг, долгое нажатие) — не нажатие
  addEventListener('click', (e) => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); swallowUntil = 0; } }, true);
  { // осмотр открылся — карточка снова по центру
    const ins = insp();
    if (ins) new MutationObserver(() => { if (!ins.hidden) ins.querySelectorAll('.vin-card, .vhs-card, .bb-card').forEach((c) => setSlide(c, 0)); })
      .observe(ins, { attributes: true, attributeFilter: ['hidden'] });
  }
  addEventListener('contextmenu', (e) => { if (e.pointerType !== 'mouse' && !e.button) e.preventDefault(); }, true);

  // ---------- старт: вход на VP-B (или точка из адреса) ----------
  for (const id of Object.keys(S.views)) { // прогреть картинки, чтобы переход не ждал загрузку
    const v = S.views[id];
    new Image().src = v.image;
    if (v.mobile) new Image().src = v.mobile.image;
  }
  // журнал STO-00 (8.7, devices-c.js): со страницы — к связанному предмету; «назад» вернёт к журналу
  if (RS) RS.goTo = (oid) => { if (busy || !S.objects[oid] || oid === nearId) return; pendingOrigin = { x: 0.5, y: 0.5 }; depth += 1; location.hash = oid; };
  // журнал на узком экране (9.11): сцена предмета шире экрана — сдвинуть её, чтобы нужная страница была видна целиком;
  // a, b — доли ширины сцены. Дальше посетитель, как обычно, тянет вбок сам.
  if (RS) RS.showPart = (a, b) => {
    if (!nearId) return;
    const [lo, hi] = slideLimits(nearObj);
    if (lo === hi) return;
    const r = nearObj.getBoundingClientRect(), left0 = r.left - (nearObj._px || 0);
    const x = innerWidth / 2 - (left0 + r.width * (a + b) / 2);
    setSlide(nearObj, Math.max(lo, Math.min(hi, x))); snap(nearObj);
  };
  const startObj = objFromHash();
  const start = idFromHash() || (startObj ? S.objects[startObj].home : S.entry);
  if (!idFromHash() && !startObj) history.replaceState(null, '', location.pathname + location.search + '#' + start);
  show(start, 'enter');
  if (startObj) openNear(startObj, null);
})();
