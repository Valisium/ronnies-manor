// Ronnie's Manor match-3 engine. Pure logic, no DOM, so it runs in the browser and in Node
// (the robot playtester in tools/calibrate.mjs uses it too).
//
// The board is flat typed arrays indexed i = y * W + x. Every change the player can see is
// returned as a list of "steps": { board: snapshot, fx: [...], score, shout } which the
// renderer animates one after another.

export const K = { EMPTY: 0, NORMAL: 1, CABH: 2, CABV: 3, BEN: 4, BUTTON: 5, WOOD: 6, EEL: 7, JACK: 8 };
export const B = { NONE: 0, FOG: 1, CONE: 2 };
export const COLOURS = 7; // bus, roundel, crown, cuppa, pie, brolly, pint

const PTS = { tile: 60, puddle: 100, blocker: 100, clamp: 80, ingredient: 1000, cab: 120, ben: 200, wood: 200, button: 400 };

export function rng(seed) {
  // mulberry32: small, fast, deterministic
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.state = () => a;
  f.set = (s) => { a = s >>> 0; };
  return f;
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const isSpecial = (k) => k >= K.CABH && k <= K.WOOD;
const isIngredient = (k) => k === K.EEL || k === K.JACK;

export class Board {
  constructor(level, opts = {}) {
    this.level = level;
    this.W = level.cols; this.H = level.rows;
    const N = this.W * this.H;
    this.N = N;
    this.hole = new Uint8Array(N);
    this.puddle = new Uint8Array(N);
    this.blk = new Uint8Array(N);
    this.bhp = new Uint8Array(N);
    this.kind = new Uint8Array(N);
    this.col = new Int8Array(N).fill(-1);
    this.clamp = new Uint8Array(N);
    this.id = new Int32Array(N);
    this.nextId = 1;
    this.colours = level.colours;
    this.rand = rng(opts.seed ?? level.seed ?? 1);
    this.record = opts.record !== false;
    this.mult = 1; // score multiplier (Happy Hour)
    this.score = 0;
    this.movesUsed = 0;
    this.ingredientsOnBoard = 0;
    this.ingredientsSpawned = 0;
    this.goals = (level.goals || []).map((g) => ({ ...g, done: 0 }));
    for (const i of level.holes || []) this.hole[i] = 1;
    for (const p of level.puddles || []) if (!this.hole[p.i]) this.puddle[p.i] = p.layers || 1;
    for (const b of level.blockers || []) if (!this.hole[b.i]) { this.blk[b.i] = b.type; this.bhp[b.i] = b.hp || 1; }
    this.fill();
    for (const c of level.clamps || []) if (this.kind[c.i] === K.NORMAL) this.clamp[c.i] = c.layers || 1;
    for (const g of this.goals) if (g.type === 'puddles') g.count = this.puddleTotal();
    for (const g of this.goals) if (g.type === 'blockers') g.count = this.blockerTotal();
    this.spawnInitialIngredients();
    if (!this.findMove()) this.shuffle(false);
  }

  // ---------- helpers ----------
  xy(i) { return [i % this.W, (i / this.W) | 0]; }
  at(x, y) { return x < 0 || y < 0 || x >= this.W || y >= this.H ? -1 : y * this.W + x; }
  cellOk(i) { return i >= 0 && !this.hole[i]; }
  fixed(i) { return this.hole[i] || this.blk[i] || (this.kind[i] && this.clamp[i] > 0); }
  movable(i) { return i >= 0 && !this.hole[i] && !this.blk[i] && this.kind[i] !== K.EMPTY && this.clamp[i] === 0; }
  empty(i) { return !this.hole[i] && !this.blk[i] && this.kind[i] === K.EMPTY; }
  matchCol(i) {
    if (i < 0 || this.hole[i] || this.blk[i]) return -1;
    const k = this.kind[i];
    return k >= K.NORMAL && k <= K.WOOD && k !== K.BUTTON ? this.col[i] : -1;
  }
  puddleTotal() { let s = 0; for (let i = 0; i < this.N; i++) s += this.puddle[i]; return s; }
  blockerTotal() { let s = 0; for (let i = 0; i < this.N; i++) if (this.blk[i]) s += this.bhp[i]; return s; }
  randColour() { return (this.rand() * this.colours) | 0; }
  put(i, kind, col) { this.kind[i] = kind; this.col[i] = col; this.id[i] = this.nextId++; this.clamp[i] = 0; }
  clearTile(i) { this.kind[i] = K.EMPTY; this.col[i] = -1; this.id[i] = 0; this.clamp[i] = 0; }

  snapshot() {
    return {
      W: this.W, H: this.H,
      hole: this.hole, puddle: this.puddle.slice(), blk: this.blk.slice(), bhp: this.bhp.slice(),
      kind: this.kind.slice(), col: this.col.slice(), clamp: this.clamp.slice(), id: this.id.slice(),
    };
  }

  clone() {
    const b = Object.create(Board.prototype);
    for (const k of Object.keys(this)) {
      const v = this[k];
      b[k] = ArrayBuffer.isView(v) ? v.slice() : v;
    }
    b.goals = this.goals.map((g) => ({ ...g }));
    b.rand = rng(0); b.rand.set(this.rand.state());
    b.record = false;
    return b;
  }

  // ---------- setup ----------
  wouldMatch(i, c) {
    const [x, y] = this.xy(i);
    const m = (xx, yy) => this.matchCol(this.at(xx, yy)) === c;
    if (m(x - 1, y) && m(x - 2, y)) return true;
    if (m(x, y - 1) && m(x, y - 2)) return true;
    if (m(x - 1, y) && m(x, y - 1) && m(x - 1, y - 1)) return true;
    return false;
  }

  fill() {
    for (let i = 0; i < this.N; i++) {
      if (this.hole[i] || this.blk[i] || this.kind[i]) continue;
      let c, n = 0;
      do { c = this.randColour(); } while (this.wouldMatch(i, c) && ++n < 20);
      this.put(i, K.NORMAL, c);
    }
  }

  ingredientGoal() { return this.goals.find((g) => g.type === 'eels' || g.type === 'jack'); }

  spawnInitialIngredients() {
    const g = this.ingredientGoal();
    if (!g) return;
    const want = Math.min(g.count, g.onBoard || 2);
    const tops = [];
    for (let x = 0; x < this.W; x++) {
      for (let y = Math.floor(this.H / 3); y < Math.ceil(this.H / 2); y++) {
        const i = this.at(x, y);
        if (this.movable(i) && this.kind[i] === K.NORMAL) { tops.push(i); break; }
      }
    }
    for (let n = 0; n < want && tops.length; n++) {
      const i = tops.splice((this.rand() * tops.length) | 0, 1)[0];
      this.put(i, g.type === 'jack' ? K.JACK : K.EEL, -1);
      this.ingredientsOnBoard++; this.ingredientsSpawned++;
    }
  }

  // ---------- matching ----------
  findMatches() {
    const { W, H } = this;
    const shapes = [];
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const c = this.matchCol(this.at(x, y));
        let e = x + 1;
        if (c >= 0) while (e < W && this.matchCol(this.at(e, y)) === c) e++;
        if (c >= 0 && e - x >= 3) {
          const cells = []; for (let k = x; k < e; k++) cells.push(this.at(k, y));
          shapes.push({ c, cells, dir: 'h', len: e - x });
        }
        x = e;
      }
    }
    for (let x = 0; x < W; x++) {
      let y = 0;
      while (y < H) {
        const c = this.matchCol(this.at(x, y));
        let e = y + 1;
        if (c >= 0) while (e < H && this.matchCol(this.at(x, e)) === c) e++;
        if (c >= 0 && e - y >= 3) {
          const cells = []; for (let k = y; k < e; k++) cells.push(this.at(x, k));
          shapes.push({ c, cells, dir: 'v', len: e - y });
        }
        y = e;
      }
    }
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = this.at(x, y), c = this.matchCol(a);
      if (c < 0) continue;
      const b = this.at(x + 1, y), d = this.at(x, y + 1), e = this.at(x + 1, y + 1);
      if (this.matchCol(b) === c && this.matchCol(d) === c && this.matchCol(e) === c)
        shapes.push({ c, cells: [a, b, d, e], dir: 'sq', len: 4 });
    }
    if (!shapes.length) return [];
    // union shapes that share a cell
    const parent = shapes.map((_, k) => k);
    const find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
    const owner = new Map();
    shapes.forEach((s, k) => s.cells.forEach((i) => {
      if (owner.has(i)) parent[find(k)] = find(owner.get(i)); else owner.set(i, k);
    }));
    const groups = new Map();
    shapes.forEach((s, k) => {
      const r = find(k);
      if (!groups.has(r)) groups.set(r, { c: s.c, cells: new Set(), shapes: [] });
      const g = groups.get(r);
      s.cells.forEach((i) => g.cells.add(i));
      g.shapes.push(s);
    });
    return [...groups.values()];
  }

  // What special (if any) a match group makes, and where.
  specialFor(g, prefer) {
    const lines = g.shapes.filter((s) => s.dir !== 'sq');
    const maxLen = lines.reduce((m, s) => Math.max(m, s.len), 0);
    const hs = lines.filter((s) => s.dir === 'h'), vs = lines.filter((s) => s.dir === 'v');
    let kind = 0, spot = -1;
    const pick = (cands) => {
      const ok = cands.filter((i) => this.clamp[i] === 0 && !isSpecial(this.kind[i]) || prefer.includes(i));
      for (const p of prefer) if (cands.includes(p)) return p;
      return ok.length ? ok[(ok.length / 2) | 0] : cands[(cands.length / 2) | 0];
    };
    if (maxLen >= 5) {
      kind = K.BUTTON;
      spot = pick(lines.find((s) => s.len === maxLen).cells);
    } else if (hs.length && vs.length) {
      let cross = -1;
      for (const h of hs) for (const v of vs) for (const i of h.cells) if (v.cells.includes(i)) cross = i;
      if (cross >= 0) { kind = K.BEN; spot = prefer.find((p) => g.cells.has(p)) ?? cross; }
    }
    if (!kind && maxLen === 4) {
      const s = lines.find((l) => l.len === 4);
      kind = s.dir === 'h' ? K.CABV : K.CABH;
      spot = pick(s.cells);
    }
    if (!kind && g.shapes.some((s) => s.dir === 'sq')) {
      kind = K.WOOD;
      spot = pick(g.shapes.find((s) => s.dir === 'sq').cells);
    }
    return kind ? { kind, spot, c: g.c } : null;
  }

  // Is there a line of 3 or a 2x2 through cell i?
  matchAt(i) {
    const c = this.matchCol(i);
    if (c < 0) return false;
    const [x, y] = this.xy(i);
    const m = (xx, yy) => this.matchCol(this.at(xx, yy)) === c;
    let h = 1; for (let k = x - 1; m(k, y); k--) h++; for (let k = x + 1; m(k, y); k++) h++;
    if (h >= 3) return true;
    let v = 1; for (let k = y - 1; m(x, k); k--) v++; for (let k = y + 1; m(x, k); k++) v++;
    if (v >= 3) return true;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      if (m(x + dx, y) && m(x, y + dy) && m(x + dx, y + dy)) return true;
    return false;
  }

  swapRaw(a, b) {
    for (const arr of [this.kind, this.col, this.clamp, this.id]) { const t = arr[a]; arr[a] = arr[b]; arr[b] = t; }
  }

  adjacent(a, b) {
    const [ax, ay] = this.xy(a), [bx, by] = this.xy(b);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  moveValid(a, b) {
    if (!this.adjacent(a, b) || !this.movable(a) || !this.movable(b)) return false;
    const ka = this.kind[a], kb = this.kind[b];
    if ((isSpecial(ka) && !isIngredient(kb)) || (isSpecial(kb) && !isIngredient(ka))) return true;
    this.swapRaw(a, b);
    const ok = this.matchAt(a) || this.matchAt(b);
    this.swapRaw(a, b);
    return ok;
  }

  findMove() {
    let best = null, bestScore = -1;
    for (let i = 0; i < this.N; i++) {
      if (!this.movable(i)) continue;
      const [x, y] = this.xy(i);
      for (const j of [this.at(x + 1, y), this.at(x, y + 1)]) {
        if (j < 0 || !this.moveValid(i, j)) continue;
        const s = (isSpecial(this.kind[i]) ? 2 : 0) + (isSpecial(this.kind[j]) ? 2 : 0) + this.rand() * 0.5;
        if (s > bestScore) { bestScore = s; best = [i, j]; }
      }
    }
    return best;
  }

  allMoves() {
    const out = [];
    for (let i = 0; i < this.N; i++) {
      if (!this.movable(i)) continue;
      const [x, y] = this.xy(i);
      for (const j of [this.at(x + 1, y), this.at(x, y + 1)]) if (j >= 0 && this.moveValid(i, j)) out.push([i, j]);
    }
    return out;
  }

  // ---------- resolving ----------
  newStats() { return { cleared: new Array(COLOURS).fill(0), puddles: 0, blockers: 0, clamps: 0, ingredients: 0, specials: 0, cascade: 0, score: 0, made: [] }; }

  addScore(p, st) { const v = Math.round(p * this.mult); this.score += v; st.score += v; }

  step(steps, fx, st, extra) {
    if (!this.record) return;
    steps.push({ board: this.snapshot(), fx, score: this.score, ...extra });
  }

  // Hit a cell once. Returns nothing; queues special activations.
  hit(i, st, queue, cascade, fromMatch) {
    if (i < 0 || this.hole[i]) return;
    if (this.blk[i]) {
      this.bhp[i]--; st.blockers++; this.addScore(PTS.blocker, st);
      if (this.bhp[i] <= 0) { this.blk[i] = 0; this.bhp[i] = 0; }
      return;
    }
    const k = this.kind[i];
    if (!k || isIngredient(k)) return;
    if (this.clamp[i] > 0) { this.clamp[i]--; st.clamps++; this.addScore(PTS.clamp, st); return; }
    if (this.col[i] >= 0) st.cleared[this.col[i]]++;
    if (isSpecial(k)) queue.push({ i, kind: k, c: this.col[i] });
    this.clearTile(i);
    this.addScore(PTS.tile * Math.max(1, cascade), st);
    if (this.puddle[i] > 0) { this.puddle[i]--; st.puddles++; this.addScore(PTS.puddle, st); }
  }

  mostCommonColour(except = -1) {
    const n = new Array(COLOURS).fill(0);
    for (let i = 0; i < this.N; i++) if (this.kind[i] === K.NORMAL && this.col[i] >= 0) n[this.col[i]]++;
    let best = 0;
    for (let c = 0; c < COLOURS; c++) if (c !== except && n[c] > n[best]) best = c;
    return best;
  }

  woodTarget(from) {
    // Aim at what matters most: blockers, then puddles, then goal colours, then anything.
    const goalCols = this.goals.filter((g) => g.type === 'collect' && g.done < g.count).map((g) => g.colour);
    let best = -1, bestS = -1;
    for (let i = 0; i < this.N; i++) {
      if (i === from || this.hole[i]) continue;
      let s = 0;
      if (this.blk[i]) s = 50 + this.bhp[i];
      else if (this.kind[i] && this.clamp[i]) s = 40;
      else if (this.puddle[i] && this.kind[i] && !isIngredient(this.kind[i])) s = 30 + this.puddle[i];
      else if (this.kind[i] === K.NORMAL && goalCols.includes(this.col[i])) s = 20;
      else if (this.kind[i] === K.NORMAL) s = 1;
      if (!s) continue;
      s += this.rand();
      if (s > bestS) { bestS = s; best = i; }
    }
    return best;
  }

  woodPath(from, to) {
    const [x0, y0] = this.xy(from), [x1, y1] = this.xy(to);
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const bias = (this.rand() < 0.5 ? -1 : 1) * Math.min(2.5, len / 3);
    const cx = (x0 + x1) / 2 - (dy / len) * bias, cy = (y0 + y1) / 2 + (dx / len) * bias;
    const cells = [];
    const steps = Math.max(4, Math.ceil(len * 3));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      const px = Math.round(u * u * x0 + 2 * u * t * cx + t * t * x1);
      const py = Math.round(u * u * y0 + 2 * u * t * cy + t * t * y1);
      const i = this.at(px, py);
      if (i >= 0 && cells[cells.length - 1] !== i) cells.push(i);
    }
    return cells;
  }

  // Fire one special. Returns fx for the renderer.
  activate(a, st, queue, cascade) {
    const { i, kind, c } = a;
    const [x, y] = this.xy(i);
    const fx = [];
    const hitAll = (cells) => cells.forEach((j) => this.hit(j, st, queue, cascade));
    if (kind === K.CABH || kind === K.CABV) {
      const cells = [];
      if (kind === K.CABH) for (let k = 0; k < this.W; k++) cells.push(this.at(k, y));
      else for (let k = 0; k < this.H; k++) cells.push(this.at(x, k));
      hitAll(cells); fx.push({ t: 'cab', i, dir: kind === K.CABH ? 'h' : 'v' });
    } else if (kind === K.BEN) {
      const r = a.r || 1, cells = [];
      for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const j = this.at(xx, yy); if (j >= 0) cells.push(j); }
      hitAll(cells); fx.push({ t: 'ben', i, r });
    } else if (kind === K.BUTTON) {
      const target = a.target ?? this.mostCommonColour();
      const cells = [];
      for (let j = 0; j < this.N; j++) if (this.col[j] === target && this.kind[j] >= K.NORMAL && this.kind[j] <= K.WOOD) cells.push(j);
      hitAll(cells); fx.push({ t: 'button', i, cells });
    } else if (kind === K.WOOD) {
      const to = this.woodTarget(i);
      if (to >= 0) {
        const path = this.woodPath(i, to);
        hitAll(path);
        if (a.carry) queue.push({ i: to, kind: a.carry, c, r: 1 });
        else this.hit(to, st, queue, cascade);
        fx.push({ t: 'wood', i, path });
      }
    }
    return fx;
  }

  runQueue(queue, st, cascade, fx) {
    let guard = 0;
    while (queue.length && guard++ < 400) {
      const a = queue.shift();
      fx.push(...this.activate(a, st, queue, cascade));
    }
  }

  // Gravity with diagonal slides past fixed cells. Returns fall info for the renderer.
  gravity() {
    const { W, H } = this;
    const spawnDepth = new Array(W).fill(0);
    const topOf = (x) => { for (let y = 0; y < H; y++) { const i = this.at(x, y); if (!this.hole[i]) return y; } return -1; };
    const tops = []; for (let x = 0; x < W; x++) tops.push(topOf(x));
    let changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      for (let y = H - 1; y >= 0; y--) for (let x = 0; x < W; x++) {
        const i = this.at(x, y);
        if (!this.empty(i)) continue;
        // look up the column, passing through holes
        let yy = y - 1, j = -1;
        while (yy >= 0) { const c = this.at(x, yy); if (!this.hole[c]) { j = c; break; } yy--; }
        if (j === -1) {
          // top of column: spawn
          if (y === tops[x] || yy < 0) {
            spawnDepth[x]++;
            this.spawnTile(i, -spawnDepth[x]);
            changed = true;
          }
        } else if (this.movable(j)) {
          this.swapRaw(i, j); changed = true;
        }
      }
      if (changed) continue;
      // diagonal slides into empty cells under fixed cells
      for (let y = H - 1; y >= 1 && !changed; y--) for (let x = 0; x < W && !changed; x++) {
        const i = this.at(x, y);
        if (!this.empty(i)) continue;
        for (const dx of this.rand() < 0.5 ? [-1, 1] : [1, -1]) {
          const j = this.at(x + dx, y - 1);
          if (j < 0 || !this.movable(j)) continue;
          const below = this.at(x + dx, y);
          if (below >= 0 && this.empty(below)) continue;
          this.swapRaw(i, j); changed = true; break;
        }
      }
    }
    return spawnDepth;
  }

  spawnTile(i, fromY) {
    const g = this.ingredientGoal();
    if (g && this.ingredientsSpawned < g.count && this.ingredientsOnBoard < (g.onBoard || 2) && this.rand() < 0.12) {
      this.put(i, g.type === 'jack' ? K.JACK : K.EEL, -1);
      this.ingredientsOnBoard++; this.ingredientsSpawned++;
    } else {
      this.put(i, K.NORMAL, this.randColour());
    }
    if (this.record) (this.spawned || (this.spawned = new Map())).set(this.id[i], fromY);
  }

  // Ingredients sitting on the lowest cell of their column are delivered.
  collectIngredients(st) {
    let n = 0;
    for (let x = 0; x < this.W; x++) {
      for (let y = this.H - 1; y >= 0; y--) {
        const i = this.at(x, y);
        if (this.hole[i]) continue;
        if (isIngredient(this.kind[i])) {
          this.clearTile(i); this.ingredientsOnBoard--; st.ingredients++; n++;
          this.addScore(PTS.ingredient, st);
        }
        break;
      }
    }
    return n;
  }

  // Match, clear, fall, repeat until the board settles.
  cascadeLoop(steps, st, prefer, startFx) {
    let cascade = 0, pendingFx = startFx || [];
    for (let guard = 0; guard < 60; guard++) {
      const groups = this.findMatches();
      if (!groups.length && !pendingFx.length) {
        if (this.collectIngredients(st)) { this.spawned = null; this.gravity(); this.step(steps, [{ t: 'collect' }], st, { fall: this.spawned }); this.spawned = null; continue; }
        break;
      }
      cascade++;
      const fx = pendingFx; pendingFx = [];
      const queue = [];
      const makes = [];
      for (const g of groups) {
        const sp = this.specialFor(g, cascade === 1 ? prefer : []);
        if (sp) makes.push(sp);
        const adj = new Set();
        for (const i of g.cells) {
          this.hit(i, st, queue, cascade, true);
          const [x, y] = this.xy(i);
          for (const j of [this.at(x + 1, y), this.at(x - 1, y), this.at(x, y + 1), this.at(x, y - 1)])
            if (j >= 0 && !g.cells.has(j) && this.blk[j]) adj.add(j);
        }
        adj.forEach((j) => this.hit(j, st, queue, cascade));
        fx.push({ t: 'match', cells: [...g.cells], c: g.c, n: g.cells.size });
      }
      this.runQueue(queue, st, cascade, fx);
      for (const sp of makes) {
        if (!this.empty(sp.spot)) continue;
        this.put(sp.spot, sp.kind, sp.kind === K.BUTTON ? -1 : sp.c);
        st.specials++; st.made.push(sp.kind);
        this.addScore(PTS[{ [K.CABH]: 'cab', [K.CABV]: 'cab', [K.BEN]: 'ben', [K.WOOD]: 'wood', [K.BUTTON]: 'button' }[sp.kind]], st);
        fx.push({ t: 'made', i: sp.spot, kind: sp.kind });
      }
      st.cascade = Math.max(st.cascade, cascade);
      this.step(steps, fx, st, { cascade });
      this.spawned = null;
      this.gravity();
      this.step(steps, [], st, { fall: this.spawned });
      this.spawned = null;
    }
  }

  updateGoals(st) {
    for (const g of this.goals) {
      if (g.type === 'collect') g.done = Math.min(g.count, g.done + st.cleared[g.colour]);
      else if (g.type === 'puddles') g.done = Math.min(g.count, g.done + st.puddles);
      else if (g.type === 'blockers') g.done = Math.min(g.count, g.done + st.blockers);
      else if (g.type === 'eels' || g.type === 'jack') g.done = Math.min(g.count, g.done + st.ingredients);
      else if (g.type === 'score') g.done = Math.min(g.count, this.score);
    }
  }

  goalsDone() { return this.goals.every((g) => g.done >= g.count); }

  afterMove(steps, st) {
    this.updateGoals(st);
    if (!this.goalsDone() && !this.findMove()) this.shuffle(true, steps);
  }

  // Player swaps a and b. Returns { valid, steps, stats }.
  trySwap(a, b) {
    if (!this.moveValid(a, b)) return { valid: false, steps: [], stats: null };
    const steps = [], st = this.newStats();
    this.movesUsed++;
    const ka = this.kind[a], kb = this.kind[b];
    this.swapRaw(a, b);
    this.step(steps, [{ t: 'swap', a, b }], st);
    // after swapRaw, the tile that was at a is now at b
    const combo = this.comboFor(b, a, ka, kb);
    if (combo) {
      const fx = [];
      const queue = [];
      combo(st, queue, fx);
      this.runQueue(queue, st, 1, fx);
      this.step(steps, fx, st, { cascade: 1, combo: true });
      this.spawned = null; this.gravity(); this.step(steps, [], st, { fall: this.spawned }); this.spawned = null;
      this.cascadeLoop(steps, st, []);
    } else {
      this.cascadeLoop(steps, st, [a, b]);
    }
    this.afterMove(steps, st);
    return { valid: true, steps, stats: st };
  }

  // Special combos. pa/pb are positions after the swap; ka was at a (now at pa), kb now at pb.
  comboFor(pa, pb, ka, kb) {
    const sa = isSpecial(ka), sb = isSpecial(kb);
    if (!sa && !sb) return null;
    const ca = this.col[pa], cb = this.col[pb];
    const kill = (i) => { if (this.kind[i]) { if (this.col[i] >= 0) this.cleared = true; this.clearTile(i); } };
    const cab = (k) => k === K.CABH || k === K.CABV;
    const both = [ka, kb];
    const has = (k) => both.includes(k);
    const pos = (k) => (ka === k ? pa : pb);
    if (ka === K.BUTTON && kb === K.BUTTON) {
      return (st, q, fx) => {
        kill(pa); kill(pb);
        const cells = []; for (let i = 0; i < this.N; i++) if (!this.hole[i]) cells.push(i);
        cells.forEach((i) => this.hit(i, st, q, 2));
        fx.push({ t: 'button', i: pa, cells, all: true });
      };
    }
    if (has(K.BUTTON)) {
      const bi = pos(K.BUTTON), oi = bi === pa ? pb : pa, ok = bi === pa ? kb : ka;
      const target = this.col[oi] >= 0 ? this.col[oi] : this.mostCommonColour();
      return (st, q, fx) => {
        kill(bi);
        const cells = [];
        for (let i = 0; i < this.N; i++) if (this.col[i] === target && this.kind[i] >= K.NORMAL && this.kind[i] <= K.WOOD && !this.blk[i]) cells.push(i);
        if (isSpecial(ok) && ok !== K.BUTTON) {
          // turn every tile of that colour into the same special, then fire them all
          for (const i of cells) { if (this.clamp[i]) continue; this.kind[i] = cab(ok) ? (this.rand() < 0.5 ? K.CABH : K.CABV) : ok; }
          fx.push({ t: 'button', i: bi, cells, turn: ok });
          for (const i of cells) this.hit(i, st, q, 2);
        } else {
          fx.push({ t: 'button', i: bi, cells });
          for (const i of cells) this.hit(i, st, q, 2);
        }
      };
    }
    if (sa && sb) {
      return (st, q, fx) => {
        const [x, y] = this.xy(pa);
        kill(pa); kill(pb);
        if (cab(ka) && cab(kb)) {
          q.push({ i: pa, kind: K.CABH, c: ca }, { i: pa, kind: K.CABV, c: ca });
        } else if (has(K.BEN) && (cab(ka) || cab(kb))) {
          for (let d = -1; d <= 1; d++) {
            const r = this.at(Math.min(this.W - 1, Math.max(0, x + d)), y), c = this.at(x, Math.min(this.H - 1, Math.max(0, y + d)));
            q.push({ i: r, kind: K.CABV, c: ca }, { i: c, kind: K.CABH, c: ca });
          }
          fx.push({ t: 'rush', i: pa });
        } else if (ka === K.BEN && kb === K.BEN) {
          q.push({ i: pa, kind: K.BEN, c: ca, r: 2 });
        } else if (ka === K.WOOD && kb === K.WOOD) {
          q.push({ i: pa, kind: K.WOOD, c: ca }, { i: pa, kind: K.WOOD, c: ca }, { i: pa, kind: K.WOOD, c: ca });
        } else {
          // wood carrying a cab or Big Ben
          const other = ka === K.WOOD ? kb : ka;
          q.push({ i: pa, kind: K.WOOD, c: ca, carry: cab(other) ? (this.rand() < 0.5 ? K.CABH : K.CABV) : K.BEN });
        }
      };
    }
    // one special swapped with a plain tile: if it doesn't make a match, fire the special where it lands
    const si = sa ? pa : pb, sk = sa ? ka : kb;
    if (this.matchAt(si) || this.matchAt(si === pa ? pb : pa)) return null;
    return (st, q, fx) => { kill(si); q.push({ i: si, kind: sk, c: sa ? ca : cb }); };
  }

  // Tap a special twice to fire it where it sits (costs a move).
  tapSpecial(i) {
    if (!this.movable(i) || !isSpecial(this.kind[i])) return { valid: false, steps: [] };
    const steps = [], st = this.newStats();
    this.movesUsed++;
    const a = { i, kind: this.kind[i], c: this.col[i] };
    this.clearTile(i);
    const q = [a], fx = [];
    this.runQueue(q, st, 1, fx);
    this.step(steps, fx, st, { cascade: 1 });
    this.spawned = null; this.gravity(); this.step(steps, [], st, { fall: this.spawned }); this.spawned = null;
    this.cascadeLoop(steps, st, []);
    this.afterMove(steps, st);
    return { valid: true, steps, stats: st };
  }

  shuffle(record = true, steps = []) {
    const cells = [], pool = [];
    for (let i = 0; i < this.N; i++) if (this.movable(i) && this.kind[i] === K.NORMAL) { cells.push(i); pool.push(this.col[i]); }
    for (let tries = 0; tries < 50; tries++) {
      for (let k = pool.length - 1; k > 0; k--) { const j = (this.rand() * (k + 1)) | 0; [pool[k], pool[j]] = [pool[j], pool[k]]; }
      cells.forEach((i, k) => { this.col[i] = pool[k]; });
      if (tries > 30) cells.forEach((i) => { this.col[i] = this.randColour(); });
      let bad = false;
      for (const i of cells) if (this.matchAt(i)) { bad = true; break; }
      if (!bad && this.findMove()) break;
    }
    if (record) this.step(steps, [{ t: 'shuffle' }], this.newStats(), { shout: 'shuffle' });
  }

  // Put a power-up on a random plain tile (boosters, Big Ben on the hour).
  placeSpecial(kind) {
    const cands = [];
    for (let i = 0; i < this.N; i++) if (this.movable(i) && this.kind[i] === K.NORMAL && !this.clamp[i]) cands.push(i);
    if (!cands.length) return -1;
    const i = cands[(this.rand() * cands.length) | 0];
    const c = this.col[i];
    this.put(i, kind, kind === K.BUTTON ? -1 : c);
    return i;
  }

  // Toucher finish: spare moves become woods bowled down the board, then every power-up left fires.
  toucher(movesLeft, cap = 12) {
    const steps = [], st = this.newStats();
    const n = Math.min(movesLeft, cap);
    for (let k = 0; k < n; k++) {
      const i = this.placeSpecial(K.WOOD);
      if (i < 0) break;
      this.step(steps, [{ t: 'made', i, kind: K.WOOD }], st);
      const q = [{ i, kind: K.WOOD, c: this.col[i] }], fx = [];
      this.clearTile(i);
      this.runQueue(q, st, 1, fx);
      this.step(steps, fx, st, { cascade: 1 });
      this.spawned = null; this.gravity(); this.step(steps, [], st, { fall: this.spawned }); this.spawned = null;
      this.cascadeLoop(steps, st, []);
    }
    for (let guard = 0; guard < 6; guard++) {
      const q = [];
      for (let i = 0; i < this.N; i++) if (isSpecial(this.kind[i]) && this.movable(i)) { q.push({ i, kind: this.kind[i], c: this.col[i] }); this.clearTile(i); }
      if (!q.length) break;
      const fx = [];
      this.runQueue(q, st, 1, fx);
      this.step(steps, fx, st, { cascade: 1 });
      this.spawned = null; this.gravity(); this.step(steps, [], st, { fall: this.spawned }); this.spawned = null;
      this.cascadeLoop(steps, st, []);
    }
    const bonus = movesLeft * 1000 * this.mult; // every spare move counts, even beyond the woods shown
    this.score += bonus; st.score += bonus;
    return { steps, stats: st, woods: n };
  }
}
