// RockShowcase — звук (шаг 8.9, D-198): временные записи после явного действия.
// Альбомы (Nebraska, Ten на кассетах; Born to Run, Nevermind на пластинках) — 30-секундные отрывки прямо
// с сервера Apple (ссылки iTunes Search API → project/world/sound_previews.json, сами записи не храним).
// Где отрывок не пустили (закрытая страница claude.ai, нет сети) — “свой звук”: рок-петля из браузера.
// Остальное — всегда свой звук: катушечники, видеокассета, Walkman, бумбоксы (кассеты без записи в каталоге),
// чистые кассеты XLII-S и SA-X — шипение плёнки; усилители — гитара (Fender) и бас (SVT) в общем такте (D-185),
// ручки, яркость, педаль, клавиши ultra — настоящие фильтры; решётки дрожат по настоящей громкости.
// Звук идёт только после нажатия на сам предмет (D-006: никаких кнопок звука); аппараты играют и когда
// посетитель ушёл к другому предмету. Источники A (дека, TASCAM, Technics, катушки, видео) — через колонки
// и MC275 (его ручки GAIN — громкость колонок, BALANCE — лево/право); бумбоксы и усилители — своими динамиками; Walkman — “в наушниках”.
// 9.10 (D-212): дека и TASCAM играют ту сторону кассеты, что смотрели в руке последней; наушники с консоли (S.hp)
// забирают звук B себе, комната стихает.
//
// Автомат не меняем: модуль сам читает общее состояние RS.kit.S несколько раз в секунду и включает/гасит голоса.
(function () {
  'use strict';
  const RS = window.RS;
  if (!RS || !RS.kit) return;
  const S = RS.kit.S, world = RS.kit.world;
  const PV = ((window.__SITE__ || {}).sound || {}).albums || {};
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const log = (t) => { if (window.RS_DEBUG) console.debug('[8.9]', t); };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const CAS = ['neb', 'ten', null, null]; // кассеты кейса (S.sel): 0 Nebraska, 1 Ten, 2 XLII-S и 3 SA-X — чистые

  let ctx = null, bus = null, remoteOk = true; // remoteOk=false — отрывки не пускают, дальше сразу свой звук
  const voices = new Map(); // ключ голоса → голос
  const pos = {};           // где остановилась запись носителя: {i, t} — кассета, переставленная в другой аппарат, играет дальше

  // ---------- выходы: колонки A (через MC275), бумбокс, наушники Walkman ----------
  function buildBus() {
    const out = ctx.createDynamicsCompressor(); out.threshold.value = -10; out.ratio.value = 4; out.connect(ctx.destination);
    const A = ctx.createGain(); A.connect(out);
    const boom = ctx.createBiquadFilter(); boom.type = 'highpass'; boom.frequency.value = 140;
    const boomLp = ctx.createBiquadFilter(); boomLp.type = 'lowpass'; boomLp.frequency.value = 6000;
    const boomPk = ctx.createBiquadFilter(); boomPk.type = 'peaking'; boomPk.frequency.value = 1200; boomPk.gain.value = 4;
    const boomG = ctx.createGain(); boomG.gain.value = 0.8;
    boom.connect(boomLp); boomLp.connect(boomPk); boomPk.connect(boomG); boomG.connect(out);
    const wm = ctx.createBiquadFilter(); wm.type = 'lowpass'; wm.frequency.value = 7000;
    const wmG = ctx.createGain(); wm.connect(wmG); wmG.connect(out);
    const amp = ctx.createGain(); amp.connect(out);
    // 9.10 (D-212): комната — всё, что слышно из колонок и динамиков; наушники с консоли её приглушают.
    // Аппараты B (дека, TASCAM, Technics) идут в B: через колонки (MC275) или, когда наушники надеты, прямо в уши.
    const room = ctx.createGain(); room.connect(out);
    for (const n of [A, boomG, wmG, amp]) { n.disconnect(); n.connect(room); }
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; // BALANCE MC275
    if (pan) { A.disconnect(); A.connect(pan); pan.connect(room); }
    const B = ctx.createGain(), bRoom = ctx.createGain(), hpG = ctx.createGain(); hpG.gain.value = 0;
    B.connect(bRoom); bRoom.connect(A); B.connect(hpG); hpG.connect(out);
    return { out, A, B, bRoom, hpG, room, pan, boom, wm, wmG, amp };
  }
  function unlock() {
    if (!ctx) { ctx = new AC(); bus = buildBus(); log('звук включён'); }
    if (ctx.state === 'suspended') ctx.resume();
    tick();
  }
  // первое нажатие посетителя открывает звук (браузеры без жеста не играют); сами аппараты включаются его же нажатиями
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });
  // iPhone (Safari) открывает звук только по отпусканию пальца / нажатию, не по касанию (8.10)
  addEventListener('touchend', unlock, { capture: true });
  addEventListener('click', unlock, { capture: true });

  // ---------- шум: шипение плёнки, малый барабан, хэт ----------
  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function hissVoice(dest) {
    const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(hp); hp.connect(g); g.connect(dest); src.start();
    return { g, set(p) { g.gain.setTargetAtTime(0.035 * p.gain, ctx.currentTime, 0.08); }, stop() { fadeStop(g, () => src.stop()); } };
  }
  function fadeStop(g, done) {
    const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.06);
    setTimeout(() => { try { done && done(); g.disconnect(); } catch (e) { /* уже отключён */ } }, 400);
  }

  // ---------- “свой звук”: рок-петля (ударные, бас, аккорды), у каждого источника своя ----------
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const STYLES = { // темп, тоника, гармония (ступени от тоники), рисунок
    neb: [92, 45, [0, 0, 5, 7], 'folk'], ten: [104, 50, [0, -2, -5, -2], 'rock'], btr: [146, 52, [0, 5, 7, 5], 'rock'], nvm: [116, 41, [0, 5, 3, 8], 'grunge'],
    rx: [100, 48, [0, 7, 9, 5], 'soft'], tc: [124, 43, [0, 3, 5, 3], 'rock'], vhs: [96, 47, [0, -3, 5, 7], 'soft'],
    wm: [120, 50, [0, 7, 9, 5], 'pop'], rc: [98, 46, [0, 0, 3, 5], 'hiphop'], gf1: [108, 45, [0, 5, 7, 7], 'rock'], gf2: [132, 52, [0, 3, -2, 5], 'pop'],
  };
  const DRUMS = { // 16 шагов: k — бочка, s — малый, h — хэт
    rock: ['k.h.s.h.k.k.s.h.', 'h'], grunge: ['k..ks.h.k.k.s.hh', 'h'], folk: ['k...s...k.k.s...', ''], soft: ['k...s...k...s..h', 'h'],
    pop: ['k.h.s.hkk.h.s.h.', 'h'], hiphop: ['k..k..s.k.k...s.', 'h'],
  };
  function loopVoice(style, dest) {
    const [bpm, root, prog, kind] = STYLES[style] || STYLES.rx;
    const pat = DRUMS[kind][0];
    const g = ctx.createGain(); g.gain.value = 0; g.connect(dest);
    let rate = 1, next = ctx.currentTime + 0.05, step = 0, alive = true;
    const hit = (t, f0, f1, dur, vol, type = 'sine') => {
      const o = ctx.createOscillator(), e = ctx.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + dur + 0.02);
    };
    const nz = (t, f, q, dur, vol) => {
      const s = ctx.createBufferSource(); s.buffer = noise();
      const b = ctx.createBiquadFilter(); b.type = f > 5000 ? 'highpass' : 'bandpass'; b.frequency.value = f; b.Q.value = q;
      const e = ctx.createGain(); e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(b); b.connect(e); e.connect(g); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    };
    const tone = (t, n, dur, vol, type, cut) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), e = ctx.createGain();
      o.type = type; o.frequency.value = midi(n) * rate; f.type = 'lowpass'; f.frequency.value = cut;
      e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + 0.01); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(f); f.connect(e); e.connect(g); o.start(t); o.stop(t + dur + 0.02);
    };
    function sched() {
      if (!alive) return;
      const st = 60 / (bpm * rate) / 4;
      while (next < ctx.currentTime + 0.2) {
        const s = step % 16, bar = Math.floor(step / 16) % 4, r = root + prog[bar], c = pat[s];
        if (c === 'k') hit(next, 140 * rate, 45, 0.28, 0.9);
        if (c === 's') nz(next, 1800, 0.8, 0.18, 0.55);
        if (c === 'h' || (DRUMS[kind][1] === 'h' && s % 2 === 0)) nz(next, 8000, 1, 0.05, 0.16);
        if (s % 4 === 0 || (kind !== 'folk' && s % 4 === 3)) tone(next, r - 12, st * 1.8, 0.32, 'sawtooth', 500);
        if (s === 0 || s === 8 || (kind === 'grunge' && s === 11)) for (const iv of [0, 7, 12, kind === 'soft' || kind === 'pop' ? 16 : 19]) tone(next, r + iv, st * 7, 0.07, kind === 'folk' ? 'triangle' : 'sawtooth', kind === 'grunge' ? 2600 : 1800);
        next += st; step++;
      }
      setTimeout(sched, 60);
    }
    sched();
    return {
      g, synth: true,
      set(p) { rate = clamp(p.rate || 1, 0.3, 2); g.gain.setTargetAtTime(0.5 * p.gain, ctx.currentTime, 0.08); },
      stop() { alive = false; fadeStop(g); },
    };
  }

  // ---------- отрывки альбома: сторона по порядку, по кругу; не пустили — свой звук ----------
  function albumVoice(key, alb, side, dest) {
    const list = (PV[alb] || {})['side' + side] || [];
    const g = ctx.createGain(); g.gain.value = 0; g.connect(dest);
    const at = pos[key] || (pos[key] = { i: 0, t: 0 });
    let el = null, src = null, fallback = null, wantPlay = false, waitT = null, rate = 1, gain = 0;
    const toSynth = (why) => {
      if (fallback) return;
      log(`${alb}: отрывок не играет (${why}) — свой звук`);
      remoteOk = false;
      if (el) { el.pause(); el.removeAttribute('src'); }
      fallback = loopVoice(alb, dest); fallback.set({ rate, gain });
    };
    function load() {
      el = new Audio(); el.crossOrigin = 'anonymous'; el.preload = 'auto';
      if ('preservesPitch' in el) el.preservesPitch = false; else el.mozPreservesPitch = false;
      el.src = list[at.i % list.length].url;
      el.addEventListener('loadedmetadata', () => { if (at.t && at.t < el.duration - 0.5) el.currentTime = at.t; }, { once: true });
      el.addEventListener('playing', () => { clearTimeout(waitT); waitT = null; });
      el.addEventListener('timeupdate', () => { at.t = el.currentTime; });
      el.addEventListener('ended', () => { at.i = (at.i + 1) % list.length; at.t = 0; const n = el; n.src = list[at.i].url; if (wantPlay) play(); });
      el.addEventListener('error', () => toSynth('error ' + (el.error ? el.error.code : '?')));
      src = ctx.createMediaElementSource(el); src.connect(g);
    }
    function play() {
      if (fallback || !el) return;
      el.playbackRate = rate;
      const p = el.play();
      if (p) p.catch((e) => { if (e.name !== 'NotAllowedError') toSynth(e.name); }); // NotAllowed — повторим на следующем нажатии
      if (!waitT) waitT = setTimeout(() => { if (wantPlay && el.paused === false && el.readyState < 3) toSynth('won’t load'); waitT = null; }, 8000);
    }
    if (!list.length || !remoteOk) toSynth(list.length ? 'blocked earlier' : 'no links'); else load();
    return {
      g,
      set(p) {
        rate = clamp(p.rate || 1, 0.5, 2); gain = p.gain;
        if (fallback) { fallback.set(p); return; }
        g.gain.setTargetAtTime(p.gain, ctx.currentTime, 0.08);
        if (Math.abs(el.playbackRate - rate) > 0.001) el.playbackRate = rate;
        wantPlay = true;
        if (el.paused) play();
      },
      stop() {
        wantPlay = false; clearTimeout(waitT);
        if (fallback) fallback.stop();
        fadeStop(g, () => { if (el) { at.t = el.currentTime; el.pause(); el.removeAttribute('src'); el.load(); } if (src) src.disconnect(); });
      },
    };
  }

  // ---------- гитарные усилители: гитара Fender и бас SVT в общем такте 100 BPM (как партии в devices-amp.js) ----------
  const TEMPO = 100, SPB = 60 / TEMPO;
  const GTR = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
  const BAS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
  const RIFF = [40, 40, 43, 38]; // E, E, G, D — тоники тактов
  let ampClock = null; // общий отсчёт тактов: оба усилителя играют вместе
  function irBuf(sec) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return b;
  }
  function shaper(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
  }
  const db = (knob) => (knob - 5) * 2.4; // ручка тембра 0…10 → −12…+12 дБ
  function ampVoice(d) {
    const fe = d === 'fe';
    const inG = ctx.createGain();
    const drive = ctx.createWaveShaper(); drive.curve = shaper(fe ? 2.5 : 1.5); drive.oversample = '2x';
    const lo = ctx.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = fe ? 120 : 70;
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = fe ? 650 : 800; mid.Q.value = 0.9;
    const hi = ctx.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = fe ? 3000 : 2500;
    const extra = ctx.createBiquadFilter(); extra.type = 'highshelf'; extra.frequency.value = fe ? 4000 : 5000; // BRIGHT / ultra hi
    const extraLo = ctx.createBiquadFilter(); extraLo.type = 'lowshelf'; extraLo.frequency.value = 45; // ultra lo
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = fe ? 5500 : 3500; // динамики
    const trem = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
    const vol = ctx.createGain(); vol.gain.value = 0;
    const rev = ctx.createConvolver(); rev.buffer = irBuf(2.2); const revG = ctx.createGain(); revG.gain.value = 0;
    const an = ctx.createAnalyser(); an.fftSize = 512;
    inG.connect(drive); drive.connect(lo); lo.connect(mid); mid.connect(hi); hi.connect(extra); extra.connect(extraLo); extraLo.connect(cab);
    cab.connect(trem); trem.connect(vol); vol.connect(an); an.connect(bus.amp);
    if (fe) { cab.connect(rev); rev.connect(revG); revG.connect(vol); }
    let next = 0, step = 0, alive = true;
    function note(t, n, dur) {
      const parts = fe ? [[0, 'sawtooth', 0.22], [7, 'sawtooth', 0.18], [12, 'square', 0.1]] : [[0, 'sawtooth', 0.4], [-12, 'sine', 0.5]];
      for (const [iv, type, v] of parts) {
        const o = ctx.createOscillator(), e = ctx.createGain(); o.type = type; o.frequency.value = midi(n + iv);
        if (fe) o.detune.value = (Math.random() - 0.5) * 8;
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(v, t + 0.006); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(e); e.connect(inG); o.start(t); o.stop(t + dur + 0.02);
      }
    }
    function sched() {
      if (!alive) return;
      const st = SPB / 4;
      if (ampClock === null) ampClock = ctx.currentTime + 0.05;
      if (!next) { step = Math.ceil((ctx.currentTime + 0.03 - ampClock) / st); next = ampClock + step * st; }
      while (next < ctx.currentTime + 0.2) {
        const s = step % 16, r = RIFF[Math.floor(step / 16) % 4];
        if ((fe ? GTR : BAS)[s]) note(next, fe ? r + 12 : r, fe ? st * 1.6 : st * 2.6);
        next += st; step++;
      }
      setTimeout(sched, 60);
    }
    sched();
    const buf = new Float32Array(an.fftSize);
    return {
      g: vol, an,
      level() { an.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; return clamp(Math.sqrt(s / buf.length) * 4); },
      set() {
        const A = S.amp[d], ch = A.cable ? (fe ? (A.cable[0] === 'V' ? 'vibrato' : 'normal') : (A.cable[0] === '1' ? 'one' : 'two')) : null;
        const k = (n) => A.knobs[ch + '-' + n], t = ctx.currentTime, tc = 0.05;
        if (!ch) return;
        const v = (k('volume') - (fe ? 1 : 0)) / (fe ? 9 : 10);
        const gate = RS.amps && RS.amps.gate ? RS.amps.gate(d) : 1;
        vol.gain.setTargetAtTime(0.55 * v * v * gate, t, tc);
        drive.curve = shaper((fe ? 1.5 : 1) + v * (fe ? 4 : 2));
        lo.gain.setTargetAtTime(db(k('bass')), t, tc);
        mid.gain.setTargetAtTime(k('middle') !== undefined ? db(k('middle')) : k('midrange') !== undefined ? db(k('midrange')) : 0, t, tc);
        hi.gain.setTargetAtTime(db(k('treble')), t, tc);
        if (fe) {
          extra.gain.setTargetAtTime(A.bright[ch] ? 6 : 0, t, tc);
          const vib = ch === 'vibrato';
          revG.gain.setTargetAtTime(vib && A.pedal.reverb ? A.knobs['vibrato-reverb'] / 10 * 0.9 : 0, t, tc);
          const on = vib && A.pedal.vibrato, depth = on ? A.knobs['vibrato-intensity'] / 10 * 0.5 : 0;
          lfo.frequency.setTargetAtTime(1 + A.knobs['vibrato-speed'] * 0.8, t, tc);
          lfoG.gain.setTargetAtTime(depth, t, tc); trem.gain.setTargetAtTime(1 - depth, t, tc);
        } else {
          if (ch === 'one') mid.frequency.setTargetAtTime(MIDF[(A.mid || 2) - 1], t, tc);
          extra.gain.setTargetAtTime(A.keys[ch + '-uhi'] || (A.cable && A.cable[1] === 'B') ? 8 : 0, t, tc);
          extraLo.gain.setTargetAtTime(A.keys[ch + '-ulo'] ? 8 : 0, t, tc);
          lfoG.gain.value = 0; trem.gain.value = 1;
        }
      },
      stop() { alive = false; fadeStop(vol, () => { lfo.stop(); an.disconnect(); }); },
    };
  }
  const MIDF = [220, 800, 3000];

  // ---------- что должно звучать сейчас (по общему автомату) ----------
  function wanted() {
    const w = [], p = world.playing();
    const mc = S.mc ? S.mc.knob : null;
    const casVoice = (key, gain) => {
      const a = CAS[S.sel];
      const sd = S.casSide === 2 ? 2 : 1; // 9.10: сторона, которую смотрели в руке последней
      w.push(a ? { key, kind: 'album', alb: a, side: sd, media: 'cas' + S.sel + '-' + sd, out: 'B', gain } : { key, kind: 'hiss', out: 'B', gain });
    };
    if (p.includes('b-cassette-deck')) casVoice('deck', 1);
    if (p.includes('b-portastudio')) casVoice('ps', 0.3 + 0.9 * clamp(S.psMaster));
    if (p.includes('b-turntable')) {
      const t = S.tt;
      w.push({ key: 'tt', kind: 'album', alb: t.disc, side: t.side, media: 'vin-' + t.disc + t.side, out: 'B', gain: 1, rate: (t.speed === 45 ? 45 / 33.333 : 1) * (1 + t.pitch / 100) });
    }
    for (const [id, dv] of [['a-reel-to-reel', 'rx'], ['a-reel-to-reel-2', 'tc']]) if (p.includes(id)) { const v = Math.abs(S.rr[dv].v); w.push({ key: dv, kind: 'loop', style: dv, out: 'A', gain: clamp(v), rate: v }); }
    if (p.includes('a-video-deck')) w.push({ key: 'vhs', kind: 'loop', style: 'vhs', out: 'A', gain: clamp(S.vd.v), rate: clamp(S.vd.v, 0.3, 1) });
    const cc = S.cc;
    if (cc) {
      const wm = cc.wm;
      if (wm.listen && wm.cass === 'in' && wm.door === 'closed') w.push({ key: 'wm', kind: 'loop', style: 'wm', out: 'wm', gain: wm.duck, rate: clamp(wm.v || 1, 0.3, 1) });
      if (cc.rc.playing) w.push({ key: 'rc', kind: 'loop', style: 'rc', out: 'boom', gain: 1, rate: clamp(cc.rc.v || 1, 0.3, 1) });
      for (const n of [1, 2]) if (cc.gf.p[n]) w.push({ key: 'gf' + n, kind: 'loop', style: 'gf' + n, out: 'boom', gain: 0.8, rate: clamp(cc.gf.vd[n] || 1, 0.3, 1) });
    }
    if (RS.amps) for (const id of RS.amps.sounding()) w.push({ key: id === 'a-amp-svt' ? 'svt' : 'fe', kind: 'amp', out: 'amp' });
    return { w, mcGain: mc ? Math.pow(10, ((mc['gain-l'] + mc['gain-r'] + mc['gain-mono']) / 3) * 3 / 20) : 1, bal: mc ? mc.balance / 2.5 : 0 };
  }

  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const { w, mcGain, bal } = wanted();
    bus.A.gain.setTargetAtTime(mcGain, ctx.currentTime, 0.1);
    if (bus.pan) bus.pan.pan.setTargetAtTime(bal, ctx.currentTime, 0.1);
    // наушники с консоли (9.10): B — в уши, мимо колонок; остальная комната — едва слышно
    const hp = !!S.hp;
    bus.bRoom.gain.setTargetAtTime(hp ? 0 : 1, ctx.currentTime, 0.15);
    bus.hpG.gain.setTargetAtTime(hp ? 1.1 : 0, ctx.currentTime, 0.15);
    bus.room.gain.setTargetAtTime(hp ? 0.18 : 1, ctx.currentTime, 0.2);
    // Walkman — “в наушниках”: рядом с ним слышно, от других предметов — едва
    bus.wmG.gain.setTargetAtTime(location.hash === '#c-walkman' ? 0.7 : 0.12, ctx.currentTime, 0.2);
    const keep = new Set();
    for (const v of w) {
      const id = v.key + ':' + (v.media || v.style || v.kind);
      keep.add(id);
      let vc = voices.get(id);
      if (!vc) {
        const dest = bus[v.out];
        vc = v.kind === 'album' ? albumVoice(v.media, v.alb, v.side, dest) : v.kind === 'hiss' ? hissVoice(dest) : v.kind === 'amp' ? ampVoice(v.key) : loopVoice(v.style, dest);
        voices.set(id, vc);
        log('играет ' + id);
      }
      vc.set(v);
    }
    for (const [id, vc] of voices) if (!keep.has(id)) { vc.stop(); voices.delete(id); log('стоп ' + id); }
  }
  setInterval(tick, 120);
  world.on(() => tick());

  RS.sound = {
    // громкость усилителя 0…1 для дрожи решётки; null — звука нет (решётка дрожит по такту, как в 8.8)
    level(d) { if (!ctx || ctx.state !== 'running') return null; for (const [id, vc] of voices) if (id.startsWith(d + ':') && vc.level) return vc.level(); return 0; },
    remote: () => remoteOk,
    playing: () => [...voices.keys()],
    route: () => (bus ? { hp: bus.hpG.gain.value, room: bus.room.gain.value, bRoom: bus.bRoom.gain.value, pan: bus.pan ? bus.pan.pan.value : null } : null), // для проверок
  };
})();
