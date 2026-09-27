// Canvas board: draws the snapshot, animates steps from the engine, and turns touches into swaps.
import { K, B } from './engine.js';
import { TILE_COLOURS } from './art.js';

const ease = { out: (t) => 1 - (1 - t) * (1 - t), in: (t) => t * t, inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
const SKINS = {
  normal: { cell: '#0C3428', cell2: '#0E3A2D', panel: 'rgba(0,0,0,0.28)' },
  green: { cell: '#2F7A3A', cell2: '#35843F', panel: 'rgba(0,30,10,0.35)' },
  night: { cell: '#131C38', cell2: '#172245', panel: 'rgba(0,0,0,0.4)' },
};

export class BoardView {
  constructor(canvas, images) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.img = images;
    this.sprites = new Map();
    this.snap = null;
    this.parts = []; this.fx = []; this.texts = [];
    this.sel = -1; this.hintCells = null;
    this.running = false; this.t0 = performance.now();
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onSwap = null; this.onTapSpecial = null; this.onAnyInput = null;
    this.locked = false;
    this.speed = 1;
    this.bindInput();
  }

  layout(level, maxW, maxH) {
    this.W = level.cols; this.H = level.rows; this.skin = SKINS[level.skin] || SKINS.normal;
    const pad = 8;
    this.cell = Math.floor(Math.min((maxW - pad * 2) / this.W, (maxH - pad * 2) / this.H));
    this.pad = pad;
    const w = this.cell * this.W + pad * 2, h = this.cell * this.H + pad * 2;
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.cv.width = Math.round(w * this.dpr); this.cv.height = Math.round(h * this.dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.cssW = w; this.cssH = h;
    this.kick();
  }

  setBoard(snap) {
    this.snap = snap; this.sprites.clear();
    for (let i = 0; i < snap.kind.length; i++) if (snap.kind[i]) this.sprites.set(snap.id[i], this.spriteFrom(snap, i));
    this.parts = []; this.fx = []; this.texts = []; this.sel = -1; this.hintCells = null;
    this.kick();
  }

  spriteFrom(s, i) {
    return { id: s.id[i], x: i % s.W, y: (i / s.W) | 0, kind: s.kind[i], col: s.col[i], clamp: s.clamp[i], sc: 1, a: 1, rot: 0, anim: null };
  }

  // ---------- animation ----------
  tween(sp, to, dur, fn = ease.out, delay = 0) {
    const from = { x: sp.x, y: sp.y, sc: sp.sc, a: sp.a, rot: sp.rot };
    sp.anim = { from, to, t0: performance.now() + delay * this.speed, dur: dur * this.speed, fn };
  }

  wait(ms) { return new Promise((r) => setTimeout(r, this.reduce ? Math.min(ms, 60) : ms * this.speed)); }

  async play(steps, onStep) {
    for (const st of steps) {
      if (onStep) onStep(st);
      await this.playStep(st);
    }
  }

  async playStep(st) {
    const next = st.board;
    const fx = st.fx || [];
    const swap = fx.find((f) => f.t === 'swap');
    const kick = () => this.kick();
    if (swap) {
      const A = this.spriteAt(swap.a), Bs = this.spriteAt(swap.b);
      const [ax, ay] = this.xy(swap.a), [bx, by] = this.xy(swap.b);
      if (A) this.tween(A, { x: bx, y: by }, 170, ease.inOut);
      if (Bs) this.tween(Bs, { x: ax, y: ay }, 170, ease.inOut);
      kick(); await this.wait(180);
      this.snap = next; this.syncStatic(next);
      return;
    }
    if (fx.some((f) => f.t === 'shuffle')) {
      for (const sp of this.sprites.values()) this.tween(sp, { sc: 0.2, rot: Math.PI }, 220, ease.in);
      kick(); await this.wait(230);
      this.snap = next; this.rebuild(next);
      for (const sp of this.sprites.values()) { sp.sc = 0.2; sp.rot = -Math.PI; this.tween(sp, { sc: 1, rot: 0 }, 260, ease.back); }
      kick(); await this.wait(280);
      return;
    }
    // effects first, so beams and blasts show while tiles pop
    let extra = 0;
    for (const f of fx) extra = Math.max(extra, this.addFx(f));
    const nextIds = new Set();
    for (let i = 0; i < next.kind.length; i++) if (next.kind[i]) nextIds.add(next.id[i]);
    // removed
    for (const [id, sp] of this.sprites) {
      if (nextIds.has(id)) continue;
      const delay = sp.delay || 0;
      this.tween(sp, { sc: 1.25, a: 0 }, 200, ease.out, delay);
      sp.dying = performance.now() + 200 + delay;
      this.burst(sp.x, sp.y, sp.col >= 0 ? TILE_COLOURS[sp.col] : '#F5EEDC', 7, delay);
    }
    // moved, new and spawned
    const fall = st.fall;
    let longest = 0;
    for (let i = 0; i < next.kind.length; i++) {
      if (!next.kind[i]) continue;
      const id = next.id[i], x = i % next.W, y = (i / next.W) | 0;
      let sp = this.sprites.get(id);
      if (!sp) {
        sp = this.spriteFrom(next, i);
        const fromY = fall && fall.get ? fall.get(id) : undefined;
        if (fromY !== undefined) {
          sp.y = fromY; sp.a = 1;
          const dur = Math.min(520, 90 + (y - fromY) * 55);
          this.tween(sp, { y }, dur, ease.in); longest = Math.max(longest, dur);
        } else {
          sp.sc = 0; this.tween(sp, { sc: 1 }, 260, ease.back, 80); longest = Math.max(longest, 340);
        }
        this.sprites.set(id, sp);
      } else {
        if (sp.kind !== next.kind[i]) { sp.kind = next.kind[i]; sp.sc = 1.35; this.tween(sp, { sc: 1 }, 240, ease.back); }
        sp.col = next.col[i]; sp.clamp = next.clamp[i];
        if (sp.x !== x || sp.y !== y) {
          const dist = Math.hypot(sp.x - x, sp.y - y);
          const dur = Math.min(520, 90 + dist * 55);
          this.tween(sp, { x, y }, dur, ease.in); longest = Math.max(longest, dur);
        }
      }
    }
    this.snap = next;
    kick();
    const hasClear = [...this.sprites.values()].some((s) => s.dying);
    await this.wait(Math.max(longest + 30, hasClear ? 230 : 0, extra));
    for (const [id, sp] of this.sprites) if (sp.dying) this.sprites.delete(id);
  }

  syncStatic(next) {
    for (let i = 0; i < next.kind.length; i++) {
      if (!next.kind[i]) continue;
      const sp = this.sprites.get(next.id[i]);
      if (sp) { sp.x = i % next.W; sp.y = (i / next.W) | 0; sp.anim = null; }
    }
  }

  rebuild(next) {
    this.sprites.clear();
    for (let i = 0; i < next.kind.length; i++) if (next.kind[i]) this.sprites.set(next.id[i], this.spriteFrom(next, i));
  }

  spriteAt(i) { return this.sprites.get(this.snap.id[i]); }
  xy(i) { return [i % this.W, (i / this.W) | 0]; }

  // ---------- effects ----------
  addFx(f) {
    const now = performance.now();
    if (f.t === 'cab') { this.fx.push({ t: 'cab', i: f.i, dir: f.dir, t0: now, dur: 420 }); return 300; }
    if (f.t === 'ben') { this.fx.push({ t: 'ben', i: f.i, r: f.r, t0: now, dur: 520 }); const [x, y] = this.xy(f.i); this.burst(x, y, '#F0C861', 18); return 300; }
    if (f.t === 'button') { this.fx.push({ t: 'button', i: f.i, cells: f.cells, t0: now, dur: 520 }); return 380; }
    if (f.t === 'wood') { this.fx.push({ t: 'wood', i: f.i, path: f.path, t0: now, dur: 120 + f.path.length * 55 }); return 120 + f.path.length * 55; }
    if (f.t === 'rush') { this.fx.push({ t: 'ben', i: f.i, r: 1.5, t0: now, dur: 600 }); return 300; }
    if (f.t === 'made') { const [x, y] = this.xy(f.i); this.burst(x, y, '#F0C861', 10); return 0; }
    return 0;
  }

  burst(cx, cy, colour, n, delay = 0) {
    if (this.reduce) return;
    const now = performance.now() + delay;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.5;
      this.parts.push({ x: cx + 0.5, y: cy + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, t0: now, life: 420 + Math.random() * 300, c: colour, s: 0.08 + Math.random() * 0.08 });
    }
  }

  floatText(i, text, colour = '#F5EEDC') {
    const [x, y] = this.xy(i);
    this.texts.push({ x: x + 0.5, y: y + 0.5, text, colour, t0: performance.now(), dur: 900 });
    this.kick();
  }

  setHint(cells) { this.hintCells = cells; this.kick(); }
  clearHint() { this.hintCells = null; }

  // ---------- drawing ----------
  kick() { if (!this.running) { this.running = true; requestAnimationFrame((t) => this.frame(t)); } }

  frame(now) {
    const active = this.draw(now);
    if (active) requestAnimationFrame((t) => this.frame(t)); else this.running = false;
  }

  draw(now) {
    const { ctx, cell, pad, snap } = this;
    if (!snap) return false;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    let active = false;
    const X = (x) => pad + x * cell, Y = (y) => pad + y * cell;
    const r = Math.max(4, cell * 0.16);
    // panel
    ctx.fillStyle = this.skin.panel;
    rr(ctx, 0, 0, this.cssW, this.cssH, 18); ctx.fill();
    // cells, puddles, blockers
    for (let i = 0; i < snap.kind.length; i++) {
      if (snap.hole[i]) continue;
      const x = i % snap.W, y = (i / snap.W) | 0;
      ctx.fillStyle = (x + y) % 2 ? this.skin.cell : this.skin.cell2;
      rr(ctx, X(x) + 1.5, Y(y) + 1.5, cell - 3, cell - 3, r); ctx.fill();
      if (snap.puddle[i]) {
        ctx.fillStyle = snap.puddle[i] > 1 ? 'rgba(60,125,215,0.72)' : 'rgba(78,150,222,0.45)';
        rr(ctx, X(x) + 1.5, Y(y) + 1.5, cell - 3, cell - 3, r); ctx.fill();
        ctx.strokeStyle = 'rgba(170,215,250,0.55)'; ctx.lineWidth = 1.5;
        rr(ctx, X(x) + 2.5, Y(y) + 2.5, cell - 5, cell - 5, r); ctx.stroke();
      }
    }
    // tiles
    const drawList = [...this.sprites.values()];
    for (const sp of drawList) {
      if (sp.anim) {
        const k = Math.max(0, Math.min(1, (now - sp.anim.t0) / sp.anim.dur));
        const e = sp.anim.fn(k);
        for (const key of Object.keys(sp.anim.to)) sp[key] = sp.anim.from[key] + (sp.anim.to[key] - sp.anim.from[key]) * e;
        if (k >= 1) sp.anim = null; else active = true;
      }
      if (sp.dying) active = true;
      if (sp.y < -0.9) continue;
      let sc = sp.sc;
      const i = Math.round(sp.y) * this.W + Math.round(sp.x);
      if (this.hintCells && this.hintCells.includes(i) && !sp.anim) { sc *= 1 + 0.08 * Math.max(0, Math.sin((now - this.t0) / 180)); active = true; }
      if (this.sel === i && !sp.anim) sc *= 1.1;
      this.drawTile(sp, X(sp.x), Y(sp.y), cell, sc);
    }
    // clip spawns above the board: redraw panel top strip
    // blockers above tiles
    for (let i = 0; i < snap.kind.length; i++) {
      if (!snap.blk[i]) continue;
      const x = i % snap.W, y = (i / snap.W) | 0;
      const im = snap.blk[i] === B.FOG ? this.img.overlays.fog : snap.bhp[i] > 1 ? this.img.overlays.cone : this.img.overlays.cone1;
      if (im) ctx.drawImage(im, X(x) + cell * 0.04, Y(y) + cell * 0.04, cell * 0.92, cell * 0.92);
    }
    // selection
    if (this.sel >= 0) {
      const [x, y] = this.xy(this.sel);
      ctx.strokeStyle = '#D9A93A'; ctx.lineWidth = 3.5;
      rr(ctx, X(x) + 2, Y(y) + 2, cell - 4, cell - 4, r); ctx.stroke();
    }
    active = this.drawFx(now, X, Y) || active;
    active = this.drawParts(now, X, Y) || active;
    active = this.drawTexts(now, X, Y) || active;
    // hide tiles falling in from above the board
    ctx.clearRect(0, 0, this.cssW, pad - 1);
    return active || this.sel >= 0;
  }

  drawTile(sp, px, py, cell, sc) {
    const { ctx } = this;
    const s = cell * 0.86 * Math.max(0, sc);
    if (s < 1) return;
    const cx = px + cell / 2, cy = py + cell / 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, sp.a));
    ctx.translate(cx, cy); if (sp.rot) ctx.rotate(sp.rot);
    let im = null;
    if (sp.kind === K.NORMAL) im = this.img.tiles[sp.col];
    else {
      if (sp.col >= 0 && sp.kind !== K.EEL && sp.kind !== K.JACK) {
        const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.56);
        g.addColorStop(0, TILE_COLOURS[sp.col]); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.56, 0, 7); ctx.fill();
      }
      im = this.img.specials[{ [K.CABH]: 'cabh', [K.CABV]: 'cabv', [K.BEN]: 'ben', [K.BUTTON]: 'button', [K.WOOD]: 'wood', [K.EEL]: 'eel', [K.JACK]: 'jack' }[sp.kind]];
    }
    if (im) {
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowOffsetY = cell * 0.04;
      ctx.drawImage(im, -s / 2, -s / 2, s, s);
      ctx.shadowColor = 'transparent';
    }
    if (sp.clamp) {
      const o = sp.clamp > 1 ? this.img.overlays.clamp2 : this.img.overlays.clamp;
      if (o) ctx.drawImage(o, -cell * 0.5, -cell * 0.5, cell, cell);
    }
    ctx.restore();
  }

  drawFx(now, X, Y) {
    const { ctx, cell } = this;
    let active = false;
    this.fx = this.fx.filter((f) => now - f.t0 < f.dur);
    for (const f of this.fx) {
      active = true;
      const k = Math.max(0, Math.min(1, (now - f.t0) / f.dur));
      const [fx, fy] = this.xy(f.i);
      if (f.t === 'cab') {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = 'rgba(255,199,44,0.55)';
        if (f.dir === 'h') ctx.fillRect(X(0), Y(fy) + cell * 0.3, cell * this.W, cell * 0.4);
        else ctx.fillRect(X(fx) + cell * 0.3, Y(0), cell * 0.4, cell * this.H);
        ctx.globalAlpha = 1;
        const im = this.img.specials[f.dir === 'h' ? 'cabh' : 'cabv'];
        const p = ease.inOut(k);
        for (const sgn of [-1, 1]) {
          const cx = f.dir === 'h' ? fx + sgn * p * this.W : fx, cy = f.dir === 'v' ? fy + sgn * p * this.H : fy;
          if (im) ctx.drawImage(im, X(cx), Y(cy), cell, cell);
        }
        ctx.restore();
      } else if (f.t === 'ben') {
        const rad = (f.r + 0.5) * cell * ease.out(k) * 1.1;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#F0C861'; ctx.lineWidth = cell * 0.18 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc(X(fx) + cell / 2, Y(fy) + cell / 2, rad, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,190,0.25)'; ctx.fill();
        ctx.restore();
      } else if (f.t === 'button') {
        ctx.save();
        ctx.globalAlpha = 1 - k * 0.7;
        ctx.strokeStyle = '#FFF7E0'; ctx.lineWidth = 2.5; ctx.shadowColor = '#D9A93A'; ctx.shadowBlur = 10;
        const n = Math.ceil(f.cells.length * Math.min(1, k * 2.5));
        for (let q = 0; q < n; q++) {
          const [tx, ty] = this.xy(f.cells[q]);
          ctx.beginPath(); ctx.moveTo(X(fx) + cell / 2, Y(fy) + cell / 2);
          const mx = (X(fx) + X(tx)) / 2 + cell / 2 + (Math.random() - 0.5) * cell * 0.6, my = (Y(fy) + Y(ty)) / 2 + cell / 2 + (Math.random() - 0.5) * cell * 0.6;
          ctx.lineTo(mx, my); ctx.lineTo(X(tx) + cell / 2, Y(ty) + cell / 2); ctx.stroke();
        }
        ctx.restore();
      } else if (f.t === 'wood') {
        const pts = [[fx, fy], ...f.path.map((i) => this.xy(i))];
        const pos = k * (pts.length - 1), a = Math.floor(pos), b = Math.min(pts.length - 1, a + 1), t = pos - a;
        const x = pts[a][0] + (pts[b][0] - pts[a][0]) * t, y = pts[a][1] + (pts[b][1] - pts[a][1]) * t;
        ctx.save();
        ctx.strokeStyle = 'rgba(245,238,220,0.35)'; ctx.lineWidth = cell * 0.12; ctx.setLineDash([cell * 0.1, cell * 0.14]);
        ctx.beginPath(); ctx.moveTo(X(pts[0][0]) + cell / 2, Y(pts[0][1]) + cell / 2);
        for (let q = 1; q <= a; q++) ctx.lineTo(X(pts[q][0]) + cell / 2, Y(pts[q][1]) + cell / 2);
        ctx.lineTo(X(x) + cell / 2, Y(y) + cell / 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.translate(X(x) + cell / 2, Y(y) + cell / 2); ctx.rotate(k * 12);
        const im = this.img.specials.wood;
        if (im) ctx.drawImage(im, -cell * 0.45, -cell * 0.45, cell * 0.9, cell * 0.9);
        ctx.restore();
      }
    }
    return active;
  }

  drawParts(now, X, Y) {
    const { ctx, cell } = this;
    this.parts = this.parts.filter((p) => now - p.t0 < p.life);
    for (const p of this.parts) {
      const t = (now - p.t0) / 1000;
      if (t < 0) continue;
      const x = p.x + p.vx * t, y = p.y + p.vy * t + 9 * t * t;
      ctx.globalAlpha = 1 - (now - p.t0) / p.life;
      ctx.fillStyle = p.c;
      ctx.fillRect(X(x) - (p.s * cell) / 2, Y(y) - (p.s * cell) / 2, p.s * cell, p.s * cell);
    }
    ctx.globalAlpha = 1;
    return this.parts.length > 0;
  }

  drawTexts(now, X, Y) {
    const { ctx, cell } = this;
    this.texts = this.texts.filter((t) => now - t.t0 < t.dur);
    for (const t of this.texts) {
      const k = (now - t.t0) / t.dur;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `700 ${Math.round(cell * 0.42)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,43,33,0.9)';
      const y = Y(t.y - k * 0.8);
      ctx.strokeText(t.text, X(t.x), y); ctx.fillStyle = t.colour; ctx.fillText(t.text, X(t.x), y);
      ctx.restore();
    }
    return this.texts.length > 0;
  }

  // ---------- input ----------
  cellAt(ev) {
    const b = this.cv.getBoundingClientRect();
    const x = Math.floor((ev.clientX - b.left - this.pad) / this.cell), y = Math.floor((ev.clientY - b.top - this.pad) / this.cell);
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return -1;
    return y * this.W + x;
  }

  bindInput() {
    let down = null;
    this.cv.addEventListener('pointerdown', (ev) => {
      if (this.onAnyInput) this.onAnyInput();
      if (this.locked) return;
      const i = this.cellAt(ev);
      if (i < 0 || !this.snap || this.snap.hole[i]) return;
      down = { i, x: ev.clientX, y: ev.clientY, used: false };
      try { this.cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    });
    this.cv.addEventListener('pointermove', (ev) => {
      if (!down || down.used || this.locked) return;
      const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cell * 0.35) return;
      const [x, y] = this.xy(down.i);
      const nx = Math.abs(dx) > Math.abs(dy) ? x + Math.sign(dx) : x, ny = Math.abs(dx) > Math.abs(dy) ? y : y + Math.sign(dy);
      down.used = true;
      if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) return;
      this.sel = -1;
      if (this.onSwap) this.onSwap(down.i, ny * this.W + nx);
    });
    const up = (ev) => {
      if (!down) return;
      const d = down; down = null;
      if (d.used || this.locked) return;
      const i = d.i;
      if (this.sel === -1) { this.sel = i; this.kick(); return; }
      if (this.sel === i) {
        const k = this.snap.kind[i];
        this.sel = -1;
        if (k >= K.CABH && k <= K.WOOD && this.onTapSpecial) this.onTapSpecial(i);
        this.kick(); return;
      }
      const [ax, ay] = this.xy(this.sel), [bx, by] = this.xy(i);
      if (Math.abs(ax - bx) + Math.abs(ay - by) === 1) { const a = this.sel; this.sel = -1; if (this.onSwap) this.onSwap(a, i); }
      else { this.sel = i; }
      this.kick();
    };
    this.cv.addEventListener('pointerup', up);
    this.cv.addEventListener('pointercancel', () => { down = null; });
  }

  // Wobble a failed swap
  async nope(a, b) {
    const A = this.spriteAt(a), Bs = this.spriteAt(b);
    if (!A || !Bs) return;
    const [ax, ay] = [A.x, A.y], [bx, by] = [Bs.x, Bs.y];
    this.tween(A, { x: ax + (bx - ax) * 0.35, y: ay + (by - ay) * 0.35 }, 110, ease.out);
    this.tween(Bs, { x: bx + (ax - bx) * 0.35, y: by + (ay - by) * 0.35 }, 110, ease.out);
    this.kick(); await this.wait(120);
    this.tween(A, { x: ax, y: ay }, 140, ease.back); this.tween(Bs, { x: bx, y: by }, 140, ease.back);
    this.kick(); await this.wait(150);
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
