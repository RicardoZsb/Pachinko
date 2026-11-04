/* ===== 存档：参数、设置与排行榜的永久保存 =====
   · Windows 软件里：写入“文档\弹珠游园会\存档.json”，并同步生成“排行榜.csv”（Excel 可直接打开）
   · 浏览器里：写入本浏览器的 localStorage
   · 每个规则版本一个榜单；同一“邮箱＋昵称”只保留最高分；记录始终按得分从高到低排列 */
(function () {
'use strict';
const PB = window.PB;
const LS_KEY = 'pbfair.v2.db';
const OLD = 'pbfair.v2.';

const pad = n => String(n).padStart(2, '0');
const fmtTime = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const sortRecs = recs => recs.sort((a, b) => b.best - a.best || a.at - b.at);
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

const DB = PB.DB = {
  mode: 'web',        // 'web' | 'app'
  dir: '', file: '', csv: '', backup: '',
  data: { config: null, prefs: null, player: null, boards: {} },
  lastError: '',
  _timer: 0, _writing: null, _dirty: false, _backedUp: false,

  isApp() { return this.mode === 'app'; },

  async init() {
    const app = typeof window.Neutralino !== 'undefined' && typeof window.NL_OS !== 'undefined';
    if (app) {
      this.mode = 'app';
      try {
        const docs = await Neutralino.os.getPath('documents');
        this.dir = docs.replace(/[\\/]+$/, '') + '/弹珠游园会';
        this.file = this.dir + '/存档.json';
        this.csv = this.dir + '/排行榜.csv';
        this.backup = this.dir + '/存档.上次启动备份.json';
        try { await Neutralino.filesystem.createDirectory(this.dir); } catch (e) { /* 已存在 */ }
        let txt = null;
        try { txt = await Neutralino.filesystem.readFile(this.file); } catch (e) { /* 首次运行 */ }
        if (txt) this.load(JSON.parse(txt));
      } catch (e) {
        this.lastError = '读取存档失败：' + (e && (e.message || e.code) || e);
      }
      return;
    }
    this.mode = 'web';
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) this.load(JSON.parse(raw));
      else this.migrateOld();
    } catch (e) { /* 无痕模式或禁用存储：只在内存中保存 */ }
  },

  /* 第 2 版早期的分散键 → 统一存档 */
  migrateOld() {
    try {
      const get = k => { const v = localStorage.getItem(OLD + k); return v ? JSON.parse(v) : null; };
      this.data.config = get('config'); this.data.prefs = get('prefs'); this.data.player = get('player');
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf(OLD + 'lb.') !== 0) continue;
        const ver = k.slice((OLD + 'lb.').length), recs = JSON.parse(localStorage.getItem(k)) || [];
        if (!recs.length) continue;
        const map = ver.split('-')[0];
        const b = this.board(ver, map);
        b.records = sortRecs(recs.map(r => ({ id: r.id, nick: r.nick, email: r.email, best: r.best, at: r.at, plays: r.plays || 1, last: r.at })));
      }
      if (this.data.config || Object.keys(this.data.boards).length) this.save();
    } catch (e) { /* 忽略 */ }
  },

  load(obj) {
    if (!obj || typeof obj !== 'object') return;
    this.data.config = obj.config || null;
    this.data.prefs = obj.prefs || null;
    this.data.player = obj.player || null;
    this.data.boards = {};
    const list = Array.isArray(obj.boards) ? obj.boards : Object.values(obj.boards || {});
    for (const b of list) {
      if (!b || !b.ver) continue;
      const recs = (b.records || []).map(r => ({
        id: r.id || ((r.email || '').toLowerCase() + '|' + r.nick), nick: r.nick, email: r.email,
        best: +r.best || 0, at: +r.at || 0, plays: +r.plays || 1, last: +r.last || +r.at || 0
      }));
      this.data.boards[b.ver] = { ver: b.ver, map: b.map || b.ver.split('-')[0], mapName: b.mapName || '', created: +b.created || Date.now(), updated: +b.updated || 0, records: sortRecs(recs) };
    }
  },

  /* 写盘内容：榜单按最近更新排列，每个榜单内按得分从高到低 */
  serialize() {
    const boards = Object.values(this.data.boards).filter(b => b.records.length)
      .sort((a, b) => b.updated - a.updated)
      .map(b => ({
        ver: b.ver, map: b.map, mapName: b.mapName, created: b.created, updated: b.updated, count: b.records.length,
        records: sortRecs(b.records.slice()).map((r, i) => ({
          rank: i + 1, nick: r.nick, email: r.email, best: r.best, time: fmtTime(r.at), plays: r.plays,
          id: r.id, at: r.at, last: r.last
        }))
      }));
    return {
      说明: '弹珠游园会存档。每个规则版本一个榜单，记录按最高分从高到低排列；同一邮箱＋昵称只保留最高分。',
      v: 2, savedAt: fmtTime(Date.now()),
      boards, config: this.data.config, prefs: this.data.prefs, player: this.data.player
    };
  },

  toCSV(onlyVer) {
    const head = ['名次', '昵称', '邮箱', '最高分', '游玩次数', '最高分时间', '地图', '规则版本'];
    const rows = [head];
    const boards = Object.values(this.data.boards).filter(b => b.records.length && (!onlyVer || b.ver === onlyVer))
      .sort((a, b) => b.updated - a.updated);
    for (const b of boards) {
      sortRecs(b.records.slice()).forEach((r, i) => rows.push([i + 1, r.nick, r.email, r.best, r.plays, fmtTime(r.at), `${b.map} ${b.mapName}`, b.ver]));
    }
    return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  },

  save() {
    this._dirty = true;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), 120);
  },

  async flush() {
    clearTimeout(this._timer);
    if (!this._dirty) return this._writing;
    this._dirty = false;
    const payload = this.serialize();
    if (this.mode === 'web') {
      try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch (e) { this.lastError = '浏览器存储不可用，成绩只保存在本次打开期间。'; }
      return;
    }
    const run = async () => {
      const fs = Neutralino.filesystem;
      try {
        if (!this._backedUp) {
          this._backedUp = true;
          try { const old = await fs.readFile(this.file); if (old) await fs.writeFile(this.backup, old); } catch (e) { /* 首次没有旧存档 */ }
        }
        const text = JSON.stringify(payload, null, 2);
        const tmp = this.file + '.tmp';
        await fs.writeFile(tmp, text);
        try { await fs.move(tmp, this.file); }
        catch (e) { await fs.writeFile(this.file, text); try { await fs.remove(tmp); } catch (_) { /* 忽略 */ } }
        await fs.writeFile(this.csv, this.toCSV());
        this.lastError = '';
      } catch (e) {
        this.lastError = '写入存档失败：' + (e && (e.message || e.code) || e);
        if (PB.onStoreError) PB.onStoreError(this.lastError);
      }
    };
    this._writing = (this._writing || Promise.resolve()).then(run);
    return this._writing;
  },

  /* ---------- 设置类 ---------- */
  get(key) { return this.data[key]; },
  set(key, val) { this.data[key] = val; this.save(); },

  /* ---------- 榜单 ---------- */
  board(ver, map, mapName) {
    let b = this.data.boards[ver];
    if (!b) b = this.data.boards[ver] = { ver, map: map || ver.split('-')[0], mapName: mapName || '', created: Date.now(), updated: 0, records: [] };
    if (mapName && !b.mapName) b.mapName = mapName;
    return b;
  },
  records(ver) { const b = this.data.boards[ver]; return b ? sortRecs(b.records) : []; },
  boardsList() { return Object.values(this.data.boards).filter(b => b.records.length).sort((a, b) => b.updated - a.updated); },

  record(ver, map, mapName, nick, email, score) {
    const b = this.board(ver, map, mapName);
    const id = email.toLowerCase() + '|' + nick;
    const now = Date.now();
    let r = b.records.find(x => x.id === id), isBest = false;
    const prev = r ? r.best : null;
    if (!r) { r = { id, nick, email: email.toLowerCase(), best: score, at: now, plays: 1, last: now }; b.records.push(r); isBest = true; }
    else { r.plays = (r.plays || 0) + 1; r.last = now; if (score > r.best) { r.best = score; r.at = now; isBest = true; } }
    b.updated = now;
    sortRecs(b.records);
    this.save();
    return { isBest, prev, best: r.best, rank: b.records.findIndex(x => x.id === id) + 1, total: b.records.length, sorted: b.records, id };
  },

  removeRecord(ver, id) {
    const b = this.data.boards[ver]; if (!b) return false;
    const n = b.records.length;
    b.records = b.records.filter(r => r.id !== id);
    if (b.records.length !== n) { b.updated = Date.now(); this.save(); return true; }
    return false;
  },
  clearBoard(ver) {
    if (!this.data.boards[ver]) return;
    delete this.data.boards[ver];
    this.save();
  },
  fmtTime
};
})();
