/* ===== 声音：Web Audio 实时合成（无外部音频文件） =====
   每类道具用不同的音色家族，听感差距拉开：
   固定弹射＝低频重击 + 弹簧/爆破；变速回弹＝按来速变调的“咚/嘣”；生球＝亮闪闪的琶音/鸟鸣/水晶；
   得分＝金属铃、硬币、木鱼；墙＝木块；导流钉＝玻璃叮 */
(function (G) {
'use strict';
const PB = G.PB || (G.PB = {});

const A = PB.Audio = {
  ctx: null, master: null, musicBus: null, sfxBus: null, echoBus: null,
  musicVol: 0.55, sfxVol: 0.8,
  track: null, nextTime: 0, step: 0, timer: null,
  last: {}, noiseBuf: null
};

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

A.init = function () {
  if (A.ctx) return;
  const AC = G.AudioContext || G.webkitAudioContext;
  if (!AC) return;
  const ctx = A.ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  A.master = ctx.createGain(); A.master.gain.value = 0.9;
  A.musicBus = ctx.createGain(); A.sfxBus = ctx.createGain();
  // 回声总线（铃类声音用）
  const dl = ctx.createDelay(1); dl.delayTime.value = 0.19;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  A.echoBus = ctx.createGain();
  A.echoBus.connect(A.sfxBus); A.echoBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(A.sfxBus);
  A.musicBus.connect(A.master); A.sfxBus.connect(A.master);
  A.master.connect(comp); comp.connect(ctx.destination);
  const len = ctx.sampleRate;
  A.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = A.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.setVolumes(A.musicVol, A.sfxVol);
};
A.resume = function () { A.init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
A.setVolumes = function (m, s) {
  A.musicVol = m; A.sfxVol = s;
  if (!A.ctx) return;
  const t = A.ctx.currentTime;
  A.musicBus.gain.setTargetAtTime(m * m * 0.45, t, 0.05);
  A.sfxBus.gain.setTargetAtTime(s * s * 0.95, t, 0.05);
};

/* ---------- 合成基元 ---------- */
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function now() { return A.ctx.currentTime; }
function tone(o) {
  const ctx = A.ctx; if (!ctx) return;
  const t = o.t || ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.d));
  if (o.vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = o.vib; lg.gain.value = o.vibD || 20; l.connect(lg); lg.connect(osc.frequency);
    l.start(t); l.stop(t + (o.a || 0.004) + (o.d || 0.15) + 0.05);
  }
  const g = ctx.createGain();
  env(g, t, o.a || 0.004, o.v || 0.2, o.d || 0.15);
  let node = osc;
  if (o.lp || o.bp || o.hp) {
    const f = ctx.createBiquadFilter();
    f.type = o.lp ? 'lowpass' : o.bp ? 'bandpass' : 'highpass';
    f.frequency.setValueAtTime(o.lp || o.bp || o.hp, t);
    if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + (o.d || 0.15));
    f.Q.value = o.q || 0.8;
    node.connect(f); node = f;
  }
  node.connect(g); g.connect(o.bus || A.sfxBus);
  osc.start(t); osc.stop(t + (o.a || 0.004) + (o.d || 0.15) + 0.05);
}
function noise(o) {
  const ctx = A.ctx; if (!ctx) return;
  const t = o.t || ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = A.noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || 1;
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.d || 0.1));
  const g = ctx.createGain(); env(g, t, o.a || 0.002, o.v || 0.2, o.d || 0.1);
  src.connect(f); f.connect(g); g.connect(o.bus || A.sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + (o.a || 0.002) + (o.d || 0.1) + 0.05);
}
/* 金属铃：非谐波分音 */
function bell(f, v, d, t, bus) {
  [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.9, 0.12]].forEach(([r, a]) =>
    tone({ f: f * r, type: 'sine', v: v * a, a: 0.002, d: d / (1 + r * 0.25), t, bus: bus || A.echoBus }));
}
function arp(notes, gap, o) {
  const t0 = now();
  notes.forEach((m, i) => tone(Object.assign({ f: mtof(m), t: t0 + i * gap }, o)));
}

/* ---------- 音效表 ---------- */
const GAP = { peg: 0.04, wall: 0.05, thud: 0.05, coin: 0.035, bump: 0.03, sling: 0.03, flipHit: 0.05, chain: 0.03, ready: 0.08, saluteShot: 0.05 };
const SFX = {
  // 环境：导流钉＝玻璃叮；墙＝木块
  peg: () => tone({ f: 2900 + Math.random() * 500, type: 'sine', v: 0.06, d: 0.05 }),
  wall: v => { noise({ f: 900, q: 6, v: Math.min(0.2, (v || 300) / 3500), d: 0.05 }); tone({ f: 380, f2: 300, type: 'triangle', v: 0.06, d: 0.04 }); },
  thud: () => { tone({ f: 260, f2: 170, type: 'triangle', v: 0.1, d: 0.07 }); noise({ f: 600, q: 2, v: 0.04, d: 0.03 }); },

  // 固定弹射：大、低、冲
  kick: () => {
    tone({ f: 110, type: 'sawtooth', v: 0.22, d: 0.38, lp: 3200, lp2: 260, q: 14 });
    tone({ f: 70, f2: 40, type: 'sine', v: 0.42, d: 0.2 });
    noise({ f: 2500, v: 0.12, d: 0.05 });
  },
  mush: () => {
    tone({ f: 130, f2: 820, slide: 0.16, type: 'sine', v: 0.32, d: 0.3, vib: 22, vibD: 30 });
    tone({ f: 60, f2: 38, type: 'sine', v: 0.4, d: 0.18 });
  },
  power: () => {
    noise({ f: 2400, f2: 180, ft: 'lowpass', v: 0.5, d: 0.26 });
    tone({ f: 240, f2: 55, type: 'square', v: 0.16, d: 0.22, lp: 1400 });
    tone({ f: 55, f2: 34, type: 'sine', v: 0.55, d: 0.3 });
  },
  cannonIn: () => { tone({ f: 190, f2: 95, type: 'square', v: 0.14, d: 0.12, bp: 700, q: 3 }); noise({ f: 4000, v: 0.12, d: 0.03 }); },
  cannonFire: () => { noise({ f: 1200, f2: 90, ft: 'lowpass', v: 0.6, d: 0.45 }); tone({ f: 80, f2: 30, type: 'sine', v: 0.6, d: 0.4 }); },
  flipAuto: () => { noise({ f: 5000, ft: 'highpass', v: 0.16, d: 0.03 }); tone({ f: 150, f2: 70, type: 'square', v: 0.1, d: 0.07, lp: 900 }); noise({ f: 500, f2: 2200, v: 0.1, d: 0.12 }); },
  flipHit: () => tone({ f: 200, f2: 120, type: 'triangle', v: 0.16, d: 0.07 }),

  // 变速回弹：音高和音量随出射速度变化（v = 0~1）
  bump: v => {
    v = v || 0.3;
    tone({ f: 320 + 620 * v, f2: (320 + 620 * v) * 0.6, type: 'triangle', v: 0.12 + 0.22 * v, d: 0.12 + 0.1 * v });
    tone({ f: (320 + 620 * v) * 2.4, type: 'sine', v: 0.05 + 0.08 * v, d: 0.18 });
  },
  tramp: v => { v = v || 0.3; tone({ f: 180 + 120 * v, f2: 360 + 520 * v, slide: 0.14, type: 'sine', v: 0.14 + 0.2 * v, d: 0.24, vib: 9, vibD: 14 }); },
  sling: v => { v = v || 0.3; tone({ f: 900 + 900 * v, f2: 260, type: 'square', v: 0.06 + 0.1 * v, d: 0.1, lp: 3500 }); },

  // 生成新球：亮、闪
  gift: () => { tone({ f: 500, f2: 1500, type: 'sine', v: 0.2, d: 0.08 }); arp([84, 88, 91, 96], 0.045, { type: 'triangle', v: 0.14, d: 0.18 }); noise({ f: 7000, ft: 'highpass', v: 0.06, d: 0.25 }); },
  nest: () => { [0, 0.1].forEach(dt => tone({ f: 2100, f2: 3300, slide: 0.06, type: 'sine', v: 0.14, d: 0.08, t: now() + dt })); },
  split: () => { [3100, 3500, 4300, 5200, 6100].forEach((f, i) => tone({ f, type: 'sine', v: 0.07, d: 0.35 - i * 0.04, t: now() + i * 0.012 })); noise({ f: 6000, ft: 'highpass', v: 0.1, d: 0.12 }); },
  salute: () => { for (let i = 0; i < 3; i++) { noise({ f: 800, ft: 'lowpass', v: 0.35, d: 0.1, t: now() + i * 0.2 }); tone({ f: 700, f2: 2200, slide: 0.18, type: 'sine', v: 0.08, d: 0.2, t: now() + i * 0.2 }); } },
  saluteShot: () => tone({ f: 900, f2: 1600, type: 'triangle', v: 0.08, d: 0.06 }),
  ready: () => tone({ f: 1568, type: 'sine', v: 0.07, d: 0.12 }),
  pop: () => tone({ f: 700, f2: 1300, type: 'triangle', v: 0.1, d: 0.07 }),

  // 得分：金属、硬币、木鱼
  coin: () => { tone({ f: 988, type: 'square', v: 0.07, d: 0.05, lp: 5000 }); tone({ f: 1319, type: 'square', v: 0.07, d: 0.2, t: now() + 0.05, lp: 6000 }); },
  chain: v => { const n = [[76], [76, 83], [76, 83, 88]][v || 0]; arp(n, 0.05, { type: 'sine', v: 0.18, d: 0.14 }); },
  letter: () => bell(1046, 0.22, 1.0),
  letterAgain: () => bell(1046, 0.1, 0.4),
  set: () => { arp([72, 76, 79, 84, 88, 91, 96], 0.07, { type: 'triangle', v: 0.16, d: 0.3 }); bell(1568, 0.14, 1.2, now() + 0.5); },
  center: () => { tone({ f: 1760, type: 'square', v: 0.08, d: 0.12, lp: 6000 }); tone({ f: 2637, type: 'square', v: 0.08, d: 0.3, t: now() + 0.08, lp: 7000 }); },
  edge: () => { noise({ f: 1400, q: 8, v: 0.18, d: 0.05 }); tone({ f: 520, type: 'sine', v: 0.08, d: 0.06 }); },
  claim: v => { const n = Math.max(2, Math.min(7, Math.round((v || 0) / 45))); for (let i = 0; i < n; i++) tone({ f: 1500 + i * 140, type: 'square', v: 0.05, d: 0.05, t: now() + i * 0.045, lp: 5000 }); bell(2093, 0.08, 0.4, now() + n * 0.045); },
  crack: () => { noise({ f: 1700, q: 3, v: 0.28, d: 0.07 }); tone({ f: 300, f2: 180, type: 'triangle', v: 0.08, d: 0.06 }); },
  break: () => { noise({ f: 3500, ft: 'highpass', v: 0.4, d: 0.4 }); noise({ f: 700, v: 0.3, d: 0.2 }); arp([84, 88, 91, 96], 0.05, { type: 'square', v: 0.06, d: 0.15, lp: 5000 }); },
  echo: v => bell(v ? 1175 : 1318, v ? 0.11 : 0.2, 0.9),
  solo1: () => bell(440, 0.2, 1.2),
  gray: () => tone({ f: 220, f2: 140, type: 'square', v: 0.07, d: 0.25, lp: 800 }),
  solo: () => { bell(330, 0.24, 1.6); bell(495, 0.12, 1.4, now() + 0.12); },
  arch: () => noise({ f: 600, f2: 3200, v: 0.18, d: 0.18 }),
  cup: () => { tone({ f: 520, f2: 140, type: 'sine', v: 0.3, d: 0.16 }); arp([88, 95], 0.06, { type: 'square', v: 0.05, d: 0.12, lp: 6000 }); },

  // 联动
  store: () => tone({ f: 300, f2: 110, type: 'sine', v: 0.3, d: 0.2, lp: 900 }),
  spout: () => { noise({ f: 2800, f2: 500, v: 0.35, d: 0.4 }); tone({ f: 180, f2: 520, type: 'sine', v: 0.14, d: 0.22 }); },
  link: () => { [0, 0.08, 0.16].forEach((dt, i) => bell(1568 + i * 200, 0.08, 0.5, now() + dt)); },
  teleport: () => tone({ f: 300, f2: 1800, slide: 0.22, type: 'sine', v: 0.15, d: 0.25, vib: 30, vibD: 40 }),
  teleportOut: () => tone({ f: 1800, f2: 500, slide: 0.18, type: 'sine', v: 0.13, d: 0.2 }),
  gateOpen: () => { tone({ f: 200, f2: 420, slide: 0.2, type: 'sawtooth', v: 0.07, d: 0.22, lp: 900 }); bell(988, 0.08, 0.3); },
  gateClose: () => tone({ f: 420, f2: 160, slide: 0.18, type: 'sawtooth', v: 0.06, d: 0.2, lp: 800 }),
  button: () => tone({ f: 880, type: 'square', v: 0.06, d: 0.04, lp: 2500 }),

  // 系统
  launch: p => { noise({ f: 400, f2: 2600, v: 0.2, d: 0.2 }); tone({ f: 150 + (p || 0) * 130, f2: 55, type: 'sine', v: 0.38, d: 0.22 }); },
  full: () => tone({ f: 260, f2: 220, type: 'square', v: 0.06, d: 0.14, lp: 900 }),
  ui: () => tone({ f: 660, f2: 990, type: 'triangle', v: 0.09, d: 0.07 }),
  passed: () => { arp([72, 76, 79, 84, 79, 84, 88], 0.09, { type: 'triangle', v: 0.18, d: 0.3 }); bell(2093, 0.1, 1.0, now() + 0.6); },
  win: () => { arp([60, 64, 67, 72, 76, 79, 84], 0.08, { type: 'triangle', v: 0.17, d: 0.4 }); arp([48, 55, 60], 0.24, { type: 'sine', v: 0.22, d: 0.6 }); },
  lose: () => arp([67, 63, 60, 55], 0.16, { type: 'triangle', v: 0.16, d: 0.4 }),
  timeout: () => arp([72, 67], 0.12, { type: 'square', v: 0.07, d: 0.2, lp: 1500 }),
  shotEnd: () => arp([79, 84], 0.07, { type: 'triangle', v: 0.11, d: 0.15 })
};

A.sfx = function (name, v) {
  if (!A.ctx || A.ctx.state !== 'running' || A.sfxVol <= 0) return;
  const fn = SFX[name]; if (!fn) return;
  const t = A.ctx.currentTime;
  const gap = GAP[name] || 0.025;
  if (A.last[name] && t - A.last[name] < gap) return;  // 同类高频声音合并
  A.last[name] = t;
  try { fn(v); } catch (e) { /* 忽略单个音效错误 */ }
};

/* ---------- 音乐：大厅 / 游玩两条循环 ---------- */
const TRACKS = {
  lobby: {
    bpm: 100,
    chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]],
    play(step, t, s) {
      const bar = Math.floor(step / 8) % 4, e = step % 8, ch = this.chords[bar];
      const pat = [0, 1, 2, 3, 2, 1, 2, 3];
      tone({ f: mtof(ch[pat[e]] + 12), t, type: 'triangle', v: 0.09, a: 0.005, d: s * 1.4, lp: 3000, bus: A.musicBus });
      if (e === 0 || e === 4) tone({ f: mtof(ch[0] - 24), t, type: 'sine', v: 0.22, a: 0.01, d: s * 3.2, bus: A.musicBus });
      if (e === 2 || e === 6) noise({ t, f: 6000, ft: 'highpass', v: 0.03, d: 0.05, bus: A.musicBus });
      if (e === 0 && bar % 2 === 0) tone({ f: mtof(ch[3] + 12), t: t + s * 0.5, type: 'sine', v: 0.05, a: 0.02, d: s * 4, bus: A.musicBus });
    }
  },
  game: {
    bpm: 132,
    chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
    lead: [[72, 0, 76, 79, 0, 76, 74, 72], [71, 0, 74, 0, 79, 0, 74, 71], [72, 0, 69, 72, 76, 0, 72, 0], [69, 72, 0, 77, 76, 0, 74, 0]],
    play(step, t, s) {
      const bar = Math.floor(step / 8) % 4, e = step % 8, ch = this.chords[bar];
      const bassPat = [0, 0, 12, 0, 0, 12, 0, 7];
      tone({ f: mtof(ch[0] - 24 + bassPat[e]), t, type: 'triangle', v: 0.2, a: 0.005, d: s * 0.8, lp: 900, bus: A.musicBus });
      if (e === 0 || e === 4) tone({ f: 120, f2: 45, t, type: 'sine', v: 0.38, d: 0.16, bus: A.musicBus });
      if (e === 2 || e === 6) noise({ t, f: 1800, v: 0.11, d: 0.09, bus: A.musicBus });
      noise({ t, f: 8000, ft: 'highpass', v: e % 2 ? 0.035 : 0.02, d: 0.03, bus: A.musicBus });
      const n = this.lead[bar][e];
      if (n && (Math.floor(step / 32) % 2 === 1 || e % 2 === 0)) tone({ f: mtof(n), t, type: 'square', v: 0.04, a: 0.005, d: s * 0.9, lp: 2600, bus: A.musicBus });
      if (e === 0) ch.forEach(m => tone({ f: mtof(m), t, type: 'sawtooth', v: 0.016, a: 0.02, d: s * 6, lp: 1300, bus: A.musicBus }));
    }
  }
};

A.playMusic = function (name) {
  if (!A.ctx) return;
  if (A.track === name) return;
  A.track = name; A.step = 0;
  A.nextTime = A.ctx.currentTime + 0.08;
  if (A.timer) { clearInterval(A.timer); A.timer = null; }
  if (!name) return;
  const tr = TRACKS[name];
  A.timer = setInterval(() => {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const s = 60 / tr.bpm / 2;
    if (A.nextTime < A.ctx.currentTime - 0.2) A.nextTime = A.ctx.currentTime + 0.02;
    while (A.nextTime < A.ctx.currentTime + 0.15) {
      if (A.musicVol > 0) tr.play(A.step, A.nextTime, s);
      A.nextTime += s; A.step++;
    }
  }, 30);
};
A.stopMusic = function () { A.playMusic(null); };
})(typeof window !== 'undefined' ? window : globalThis);
