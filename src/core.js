/* ===== 弹珠游园会 · 核心逻辑（无 DOM，可在 Node 中模拟） ===== */
(function (G) {
'use strict';
const PB = G.PB || (G.PB = {});

/* 棋盘坐标：有效棋盘 1280×576，原点为棋盘左上角；顶部 -130 为发射区天花板；底部 576 以下为自动拨杆回收区 */
const BOARD = PB.BOARD = { w: 1280, h: 576, ceil: -130, drain: 714, pivot: { x: 640, y: -130 }, muzzle: 44, ballR: 18 };
const DEG = Math.PI / 180;
const AIM_MAX = 55 * DEG;
PB.AIM_MAX = AIM_MAX;

/* 交错格：奇数排 10 格（x=64+128(c-1)），偶数排 9 格（x=128+128(c-1)），排距 96 */
PB.cellXY = function (cell) {
  const m = /^R(\d)C(\d+)$/.exec(cell);
  const r = +m[1], c = +m[2];
  return { r, c, x: (r % 2 ? 64 : 128) + 128 * (c - 1), y: 48 + 96 * (r - 1) };
};

PB.DEFAULTS = {
  map: 'A',
  targets: { A: 7000, B: 15500, C: 6000 },
  shots: 3,
  newBallCap: 8,
  maxEntities: 8,
  shotTime: 25,
  flippers: true,
  flipperCooldown: 1.0,
  physics: { gravity: 650, restitution: 0.75, pegRestitution: 0.85, maxSpeed: 1100, flipperSpeed: 1150 },
  force: { fixed: 950, varGain: 1.3, varMin: 320 },
  spawnCd: { gift: 5, nest: 2.5, split: 3.5, salute: 8 },
  scores: {
    bounce: 20, cannon: 20, coin: 50,
    chain1: 40, chain2: 80, chain3: 120,
    letter: 60, letterSet: 300,
    targetCenter: 200, targetEdge: 40,
    clockRate: 20, clockMax: 300,
    pot: 240, echo: 60, solo: 250, arch: 80, cup: 120
  }
};

/* 道具库：fam = fixed 固定弹射 / vari 变速回弹 / spawn 生成新球 / score 碰撞得分 / link 联动 */
PB.ITEMS = {
  kicker: { name: '弹射板', fam: 'fixed', desc: '正面撞上后，沿箭头方向以固定大力弹出' },
  mushroom: { name: '弹射蘑菇', fam: 'fixed', desc: '从上方落到伞盖，固定大力竖直弹回上方' },
  power: { name: '冲击鼓', fam: 'fixed', desc: '任意方向撞上，都以固定大力径向弹开' },
  cannon: { name: '转向炮', fam: 'fixed', desc: '吸入球 0.35 秒后按炮口方向大力射出；发射前点击可换方向' },
  bumper: { name: '弹力鼓', fam: 'vari', desc: '来得越快弹得越快（×倍率），慢球也有最低弹力' },
  tramp: { name: '蹦床绳', fam: 'vari', desc: '从上方落下时按下落速度向上回弹，有最低弹力' },
  sling: { name: '回弹条', fam: 'vari', desc: '斜置弹条，按撞击速度放大反弹，有最低弹力' },
  gift: { name: '双球礼盒', fam: 'spawn', desc: '撞到放出 2 颗新球；冷却 5 秒，冷却中变暗可穿过' },
  nest: { name: '小球鸟巢', fam: 'spawn', desc: '撞到向上吐出 1 颗新球；冷却 2.5 秒' },
  split: { name: '分裂水晶', fam: 'spawn', desc: '撞到的球一分为二，镜像飞出；冷却 3.5 秒' },
  salute: { name: '三响礼炮', fam: 'spawn', desc: '撞到后连发 3 颗新球；冷却 8 秒' },
  coin: { name: '金币钉', fam: 'score', desc: '每次有效碰撞 +50' },
  letter: { name: '三连灯牌', fam: 'score', desc: '每块 +60，本局 A/B/C 集齐再 +300' },
  target: { name: '中心靶', fam: 'score', desc: '上下边中央红区 +200（每发 2 次），其余 +40' },
  pot: { name: '碎罐奖', fam: 'score', desc: '本局累计第 3 次撞击碎裂 +240' },
  arch: { name: '过路拱门', fam: 'score', desc: '从上往下穿过 +80，每球每发 1 次' },
  cup: { name: '落袋杯', fam: 'score', desc: '落入杯口 +120，同时回收该球' },
  echo: { name: '回声铃', fam: 'score', desc: '撞响 +60，0.5 秒后回声再 +60' },
  clock: { name: '储分钟', fam: 'score', desc: '每秒积累 20 分（上限 300），首次撞到领取' },
  solo: { name: '独响钟', fam: 'score', desc: '本发恰好撞 1 次，结束时 +250' },
  hole: { name: '连环洞', fam: 'score', desc: '连续撞不同的洞：40 → 80 → 120' },
  link: { name: '连动铃', fam: 'link', desc: '撞响后，连线的 3 枚金币同时计分' },
  whale: { name: '储球鲸箱', fam: 'link', desc: '吞下最多 2 球，0.8 秒后一起喷出' },
  portalIn: { name: '回程门·入', fam: 'link', desc: '把球传送到同号出口，每发 2 次' },
  portalOut: { name: '回程门·出', fam: 'link', desc: '传送出口，球从这里向下落出' },
  button: { name: '开关钮', fam: 'link', desc: '撞到打开同号闸门 4 秒，每发 2 次' },
  gate: { name: '闸门', fam: 'link', desc: '关闭时挡球，打开后可以穿过' },
  peg: { name: '导流钉', fam: 'peg', desc: '只改变方向，不计分' }
};
PB.FAMILIES = [
  ['fixed', '固定弹射'], ['vari', '变速回弹'], ['spawn', '生成新球'], ['score', '碰撞得分'], ['link', '联动储球']
];

/* 关卡（我重新设计）：奇数排 10 格、偶数排 9 格；“.” 空位，“,” 导流钉 */
const CODE = {
  K: 'kicker', M: 'mushroom', P: 'power', Q: 'cannon', B: 'bumper', T: 'tramp', Y: 'sling',
  G: 'gift', N: 'nest', X: 'split', S: 'salute',
  $: 'coin', L: 'letter', O: 'target', J: 'pot', H: 'arch', U: 'cup', E: 'echo', C: 'clock', D: 'solo', R: 'hole',
  Z: 'link', W: 'whale', I: 'portalIn', o: 'portalOut', b: 'button', g: 'gate', ',': 'peg'
};
PB.CODE = CODE;
PB.LEVELS = {
  A: {
    name: '欢乐彩球场', tag: '推荐首发 · 固定弹射与变速回弹入门',
    rows: [
      '$ N $ B . . B $ G $',
      'L , $ T X T $ , L',
      'K $ B E , , O B $ K',
      '$ M , Z P W , M H',
      'K , $ B L , C B , K',
      ', J M . Q . M S ,'
    ]
  },
  B: {
    name: '多球游乐场', tag: '七个生球点 · 连环洞与回声铃',
    rows: [
      '$ G $ N . . N $ G $',
      'B , R Y X Y R , B',
      'K $ S E , , E S $ K',
      'T M , Z W Z , M T',
      'K , B R $ , R B , K',
      ', B P . T . P B ,'
    ]
  },
  C: {
    name: '巧射挑战场', tag: '双转向炮 · 开门、中心靶与落点',
    rows: [
      '$ H $ b . . N $ o $',
      'Y , O , g , O , Y',
      'K $ B C , , C B $ K',
      '$ X O , P , O G $',
      'K , B M D I M B , K',
      'U , Q $ T . Q , U'
    ]
  }
};

/* ---------- 工具 ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
PB.mulberry32 = mulberry32;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
PB.clamp = clamp;

/* 解析关卡行 → 道具清单 */
PB.parseLevel = function (lv) {
  const list = [];
  lv.rows.forEach((row, ri) => {
    const r = ri + 1, toks = row.trim().split(/\s+/), need = r % 2 ? 10 : 9;
    if (toks.length !== need) throw new Error(`关卡第 ${r} 排应为 ${need} 格，实际 ${toks.length}`);
    toks.forEach((tk, ci) => {
      if (tk === '.') return;
      const type = CODE[tk];
      if (!type) throw new Error('未知道具代码 ' + tk);
      list.push({ type, cell: `R${r}C${ci + 1}` });
    });
  });
  return list;
};

/* 碰撞：返回 {pen,nx,ny,px,py,t} 或 null（距离超过 2 单位视为离开） */
function hitCircle(cx, cy, r, b) {
  let dx = b.x - cx, dy = b.y - cy;
  let d = Math.hypot(dx, dy);
  const pen = r + b.r - d;
  if (pen < -2) return null;
  if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
  const nx = dx / d, ny = dy / d;
  return { pen, nx, ny, px: cx + nx * r, py: cy + ny * r, t: 0 };
}
function hitSeg(ax, ay, bx, by, r, b) {
  const ex = bx - ax, ey = by - ay;
  const L2 = ex * ex + ey * ey;
  const t = L2 > 0 ? clamp(((b.x - ax) * ex + (b.y - ay) * ey) / L2, 0, 1) : 0;
  const h = hitCircle(ax + ex * t, ay + ey * t, r, b);
  if (h) h.t = t;
  return h;
}
function hitBox(x, y, hw, hh, rr, b) {
  const ix = hw - rr, iy = hh - rr;
  const lx = b.x - x, ly = b.y - y;
  const qx = clamp(lx, -ix, ix), qy = clamp(ly, -iy, iy);
  const dx = lx - qx, dy = ly - qy;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) {
    const ox = ix - Math.abs(lx), oy = iy - Math.abs(ly);
    if (ox < oy) { const s = lx >= 0 ? 1 : -1; return { pen: ox + rr + b.r, nx: s, ny: 0, px: x + s * hw, py: b.y, t: 0 }; }
    const s = ly >= 0 ? 1 : -1; return { pen: oy + rr + b.r, nx: 0, ny: s, px: b.x, py: y + s * hh, t: 0 };
  }
  const pen = rr + b.r - d;
  if (pen < -2) return null;
  const nx = dx / d, ny = dy / d;
  return { pen, nx, ny, px: x + qx + nx * rr, py: y + qy + ny * rr, t: 0 };
}
function hitShape(s, b) {
  if (s.k === 'c') return hitCircle(s.x, s.y, s.r, b);
  if (s.k === 's') return hitSeg(s.ax, s.ay, s.bx, s.by, s.r, b);
  return hitBox(s.x, s.y, s.hw, s.hh, s.rr, b);
}
PB.hitShape = hitShape;

/* 碰撞体（相对道具中心）。常规道具碰撞直径约 44，球直径 36 ≈ 82% */
function shapesFor(type, it) {
  const C = (r, ox = 0, oy = 0, part) => ({ k: 'c', r, ox, oy, part });
  const B = (hw, hh, rr, ox = 0, oy = 0, part) => ({ k: 'b', hw, hh, rr, ox, oy, part });
  const S = (ax, ay, bx, by, r, part) => ({ k: 's', ax, ay, bx, by, r, part });
  switch (type) {
    case 'kicker': {
      const d = it.dir, wall = it.c === 1 || it.c === 10;
      return wall ? [S(-58 * d, -26, 30 * d, 14, 8, 'board')] : [S(-38 * d, -17, 38 * d, 17, 8, 'board')];
    }
    case 'mushroom': return [B(28, 12, 11, 0, -8, 'cap'), B(10, 12, 4, 0, 12, 'stem')];
    case 'power': case 'bumper': return [C(24)];
    case 'cannon': return [C(24)];
    case 'tramp': return [C(7, -32, -10, 'post'), C(7, 32, -10, 'post'), S(-28, 4, 28, 4, 4, 'rope')];
    case 'sling': { const d = it.dir; return [S(-34 * d, -14, 34 * d, 14, 8, 'bar')]; }
    case 'gift': return [B(24, 20, 6)];
    case 'nest': return [B(28, 14, 13, 0, 6)];
    case 'split': return [C(22)];
    case 'salute': return [B(28, 20, 6)];
    case 'coin': case 'hole': case 'echo': case 'clock': case 'solo': case 'link': return [C(22)];
    case 'letter': return [B(22, 22, 7)];
    case 'target': return [B(38, 11, 6)];
    case 'pot': return [C(24)];
    case 'arch': return [S(-36, -22, -36, 22, 5, 'post'), S(36, -22, 36, 22, 5, 'post')];
    case 'cup': return [S(-34, -24, -27, 22, 5, 'wall'), S(34, -24, 27, 22, 5, 'wall'), S(-27, 22, 27, 22, 5, 'wall')];
    case 'whale': return [B(34, 22, 16)];
    case 'portalIn': case 'portalOut': return [S(-36, -22, -36, 24, 6, 'post'), S(36, -22, 36, 24, 6, 'post')];
    case 'button': return [C(18)];
    case 'gate': return [B(58, 8, 4, 0, 0, 'gate')];
    case 'peg': return [C(8)];
  }
  return [];
}
function place(s, it) {
  s.item = it;
  if (s.k === 's') { s.ax += it.x; s.ay += it.y; s.bx += it.x; s.by += it.y; }
  else { s.x = it.x + s.ox; s.y = it.y + s.oy; }
  return s;
}

const CANNON_DIRS = [-45 * DEG, 0, 45 * DEG];
PB.CANNON_DIRS = CANNON_DIRS;
const SPAWNERS = { gift: 1, nest: 1, split: 1, salute: 1 };

/* ---------- 游戏 ---------- */
class Game {
  constructor(cfg, mapId, seed) {
    this.cfg = cfg;
    this.mapId = mapId;
    this.level = PB.LEVELS[mapId];
    this.target = cfg.targets[mapId];
    this.rng = mulberry32((seed >>> 0) || 7);
    this.t = 0; this.shotT = 0;
    this.score = 0; this.passed = false;
    this.shotsTotal = cfg.shots; this.shotsLeft = cfg.shots; this.shotNo = 0;
    this.phase = 'aim';
    this.balls = []; this.pending = []; this.timers = []; this.events = [];
    this.budget = cfg.newBallCap; this.ballSeq = 0;
    this.aim = 0;
    this.recent = []; this.lastShakeT = -9;
    this.letters = {}; this.letterSet = false;
    this.shotScoreStart = 0; this.settleT = 0; this.timedOut = false;
    this.lastSpawnT = -9;
    this.build();
    this.resetShot();
  }

  build() {
    const cfg = this.cfg;
    this.items = []; this.byCell = {}; this.pegs = [];
    let id = 0, letterIdx = 0, holeIdx = 0;
    for (const { type, cell } of PB.parseLevel(this.level)) {
      const p = PB.cellXY(cell);
      const it = { id: 'i' + (id++), type, cell, x: p.x, y: p.y, r: p.r, c: p.c, hitT: -9, fam: (PB.ITEMS[type] || {}).fam };
      if (type === 'kicker' || type === 'sling') it.dir = it.x < 640 ? 1 : -1;
      if (type === 'cannon') it.dirIdx = 1;
      if (type === 'pot') { it.hits = 0; it.broken = false; }
      if (type === 'letter') { it.letter = 'ABC'[letterIdx++] || 'A'; this.letters[it.letter] = false; }
      if (type === 'hole') it.n = ++holeIdx;
      if (type === 'portalIn' || type === 'portalOut' || type === 'button' || type === 'gate') it.pair = 1;
      it.shapes = shapesFor(type, it).map(s => place(s, it));
      it.e = type === 'peg' ? cfg.physics.pegRestitution : cfg.physics.restitution;
      if (type === 'peg') this.pegs.push(it); else this.items.push(it);
      this.byCell[cell] = it;
    }
    const coins = this.items.filter(o => o.type === 'coin');
    for (const it of this.items) {
      if (it.type === 'link') it.linkItems = coins.slice().sort((a, b) => Math.hypot(a.x - it.x, a.y - it.y) - Math.hypot(b.x - it.x, b.y - it.y)).slice(0, 3);
      if (it.type === 'button') it.gate = this.items.find(o => o.type === 'gate' && o.pair === it.pair);
      if (it.type === 'portalIn') it.exit = this.items.find(o => o.type === 'portalOut' && o.pair === it.pair);
    }
    this.spawners = this.items.filter(it => SPAWNERS[it.type]);
    // 墙
    const fl = cfg.flippers;
    const wallBottom = 576;
    const wallItem = (wid, ax, ay, bx, by) => {
      const it = { id: wid, type: 'wall', x: (ax + bx) / 2, y: (ay + by) / 2, e: cfg.physics.restitution, hitT: -9 };
      it.shapes = [{ k: 's', ax, ay, bx, by, r: 2, item: it }];
      return it;
    };
    this.walls = [
      wallItem('wL', 0, BOARD.ceil, 0, wallBottom),
      wallItem('wR', BOARD.w, BOARD.ceil, BOARD.w, wallBottom),
      wallItem('wT', 0, BOARD.ceil, BOARD.w, BOARD.ceil)
    ];
    this.flippers = [];
    if (fl) {
      // 自动拨杆：长度 187（原 140，加长约 1/3）；上摆角度收小，避免扫到第 6 排道具
      this.walls.push(wallItem('wIL', 0, 576, 82, 625));
      this.walls.push(wallItem('wIR', BOARD.w, 576, BOARD.w - 82, 625));
      const mk = (fid, s, px) => ({ id: fid, type: 'flipper', s, px, py: 632, len: 187, r0: 13, r1: 8, rest: 0.36, up: -0.33, a: 0.36, pa: 0.36, down: false, cdUntil: 0, releaseAt: 0, fireT: -9, hitT: -9 });
      this.flippers.push(mk('fL', 1, 90), mk('fR', -1, BOARD.w - 90));
    }
    this.sensorItems = this.items.filter(it => it.type === 'arch' || it.type === 'cup' || it.type === 'portalIn');
    this.rebuildSolids();
  }

  rebuildSolids() {
    const list = [];
    for (const it of this.items) {
      if (it.type === 'pot' && it.broken) continue;
      if (it.type === 'gate' && it.open) continue;
      for (const s of it.shapes) list.push(s);
    }
    for (const it of this.pegs) list.push(it.shapes[0]);
    for (const it of this.walls) list.push(it.shapes[0]);
    this.solids = list;
  }

  /* 每发开始重置的状态 */
  resetShot() {
    for (const it of this.items) {
      it.cdUntil = 0; it.lastT = -9; it.busy = false; it.off = false;
      switch (it.type) {
        case 'echo': case 'link': it.triggers = 0; break;
        case 'target': it.centerLeft = 2; break;
        case 'clock': it.claimed = false; break;
        case 'solo': it.count = 0; break;
        case 'whale': it.stored = []; it.closed = false; break;
        case 'button': it.opens = 0; break;
        case 'gate': it.open = false; it.openUntil = 0; break;
        case 'portalIn': case 'cannon': it.charges = 2; break;
        case 'salute': it.fireT = -9; break;
      }
    }
    for (const f of this.flippers) { f.cdUntil = 0; f.down = false; }
    this.budget = this.cfg.newBallCap;
    this.rebuildSolids();
  }

  emit(e) { this.events.push(e); }
  sfx(name, x, y, v) { this.events.push({ type: 'sfx', name, x, y, v }); }
  shake(a) { this.events.push({ type: 'shake', a }); }

  add(p, x, y, kind) {
    if (!(p > 0)) return;
    this.score += p;
    this.emit({ type: 'score', p, x, y, kind });
    const r = this.recent; r.push(this.t);
    while (r.length && r[0] < this.t - 0.5) r.shift();
    if (r.length >= 3 && this.t - this.lastShakeT >= 0.1) { this.lastShakeT = this.t; this.shake(0.14 + 0.03 * Math.min(8, r.length - 3)); }
    if (p >= 150) this.shake(0.3);
    if (!this.passed && this.score >= this.target) { this.passed = true; this.emit({ type: 'passed' }); this.shake(0.5); }
  }

  clockValue() {
    const s = this.cfg.scores;
    return Math.min(s.clockMax, Math.floor(s.clockRate * this.shotT));
  }

  liveCount() { return this.balls.length; }
  entityCount() { return this.balls.length + this.pending.length; }

  addBall(x, y, vx, vy, spawned) {
    const b = {
      id: ++this.ballSeq, x, y, px: x, py: y, vx, vy, r: BOARD.ballR, state: 'live', spawned: !!spawned,
      touch: new Set(), lastHit: new Map(), chain: null, arch: new Set(), noPortalUntil: 0,
      slowT: 0, boostT: 0, born: this.t, trail: []
    };
    this.balls.push(b);
    return b;
  }

  safePos(x, y) {
    const R = BOARD.ballR;
    const probe = { x, y, r: R };
    const offs = [[0, 0], [0, -14], [14, -10], [-14, -10], [0, -28], [24, 0], [-24, 0]];
    outer:
    for (const [ox, oy] of offs) {
      probe.x = x + ox; probe.y = y + oy;
      if (probe.x < R + 2 || probe.x > BOARD.w - R - 2 || probe.y < BOARD.ceil + R + 2 || probe.y > 600) continue;
      for (const s of this.solids) {
        if (s.item.off) continue;
        const h = hitShape(s, probe); if (h && h.pen > 0) continue outer;
      }
      return { x: probe.x, y: probe.y };
    }
    return null;
  }

  /* 生球：受“每发新增上限”和“同时在场上限”约束，返回实际生成/预约数量（0 = 未触发） */
  spawn(item, specs) {
    const free = Math.min(this.budget, this.cfg.maxEntities - this.entityCount());
    if (free <= 0) {
      this.emit({ type: 'note', text: this.budget <= 0 ? '本发新增球已用完' : '场上球数已满', x: item.x, y: item.y - 48 });
      this.sfx('full', item.x, item.y); return 0;
    }
    let n = 0;
    for (const s of specs) {
      if (n >= free) break;
      const x = s.abs ? s.x : item.x + s.x, y = s.abs ? s.y : item.y + s.y;
      if (s.delay) {
        this.pending.push({ at: this.t + s.delay, x, y, vx: s.vx, vy: s.vy, item });
        this.budget--; n++;
      } else {
        const p = this.safePos(x, y);
        if (!p) continue;
        this.addBall(p.x, p.y, s.vx, s.vy, true);
        this.budget--; n++;
      }
    }
    if (n > 0) { this.lastSpawnT = this.t; this.emit({ type: 'spawn', item, n, left: this.budget }); this.shake(0.3); }
    return n;
  }

  /* 生球道具冷却：变暗，不产生碰撞 */
  cooldown(it, dur) { it.off = true; it.cdUntil = this.t + dur; it.cdDur = dur; }

  after(delay, kind, fn) { this.timers.push({ at: this.t + delay, kind, fn }); }

  capture(b, item) { b.state = 'held'; b.heldBy = item; b.vx = 0; b.vy = 0; b.touch.clear(); b.trail.length = 0; }
  releaseBall(b, x, y, vx, vy) {
    b.state = 'live'; b.heldBy = null; b.x = b.px = x; b.y = b.py = y; b.vx = vx; b.vy = vy;
    b.touch.clear(); b.slowT = 0; b.trail.length = 0;
  }

  /* ---------- 发射 ---------- */
  setAim(a) { this.aim = clamp(a, -AIM_MAX, AIM_MAX); }
  launchVector(power) {
    const th = this.aim, sp = 500 + 350 * clamp(power, 0, 1);
    const dx = Math.sin(th), dy = Math.cos(th);
    return { x: BOARD.pivot.x + dx * BOARD.muzzle, y: BOARD.pivot.y + dy * BOARD.muzzle, vx: dx * sp, vy: dy * sp };
  }
  fire(power) {
    if (this.phase !== 'aim' || this.shotsLeft <= 0) return false;
    const L = this.launchVector(power);
    this.shotT = 0; this.shotNo++; this.shotsLeft--;
    this.shotScoreStart = this.score; this.timedOut = false;
    this.budget = this.cfg.newBallCap;
    this.addBall(L.x, L.y, L.vx, L.vy, false);
    this.phase = 'play';
    this.emit({ type: 'launch', power });
    this.sfx('launch', L.x, L.y, power);
    return true;
  }
  cycleCannon(item) {
    if (this.phase !== 'aim' || item.type !== 'cannon') return;
    item.dirIdx = (item.dirIdx + 1) % 3;
    this.sfx('button', item.x, item.y);
  }

  /* 短程预瞄：沿同一重力与碰撞体推算到首次真实接触 */
  preview(power) {
    const L = this.launchVector(power);
    const g = this.cfg.physics.gravity;
    const probe = { x: L.x, y: L.y, r: BOARD.ballR };
    let vx = L.vx, vy = L.vy;
    const pts = [];
    const dt = 1 / 240;
    for (let i = 0; i < 480; i++) {
      vy += g * dt; probe.x += vx * dt; probe.y += vy * dt;
      if (i % 6 === 0) pts.push(probe.x, probe.y);
      for (const s of this.solids) {
        if (s.item.off) continue;
        const h = hitShape(s, probe);
        if (h && h.pen > 0) return { pts, hit: { x: probe.x, y: probe.y, item: s.item } };
      }
      if (probe.y > BOARD.drain) break;
    }
    return { pts, hit: null };
  }

  /* ---------- 自动拨杆 ---------- */
  flipperDir(f, a) { return { x: f.s * Math.cos(a), y: Math.sin(a) }; }
  flipperWants(f) {
    const d = this.flipperDir(f, f.rest);
    const nTop = d.x > 0 ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
    for (const b of this.balls) {
      if (b.state !== 'live' || b.vy < -150) continue;
      const rx = b.x - f.px, ry = b.y - f.py;
      const along = (rx * d.x + ry * d.y) / f.len;
      if (along < 0.04 || along > 1.02) continue;
      const perp = rx * nTop.x + ry * nTop.y;
      if (perp < -2 || perp > b.r + f.r0 + 12) continue;
      return true;
    }
    return false;
  }

  /* ---------- 主步进（固定步长） ---------- */
  step(dt) {
    this.t += dt;
    for (const f of this.flippers) {
      if (f.down && this.t >= f.releaseAt) f.down = false;
      if (!f.down && this.t >= f.cdUntil && this.phase === 'play' && this.flipperWants(f)) {
        f.down = true; f.fireT = this.t; f.releaseAt = this.t + 0.16; f.cdUntil = this.t + this.cfg.flipperCooldown;
        this.sfx('flipAuto', f.px, f.py); this.shake(0.12);
      }
      f.pa = f.a;
      const target = f.down ? f.up : f.rest;
      const sp = f.down ? 20 : 12;
      if (f.a > target) f.a = Math.max(target, f.a - sp * dt);
      else f.a = Math.min(target, f.a + sp * dt);
    }
    if (this.phase === 'play') {
      this.shotT = Math.min(this.shotT + dt, this.cfg.shotTime);
      if (this.shotT >= this.cfg.shotTime) this.timeout();
    }
    if (this.timers.length) {
      const due = this.timers.filter(k => k.at <= this.t);
      if (due.length) {
        this.timers = this.timers.filter(k => k.at > this.t);
        for (const k of due) k.fn();
      }
    }
    if (this.pending.length) {
      const due = this.pending.filter(p => p.at <= this.t);
      if (due.length) {
        this.pending = this.pending.filter(p => p.at > this.t);
        for (const p of due) {
          const pos = this.safePos(p.x, p.y);
          if (pos) { this.addBall(pos.x, pos.y, p.vx, p.vy, true); this.sfx('saluteShot', pos.x, pos.y); this.shake(0.2); }
          else this.budget++;
        }
      }
    }
    for (const b of this.balls) if (b.state === 'live') this.stepBall(b, dt);
    if (this.balls.some(b => b.dead)) this.balls = this.balls.filter(b => !b.dead);
    // 冷却结束：没有球压在上面才恢复碰撞
    for (const it of this.spawners) {
      if (!it.off || this.t < it.cdUntil) continue;
      let blocked = false;
      for (const b of this.balls) {
        if (b.state !== 'live') continue;
        for (const s of it.shapes) { const h = hitShape(s, b); if (h && h.pen > -3) blocked = true; }
      }
      if (!blocked) { it.off = false; it.readyT = this.t; this.sfx('ready', it.x, it.y); }
    }
    for (const it of this.items) {
      if (it.type === 'gate' && it.open && this.t >= it.openUntil) {
        let blocked = false;
        for (const b of this.balls) {
          if (b.state !== 'live') continue;
          for (const s of it.shapes) { const h = hitShape(s, b); if (h && h.pen > -1) blocked = true; }
        }
        if (!blocked) { it.open = false; this.rebuildSolids(); this.sfx('gateClose', it.x, it.y); }
      }
    }
    if (this.phase === 'play' && this.balls.length === 0 && this.pending.length === 0 && !this.timers.some(k => k.kind !== 'score')) {
      this.phase = 'settle'; this.settleT = 0;
    }
    if (this.phase === 'settle') {
      this.settleT += dt;
      if (!this.timers.length || this.settleT >= 0.5) { this.timers.length = 0; this.finishShot(); }
    }
  }

  timeout() {
    if (this.phase !== 'play') return;
    this.timedOut = true;
    this.emit({ type: 'timeout' });
    for (const b of this.balls) this.emit({ type: 'vanish', x: b.x, y: b.y });
    this.balls = []; this.pending = [];
    this.timers = this.timers.filter(k => k.kind === 'score');
    for (const it of this.items) { if (it.type === 'whale') it.stored = []; if (it.type === 'cannon') it.busy = false; }
    this.phase = 'settle'; this.settleT = 0;
  }

  finishShot() {
    for (const it of this.items) {
      if (it.type === 'solo' && it.count === 1) { this.add(this.cfg.scores.solo, it.x, it.y, 'solo'); this.sfx('solo', it.x, it.y); it.hitT = this.t; }
    }
    const shotScore = this.score - this.shotScoreStart;
    this.emit({ type: 'shotEnd', shotNo: this.shotNo, shotScore, timedOut: this.timedOut });
    if (this.shotsLeft > 0) {
      this.phase = 'aim'; this.shotT = 0;
      this.resetShot();
      this.emit({ type: 'nextShot', shotNo: this.shotNo + 1 });
    } else {
      this.phase = 'over';
      this.emit({ type: 'over', score: this.score, passed: this.passed });
    }
  }

  stepBall(b, dt) {
    const P = this.cfg.physics;
    b.px = b.x; b.py = b.y;
    b.vy += P.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const near = new Set();
    const hits = [];
    for (const s of this.solids) {
      if (s.item.off) continue;
      const h = hitShape(s, b);
      if (!h) continue;
      near.add(s.item.id);
      if (h.pen > 0) {
        const vx0 = b.vx, vy0 = b.vy;
        b.x += h.nx * h.pen; b.y += h.ny * h.pen;
        const vn = b.vx * h.nx + b.vy * h.ny;
        if (vn < 0) {
          const e = s.item.e;
          b.vx -= (1 + e) * vn * h.nx; b.vy -= (1 + e) * vn * h.ny;
          const tx = -h.ny, ty = h.nx, vt = b.vx * tx + b.vy * ty;
          b.vx -= vt * 0.015 * tx; b.vy -= vt * 0.015 * ty;
        }
        h.item = s.item; h.part = s.part; h.vx0 = vx0; h.vy0 = vy0;
        hits.push(h);
      }
    }
    for (const f of this.flippers) {
      const h = this.hitFlipper(f, b, dt);
      if (!h) continue;
      near.add(f.id);
      if (h.pen > 0) hits.push(h);
    }
    for (const h of hits) {
      if (b.state !== 'live') break;
      const id = h.item.id;
      if (b.touch.has(id)) continue;
      b.touch.add(id);
      const last = b.lastHit.has(id) ? b.lastHit.get(id) : -9;
      if (this.t - last < 0.2) continue;
      b.lastHit.set(id, this.t);
      this.onHit(h.item, b, h);
    }
    if (b.state !== 'live' || b.dead) return;
    for (const id of b.touch) if (!near.has(id)) b.touch.delete(id);
    this.sensors(b);
    if (b.dead || b.state !== 'live') return;
    if (b.boostT > 0) b.boostT -= dt;
    const cap = b.boostT > 0 ? Math.max(P.maxSpeed, P.flipperSpeed) : P.maxSpeed;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
    if (sp < 14) { b.slowT += dt; if (b.slowT > 1.2) { b.slowT = 0; b.vx += (this.rng() < 0.5 ? -1 : 1) * 110; b.vy -= 160; } }
    else b.slowT = 0;
    if (b.y - b.r > BOARD.drain || b.x < -80 || b.x > BOARD.w + 80) { b.dead = true; this.emit({ type: 'drain', x: b.x, y: b.y }); }
  }

  hitFlipper(f, b, dt) {
    const d = this.flipperDir(f, f.a);
    const L = f.len;
    const t = clamp(((b.x - f.px) * d.x + (b.y - f.py) * d.y) / L, 0, 1);
    const cx = f.px + d.x * L * t, cy = f.py + d.y * L * t;
    const rr = f.r0 + (f.r1 - f.r0) * t;
    let dx = b.x - cx, dy = b.y - cy;
    let dist = Math.hypot(dx, dy);
    const pen = rr + b.r - dist;
    if (pen < -2) return null;
    if (dist < 1e-6) { dx = 0; dy = -1; dist = 1; }
    const nx = dx / dist, ny = dy / dist;
    const h = { pen, nx, ny, px: cx + nx * rr, py: cy + ny * rr, item: f, part: 'flipper', vx0: b.vx, vy0: b.vy };
    if (pen > 0) {
      const dp = this.flipperDir(f, f.pa);
      const vsx = (cx - (f.px + dp.x * L * t)) / dt, vsy = (cy - (f.py + dp.y * L * t)) / dt;
      b.x += nx * pen; b.y += ny * pen;
      const rvx = b.vx - vsx, rvy = b.vy - vsy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) { b.vx -= 1.3 * vn * nx; b.vy -= 1.3 * vn * ny; }
      if (Math.hypot(vsx, vsy) > 60) b.boostT = 0.45;
    }
    return h;
  }

  /* 固定弹射防循环：同一颗球 1 秒内不会被同一个固定弹射道具再次大力弹出（只做普通反弹） */
  fixedReady(it, b) {
    const k = 'fx' + it.id;
    if (b[k] && this.t - b[k] < 1.0) return false;
    b[k] = this.t; return true;
  }

  /* 变速回弹：法向出射速度 = max(最小值, 倍率 × 法向来速)。
     同一颗球 0.8 秒内再次撞同一个变速道具时只做普通反弹，避免两件道具之间无限加速循环；
     出射方向带 ±8° 随机偏转，打破竖直对齐的来回弹。 */
  variBounce(b, h, it) {
    const F = this.cfg.force, cap = this.cfg.physics.maxSpeed;
    const vin = Math.max(0, -(h.vx0 * h.nx + h.vy0 * h.ny));
    const k = 'vx' + it.id;
    const fresh = !(b[k] && this.t - b[k] < 0.8);
    b[k] = this.t;
    if (!fresh) return { vin, out: Math.hypot(b.vx, b.vy), plain: true };
    const out = Math.min(cap, Math.max(F.varMin, F.varGain * vin));
    const j = (this.rng() - 0.5) * 0.28;
    const nx = h.nx * Math.cos(j) - h.ny * Math.sin(j), ny = h.nx * Math.sin(j) + h.ny * Math.cos(j);
    const tx = -ny, ty = nx, vt = (h.vx0 * tx + h.vy0 * ty) * 0.9;
    b.vx = nx * out + tx * vt; b.vy = ny * out + ty * vt;
    return { vin, out, plain: false };
  }

  /* ---------- 有效碰撞 ---------- */
  onHit(it, b, h) {
    const S = this.cfg.scores, F = this.cfg.force, t = this.t;
    if (it.type !== 'hole' && it.type !== 'peg') b.chain = null;
    it.hitT = t;
    const spd = Math.hypot(h.vx0, h.vy0);
    switch (it.type) {
      case 'wall': if (spd > 120) this.sfx('wall', h.px, h.py, spd); break;
      case 'peg': this.sfx('peg', it.x, it.y, spd); break;
      case 'flipper': this.sfx('flipHit', h.px, h.py, spd); break;

      /* —— 固定弹射：出射速度固定为较大值 —— */
      case 'kicker': {
        this.add(S.bounce, it.x, it.y, 'fixed');
        const fx = it.dir * 0.41, fy = -0.91;
        if (h.nx * fx + h.ny * fy > 0.3 && t >= it.cdUntil && this.fixedReady(it, b)) {
          it.cdUntil = t + 0.25; it.fireT = t;
          b.vx = it.dir * 0.45 * F.fixed; b.vy = -0.89 * F.fixed;
          this.sfx('kick', it.x, it.y); this.shake(0.26);
          this.emit({ type: 'force', fam: 'fixed', x: h.px, y: h.py, nx: it.dir * 0.45, ny: -0.89, s: 1 });
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'mushroom': {
        this.add(S.bounce, it.x, it.y, 'fixed');
        if (h.part === 'cap' && h.ny < -0.2 && t >= it.cdUntil && this.fixedReady(it, b)) {
          it.cdUntil = t + 0.3; it.fireT = t;
          b.vy = -0.95 * F.fixed; b.vx = b.vx * 0.3 + h.nx * 140;
          this.sfx('mush', it.x, it.y); this.shake(0.26);
          this.emit({ type: 'force', fam: 'fixed', x: it.x, y: it.y - 20, nx: 0, ny: -1, s: 1 });
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'power': {
        this.add(S.bounce, it.x, it.y, 'fixed');
        if (t >= it.cdUntil && this.fixedReady(it, b)) {
          it.cdUntil = t + 0.2; it.fireT = t;
          b.vx = h.nx * 0.9 * F.fixed; b.vy = h.ny * 0.9 * F.fixed;
          this.sfx('power', it.x, it.y); this.shake(0.32);
          this.emit({ type: 'force', fam: 'fixed', x: h.px, y: h.py, nx: h.nx, ny: h.ny, s: 1 });
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'cannon': {
        if (!it.busy && t >= it.cdUntil && it.charges > 0) {
          it.busy = true; it.charges--;
          this.capture(b, it); b.x = it.x; b.y = it.y;
          this.add(S.cannon, it.x, it.y, 'fixed');
          this.sfx('cannonIn', it.x, it.y);
          this.after(0.35, 'release', () => {
            it.busy = false; it.cdUntil = this.t + 1.0;
            if (b.dead || b.state !== 'held') return;
            const a = CANNON_DIRS[it.dirIdx];
            const dx = Math.sin(a), dy = -Math.cos(a);
            this.releaseBall(b, it.x + dx * 46, it.y + dy * 46, dx * F.fixed * 1.05, dy * F.fixed * 1.05);
            it.fireT = this.t;
            this.sfx('cannonFire', it.x, it.y); this.shake(0.4);
            this.emit({ type: 'force', fam: 'fixed', x: it.x + dx * 40, y: it.y + dy * 40, nx: dx, ny: dy, s: 1.2 });
          });
        } else this.sfx('thud', it.x, it.y);
        break;
      }

      /* —— 变速回弹：按来速放大，有最小值 —— */
      case 'bumper': {
        this.add(S.bounce, it.x, it.y, 'vari');
        const r = this.variBounce(b, h, it);
        const k = Math.min(1, r.out / this.cfg.physics.maxSpeed);
        it.fireT = t; it.lastOut = k;
        this.sfx(r.plain ? 'thud' : 'bump', it.x, it.y, k);
        if (k > 0.55) this.shake(0.1 + 0.2 * k);
        this.emit({ type: 'force', fam: 'vari', x: it.x, y: it.y, nx: h.nx, ny: h.ny, s: k });
        break;
      }
      case 'tramp': {
        this.add(S.bounce, it.x, it.y, 'vari');
        const kk = 'vx' + it.id, fresh = !(b[kk] && t - b[kk] < 0.8);
        if (h.part === 'rope' && h.ny < -0.3 && fresh) {
          b[kk] = t;
          const vin = Math.max(0, h.vy0);
          const out = Math.min(this.cfg.physics.maxSpeed, Math.max(F.varMin * 0.9, F.varGain * vin));
          b.vy = -out; b.vx = h.vx0 * 0.85 + (this.rng() - 0.5) * 120;
          const k = out / this.cfg.physics.maxSpeed;
          it.fireT = t; it.lastOut = k;
          this.sfx('tramp', it.x, it.y, k);
          if (k > 0.55) this.shake(0.1 + 0.2 * k);
          this.emit({ type: 'force', fam: 'vari', x: it.x, y: it.y, nx: 0, ny: -1, s: k });
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'sling': {
        this.add(S.bounce, it.x, it.y, 'vari');
        const r = this.variBounce(b, h, it);
        const k = Math.min(1, r.out / this.cfg.physics.maxSpeed);
        it.fireT = t; it.lastOut = k;
        this.sfx(r.plain ? 'thud' : 'sling', it.x, it.y, k);
        if (k > 0.55) this.shake(0.1 + 0.2 * k);
        this.emit({ type: 'force', fam: 'vari', x: h.px, y: h.py, nx: h.nx, ny: h.ny, s: k });
        break;
      }

      /* —— 生成新球：可重复触发，触发后冷却（变暗、无碰撞） —— */
      case 'gift': {
        const n = this.spawn(it, [{ x: -48, y: -32, vx: -220, vy: -360 }, { x: 48, y: -32, vx: 220, vy: -360 }]);
        if (n > 0) { this.cooldown(it, this.cfg.spawnCd.gift); this.sfx('gift', it.x, it.y); }
        else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'nest': {
        const n = this.spawn(it, [{ x: 0, y: -46, vx: (this.rng() - 0.5) * 200, vy: -400 }]);
        if (n > 0) { this.cooldown(it, this.cfg.spawnCd.nest); this.sfx('nest', it.x, it.y); }
        else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'split': {
        let mx = 2 * it.x - b.x, my = b.y, vx = -b.vx, vy = b.vy;
        if (Math.abs(mx - b.x) < b.r * 2) {
          const s = b.x >= it.x ? -1 : 1;
          mx = it.x + s * 46; my = it.y - 12; vx = s * Math.max(220, Math.abs(b.vx)); vy = Math.min(b.vy, -120);
          if (Math.abs(b.vx) < 150) b.vx = -s * 220;
        }
        const n = this.spawn(it, [{ abs: true, x: mx, y: my, vx, vy }]);
        if (n > 0) { this.cooldown(it, this.cfg.spawnCd.split); this.sfx('split', it.x, it.y); }
        else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'salute': {
        const n = this.spawn(it, [
          { x: -22, y: -46, vx: -170, vy: -500, delay: 0.001 },
          { x: 0, y: -50, vx: 0, vy: -540, delay: 0.2 },
          { x: 22, y: -46, vx: 170, vy: -500, delay: 0.4 }
        ]);
        if (n > 0) { it.fireT = t; this.cooldown(it, this.cfg.spawnCd.salute); this.sfx('salute', it.x, it.y, n); }
        else this.sfx('thud', it.x, it.y);
        break;
      }

      /* —— 得分 —— */
      case 'coin': this.add(S.coin, it.x, it.y, 'coin'); this.sfx('coin', it.x, it.y); break;
      case 'hole': {
        const c = b.chain;
        let step = 0;
        if (c && c.last !== it.id && t - c.t <= 1.2) step = Math.min(c.step + 1, 2);
        b.chain = { last: it.id, t, step };
        this.add([S.chain1, S.chain2, S.chain3][step], it.x, it.y, 'chain');
        this.sfx('chain', it.x, it.y, step);
        break;
      }
      case 'letter': {
        this.add(S.letter, it.x, it.y, 'letter');
        if (!this.letters[it.letter]) { this.letters[it.letter] = true; this.sfx('letter', it.x, it.y); }
        else this.sfx('letterAgain', it.x, it.y);
        if (!this.letterSet && Object.values(this.letters).every(Boolean)) {
          this.letterSet = true;
          this.add(S.letterSet, it.x, it.y - 30, 'set');
          this.emit({ type: 'banner', text: '三连灯牌集齐！+' + S.letterSet });
          this.sfx('set', it.x, it.y); this.shake(0.6);
        }
        break;
      }
      case 'target': {
        const cx = b.x - h.nx * b.r;
        if (Math.abs(h.ny) > 0.7 && Math.abs(cx - it.x) <= 12 && it.centerLeft > 0) {
          it.centerLeft--; this.add(S.targetCenter, it.x, it.y, 'center'); this.sfx('center', it.x, it.y);
        } else { this.add(S.targetEdge, it.x, it.y, 'edge'); this.sfx('edge', it.x, it.y); }
        break;
      }
      case 'clock': {
        if (!it.claimed) {
          const v = this.clockValue(); it.claimed = true; it.claimedV = v;
          if (v > 0) this.add(v, it.x, it.y, 'claim');
          this.sfx('claim', it.x, it.y, v);
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'pot': {
        if (!it.broken) {
          it.hits++;
          if (it.hits >= 3) {
            it.broken = true; this.rebuildSolids();
            this.add(S.pot, it.x, it.y, 'pot'); this.sfx('break', it.x, it.y); this.shake(0.55);
            this.emit({ type: 'burst', x: it.x, y: it.y, fam: 'score', n: 30 });
          } else this.sfx('crack', it.x, it.y, it.hits);
        }
        break;
      }
      case 'echo': {
        if (it.triggers < 2 && t - it.lastT >= 0.6) {
          it.triggers++; it.lastT = t;
          this.add(S.echo, it.x, it.y, 'echo'); this.sfx('echo', it.x, it.y, 0);
          this.after(0.5, 'score', () => { this.add(S.echo, it.x, it.y - 10, 'echo'); it.hitT = this.t; this.sfx('echo', it.x, it.y, 1); });
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'solo': {
        it.count++;
        this.sfx(it.count === 1 ? 'solo1' : (it.count === 2 ? 'gray' : 'thud'), it.x, it.y);
        break;
      }
      case 'whale': {
        if (!it.closed && it.stored.length < 2) {
          this.capture(b, it); b.x = it.x; b.y = it.y;
          it.stored.push(b);
          this.sfx('store', it.x, it.y);
          if (it.stored.length >= 2) this.whaleRelease(it);
          else this.after(0.8, 'release', () => this.whaleRelease(it));
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'button': {
        const g = it.gate;
        if (g && !g.open && it.opens < 2) {
          it.opens++; g.open = true; g.openUntil = t + 4; g.openT = t;
          this.rebuildSolids(); this.sfx('gateOpen', g.x, g.y);
        } else this.sfx('button', it.x, it.y);
        break;
      }
      case 'link': {
        if (it.triggers < 2 && t - it.lastT >= 1) {
          it.triggers++; it.lastT = t;
          this.sfx('link', it.x, it.y);
          it.linkItems.forEach((c, i) => this.after(0.15 * (i + 1), 'score', () => {
            c.hitT = this.t; c.linkFlash = this.t;
            this.add(S.coin, c.x, c.y, 'coin'); this.sfx('coin', c.x, c.y);
          }));
        } else this.sfx('thud', it.x, it.y);
        break;
      }
      case 'portalIn': case 'portalOut': case 'arch': case 'cup': case 'gate':
        this.sfx('thud', h.px, h.py); break;
      default: this.sfx('thud', h.px, h.py);
    }
  }

  whaleRelease(it) {
    if (it.closed) return;
    it.closed = true;
    const st = it.stored.filter(b => !b.dead && b.state === 'held');
    it.stored = [];
    st.forEach((b, i) => {
      const s = (st.length === 1) ? (this.rng() < 0.5 ? -1 : 1) : (i === 0 ? -1 : 1);
      this.releaseBall(b, it.x + s * 56, it.y - 34, s * 260, -420);
    });
    it.spoutT = this.t;
    if (st.length) { this.sfx('spout', it.x, it.y); this.shake(0.3); }
  }

  sensors(b) {
    const S = this.cfg.scores;
    for (const it of this.sensorItems) {
      if (it.type === 'arch') {
        if (b.py < it.y && b.y >= it.y && Math.abs(b.x - it.x) < 28 && !b.arch.has(it.id)) {
          b.arch.add(it.id); it.hitT = this.t;
          this.add(S.arch, it.x, it.y, 'arch'); this.sfx('arch', it.x, it.y);
        }
      } else if (it.type === 'cup') {
        if (Math.abs(b.x - it.x) < 24 && b.y > it.y - 4 && b.y < it.y + 22) {
          it.hitT = this.t;
          this.add(S.cup, it.x, it.y, 'cup'); this.sfx('cup', it.x, it.y);
          b.dead = true; this.emit({ type: 'vanish', x: b.x, y: b.y, cup: true });
          return;
        }
      } else if (it.type === 'portalIn') {
        if (it.charges > 0 && it.exit && Math.abs(b.x - it.x) < 22 && Math.abs(b.y - it.y) < 22 && this.t >= b.noPortalUntil) {
          it.charges--; it.hitT = this.t;
          this.capture(b, it); b.x = it.x; b.y = it.y;
          b.noPortalUntil = this.t + 0.25 + 0.5;
          this.sfx('teleport', it.x, it.y);
          const ex = it.exit;
          this.after(0.25, 'release', () => {
            if (b.dead || b.state !== 'held') return;
            this.releaseBall(b, ex.x, ex.y, 0, 160);
            ex.hitT = this.t;
            this.sfx('teleportOut', ex.x, ex.y);
          });
          return;
        }
      }
    }
  }
}

PB.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
