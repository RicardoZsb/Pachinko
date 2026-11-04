/* ===== 渲染：晴日游园会 · 明亮贴纸风 ===== */
(function (G) {
'use strict';
const PB = G.PB || (G.PB = {});
const BOARD = PB.BOARD;

const W = 1600, H = 900, OX = 160, OY = 190;
PB.STAGE = { W, H, OX, OY };

const COL = PB.COL = {
  sky1: '#4FBDEE', sky2: '#C8F0FF', sun: '#FFE066',
  hill1: '#A6E37E', hill2: '#74CF63', hill3: '#53B65A',
  frame: '#FFFFFF', board1: '#FFFFFF', board2: '#E7F2FF', grid: '#CFE2F5',
  launch: '#FFF5D1', awnR: '#FF5A5F', awnW: '#FFFFFF', apron: '#D3E6FA',
  ink: '#232647', inkSoft: 'rgba(35,38,71,0.5)',
  fixed: '#FF6B35', fixedD: '#D9471A', fixedL: '#FFC6AE',
  vari: '#12B5A6', variD: '#0B8B80', variL: '#A9EFE7',
  spawn: '#FF4FA3', spawnD: '#CC2A7B', spawnL: '#FFC4E0',
  score: '#FFC21F', scoreD: '#D99300', scoreL: '#FFE9A6',
  link: '#8C6CF5', linkD: '#6346D6', linkL: '#D6CAFF',
  white: '#FFFFFF', cream: '#FFF8EA', peg: '#FFFFFF'
};
const FAMC = PB.FAMC = { fixed: COL.fixed, vari: COL.vari, spawn: COL.spawn, score: COL.score, link: COL.link, peg: '#9AA7BF' };
const SHC = 'rgba(30,52,100,0.22)';
const FD = '"ZCOOL KuaiLe","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const FN = '"Baloo 2","ZCOOL KuaiLe","PingFang SC","Microsoft YaHei",sans-serif';
PB.FONTS = { FD, FN };

let SH = false;
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function F(c, col) { c.fillStyle = SH ? SHC : col; c.fill(); }
function E(c, w) { if (SH) return; c.lineWidth = w || 3; c.strokeStyle = COL.ink; c.lineJoin = 'round'; c.stroke(); }
function FE(c, col, w) { F(c, col); E(c, w); }
function T(c, s, x, y, size, col, font, align) {
  if (SH) return;
  c.font = `700 ${size}px ${font || FN}`; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  c.fillStyle = col; c.fillText(s, x, y);
}
function TO(c, s, x, y, size, col, out, font, align, ow) {
  c.font = `700 ${size}px ${font || FN}`; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = ow || 5; c.strokeStyle = out; c.strokeText(s, x, y);
  c.fillStyle = col; c.fillText(s, x, y);
}
/* 粗描边线段：先描墨色外框，再描本色 */
function capsule(c, x1, y1, x2, y2, w, col) {
  c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  if (SH) { c.lineWidth = w + 6; c.strokeStyle = SHC; c.stroke(); c.restore(); return; }
  c.lineWidth = w + 6; c.strokeStyle = COL.ink; c.stroke();
  c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.restore();
}
function pathStroke(c, w, col) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (SH) { c.lineWidth = w + 6; c.strokeStyle = SHC; c.stroke(); c.restore(); return; }
  c.lineWidth = w + 6; c.strokeStyle = COL.ink; c.stroke();
  c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.restore();
}
function dots(c, n, max, y, x0, col) {
  if (SH) return;
  for (let i = 0; i < max; i++) {
    circ(c, (x0 || 0) + (i - (max - 1) / 2) * 10, y, 3.6);
    c.fillStyle = i < n ? (col || COL.score) : '#DDE3EE'; c.fill();
    c.lineWidth = 1.6; c.strokeStyle = COL.ink; c.stroke();
  }
}
function arrow(c, x1, y1, x2, y2, col, w) {
  if (SH) return;
  const a = Math.atan2(y2 - y1, x2 - x1);
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.moveTo(x2 - Math.cos(a - 0.6) * 8, y2 - Math.sin(a - 0.6) * 8); c.lineTo(x2, y2);
    c.lineTo(x2 - Math.cos(a + 0.6) * 8, y2 - Math.sin(a + 0.6) * 8);
  };
  path(); c.strokeStyle = COL.ink; c.lineWidth = (w || 3) + 3; c.stroke();
  path(); c.strokeStyle = col; c.lineWidth = w || 3; c.stroke();
  c.restore();
}
function bolt(c, x, y, s, col) {
  if (SH) return;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(2, -10); c.lineTo(-6, 2); c.lineTo(0, 2); c.lineTo(-3, 11); c.lineTo(7, -3); c.lineTo(1, -3); c.closePath();
  c.fillStyle = col || COL.score; c.fill(); c.lineWidth = 2 / s; c.strokeStyle = COL.ink; c.stroke(); c.restore();
}
function badgeBolt(c, x, y) {
  if (SH) return;
  circ(c, x, y, 9); c.fillStyle = COL.ink; c.fill();
  bolt(c, x, y, 0.75, COL.score);
}
function rings(c, x, y) {
  if (SH) return;
  c.save(); c.strokeStyle = COL.white; c.lineWidth = 2.4;
  for (const r of [8, 13]) { c.beginPath(); c.arc(x, y, r, -0.9, 0.9); c.stroke(); }
  c.restore();
}
function star(c, x, y, r1, r2, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + i * Math.PI / n;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}
function steelBall(c, x, y, r) {
  circ(c, x + 3, y + 5, r); c.fillStyle = SHC; c.fill();
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.35, '#E3E9F1'); g.addColorStop(0.8, '#9AA8BC'); g.addColorStop(1, '#6E7E96');
  circ(c, x, y, r); c.fillStyle = g; c.fill();
  c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke();
  c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.17, -0.6, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill();
}

/* ---------- 道具绘制（局部坐标，g 为游戏状态） ---------- */
const DRAW = {
  /* —— 固定弹射（橙） —— */
  kicker(c, it) {
    const d = it.dir, wall = it.c === 1 || it.c === 10;
    const ax = wall ? -58 * d : -38 * d, ay = wall ? -26 : -17, bx = wall ? 30 * d : 38 * d, by = wall ? 14 : 17;
    if (!SH) {
      c.save(); c.strokeStyle = COL.ink; c.lineWidth = 2.5; c.lineJoin = 'round'; c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const t = 0.2 + i * 0.1, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        c.lineTo(x + (i % 2 ? 5 : -5), y + 14 + (i % 2 ? 4 : 0));
      }
      c.stroke(); c.restore();
    }
    capsule(c, ax, ay, bx, by, 16, COL.fixed);
    if (SH) return;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    arrow(c, mx + d * 4, my - 12, mx + d * (4 + 0.45 * 30), my - 12 - 0.89 * 30, COL.white, 4);
    badgeBolt(c, mx - d * 16, my - 6);
  },
  mushroom(c, it) {
    rr(c, -11, -2, 22, 27, 7); FE(c, COL.cream, 3);
    c.beginPath(); c.moveTo(-32, 3); c.bezierCurveTo(-32, -31, 32, -31, 32, 3); c.quadraticCurveTo(0, 9, -32, 3); c.closePath();
    FE(c, COL.fixed, 3);
    if (SH) return;
    circ(c, -14, -9, 5.5); F(c, COL.white); circ(c, 6, -16, 4.5); F(c, COL.white); circ(c, 19, -5, 4); F(c, COL.white);
    arrow(c, 0, 19, 0, 5, COL.fixed, 3);
    badgeBolt(c, 24, -20);
  },
  power(c, it, g) {
    const hot = g.t - (it.fireT || -9) < 0.15;
    star(c, 0, 0, 31, 24, 10); FE(c, hot ? COL.score : COL.fixed, 3);
    circ(c, 0, 0, 16); FE(c, COL.white, 2.5);
    if (SH) return;
    bolt(c, 0, 0, 1.15, COL.fixed);
  },
  cannon(c, it, g) {
    if (!SH && g.phase === 'aim') {
      c.save(); c.setLineDash([6, 6]); c.lineDashOffset = -(performance.now() / 50);
      circ(c, 0, 0, 48); c.strokeStyle = COL.ink; c.lineWidth = 2.5; c.stroke(); c.restore();
    }
    circ(c, 0, 4, 25); FE(c, COL.fixedD, 3);
    if (!SH) {
      PB.CANNON_DIRS.forEach((a, k) => {
        circ(c, Math.sin(a) * 36, -Math.cos(a) * 36, 4.5);
        c.fillStyle = k === it.dirIdx ? COL.score : '#FFFFFF'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = COL.ink; c.stroke();
      });
    }
    c.save(); c.rotate(PB.CANNON_DIRS[it.dirIdx]);
    const kick = g.t - (it.fireT || -9) < 0.15 ? 5 : 0;
    rr(c, -10, -42 + kick, 20, 38, 7); FE(c, COL.white, 3);
    if (!SH) { rr(c, -12, -46 + kick, 24, 9, 3); FE(c, COL.fixed, 2.5); }
    c.restore();
    circ(c, 0, 2, 10); FE(c, COL.fixed, 2.5);
    if (SH) return;
    circ(c, 0, 2, 4); F(c, it.busy ? COL.score : COL.ink);
    dots(c, it.charges, 2, 38, 0, COL.fixed);
  },

  /* —— 变速回弹（青） —— */
  bumper(c, it, g) {
    const k = Math.max(0, 1 - (g.t - (it.fireT || -9)) / 0.25);
    circ(c, 0, 0, 27); FE(c, k > 0 ? COL.variL : COL.vari, 3);
    if (SH) return;
    circ(c, 0, 0, 19); c.strokeStyle = COL.white; c.lineWidth = 3; c.stroke();
    circ(c, 0, 0, 11); c.strokeStyle = COL.white; c.lineWidth = 3; c.stroke();
    circ(c, 0, 0, 4.5); F(c, COL.ink);
  },
  tramp(c, it, g) {
    const sag = (g.t - it.hitT < 0.25) ? 12 * (1 - (g.t - it.hitT) / 0.25) : 0;
    c.beginPath(); c.moveTo(-30, 0); c.quadraticCurveTo(0, 12 + sag, 30, 0);
    pathStroke(c, 6, COL.vari);
    rr(c, -40, -22, 14, 32, 5); FE(c, COL.variD, 3);
    rr(c, 26, -22, 14, 32, 5); FE(c, COL.variD, 3);
    if (SH) return;
    c.save(); c.strokeStyle = COL.variD; c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-10 + i * 10 - 4, -16); c.quadraticCurveTo(-10 + i * 10, -22, -10 + i * 10 + 4, -16); c.stroke(); }
    c.restore();
  },
  sling(c, it, g) {
    const d = it.dir;
    const hot = g.t - (it.fireT || -9) < 0.2;
    capsule(c, -34 * d, -14, 34 * d, 14, 16, hot ? COL.variL : COL.vari);
    if (SH) return;
    c.save(); c.strokeStyle = COL.white; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = -1; i <= 1; i++) {
      const x = i * 20 * d, y = i * 8.2;
      c.beginPath(); c.moveTo(x - 4 * d, y - 4); c.lineTo(x + 2 * d, y + 1); c.lineTo(x - 4 * d, y + 6); c.stroke();
    }
    c.restore();
  },

  /* —— 生成新球（粉）：冷却期间变暗、可穿过 —— */
  gift(c, it) {
    rr(c, -24, -12, 48, 32, 5); FE(c, COL.spawn, 3);
    rr(c, -28, -22, 56, 12, 4); FE(c, COL.spawnD, 3);
    if (SH) return;
    c.fillStyle = COL.white; c.fillRect(-5, -21, 10, 40);
    c.strokeStyle = COL.ink; c.lineWidth = 1.5; c.strokeRect(-5, -21, 10, 40);
    steelBall(c, -12, -31, 7.5); steelBall(c, 12, -31, 7.5);
  },
  nest(c, it) {
    c.beginPath(); c.moveTo(-32, -2); c.quadraticCurveTo(-30, 24, 0, 24); c.quadraticCurveTo(30, 24, 32, -2); c.closePath();
    FE(c, COL.spawn, 3);
    if (SH) return;
    c.save(); c.beginPath(); c.moveTo(-32, -2); c.quadraticCurveTo(-30, 24, 0, 24); c.quadraticCurveTo(30, 24, 32, -2); c.closePath(); c.clip();
    c.strokeStyle = COL.spawnD; c.lineWidth = 2.2;
    for (let x = -44; x < 44; x += 9) { c.beginPath(); c.moveTo(x, -2); c.lineTo(x + 16, 26); c.moveTo(x + 16, -2); c.lineTo(x, 26); c.stroke(); }
    c.restore();
    steelBall(c, 0, -8, 9.5);
  },
  split(c, it) {
    c.beginPath(); c.moveTo(0, -30); c.lineTo(22, -4); c.lineTo(0, 28); c.lineTo(-22, -4); c.closePath();
    FE(c, COL.spawn, 3);
    if (SH) return;
    c.beginPath(); c.moveTo(0, -30); c.lineTo(8, -4); c.lineTo(0, 28); c.lineTo(-8, -4); c.closePath(); F(c, COL.spawnL);
    c.strokeStyle = COL.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-22, -4); c.lineTo(22, -4); c.stroke();
    arrow(c, -26, 16, -40, 28, COL.white, 3); arrow(c, 26, 16, 40, 28, COL.white, 3);
  },
  salute(c, it, g) {
    rr(c, -32, 12, 64, 11, 3); FE(c, COL.spawnD, 3);
    const dt = g.t - (it.fireT || -9);
    [-20, 0, 20].forEach((x, i) => {
      const h = i === 1 ? 40 : 34;
      rr(c, x - 8, 12 - h, 16, h, 4); FE(c, COL.spawn, 2.5);
      if (!SH) {
        c.fillStyle = COL.white; c.fillRect(x - 6.5, 12 - h + 12, 13, 4);
        const lit = dt >= i * 0.2 && dt < i * 0.2 + 0.3;
        circ(c, x, 12 - h + 1, 6); FE(c, lit ? COL.white : COL.score, 2);
      }
    });
  },

  /* —— 碰撞得分（金） —— */
  coin(c, it, g) {
    if (!SH && it.linkFlash && g.t - it.linkFlash < 0.4) {
      circ(c, 0, 0, 30 + (g.t - it.linkFlash) * 30); c.strokeStyle = `rgba(140,108,245,${1 - (g.t - it.linkFlash) / 0.4})`; c.lineWidth = 4; c.stroke();
    }
    circ(c, 0, 0, 23); FE(c, COL.score, 3);
    if (SH) return;
    circ(c, 0, 0, 16.5); c.strokeStyle = COL.scoreD; c.lineWidth = 3; c.stroke();
    T(c, String(g.cfg.scores.coin), 0, 2, 18, COL.ink);
  },
  hole(c, it) {
    circ(c, 0, 0, 24); FE(c, COL.score, 3);
    if (SH) return;
    circ(c, 0, 0, 15); F(c, COL.ink);
    T(c, String(it.n), 0, 1, 16, COL.scoreL);
  },
  letter(c, it, g) {
    const lit = g.letters[it.letter];
    if (!SH && lit) { circ(c, 0, 0, 36); c.fillStyle = 'rgba(255,194,31,0.28)'; c.fill(); }
    rr(c, -23, -23, 46, 46, 8); FE(c, lit ? COL.score : '#EADFC2', 3);
    if (SH) return;
    rr(c, -16, -16, 32, 32, 5); F(c, COL.white);
    T(c, it.letter, 0, 3, 26, lit ? COL.ink : '#C2AE7A');
    dots(c, Object.values(g.letters).filter(Boolean).length, 3, 33);
  },
  target(c, it) {
    rr(c, -38, -11, 76, 22, 6); FE(c, COL.scoreL, 3);
    if (SH) return;
    c.save(); rr(c, -38, -11, 76, 22, 6); c.clip();
    c.fillStyle = COL.fixed; c.fillRect(-12, -11, 24, 22);
    c.fillStyle = COL.score; c.fillRect(-38, -11, 8, 22); c.fillRect(30, -11, 8, 22);
    c.restore();
    rr(c, -38, -11, 76, 22, 6); E(c, 3);
    arrow(c, 0, -30, 0, -16, COL.white, 2.4); arrow(c, 0, 30, 0, 16, COL.white, 2.4);
    dots(c, it.centerLeft, 2, -20, 26, COL.fixed);
  },
  clock(c, it, g) {
    rr(c, -6, -32, 12, 7, 2); FE(c, COL.scoreD, 2);
    circ(c, 0, 0, 24); FE(c, it.claimed ? '#E8DCB8' : COL.score, 3);
    if (SH) return;
    circ(c, 0, 0, 18); F(c, COL.white);
    const a = g.phase === 'play' || g.phase === 'settle' ? g.shotT / 15 * Math.PI * 2 : 0;
    c.save(); c.rotate(a); c.strokeStyle = COL.ink; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -12); c.stroke(); c.restore();
    const v = it.claimed ? it.claimedV : (g.phase === 'aim' ? 0 : g.clockValue());
    const label = it.claimed ? '已领 ' + v : '+' + v;
    c.font = `800 13px ${FN}`; const w = c.measureText(label).width + 12;
    rr(c, -w / 2, 26, w, 18, 9); FE(c, it.claimed ? '#E8DCB8' : COL.white, 2);
    T(c, label, 0, 35.5, 13, COL.ink);
  },
  pot(c, it) {
    if (it.broken) {
      if (SH) return;
      c.save(); c.globalAlpha = 0.45; c.fillStyle = COL.score; c.strokeStyle = COL.ink; c.lineWidth = 1.5;
      [[-14, 8, 0.4], [10, 12, -0.6], [2, -4, 1.2]].forEach(([x, y, r]) => { c.save(); c.translate(x, y); c.rotate(r); c.beginPath(); c.moveTo(-6, 4); c.lineTo(0, -6); c.lineTo(7, 5); c.closePath(); c.fill(); c.stroke(); c.restore(); });
      c.restore(); return;
    }
    c.beginPath(); c.moveTo(-16, -16); c.lineTo(-10, -30); c.lineTo(-2, -18); c.closePath(); FE(c, COL.scoreD, 2.5);
    c.beginPath(); c.ellipse(0, 2, 28, 22, 0, 0, Math.PI * 2); FE(c, COL.score, 3);
    rr(c, 23, -6, 9, 13, 3); FE(c, COL.scoreD, 2.5);
    if (SH) return;
    circ(c, 12, -6, 2.6); F(c, COL.ink);
    c.strokeStyle = COL.ink; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-8, -19); c.lineTo(6, -19); c.stroke();
    if (it.hits >= 1) { c.beginPath(); c.moveTo(-18, -6); c.lineTo(-10, 2); c.lineTo(-15, 8); c.lineTo(-6, 16); c.stroke(); }
    if (it.hits >= 2) { c.beginPath(); c.moveTo(4, 4); c.lineTo(12, 10); c.lineTo(6, 16); c.lineTo(14, 22); c.stroke(); }
  },
  bell(c, col, colD) {
    c.beginPath(); c.moveTo(-21, 13); c.quadraticCurveTo(-20, -24, 0, -24); c.quadraticCurveTo(20, -24, 21, 13); c.closePath();
    FE(c, col, 3);
    rr(c, -26, 11, 52, 9, 4); FE(c, colD, 2.5);
    circ(c, 0, 24, 5); FE(c, COL.ink, 1);
  },
  echo(c, it, g) {
    DRAW.bell(c, COL.score, COL.scoreD);
    if (SH) return;
    const d = g.t - it.lastT;
    T(c, '♪', 28, -16, 19, d >= 0 && d < 0.5 ? COL.fixed : '#C9CFDC', FD);
    T(c, '♪', 36, -1, 16, d >= 0.5 && d < 0.9 ? COL.fixed : '#C9CFDC', FD);
    dots(c, 2 - it.triggers, 2, -33);
  },
  link(c, it) {
    DRAW.bell(c, COL.link, COL.linkD);
    if (SH) return;
    dots(c, 2 - it.triggers, 2, -33, 0, COL.link);
  },
  solo(c, it) {
    const dead = it.count >= 2;
    circ(c, 0, 2, 24); FE(c, dead ? '#C8CBD3' : COL.score, 3);
    circ(c, 0, -26, 6.5); FE(c, it.count === 1 ? COL.fixed : dead ? '#9BA0AC' : COL.white, 2.5);
    if (SH) return;
    circ(c, 0, 2, 17); F(c, COL.white);
    T(c, String(it.count), 0, 4, 19, COL.ink);
  },
  arch(c, it) {
    c.beginPath(); c.moveTo(-36, 22); c.lineTo(-36, -6); c.arc(0, -6, 36, Math.PI, 0); c.lineTo(36, 22);
    pathStroke(c, 10, COL.score);
    if (SH) return;
    arrow(c, 0, -16, 0, 14, COL.scoreD, 3);
  },
  cup(c, it, g) {
    c.beginPath(); c.moveTo(-35, -24); c.lineTo(35, -24); c.lineTo(28, 27); c.lineTo(-28, 27); c.closePath();
    FE(c, COL.score, 3);
    if (SH) return;
    c.beginPath(); c.ellipse(0, -22, 30, 7, 0, 0, Math.PI * 2); F(c, COL.ink);
    T(c, String(g.cfg.scores.cup), 0, 8, 16, COL.ink);
  },

  /* —— 联动储球（紫） —— */
  whale(c, it, g) {
    c.beginPath(); c.moveTo(28, 0); c.lineTo(50, -18); c.lineTo(46, 0); c.lineTo(50, 17); c.closePath(); FE(c, COL.linkD, 2.5);
    c.beginPath(); c.ellipse(0, 0, 37, 24, 0, 0, Math.PI * 2); FE(c, it.closed ? '#C9C0EC' : COL.link, 3);
    if (SH) return;
    circ(c, -2, 6, 12); F(c, COL.white); E(c, 2);
    (it.stored || []).forEach((b, i) => steelBall(c, -2 + (i ? 4 : -4), 6, 5.5));
    circ(c, -22, -6, 3); F(c, COL.ink);
    if (!it.closed) { c.beginPath(); c.ellipse(-4, -22, 9, 3, 0, 0, Math.PI * 2); F(c, COL.ink); }
    const sd = g.t - (it.spoutT || -9);
    if (sd < 0.6) {
      c.save(); c.globalAlpha = 1 - sd / 0.6; c.strokeStyle = '#4FBDEE'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-4, -26); c.quadraticCurveTo(-20, -50 - sd * 20, -36, -40); c.moveTo(-4, -26); c.quadraticCurveTo(12, -50 - sd * 20, 28, -40); c.stroke(); c.restore();
    }
  },
  portal(c, it) {
    const isIn = it.type === 'portalIn';
    if (!SH) {
      c.beginPath(); c.moveTo(-36, 26); c.lineTo(-36, -4); c.arc(0, -4, 36, Math.PI, 0); c.lineTo(36, 26); c.closePath();
      c.fillStyle = isIn ? '#E7E0FF' : '#DDF3FF'; c.fill();
      const spin = performance.now() / 400;
      c.save(); c.strokeStyle = COL.link; c.lineWidth = 2.5; c.globalAlpha = 0.6;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(0, 6, 9 + i * 8, spin + i, spin + i + 2.4); c.stroke(); }
      c.restore();
    }
    c.beginPath(); c.moveTo(-36, 26); c.lineTo(-36, -4); c.arc(0, -4, 36, Math.PI, 0); c.lineTo(36, 26);
    pathStroke(c, 10, COL.link);
    if (SH) return;
    T(c, isIn ? '入' : '出', 0, 8, 20, COL.ink, FD);
    if (isIn) dots(c, it.charges, 2, 38, 0, COL.link);
  },
  button(c, it) {
    circ(c, 0, 4, 20); FE(c, COL.linkD, 3);
    circ(c, 0, -1, 14); FE(c, it.opens < 2 ? COL.link : '#C9C0EC', 2.5);
    if (SH) return;
    T(c, '钮', 0, 0, 13, COL.white, FD);
    dots(c, 2 - it.opens, 2, 32, 0, COL.link);
  },
  gate(c, it, g) {
    if (it.open) {
      if (SH) return;
      c.save(); c.setLineDash([6, 6]); rr(c, -58, -8, 116, 16, 4); c.strokeStyle = COL.link; c.lineWidth = 2.5; c.stroke(); c.restore();
      const left = Math.max(0, it.openUntil - g.t) / 4;
      rr(c, -40, 14, 80 * left, 6, 3); FE(c, COL.link, 1.5);
      return;
    }
    rr(c, -58, -8, 116, 16, 4); FE(c, COL.link, 3);
    if (SH) return;
    c.strokeStyle = COL.white; c.lineWidth = 3;
    c.beginPath(); for (let x = -46; x <= 46; x += 13) { c.moveTo(x, -5); c.lineTo(x, 5); } c.stroke();
  },
  peg(c) {
    circ(c, 0, 0, 8.5); FE(c, COL.white, 2.5);
    if (SH) return;
    circ(c, 0, 0, 2.6); F(c, '#9AA7BF');
  }
};
DRAW.portalIn = DRAW.portal; DRAW.portalOut = DRAW.portal;
PB.DRAW = DRAW;

/* ---------- 渲染器 ---------- */
class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.k = 1; this.layers = {};
    this.pops = []; this.parts = []; this.banners = []; this.notes = []; this.waves = [];
    this.trauma = 0; this.shakeOn = true;
    this.scoreShown = 0;
    this.menuBalloons = [];
    const cols = [COL.fixed, COL.vari, COL.spawn, COL.score, COL.link];
    for (let i = 0; i < 12; i++) this.menuBalloons.push({ x: Math.random() * W, y: H * 0.3 + Math.random() * H * 0.8, v: 14 + Math.random() * 20, r: 16 + Math.random() * 12, c: cols[i % 5], ph: Math.random() * 6 });
  }

  resize(scale, dpr) {
    this.k = scale * dpr;
    this.cv.width = Math.round(W * this.k); this.cv.height = Math.round(H * this.k);
    this.buildLayers();
  }

  layer(name, fn) {
    const cv = this.layers[name] || document.createElement('canvas');
    cv.width = Math.round(W * this.k); cv.height = Math.round(H * this.k);
    const c = cv.getContext('2d'); c.setTransform(this.k, 0, 0, this.k, 0, 0);
    fn(c); this.layers[name] = cv;
  }

  buildLayers(flippers) {
    if (flippers !== undefined) this.flippersOn = flippers;
    const fl = this.flippersOn !== false;
    this.layer('bg', c => this.paintSky(c, false));
    this.layer('menu', c => this.paintSky(c, true));
    this.layer('board', c => { c.translate(OX, OY); this.paintBoard(c, fl); });
    this.previewKey = null;
  }

  cloud(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const blob = () => { c.beginPath(); c.arc(-40, 8, 26, 0, Math.PI * 2); c.arc(-8, -8, 34, 0, Math.PI * 2); c.arc(30, 4, 28, 0, Math.PI * 2); c.arc(0, 16, 30, 0, Math.PI * 2); };
    c.translate(4, 7); blob(); c.fillStyle = 'rgba(30,90,150,0.16)'; c.fill(); c.translate(-4, -7);
    blob(); c.fillStyle = '#FFFFFF'; c.fill();
    c.restore();
  }

  paintSky(c, menu) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.sky1); g.addColorStop(1, COL.sky2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 太阳
    c.save(); c.translate(menu ? 1380 : 1530, menu ? 150 : 820);
    c.fillStyle = 'rgba(255,224,102,0.35)'; circ(c, 0, 0, 92); c.fill();
    for (let i = 0; i < 12; i++) { c.save(); c.rotate(i * Math.PI / 6); c.fillStyle = COL.sun; rr(c, -5, -86, 10, 22, 5); c.fill(); c.restore(); }
    circ(c, 0, 0, 54); c.fillStyle = COL.sun; c.fill(); c.lineWidth = 4; c.strokeStyle = '#F5B800'; c.stroke();
    c.restore();
    // 云
    const R = PB.mulberry32(7);
    const cl = menu ? [[180, 190, 1.1], [620, 120, 0.8], [1060, 240, 1.0], [300, 560, 0.7], [1450, 520, 0.9]] : [[72, 486, 0.7], [1528, 470, 0.7], [62, 610, 0.5], [1540, 600, 0.5]];
    cl.forEach(([x, y, s]) => this.cloud(c, x, y, s * (0.9 + R() * 0.2)));
    // 山丘
    const hills = [[COL.hill1, 0.80, 60], [COL.hill2, 0.87, 46], [COL.hill3, 0.94, 36]];
    hills.forEach(([col, base, amp], li) => {
      const yAt = x => H * base - Math.sin(x / (170 + li * 40) + li * 2) * amp * 0.5 - Math.sin(x / 60 + li) * 6;
      c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 16) c.lineTo(x, yAt(x)); c.lineTo(W, H); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
    });
    if (menu) this.paintBunting(c);
  }

  paintBunting(c) {
    const cols = [COL.fixed, COL.score, COL.vari, COL.spawn, COL.link];
    [[0, 26, W, 40, 80], [0, 64, W, 26, 64]].forEach(([x0, y0, x1, y1, sag], si) => {
      const pt = t => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag });
      c.strokeStyle = COL.ink; c.lineWidth = 2.5; c.beginPath();
      for (let t = 0; t <= 1.001; t += 0.02) { const p = pt(t); c.lineTo(p.x, p.y); } c.stroke();
      const n = 22;
      for (let i = 0; i < n; i++) {
        const t0 = (i + 0.15) / n, t1 = (i + 0.85) / n, a = pt(t0), b = pt(t1), m = pt((t0 + t1) / 2);
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(m.x, m.y + 34); c.closePath();
        c.fillStyle = cols[(i + si * 2) % cols.length]; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke();
      }
    });
  }

  /* 棋盘底板（棋盘坐标） */
  paintBoard(c, fl) {
    const top = BOARD.ceil, bot = 760;
    rr(c, -18, top - 16 + 10, 1316, bot - top + 34, 30); c.fillStyle = 'rgba(30,52,100,0.25)'; c.fill();
    rr(c, -18, top - 16, 1316, bot - top + 34, 30); c.fillStyle = COL.frame; c.fill(); c.lineWidth = 4; c.strokeStyle = COL.ink; c.stroke();
    rr(c, 0, top, 1280, bot - top, 16);
    const g = c.createLinearGradient(0, 0, 0, 700);
    g.addColorStop(0, COL.board1); g.addColorStop(1, COL.board2);
    c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke();
    c.save(); rr(c, 0, top, 1280, bot - top, 16); c.clip();
    // 发射区 + 遮阳棚
    c.fillStyle = COL.launch; c.fillRect(0, top, 1280, -top);
    const sw = 64;
    for (let i = 0; i < 1280 / sw; i++) {
      const x = i * sw;
      c.beginPath(); c.moveTo(x, top); c.lineTo(x + sw, top); c.lineTo(x + sw, top + 18); c.arc(x + sw / 2, top + 18, sw / 2, 0, Math.PI); c.closePath();
      c.fillStyle = i % 2 ? COL.awnW : COL.awnR; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
    }
    c.setLineDash([6, 10]); c.strokeStyle = COL.inkSoft; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(1280, 0); c.stroke(); c.setLineDash([]);
    // 交错格位
    for (let r = 1; r <= 6; r++) {
      const n = r % 2 ? 10 : 9;
      for (let col = 1; col <= n; col++) {
        const p = PB.cellXY(`R${r}C${col}`);
        circ(c, p.x, p.y, 32); c.strokeStyle = COL.grid; c.lineWidth = 2; c.setLineDash([4, 6]); c.stroke(); c.setLineDash([]);
      }
    }
    if (fl) {
      const solid = pts => {
        c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
        c.fillStyle = COL.apron; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
      };
      solid([[-10, 570], [0, 576], [82, 625], [95, 642], [62, 790], [-10, 790]]);
      solid([[1290, 570], [1280, 576], [1198, 625], [1185, 642], [1218, 790], [1290, 790]]);
      const dg = c.createLinearGradient(0, 640, 0, 712); dg.addColorStop(0, 'rgba(120,150,200,0)'); dg.addColorStop(1, 'rgba(120,150,200,0.45)');
      c.fillStyle = dg; c.fillRect(230, 630, 820, 90);
      c.fillStyle = 'rgba(35,38,71,0.35)'; c.font = `700 16px ${FD}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('▼ 回收区 ▼', 640, 690);
    } else {
      const dg = c.createLinearGradient(0, 600, 0, 712); dg.addColorStop(0, 'rgba(120,150,200,0)'); dg.addColorStop(1, 'rgba(120,150,200,0.45)');
      c.fillStyle = dg; c.fillRect(0, 590, 1280, 130);
      c.fillStyle = 'rgba(35,38,71,0.35)'; c.font = `700 16px ${FD}`; c.textAlign = 'center'; c.fillText('▼ 全宽回收区 ▼', 640, 690);
    }
    c.restore();
  }

  /* ---------- 动态内容 ---------- */
  drawLinks(c, g) {
    c.save(); c.setLineDash([4, 7]); c.lineCap = 'round';
    for (const it of g.items) {
      if (it.type === 'link') {
        const fresh = g.t - it.lastT < 0.8;
        for (const o of it.linkItems) {
          c.strokeStyle = fresh ? COL.link : 'rgba(140,108,245,0.35)'; c.lineWidth = fresh ? 3.5 : 2.2;
          c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(o.x, o.y); c.stroke();
        }
      } else if (it.type === 'button' && it.gate) {
        c.strokeStyle = 'rgba(140,108,245,0.45)'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(it.gate.x, it.gate.y); c.stroke();
      } else if (it.type === 'portalIn' && it.exit) {
        c.strokeStyle = 'rgba(140,108,245,0.22)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(it.exit.x, it.exit.y); c.stroke();
      }
    }
    c.restore();
  }

  drawItems(c, g) {
    const list = g.pegs.concat(g.items);
    for (const pass of [true, false]) {
      SH = pass;
      for (const it of list) {
        const fn = DRAW[it.type]; if (!fn) continue;
        if (it.off && SH) continue;
        const p = Math.max(0, 1 - (g.t - it.hitT) / 0.22);
        const rp = it.readyT ? Math.max(0, 1 - (g.t - it.readyT) / 0.3) : 0;
        c.save(); c.translate(it.x + (SH ? 3 : 0), it.y + (SH ? 5 : 0));
        if (it.off) c.globalAlpha = 0.3;
        const s = 1 + 0.13 * p + 0.18 * rp;
        if (s !== 1) c.scale(s, s);
        fn(c, it, g);
        c.restore();
        if (!SH && it.off) this.drawCooldown(c, it, g);
      }
      for (const f of g.flippers) this.drawFlipper(c, f, g, SH);
    }
    SH = false;
  }

  drawCooldown(c, it, g) {
    const left = Math.max(0, it.cdUntil - g.t), frac = it.cdDur ? left / it.cdDur : 0;
    c.save(); c.translate(it.x, it.y);
    circ(c, 0, 0, 36); c.strokeStyle = 'rgba(35,38,71,0.14)'; c.lineWidth = 6; c.stroke();
    c.beginPath(); c.arc(0, 0, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.strokeStyle = COL.spawn; c.lineWidth = 6; c.lineCap = 'round'; c.stroke();
    if (left > 0) { c.font = `800 14px ${FN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = COL.spawnD; c.fillText(left.toFixed(1), 0, 0); }
    c.restore();
  }

  drawFlipper(c, f, g, sh) {
    const dx = f.s * Math.cos(f.a), dy = Math.sin(f.a);
    const nx = -dy, ny = dx;
    const tx = f.px + dx * f.len, ty = f.py + dy * f.len;
    const ready = g.t >= f.cdUntil;
    c.save(); if (sh) c.translate(3, 6);
    c.beginPath();
    c.moveTo(f.px + nx * f.r0, f.py + ny * f.r0);
    c.lineTo(tx + nx * f.r1, ty + ny * f.r1);
    c.arc(tx, ty, f.r1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
    c.lineTo(f.px - nx * f.r0, f.py - ny * f.r0);
    c.arc(f.px, f.py, f.r0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
    c.closePath();
    if (sh) { c.fillStyle = SHC; c.fill(); c.restore(); return; }
    c.fillStyle = ready ? COL.fixed : COL.fixedL; c.fill();
    c.lineWidth = 3; c.strokeStyle = COL.ink; c.lineJoin = 'round'; c.stroke();
    circ(c, f.px, f.py, 7); c.fillStyle = ready ? COL.score : COL.white; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
    if (!ready) {
      const frac = (f.cdUntil - g.t) / g.cfg.flipperCooldown;
      c.beginPath(); c.arc(f.px, f.py, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      c.strokeStyle = COL.fixed; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
    }
    c.restore();
  }

  drawBalls(c, g) {
    for (const b of g.balls) {
      if (b.state !== 'live') continue;
      b.trail.push(b.x, b.y); if (b.trail.length > 10) b.trail.splice(0, 2);
      for (let i = 0; i < b.trail.length - 2; i += 2) {
        const a = (i / b.trail.length) * 0.22;
        circ(c, b.trail[i], b.trail[i + 1], b.r * (0.45 + i / b.trail.length * 0.5));
        c.fillStyle = `rgba(110,130,170,${a})`; c.fill();
      }
    }
    for (const b of g.balls) if (b.state === 'live') steelBall(c, b.x, b.y, b.r);
  }

  drawLauncher(c, g, ui) {
    const P = BOARD.pivot;
    const power = ui.charging ? ui.power : 0;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.arc(P.x, P.y, 66, 0.08, Math.PI - 0.08); c.lineWidth = 19; c.strokeStyle = COL.ink; c.stroke();
    c.beginPath(); c.arc(P.x, P.y, 66, 0.08, Math.PI - 0.08); c.lineWidth = 13; c.strokeStyle = '#FFFFFF'; c.stroke();
    if (power > 0) {
      const gr = c.createLinearGradient(P.x - 66, 0, P.x + 66, 0);
      gr.addColorStop(0, COL.score); gr.addColorStop(1, COL.fixed);
      c.beginPath(); c.arc(P.x, P.y, 66, Math.PI - 0.08, Math.PI - 0.08 - (Math.PI - 0.16) * power, true);
      c.lineWidth = 11; c.strokeStyle = gr; c.stroke();
    }
    c.restore();
    c.save(); c.translate(P.x, P.y); c.rotate(-g.aim);
    rr(c, -16 + 3, 0 + 5, 32, 56, 10); c.fillStyle = SHC; c.fill();
    rr(c, -16, 0, 32, 56, 10); c.fillStyle = COL.awnR; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
    c.fillStyle = COL.white; c.fillRect(-14, 16, 28, 9); c.fillRect(-14, 34, 28, 9);
    rr(c, -19, 46, 38, 11, 5); c.fillStyle = COL.score; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
    c.restore();
    circ(c, P.x, P.y, 26); c.fillStyle = COL.score; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
    star(c, P.x, P.y, 12, 6, 5); c.fillStyle = COL.white; c.fill(); c.lineWidth = 2; c.stroke();
    if (g.phase === 'aim') {
      const L = g.launchVector(power);
      steelBall(c, L.x, L.y, BOARD.ballR);
    }
  }

  drawPreview(c, g, ui) {
    if (g.phase !== 'aim') return;
    const pv = g.preview(ui.charging ? ui.power : 0);
    const pts = pv.pts;
    for (let i = 2; i < pts.length; i += 2) {
      const a = 0.85 - (i / pts.length) * 0.45;
      circ(c, pts[i], pts[i + 1], 4); c.fillStyle = `rgba(35,38,71,${a})`; c.fill();
    }
    if (pv.hit) {
      const h = pv.hit;
      c.save(); c.setLineDash([5, 4]); circ(c, h.x, h.y, BOARD.ballR + 3); c.strokeStyle = COL.fixed; c.lineWidth = 3; c.stroke(); c.restore();
      const info = PB.ITEMS[h.item.type];
      const name = info ? info.name : (h.item.type === 'wall' ? '边墙' : '');
      if (name) {
        c.font = `700 16px ${FD}`;
        const w = c.measureText(name).width + 22;
        const x = Math.min(Math.max(h.x + 24, 4), 1280 - w - 4), y = h.y - 34;
        rr(c, x, y - 13, w, 26, 13); c.fillStyle = COL.ink; c.fill();
        c.fillStyle = FAMC[info ? info.fam : 'peg'] || COL.white; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(name, x + 11, y + 1);
      }
    }
  }

  /* ---------- 特效 ---------- */
  event(e, g) {
    const now = performance.now() / 1000;
    switch (e.type) {
      case 'score': {
        const col = { coin: COL.score, fixed: COL.fixed, vari: COL.vari, chain: COL.score, set: COL.score, center: COL.fixed, claim: COL.score, pot: COL.score, cup: COL.score }[e.kind] || COL.score;
        const near = this.pops.filter(p => Math.abs(p.x - e.x) < 30 && Math.abs(p.y0 - e.y) < 30 && now - p.t < 0.3).length;
        this.pops.push({ x: e.x, y0: e.y - 34 - near * 18, t: now, text: '+' + e.p, col, big: e.p >= 150 });
        if (this.pops.length > 60) this.pops.splice(0, this.pops.length - 60);
        this.burst(e.x, e.y, e.p >= 150 ? 12 : 4, col, now);
        break;
      }
      case 'force':
        if (e.fam === 'fixed') {
          for (let i = 0; i < 7; i++) {
            const a = Math.atan2(e.ny, e.nx) + (Math.random() - 0.5) * 0.9, s = 260 + Math.random() * 260;
            this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: a, vr: 0, t: now, life: 0.28, col: i % 2 ? COL.fixed : COL.score, w: 12, line: true });
          }
          this.waves.push({ x: e.x, y: e.y, t: now, col: COL.fixed, r0: 10, r1: 46, w: 6, d: 0.22 });
        } else {
          const s = Math.max(0.15, e.s);
          this.waves.push({ x: e.x, y: e.y, t: now, col: COL.vari, r0: 24, r1: 30 + 40 * s, w: 2 + 6 * s, d: 0.3 });
        }
        break;
      case 'burst': this.burst(e.x, e.y, e.n || 16, FAMC[e.fam] || COL.score, now, 1.6); break;
      case 'spawn':
        this.burst(e.item.x, e.item.y - 30, 16, COL.spawn, now, 1.4);
        this.waves.push({ x: e.item.x, y: e.item.y, t: now, col: COL.spawn, r0: 20, r1: 70, w: 6, d: 0.35 });
        break;
      case 'note': this.notes.push({ x: e.x, y: e.y, t: now, text: e.text }); break;
      case 'shake': if (this.shakeOn) this.trauma = Math.min(1, this.trauma + (e.a || 0.2)); break;
      case 'drain': case 'vanish': this.burst(e.x, Math.min(e.y, 690), 5, '#9AA7BF', now, 0.8); break;
    }
  }
  burst(x, y, n, col, now, power) {
    power = power || 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (80 + Math.random() * 200) * power;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, t: now, life: 0.6 + Math.random() * 0.5, col: Math.random() < 0.3 ? COL.white : col, w: 5 + Math.random() * 5 });
    }
    if (this.parts.length > 360) this.parts.splice(0, this.parts.length - 360);
  }
  banner(text, sub, ms, tone) {
    const now = performance.now() / 1000;
    this.banners = this.banners.filter(b => now - b.t < b.d - 0.05);
    this.banners.push({ text, sub, t: now, d: (ms || 1400) / 1000, tone: tone || 'paper' });
  }

  drawFx(c, dtReal) {
    const now = performance.now() / 1000;
    this.waves = this.waves.filter(w => now - w.t < w.d);
    for (const w of this.waves) {
      const k = (now - w.t) / w.d;
      circ(c, w.x, w.y, w.r0 + (w.r1 - w.r0) * k);
      c.globalAlpha = 1 - k; c.strokeStyle = w.col; c.lineWidth = w.w * (1 - k * 0.5); c.stroke(); c.globalAlpha = 1;
    }
    this.parts = this.parts.filter(p => now - p.t < p.life);
    for (const p of this.parts) {
      p.vy += (p.line ? 0 : 700) * dtReal; p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.rot += p.vr * dtReal;
      const a = 1 - (now - p.t) / p.life;
      c.save(); c.globalAlpha = a; c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.line) { c.fillStyle = p.col; c.fillRect(-p.w, -2, p.w * 2, 4); }
      else { c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w / 3, p.w, p.w * 0.66); c.lineWidth = 1; c.strokeStyle = COL.ink; c.strokeRect(-p.w / 2, -p.w / 3, p.w, p.w * 0.66); }
      c.restore();
    }
    this.pops = this.pops.filter(p => now - p.t < 0.9);
    for (const p of this.pops) {
      const k = (now - p.t) / 0.9;
      c.save(); c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const sc = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(0.1, (k - 0.12));
      c.translate(p.x, p.y0 - k * 34); c.scale(sc, sc);
      TO(c, p.text, 0, 0, p.big ? 32 : 23, p.col, COL.ink, FN, 'center', 7);
      c.restore();
    }
    this.notes = this.notes.filter(n => now - n.t < 1.4);
    for (const n of this.notes) {
      const k = (now - n.t) / 1.4;
      c.save(); c.globalAlpha = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
      c.font = `700 15px ${FD}`; const w = c.measureText(n.text).width + 22;
      rr(c, n.x - w / 2, n.y - 13 - k * 16, w, 26, 13); c.fillStyle = COL.ink; c.fill();
      c.fillStyle = COL.white; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n.text, n.x, n.y - k * 16 + 1);
      c.restore();
    }
  }

  drawBanners(c) {
    const now = performance.now() / 1000;
    this.banners = this.banners.filter(b => now - b.t < b.d);
    const b = this.banners[this.banners.length - 1];
    if (!b) return;
    const k = (now - b.t) / b.d;
    const ein = Math.min(1, k / 0.12), eout = k > 0.82 ? (1 - (k - 0.82) / 0.18) : 1;
    c.save(); c.globalAlpha = Math.min(ein, eout);
    const sc = 0.85 + 0.15 * ein;
    c.translate(800, 380); c.scale(sc, sc); c.rotate(-0.025);
    c.font = `700 64px ${FD}`;
    const w = Math.max(c.measureText(b.text).width + 90, 340), h = b.sub ? 150 : 112;
    rr(c, -w / 2 + 7, -h / 2 + 10, w, h, 26); c.fillStyle = 'rgba(30,52,100,0.3)'; c.fill();
    const bg = { paper: COL.white, good: COL.score, warn: COL.fixedL, teal: COL.variL }[b.tone] || COL.white;
    rr(c, -w / 2, -h / 2, w, h, 26); c.fillStyle = bg; c.fill(); c.lineWidth = 5; c.strokeStyle = COL.ink; c.stroke();
    c.fillStyle = COL.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(b.text, 0, b.sub ? -18 : 4);
    if (b.sub) { c.font = `700 26px ${FD}`; c.fillText(b.sub, 0, 40); }
    c.restore();
  }

  /* ---------- HUD（固定，不随抖动） ---------- */
  drawHud(c, g, ui, dtReal) {
    const diff = g.score - this.scoreShown;
    this.scoreShown += diff > 0 ? Math.max(1, diff * Math.min(1, dtReal * 10)) : diff;
    if (Math.abs(g.score - this.scoreShown) < 1) this.scoreShown = g.score;
    const Y = 24;
    rr(c, 17, 8, 440, 40, 20); c.fillStyle = 'rgba(30,52,100,0.25)'; c.fill();
    rr(c, 14, 4, 440, 40, 20); c.fillStyle = COL.white; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
    c.beginPath(); c.moveTo(44, Y - 15); c.lineTo(32, Y + 3); c.lineTo(41, Y + 3); c.lineTo(36, Y + 16); c.lineTo(50, Y - 4); c.lineTo(41, Y - 4); c.closePath();
    c.fillStyle = COL.score; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
    for (let i = 0; i < g.shotsTotal; i++) {
      circ(c, 66 + i * 22, Y, 8);
      c.fillStyle = i < g.shotsLeft ? COL.fixed : '#E3E8F1'; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
    }
    const sx = 66 + g.shotsTotal * 22 + 4;
    c.fillStyle = COL.ink; c.font = `700 15px ${FD}`; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('剩余 ' + g.shotsLeft, sx, Y + 1);
    const dx = sx + 64;
    c.fillStyle = 'rgba(35,38,71,0.2)'; c.fillRect(dx, Y - 13, 2, 26);
    circ(c, dx + 26, Y, 13); c.fillStyle = COL.score; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
    c.fillStyle = COL.ink; c.font = `700 14px ${FD}`; c.textAlign = 'center'; c.fillText('分', dx + 26, Y + 1);
    c.font = `800 30px ${FN}`; c.textAlign = 'left'; c.fillText(Math.round(this.scoreShown).toLocaleString('en-US'), dx + 46, Y + 3);
    // 右上进度
    const bx = 1090, bw = 438, by = 6, bh = 34;
    const p = Math.min(1, g.score / g.target);
    rr(c, bx + 3, by + 4, bw, bh, 17); c.fillStyle = 'rgba(30,52,100,0.25)'; c.fill();
    rr(c, bx, by, bw, bh, 17); c.fillStyle = COL.white; c.fill();
    if (p > 0) { rr(c, bx + 4, by + 4, Math.max(26, (bw - 8) * p), bh - 8, 13); c.fillStyle = g.passed ? COL.vari : COL.score; c.fill(); }
    rr(c, bx, by, bw, bh, 17); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke();
    const label = g.passed ? `已通关 · 继续冲榜  ${g.score.toLocaleString('en-US')}` : `${g.score.toLocaleString('en-US')} / ${g.target.toLocaleString('en-US')}`;
    TO(c, label, bx + bw / 2, by + bh / 2 + 1, 17, COL.ink, COL.white, g.passed ? FD : FN, 'center', 4);
    c.fillStyle = COL.ink; c.font = `700 15px ${FD}`; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText(g.passed ? '通关 ✓' : '通关进度', bx - 10, by + bh / 2 + 1);

    // 左侧栏
    const cx = 76;
    const card = (y, h) => { rr(c, 10, y, 132, h, 18); c.fillStyle = 'rgba(255,255,255,0.88)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke(); };
    card(96, 330);
    c.fillStyle = COL.ink; c.font = `700 18px ${FD}`; c.textAlign = 'center';
    const shotLabel = g.phase === 'aim' ? `第 ${g.shotNo + 1} / ${g.shotsTotal} 发` : `第 ${g.shotNo} / ${g.shotsTotal} 发`;
    c.fillText(g.phase === 'over' ? '已结束' : shotLabel, cx, 120);
    const lim = g.cfg.shotTime, rem = g.phase === 'aim' ? lim : Math.max(0, lim - g.shotT);
    c.beginPath(); c.arc(cx, 186, 38, 0, Math.PI * 2); c.lineWidth = 9; c.strokeStyle = '#E3E8F1'; c.stroke();
    c.beginPath(); c.arc(cx, 186, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rem / lim); c.strokeStyle = rem < 6 ? COL.fixed : COL.vari; c.lineCap = 'round'; c.stroke(); c.lineCap = 'butt';
    c.fillStyle = COL.ink; c.font = `800 30px ${FN}`; c.fillText(Math.ceil(rem), cx, 185);
    c.font = `700 13px ${FD}`; c.fillStyle = 'rgba(35,38,71,0.7)'; c.fillText('本发秒数', cx, 240);
    c.font = `700 15px ${FD}`; c.fillStyle = COL.ink;
    c.fillText(`场上 ${g.balls.length} / ${g.cfg.maxEntities} 球`, cx, 276);
    c.fillText('可新增', cx, 306);
    const cap = g.cfg.newBallCap, have = g.phase === 'aim' ? cap : g.budget;
    const per = Math.min(4, cap);
    for (let i = 0; i < cap; i++) {
      const x = cx - (per - 1) * 12 + (i % per) * 24, y = 334 + Math.floor(i / per) * 24;
      circ(c, x, y, 8); c.fillStyle = i < have ? COL.spawn : '#E3E8F1'; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
    }
    if (g.phase === 'play' && g.t - g.lastSpawnT < 2.6) {
      const txt = g.budget > 0 ? `还可新增 ${g.budget} 球` : '新增球已用完';
      c.font = `700 16px ${FD}`; const w = c.measureText(txt).width + 24;
      rr(c, cx - w / 2, 440, w, 30, 15); c.fillStyle = COL.spawn; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke();
      c.fillStyle = COL.white; c.textAlign = 'center'; c.fillText(txt, cx, 456);
    }
    // 右侧栏：图例
    const lx = 1458;
    rr(c, lx, 96, 132, 262, 18); c.fillStyle = 'rgba(255,255,255,0.88)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke();
    c.font = `700 15px ${FD}`; c.textAlign = 'left'; c.fillStyle = COL.ink; c.fillText('道具颜色', lx + 16, 120);
    PB.FAMILIES.forEach(([k, t], i) => {
      const y = 152 + i * 40;
      rr(c, lx + 14, y - 10, 20, 20, 6); c.fillStyle = FAMC[k]; c.fill(); c.lineWidth = 2; c.strokeStyle = COL.ink; c.stroke();
      if (k === 'fixed') bolt(c, lx + 24, y, 0.55, COL.white);
      c.fillStyle = COL.ink; c.font = `700 15px ${FD}`; c.fillText(t, lx + 42, y + 1);
    });
    if (g.flippers.length) {
      c.textAlign = 'center'; c.fillStyle = COL.ink; c.font = `700 14px ${FD}`;
      c.fillText('自动拨杆', lx + 66, 384); c.fillText(`冷却 ${g.cfg.flipperCooldown} 秒`, lx + 66, 404);
    }
  }

  /* ---------- 帧 ---------- */
  frameGame(g, ui, dtReal) {
    const c = this.ctx;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.drawImage(this.layers.bg, 0, 0, W, H);
    this.trauma = Math.max(0, this.trauma - dtReal * 2.4);
    let sx = 0, sy = 0;
    if (this.trauma > 0 && this.shakeOn) {
      const m = 11 * this.trauma * this.trauma;
      sx = (Math.random() * 2 - 1) * m; sy = (Math.random() * 2 - 1) * m;
    }
    c.drawImage(this.layers.board, sx, sy, W, H);
    c.save(); c.translate(OX + sx, OY + sy);
    c.save(); c.beginPath(); c.rect(-2, BOARD.ceil - 2, 1284, 900); c.clip();
    this.drawLinks(c, g);
    this.drawItems(c, g);
    this.drawPreview(c, g, ui);
    this.drawBalls(c, g);
    this.drawFx(c, dtReal);
    c.restore();
    this.drawLauncher(c, g, ui);
    c.restore();
    this.drawHud(c, g, ui, dtReal);
    if (g.phase === 'aim' && ui.hint) {
      c.font = `700 17px ${FD}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = c.measureText(ui.hint).width + 34;
      rr(c, 800 - w / 2, 150, w, 32, 16); c.fillStyle = COL.ink; c.fill();
      c.fillStyle = COL.white; c.fillText(ui.hint, 800, 167);
    }
    this.drawBanners(c);
  }

  ensurePreview(g, key) {
    if (this.previewKey === key && this.preview) return;
    const s = 0.5, top = -BOARD.ceil + 18;
    const cv = this.preview || document.createElement('canvas');
    const pw = 1316 * s, ph = (top + 712) * s;
    cv.width = Math.round(pw * this.k); cv.height = Math.round(ph * this.k);
    const c = cv.getContext('2d');
    c.setTransform(this.k * s, 0, 0, this.k * s, 0, 0);
    c.translate(18, top);
    this.paintBoard(c, g.cfg.flippers);
    this.drawLinks(c, g); this.drawItems(c, g);
    this.drawLauncher(c, g, { charging: false, power: 0 });
    this.preview = cv; this.previewKey = key; this.previewSize = [pw, ph];
  }

  /* 道具小图标（用于道具说明） */
  iconCanvas(type, size, game) {
    const cv = document.createElement('canvas');
    const k = Math.min(3, (window.devicePixelRatio || 1) * 1.5);
    cv.width = cv.height = Math.round(size * k);
    cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d');
    c.setTransform(k * size / 96, 0, 0, k * size / 96, 0, 0);
    c.translate(48, 50);
    const it = Object.assign({ type, x: 0, y: 0, hitT: -9, dir: 1, c: 3, dirIdx: 1, charges: 2, triggers: 0, opens: 0, centerLeft: 2, count: 0, n: 1, letter: 'A', stored: [], lastT: -9, claimed: false, hits: 0, pair: 1, fireT: -9 });
    const g = game || { t: 0, phase: 'play', letters: { A: true }, cfg: PB.DEFAULTS, shotT: 6, clockValue: () => 120 };
    for (const pass of [true, false]) { SH = pass; c.save(); if (SH) c.translate(3, 5); (DRAW[type] || (() => {}))(c, it, g); c.restore(); }
    SH = false;
    return cv;
  }

  frameMenu(mode, dtReal, previewGame, previewKey) {
    const c = this.ctx;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.drawImage(mode === 'lobby' ? this.layers.bg : this.layers.menu, 0, 0, W, H);
    const t = performance.now() / 1000;
    for (const b of this.menuBalloons) {
      b.y -= b.v * dtReal; if (b.y < -80) { b.y = H + 60; b.x = Math.random() * W; }
      const x = b.x + Math.sin(t * 0.8 + b.ph) * 12;
      c.strokeStyle = COL.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, b.y + b.r * 1.15); c.quadraticCurveTo(x + 6, b.y + b.r * 1.8, x - 2, b.y + b.r * 2.6); c.stroke();
      c.beginPath(); c.ellipse(x + 3, b.y + 5, b.r * 0.85, b.r, 0, 0, Math.PI * 2); c.fillStyle = SHC; c.fill();
      c.beginPath(); c.ellipse(x, b.y, b.r * 0.85, b.r, 0, 0, Math.PI * 2); c.fillStyle = b.c; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.ink; c.stroke();
      c.beginPath(); c.ellipse(x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.18, b.r * 0.28, -0.4, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
    }
    if (mode === 'lobby' && previewGame) {
      this.ensurePreview(previewGame, previewKey);
      const [pw, ph] = this.previewSize;
      const x = 56, y = 196;
      rr(c, x - 10 + 6, y - 10 + 10, pw + 20, ph + 20, 22); c.fillStyle = 'rgba(30,52,100,0.25)'; c.fill();
      c.save(); rr(c, x - 10, y - 10, pw + 20, ph + 20, 22); c.fillStyle = COL.white; c.fill(); c.lineWidth = 3; c.strokeStyle = COL.ink; c.stroke(); c.clip();
      c.drawImage(this.preview, x, y, pw, ph);
      c.restore();
    }
  }
}
PB.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
