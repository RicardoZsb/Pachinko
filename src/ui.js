/* ===== 界面、输入、存档与主循环 ===== */
(function () {
'use strict';
const PB = window.PB, AU = PB.Audio, DB = PB.DB;
const $ = id => document.getElementById(id);
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const IS_APP = typeof window.Neutralino !== 'undefined' && typeof window.NL_OS !== 'undefined';

/* ---------- 配置 ---------- */
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mergeCfg(s) {
  const d = clone(PB.DEFAULTS);
  if (s && typeof s === 'object') {
    for (const k of Object.keys(d)) {
      if (!(k in s)) continue;
      if (d[k] && typeof d[k] === 'object') Object.assign(d[k], s[k]);
      else d[k] = s[k];
    }
  }
  if (!PB.LEVELS[d.map]) d.map = 'A';
  return d;
}
let cfg = mergeCfg(null);
let prefs = { music: 55, sfx: 80, shake: !reduced, full: false };

function ruleVersion(c) {
  const o = { v: 2, m: c.map, t: c.targets[c.map], s: c.shots, n: c.newBallCap, e: c.maxEntities, tm: c.shotTime, f: c.flippers, fc: c.flipperCooldown, p: c.physics, fo: c.force, sp: c.spawnCd, sc: c.scores };
  const str = JSON.stringify(o);
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return c.map + '-' + h.toString(36).slice(0, 5).toUpperCase();
}
const curVer = () => ruleVersion(cfg);

function maskMail(e) {
  const at = e.indexOf('@'); if (at < 0) return '***';
  const u = e.slice(0, at), d = e.slice(at + 1);
  const dd = d.split('.'); const tld = dd.length > 1 ? '.' + dd[dd.length - 1] : '';
  return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '***') + '@' + (dd[0] ? dd[0][0] + '**' : '') + tld;
}

/* ---------- 舞台缩放 ---------- */
const stage = $('stage'), cv = $('cv');
const renderer = new PB.Renderer(cv);
let fitS = 1, fitX = 0, fitY = 0;
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  fitS = Math.min(vw / 1600, vh / 900);
  fitX = (vw - 1600 * fitS) / 2; fitY = (vh - 900 * fitS) / 2;
  stage.style.transform = `translate(${fitX}px,${fitY}px) scale(${fitS})`;
  renderer.resize(fitS, Math.min(2, window.devicePixelRatio || 1));
  renderer.buildLayers(cfg.flippers);
}
window.addEventListener('resize', fit);
const toStage = e => ({ x: (e.clientX - fitX) / fitS, y: (e.clientY - fitY) / fitS });
const toBoard = e => { const p = toStage(e); return { x: p.x - PB.STAGE.OX, y: p.y - PB.STAGE.OY }; };

/* ---------- 声音解锁 ---------- */
let audioReady = false;
function unlockAudio() {
  AU.resume();
  if (!audioReady && AU.ctx) {
    audioReady = true;
    AU.setVolumes(prefs.music / 100, prefs.sfx / 100);
    AU.playMusic(screen === 'game' ? 'game' : 'lobby');
  }
}
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });
const click = () => AU.sfx('ui');

/* ---------- 屏幕切换 ---------- */
let screen = 'start';
let previewGame = null, previewKey = '';
function refreshPreview() { previewGame = new PB.Game(cfg, cfg.map, 1); previewKey = curVer() + '|' + Date.now(); }
function show(name) {
  screen = name;
  $('scr-start').hidden = name !== 'start';
  $('scr-lobby').hidden = name !== 'lobby';
  $('game-ui').hidden = name !== 'game';
  if (name === 'lobby') renderLobby();
  if (audioReady) AU.playMusic(name === 'game' ? 'game' : 'lobby');
}
function openModal(id) { $(id).hidden = false; }
function closeModal(id) { $(id).hidden = true; }
let toastT = 0;
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2200); }
PB.onStoreError = msg => toast(msg, 4000);

/* ---------- 主界面 ---------- */
function renderLobby() {
  const lv = PB.LEVELS[cfg.map];
  $('lobby-map').textContent = `${cfg.map} · ${lv.name}`;
  $('lobby-info').innerHTML = [
    `通关目标<b>${fmt(cfg.targets[cfg.map])}</b>分`,
    `发射<b>${cfg.shots}</b>次`,
    `每发限时<b>${cfg.shotTime}</b>秒`,
    `每发新增球≤<b>${cfg.newBallCap}</b>`,
    cfg.flippers ? '自动拨杆<b>开</b>' : '自动拨杆<b>关</b>'
  ].map(s => `<span class="info-pill">${s}</span>`).join('');
  const sorted = DB.records(curVer());
  $('rank-meta').innerHTML = `${esc(lv.name)} · 规则版本 ${curVer()}<br>共 ${sorted.length} 人上榜 · 按个人最高分排序`;
  const me = currentPlayerId();
  $('rank-list').innerHTML = sorted.length ? sorted.map((r, i) => rowHtml(r, i + 1, r.id === me, true)).join('')
    : `<li class="rank-empty">还没有成绩<br>点击“开始游戏”成为第一个上榜的人</li>`;
}
function rowHtml(r, rank, me, mail) {
  const cls = rank <= 3 ? ' r' + rank : '';
  return `<li class="${me ? 'me' : ''}"><span class="rk${cls}">${rank}</span><div class="who"><div class="nick">${esc(r.nick)}</div>${mail ? `<div class="mail">${esc(maskMail(r.email))}</div>` : ''}</div><span class="pts">${fmt(r.best)}</span></li>`;
}
function currentPlayerId() { const p = DB.get('player'); return p ? p.email.toLowerCase() + '|' + p.nick : ''; }

/* ---------- 存档（开始界面） ---------- */
let arcVer = '', arcArmed = { id: '', t: 0 }, arcClearArmed = 0;
function arcBoards() {
  const list = DB.boardsList().map(b => ({ ver: b.ver, map: b.map, name: b.mapName || (PB.LEVELS[b.map] || {}).name || '', n: b.records.length }));
  const cv = curVer();
  if (!list.find(b => b.ver === cv)) list.unshift({ ver: cv, map: cfg.map, name: PB.LEVELS[cfg.map].name, n: 0 });
  else list.sort((a, b) => (b.ver === cv) - (a.ver === cv));
  return list;
}
function openArchive() {
  arcVer = curVer();
  $('arc-search').value = '';
  const where = DB.isApp()
    ? `成绩自动永久保存在 <b>${esc(DB.dir.replace(/\//g, '\\'))}\\存档.json</b>，并同步生成 <b>排行榜.csv</b>（Excel 可直接打开）。`
    : '成绩保存在本浏览器中（清除浏览器数据会丢失）；Windows 软件版会写入“文档\\弹珠游园会”文件夹。';
  $('arc-where').innerHTML = where + (DB.lastError ? `<br><span style="color:#C62E14">${esc(DB.lastError)}</span>` : '');
  $('btn-arc-open').hidden = !DB.isApp();
  $('btn-arc-export').hidden = !!window.PB_NO_DOWNLOAD && !DB.isApp();
  renderArchive();
  openModal('m-archive');
}
function renderArchive() {
  const boards = arcBoards(), cv = curVer();
  if (!boards.find(b => b.ver === arcVer)) arcVer = boards[0].ver;
  $('arc-board').innerHTML = boards.map(b => `<option value="${esc(b.ver)}" ${b.ver === arcVer ? 'selected' : ''}>${esc(b.map + ' ' + b.name)} · ${esc(b.ver)}${b.ver === cv ? '（当前规则）' : ''} · ${b.n} 人</option>`).join('');
  const q = $('arc-search').value.trim().toLowerCase();
  const all = DB.records(arcVer);
  const rows = all.map((r, i) => ({ r, rank: i + 1 })).filter(x => !q || x.r.nick.toLowerCase().includes(q) || x.r.email.toLowerCase().includes(q));
  const armedNow = arcArmed.id && Date.now() - arcArmed.t < 3000;
  $('arc-body').innerHTML = rows.map(({ r, rank }) => `<tr>
    <td class="rank">${rank}</td><td class="nick" title="${esc(r.nick)}">${esc(r.nick)}</td><td class="mail">${esc(r.email)}</td>
    <td class="num">${fmt(r.best)}</td><td class="num">${r.plays || 1}</td><td class="when">${esc(DB.fmtTime(r.at))}</td>
    <td class="ops"><button class="arc-del${armedNow && arcArmed.id === r.id ? ' armed' : ''}" data-id="${esc(r.id)}" type="button">${armedNow && arcArmed.id === r.id ? '确认删除' : '删除'}</button></td></tr>`).join('');
  $('arc-empty').hidden = rows.length > 0;
  $('arc-empty').textContent = all.length ? '没有找到匹配的昵称或邮箱' : '这个榜单还没有成绩';
  $('arc-count').textContent = `共 ${all.length} 条记录${q ? `，筛选出 ${rows.length} 条` : ''} · 按最高分从高到低排列 · 删除前需再点一次确认`;
  const clr = $('btn-arc-clear');
  const clearArmed = Date.now() - arcClearArmed < 3000;
  clr.classList.toggle('armed', clearArmed); clr.textContent = clearArmed ? '再点一次确认清空' : '清空此榜单';
  clr.disabled = !all.length;
}
$('arc-board').onchange = e => { arcVer = e.target.value; arcArmed = { id: '', t: 0 }; renderArchive(); };
$('arc-search').oninput = () => renderArchive();
$('arc-body').addEventListener('click', e => {
  const btn = e.target.closest('.arc-del'); if (!btn) return;
  const id = btn.dataset.id;
  if (arcArmed.id === id && Date.now() - arcArmed.t < 3000) {
    const rec = DB.records(arcVer).find(r => r.id === id);
    DB.removeRecord(arcVer, id); arcArmed = { id: '', t: 0 };
    click(); toast(`已删除 ${rec ? rec.nick : ''} 的成绩`);
  } else { arcArmed = { id, t: Date.now() }; setTimeout(renderArchive, 3050); }
  renderArchive();
});
$('btn-arc-clear').onclick = () => {
  if (Date.now() - arcClearArmed < 3000) {
    DB.clearBoard(arcVer); arcClearArmed = 0; click(); toast('此榜单已清空'); renderArchive(); return;
  }
  arcClearArmed = Date.now(); setTimeout(renderArchive, 3050); renderArchive();
};
$('btn-arc-export').onclick = async () => {
  click();
  const csv = DB.toCSV(arcVer);
  const name = `排行榜_${arcVer}.csv`;
  if (DB.isApp()) {
    try {
      const path = DB.dir + '/' + name;
      await Neutralino.filesystem.writeFile(path, csv);
      toast('已导出到 ' + path.replace(/\//g, '\\'), 3500);
    } catch (e) { toast('导出失败：' + (e.message || e.code || e), 3500); }
    return;
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (e) { toast('当前环境不允许下载文件'); }
};
$('btn-arc-open').onclick = async () => {
  click();
  try { await DB.flush(); await Neutralino.os.open(window.NL_OS === 'Windows' ? DB.dir.replace(/\//g, '\\') : 'file://' + DB.dir); }
  catch (e) { toast('无法打开文件夹：' + DB.dir.replace(/\//g, '\\'), 4000); }
};
$('btn-arc-close').onclick = () => { click(); closeModal('m-archive'); };

/* ---------- 道具说明 ---------- */
function openHelp() {
  const g = previewGame || new PB.Game(cfg, cfg.map, 1);
  const types = [];
  for (const it of g.items) {
    const t = it.type === 'portalOut' ? 'portalIn' : it.type === 'gate' ? 'button' : it.type;
    if (!types.includes(t)) types.push(t);
  }
  if (g.pegs.length) types.push('peg');
  const body = $('help-body'); body.innerHTML = '';
  for (const [fam, label] of PB.FAMILIES.concat([['peg', '其他']])) {
    const list = types.filter(t => (PB.ITEMS[t] || {}).fam === fam);
    if (!list.length) continue;
    const sec = document.createElement('section'); sec.className = 'help-sec';
    sec.innerHTML = `<h4><i style="background:${PB.FAMC[fam]}"></i>${label}</h4>`;
    const grid = document.createElement('div'); grid.className = 'help-grid';
    for (const t of list) {
      const card = document.createElement('div'); card.className = 'help-card';
      card.appendChild(renderer.iconCanvas(t, 64));
      const info = PB.ITEMS[t];
      const txt = document.createElement('div');
      let desc = info.desc;
      if (t === 'gift') desc = `撞到放出 2 颗新球；冷却 ${cfg.spawnCd.gift} 秒，冷却中变暗可穿过`;
      if (t === 'nest') desc = `撞到向上吐出 1 颗新球；冷却 ${cfg.spawnCd.nest} 秒`;
      if (t === 'split') desc = `撞到的球一分为二，镜像飞出；冷却 ${cfg.spawnCd.split} 秒`;
      if (t === 'salute') desc = `撞到后连发 3 颗新球；冷却 ${cfg.spawnCd.salute} 秒`;
      txt.innerHTML = `<b>${esc(t === 'portalIn' ? '回程门' : t === 'button' ? '开关门' : info.name)}</b><span>${esc(t === 'button' ? '撞“钮”打开同号闸门 4 秒，每发 2 次' : desc)}</span>`;
      card.appendChild(txt); grid.appendChild(card);
    }
    sec.appendChild(grid); body.appendChild(sec);
  }
  $('help-title').textContent = `道具说明 · ${cfg.map} ${PB.LEVELS[cfg.map].name}`;
  openModal('m-help');
}

/* ---------- 游戏会话 ---------- */
let game = null, player = null, paused = false, overTimer = 0, lastShotScore = 0, helpPaused = false;
const ui = { charging: false, power: 0, chargeStart: 0, hint: '', pointerId: null, keyCharge: false, fullCued: false };
const keyAim = { L: false, R: false };

function startGame() {
  game = new PB.Game(cfg, cfg.map, ((Date.now() & 0xffffff) ^ Math.floor(Math.random() * 1e9)) >>> 0);
  renderer.scoreShown = 0; renderer.pops = []; renderer.parts = []; renderer.banners = []; renderer.waves = []; renderer.trauma = 0;
  paused = false; ui.charging = false;
  const hasCannon = game.items.some(it => it.type === 'cannon');
  ui.hint = '拖动瞄准 · 按住蓄力 · 松开发射' + (hasCannon ? ' · 点击转向炮换方向' : '');
  show('game');
  renderer.banner('第 1 发', `${PB.LEVELS[cfg.map].name} · 目标 ${fmt(game.target)} 分`, 1700, 'paper');
}

function chargePower() {
  const h = (performance.now() - ui.chargeStart) / 1000;
  return h < 0.15 ? 0 : Math.min(1, (h - 0.15) / 0.85);
}
function aimAt(p) {
  const P = PB.BOARD.pivot;
  const dx = p.x - P.x, dy = Math.max(10, p.y - P.y);
  game.setAim(Math.atan2(dx, dy));
}
function beginCharge() { ui.charging = true; ui.chargeStart = performance.now(); ui.fullCued = false; }
function doFire() {
  if (!game || !ui.charging) return;
  const p = chargePower();
  ui.charging = false; ui.keyCharge = false; ui.pointerId = null;
  game.fire(p);
}

function drainEvents() {
  for (const e of game.events) {
    renderer.event(e, game);
    switch (e.type) {
      case 'sfx': AU.sfx(e.name, e.v); break;
      case 'passed': AU.sfx('passed'); renderer.banner('已通关！', '继续发射，冲击更高排名', 1800, 'good'); break;
      case 'banner': renderer.banner(e.text, null, 1500, 'good'); break;
      case 'timeout': AU.sfx('timeout'); renderer.banner('时间到', '本发剩余的球已回收', 1300, 'warn'); break;
      case 'shotEnd': lastShotScore = e.shotScore; AU.sfx('shotEnd'); break;
      case 'nextShot': renderer.banner(`第 ${e.shotNo} 发`, `上一发 +${fmt(lastShotScore)} 分`, 1500, 'paper'); break;
      case 'over':
        renderer.banner(game.passed ? '挑战完成' : '三发结束', `本场 ${fmt(game.score)} 分`, 1400, game.passed ? 'good' : 'paper');
        clearTimeout(overTimer); overTimer = setTimeout(showResult, 1500);
        break;
    }
  }
  game.events.length = 0;
}

function showResult() {
  if (!game) return;
  const score = game.score, passed = game.passed;
  const rec = DB.record(curVer(), cfg.map, PB.LEVELS[cfg.map].name, player.nick, player.email, score);
  DB.flush();
  $('res-title').textContent = passed ? '通关成功' : '挑战失败';
  $('res-title').className = 'res-title ' + (passed ? 'win' : 'lose');
  $('res-score').textContent = fmt(score);
  $('res-target').textContent = `目标 ${fmt(game.target)}`;
  $('res-best').textContent = fmt(rec.best);
  $('res-rank').innerHTML = `第 ${rec.rank} 名<small>/ 共 ${rec.total} 人</small>`;
  const top = rec.sorted.slice(0, 7);
  let html = top.map((r, i) => rowHtml(r, i + 1, r.id === rec.id, false)).join('');
  if (rec.rank > 7) html += `<li><span></span><div class="nick" style="color:#8A8FA3">……</div><span></span></li>` + rowHtml(rec.sorted[rec.rank - 1], rec.rank, true, false);
  $('res-list').innerHTML = html;
  $('res-note').textContent = rec.isBest
    ? (rec.prev == null ? `${player.nick}，首个成绩已记录。` : `新的个人最高分！比之前高 ${fmt(rec.best - rec.prev)} 分。`)
    : `本场未超过个人最高分 ${fmt(rec.best)}，排行榜保留最高成绩。`;
  openModal('m-result');
  AU.sfx(passed ? 'win' : 'lose');
}

/* ---------- 输入：指针（瞄准、蓄力、发射；转向炮切换） ---------- */
cv.addEventListener('pointerdown', e => {
  if (screen !== 'game' || paused || !game || game.phase !== 'aim') return;
  e.preventDefault();
  const p = toBoard(e);
  const cannon = game.items.find(it => it.type === 'cannon' && Math.hypot(p.x - it.x, p.y - it.y) < 50);
  if (cannon) { game.cycleCannon(cannon); return; }
  aimAt(p); beginCharge(); ui.pointerId = e.pointerId;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* 某些环境不支持 */ }
});
cv.addEventListener('pointermove', e => {
  if (screen !== 'game' || paused || !game || game.phase !== 'aim') return;
  if (e.pointerType === 'mouse' || ui.charging) aimAt(toBoard(e));
});
function ptrUp(e) {
  if (!game) return;
  if (ui.charging && ui.pointerId === e.pointerId) { aimAt(toBoard(e)); doFire(); }
}
cv.addEventListener('pointerup', ptrUp);
cv.addEventListener('pointercancel', ptrUp);
cv.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- 输入：键盘 ---------- */
const KCHARGE = ['Space', 'Enter', 'ArrowDown', 'KeyS'];
window.addEventListener('keydown', e => {
  if (IS_APP) {
    // 软件里禁止刷新页面（刷新会断开存档通道）
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) { e.preventDefault(); return; }
    if (e.key === 'F11') { e.preventDefault(); setFullScreen(!prefs.full); return; }
  }
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  if (e.code === 'Escape') {
    if (!$('m-help').hidden) { closeHelp(); return; }
    if (!$('m-archive').hidden) { closeModal('m-archive'); return; }
    if (screen === 'game' && game && game.phase !== 'over') { e.preventDefault(); togglePause(); }
    else ['m-settings', 'm-admin', 'm-player'].forEach(id => { if (!$(id).hidden) closeModal(id); });
    return;
  }
  if (screen !== 'game' || paused || !game || !$('m-result').hidden || game.phase !== 'aim') return;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') { keyAim.L = true; e.preventDefault(); return; }
  if (e.code === 'KeyD' || e.code === 'ArrowRight') { keyAim.R = true; e.preventDefault(); return; }
  if (KCHARGE.includes(e.code)) { e.preventDefault(); if (!ui.charging && !e.repeat) { beginCharge(); ui.keyCharge = true; } }
});
window.addEventListener('keyup', e => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keyAim.L = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keyAim.R = false;
  if (game && KCHARGE.includes(e.code) && ui.keyCharge) doFire();
});
if (IS_APP) document.addEventListener('contextmenu', e => { if (!e.target.closest('input, textarea')) e.preventDefault(); });

function togglePause(force) {
  if (!game) return;
  paused = force !== undefined ? force : !paused;
  $('m-pause').hidden = !paused;
  if (paused) ui.charging = false;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game' && game && game.phase !== 'over') togglePause(true);
});

async function setFullScreen(on) {
  if (!IS_APP) return;
  try {
    if (on) await Neutralino.window.setFullScreen(); else await Neutralino.window.exitFullScreen();
    prefs.full = on; DB.set('prefs', prefs); $('set-full').checked = on;
  } catch (e) { /* 忽略 */ }
}

/* ---------- 按钮 ---------- */
$('btn-enter').onclick = () => { click(); show('lobby'); };
$('btn-archive').onclick = () => { click(); openArchive(); };
$('btn-quit').onclick = async () => {
  click();
  if (IS_APP) { try { await DB.flush(); } catch (_) { /* 尽量保存 */ } Neutralino.app.exit(); return; }
  try { window.close(); } catch (_) { /* 浏览器可能拒绝 */ }
  openModal('m-bye');
};
$('btn-reenter').onclick = () => { click(); closeModal('m-bye'); show('start'); };
$('btn-back').onclick = () => { click(); show('start'); };
$('btn-start').onclick = () => {
  click();
  const last = DB.get('player');
  $('in-nick').value = last ? last.nick : ''; $('in-mail').value = last ? last.email : '';
  $('player-err').textContent = '';
  openModal('m-player');
  setTimeout(() => $('in-nick').focus(), 30);
};
$('btn-player-cancel').onclick = () => { click(); closeModal('m-player'); };
$('form-player').addEventListener('submit', e => {
  e.preventDefault();
  const nick = $('in-nick').value.trim(), email = $('in-mail').value.trim();
  if (!nick) { $('player-err').textContent = '请填写昵称（1～12 个字）。'; $('in-nick').focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $('player-err').textContent = '邮箱格式不正确，例如 name@example.com。'; $('in-mail').focus(); return; }
  player = { nick, email };
  DB.set('player', player);
  closeModal('m-player'); click();
  startGame();
});
$('btn-pause').onclick = () => { click(); togglePause(true); };
$('btn-resume').onclick = () => { click(); togglePause(false); };
$('btn-abandon').onclick = () => { click(); clearTimeout(overTimer); game = null; paused = false; closeModal('m-pause'); show('lobby'); };
$('btn-ok').onclick = () => { click(); closeModal('m-result'); game = null; show('lobby'); };
function closeHelp() { closeModal('m-help'); if (helpPaused) { helpPaused = false; paused = false; } }
$('btn-help-lobby').onclick = () => { click(); openHelp(); };
$('btn-help-game').onclick = () => { click(); if (game && !paused) { paused = true; helpPaused = true; ui.charging = false; } openHelp(); };
$('btn-help-close').onclick = () => { click(); closeHelp(); };

/* 游戏设置 */
function syncSettingsUI() {
  $('set-music').value = prefs.music; $('out-music').textContent = prefs.music;
  $('set-sfx').value = prefs.sfx; $('out-sfx').textContent = prefs.sfx;
  $('set-shake').checked = prefs.shake;
  $('row-fullscreen').hidden = !IS_APP; $('set-full').checked = !!prefs.full;
}
const savePrefs = () => DB.set('prefs', prefs);
$('btn-settings').onclick = () => { click(); syncSettingsUI(); openModal('m-settings'); };
$('set-music').oninput = e => { prefs.music = +e.target.value; $('out-music').textContent = prefs.music; AU.setVolumes(prefs.music / 100, prefs.sfx / 100); savePrefs(); };
$('set-sfx').oninput = e => { prefs.sfx = +e.target.value; $('out-sfx').textContent = prefs.sfx; AU.setVolumes(prefs.music / 100, prefs.sfx / 100); savePrefs(); };
$('set-sfx').onchange = () => AU.sfx('coin');
$('set-shake').onchange = e => { prefs.shake = e.target.checked; renderer.shakeOn = prefs.shake; savePrefs(); };
$('set-full').onchange = e => setFullScreen(e.target.checked);
$('btn-settings-ok').onclick = () => { click(); closeModal('m-settings'); };

/* ---------- 活动参数 ---------- */
const SCORE_FIELDS = [
  ['bounce', '弹射/回弹道具每次碰撞'], ['cannon', '转向炮吸入'], ['coin', '金币钉 / 连动铃每枚'],
  ['chain1', '连环洞第 1 段'], ['chain2', '连环洞第 2 段'], ['chain3', '连环洞第 3 段及以后'],
  ['letter', '三连灯牌每块'], ['letterSet', '灯牌集齐奖励'], ['targetCenter', '中心靶·中心'],
  ['targetEdge', '中心靶·边缘'], ['clockRate', '储分钟每秒积累'], ['clockMax', '储分钟上限'],
  ['pot', '碎罐奖'], ['echo', '回声铃每段'], ['solo', '独响钟'],
  ['arch', '过路拱门'], ['cup', '落袋杯']
];
const PHYS_FIELDS = [['gravity', '重力（单位/秒²）', 10], ['restitution', '墙与道具恢复系数', 0.05], ['pegRestitution', '导流钉恢复系数', 0.05], ['maxSpeed', '球速上限', 10], ['flipperSpeed', '拨杆击球速度上限', 10]];
let clearArmed = 0;
function adminForm(c) {
  const num = (id, label, v, step) => `<label>${label}<input id="${id}" type="number" inputmode="decimal" step="${step || 1}" value="${v}"></label>`;
  const maps = Object.entries(PB.LEVELS).map(([k, lv]) =>
    `<label class="map-opt"><input type="radio" name="adm-map" id="adm-map-${k}" value="${k}" ${c.map === k ? 'checked' : ''}><b>${k} · ${lv.name}</b><span>${lv.tag}</span></label>`).join('');
  $('admin-body').innerHTML = `
    <div class="admin-sec" style="--sec:var(--score)">使用地图</div><div class="maps">${maps}</div>
    <div class="admin-sec" style="--sec:var(--fixed)">通关目标分（每张地图分别设置）</div>
    <div class="admin-grid">${['A', 'B', 'C'].map(k => num('adm-t-' + k, `${k} · ${PB.LEVELS[k].name}`, c.targets[k], 100)).join('')}</div>
    <div class="admin-sec" style="--sec:var(--vari)">发射、时间与拨杆</div>
    <div class="admin-grid">
      ${num('adm-shots', '主动发射次数', c.shots)}${num('adm-time', '每发时间上限（秒）', c.shotTime)}
      <label>自动拨杆<select id="adm-flip"><option value="1" ${c.flippers ? 'selected' : ''}>开启</option><option value="0" ${!c.flippers ? 'selected' : ''}>关闭</option></select></label>
      ${num('adm-fcd', '自动拨杆冷却（秒）', c.flipperCooldown, 0.1)}
    </div>
    <div class="admin-sec" style="--sec:var(--fixed)">施力道具</div>
    <div class="admin-grid">
      ${num('adm-fo-fixed', '固定弹射：出射速度', c.force.fixed, 10)}
      ${num('adm-fo-varGain', '变速回弹：来速倍率', c.force.varGain, 0.05)}
      ${num('adm-fo-varMin', '变速回弹：最小出射速度', c.force.varMin, 10)}
    </div>
    <div class="admin-sec" style="--sec:var(--spawn)">生成新球</div>
    <div class="admin-grid">
      ${num('adm-cap', '每发新增球上限', c.newBallCap)}${num('adm-ent', '场上同时存在球数上限', c.maxEntities)}
      ${num('adm-cd-gift', '双球礼盒冷却（秒）', c.spawnCd.gift, 0.5)}${num('adm-cd-nest', '小球鸟巢冷却（秒）', c.spawnCd.nest, 0.5)}
      ${num('adm-cd-split', '分裂水晶冷却（秒）', c.spawnCd.split, 0.5)}${num('adm-cd-salute', '三响礼炮冷却（秒）', c.spawnCd.salute, 0.5)}
    </div>
    <div class="admin-sec" style="--sec:var(--link)">物理参数</div>
    <div class="admin-grid">${PHYS_FIELDS.map(([k, l, st]) => num('adm-p-' + k, l, c.physics[k], st)).join('')}</div>
    <div class="admin-sec" style="--sec:var(--score)">道具得分</div>
    <div class="admin-grid">${SCORE_FIELDS.map(([k, l]) => num('adm-s-' + k, l, c.scores[k], 5)).join('')}</div>`;
  $('admin-body').querySelectorAll('input,select').forEach(el => el.addEventListener('input', updateVerLabel));
  updateVerLabel();
}
function readAdmin() {
  const c = clone(cfg), D = PB.DEFAULTS;
  const v = (id, lo, hi, dflt, int) => { let x = parseFloat($(id).value); if (!isFinite(x)) x = dflt; x = Math.min(hi, Math.max(lo, x)); return int ? Math.round(x) : Math.round(x * 100) / 100; };
  const m = document.querySelector('input[name="adm-map"]:checked'); c.map = m ? m.value : 'A';
  ['A', 'B', 'C'].forEach(k => c.targets[k] = v('adm-t-' + k, 100, 1e7, D.targets[k], true));
  c.shots = v('adm-shots', 1, 10, D.shots, true); c.shotTime = v('adm-time', 5, 120, D.shotTime, true);
  c.flippers = $('adm-flip').value === '1'; c.flipperCooldown = v('adm-fcd', 0.2, 10, D.flipperCooldown);
  c.force.fixed = v('adm-fo-fixed', 300, 2000, D.force.fixed, true);
  c.force.varGain = v('adm-fo-varGain', 0.5, 3, D.force.varGain);
  c.force.varMin = v('adm-fo-varMin', 0, 1500, D.force.varMin, true);
  c.newBallCap = v('adm-cap', 0, 30, D.newBallCap, true); c.maxEntities = v('adm-ent', 1, 15, D.maxEntities, true);
  ['gift', 'nest', 'split', 'salute'].forEach(k => c.spawnCd[k] = v('adm-cd-' + k, 0.5, 60, D.spawnCd[k]));
  c.physics.gravity = v('adm-p-gravity', 100, 3000, D.physics.gravity); c.physics.restitution = v('adm-p-restitution', 0.1, 0.98, D.physics.restitution);
  c.physics.pegRestitution = v('adm-p-pegRestitution', 0.1, 0.98, D.physics.pegRestitution); c.physics.maxSpeed = v('adm-p-maxSpeed', 300, 3000, D.physics.maxSpeed);
  c.physics.flipperSpeed = v('adm-p-flipperSpeed', 300, 3000, D.physics.flipperSpeed);
  SCORE_FIELDS.forEach(([k]) => c.scores[k] = v('adm-s-' + k, 0, 100000, D.scores[k], true));
  return c;
}
function updateVerLabel() {
  try { const c = readAdmin(); $('admin-ver').textContent = `保存后规则版本：${ruleVersion(c)}（当前 ${curVer()}）`; } catch (_) { /* 表单未就绪 */ }
}
$('btn-admin').onclick = () => { click(); adminForm(cfg); $('clear-confirm').hidden = true; clearArmed = 0; openModal('m-admin'); };
$('btn-admin-cancel').onclick = () => { click(); closeModal('m-admin'); };
$('btn-admin-reset').onclick = () => { click(); adminForm(clone(PB.DEFAULTS)); toast('已填入默认值，点击“保存”生效'); };
$('btn-admin-save').onclick = () => {
  click();
  cfg = readAdmin(); DB.set('config', cfg);
  refreshPreview(); renderer.buildLayers(cfg.flippers);
  closeModal('m-admin'); toast('已保存 · 规则版本 ' + curVer());
};
$('btn-admin-clear').onclick = () => {
  if (Date.now() - clearArmed > 3000) { clearArmed = Date.now(); $('clear-confirm').hidden = false; return; }
  DB.clearBoard(curVer()); clearArmed = 0; $('clear-confirm').hidden = true; toast('当前规则版本的榜单已清空');
};

/* ---------- 主循环 ---------- */
let lastTs = 0, acc = 0;
const STEP = 1 / 480;
function loop(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000)); lastTs = ts;
  if (screen === 'game' && game) {
    if (!paused) {
      if (game.phase === 'aim') {
        if (keyAim.L) game.setAim(game.aim - 1.0 * dt);
        if (keyAim.R) game.setAim(game.aim + 1.0 * dt);
        if (ui.charging) {
          ui.power = chargePower();
          if (ui.power >= 1 && !ui.fullCued) { ui.fullCued = true; AU.sfx('button'); }
        }
      } else ui.charging = false;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 30) { game.step(STEP); acc -= STEP; n++; }
      if (n >= 30) acc = 0;
      drainEvents();
    }
    renderer.frameGame(game, ui, paused ? 0 : dt);
  } else {
    renderer.frameMenu(screen, dt, previewGame, previewKey);
  }
  requestAnimationFrame(loop);
}

/* ---------- 启动：先读存档，再显示界面 ---------- */
async function boot() {
  if (IS_APP) {
    try { Neutralino.init(); } catch (e) { /* 继续以网页模式运行 */ }
    try { Neutralino.events.on('windowClose', async () => { try { await DB.flush(); } catch (_) { /* 尽量保存 */ } Neutralino.app.exit(); }); } catch (e) { /* 忽略 */ }
  }
  await DB.init();
  window.addEventListener('pagehide', () => { DB.flush(); });
  window.addEventListener('beforeunload', () => { DB.flush(); });
  cfg = mergeCfg(DB.get('config'));
  prefs = Object.assign(prefs, DB.get('prefs') || {});
  renderer.shakeOn = prefs.shake;
  PB.app = { get game() { return game; }, get screen() { return screen; }, DB };
  refreshPreview();
  fit();
  show('start');
  requestAnimationFrame(loop);
  if (IS_APP && prefs.full) setFullScreen(true);
  if (DB.lastError) toast(DB.lastError, 5000);
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('40px "ZCOOL KuaiLe"', '弹珠游园会回收区第发分剩余通关进度本发秒数可新增球入出钮门已领场上道具颜色固定弹射变速回弹生成新球碰撞得分联动储球自动拨杆冷却'),
      document.fonts.load('800 30px "Baloo 2"', '0123456789,/+.')
    ]).catch(() => {}).then(() => { renderer.buildLayers(cfg.flippers); refreshPreview(); });
  }
}
boot();
})();
