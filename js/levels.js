// Level maker: every level is built from its number, following the sawtooth difficulty curve.
// Moves and star scores come from the robot playtester (data/levels.json) when it has played that
// level; otherwise a formula fitted to its results fills in, so the map never runs out.

import { rng, hashStr, B } from './engine.js';

export const ZONES = [
  { name: 'Islington', stations: ['Angel', 'Essex Road', 'Canonbury', 'Highbury & Islington', 'Drayton Park', 'Holloway Road', 'Caledonian Road', 'Archway', 'Upper Holloway', 'Finsbury Park'] },
  { name: 'Up West', stations: ['King\'s Cross', 'Euston Square', 'Warren Street', 'Goodge Street', 'Tottenham Court Road', 'Oxford Circus', 'Bond Street', 'Piccadilly Circus', 'Leicester Square', 'Covent Garden'] },
  { name: 'Down the River', stations: ['Charing Cross', 'Embankment', 'Westminster', 'Waterloo', 'Southwark', 'London Bridge', 'Borough', 'Tower Hill', 'Canary Wharf', 'Cutty Sark'] },
  { name: 'The East End', stations: ['Aldgate East', 'Whitechapel', 'Stepney Green', 'Mile End', 'Bow Road', 'Bromley-by-Bow', 'West Ham', 'Plaistow', 'Upton Park', 'East Ham'] },
  { name: 'North London', stations: ['Camden Town', 'Chalk Farm', 'Belsize Park', 'Hampstead', 'Kentish Town', 'Tufnell Park', 'Highgate', 'East Finchley', 'Finchley Central', 'Mill Hill East'] },
  { name: 'South of the River', stations: ['Elephant & Castle', 'Kennington', 'Oval', 'Stockwell', 'Clapham North', 'Clapham Common', 'Clapham South', 'Brixton', 'Vauxhall', 'Pimlico'] },
  { name: 'West London', stations: ['Notting Hill Gate', 'Holland Park', 'Shepherd\'s Bush', 'White City', 'Hammersmith', 'Earl\'s Court', 'Gloucester Road', 'South Kensington', 'Sloane Square', 'Fulham Broadway'] },
  { name: 'Out East', stations: ['Stratford', 'Leyton', 'Leytonstone', 'Snaresbrook', 'South Woodford', 'Woodford', 'Buckhurst Hill', 'Loughton', 'Debden', 'Epping'] },
  { name: 'Up North', stations: ['Manor House', 'Turnpike Lane', 'Wood Green', 'Bounds Green', 'Arnos Grove', 'Southgate', 'Oakwood', 'Cockfosters', 'Seven Sisters', 'Tottenham Hale'] },
  { name: 'Out West', stations: ['Acton Town', 'Ealing Common', 'Ealing Broadway', 'Boston Manor', 'Osterley', 'Hounslow East', 'Hounslow Central', 'Hounslow West', 'Hatton Cross', 'Heathrow'] },
];
export const LEVELS_PER_STATION = 3;
export const LEVELS_PER_ZONE = 30;

export function zoneOf(n) {
  const z = Math.floor((n - 1) / LEVELS_PER_ZONE);
  const base = ZONES[z % ZONES.length];
  const round = Math.floor(z / ZONES.length);
  return { index: z, name: round ? `${base.name} (night route ${round})` : base.name, stations: base.stations };
}

export function stationOf(n) {
  const z = zoneOf(n);
  const s = Math.floor(((n - 1) % LEVELS_PER_ZONE) / LEVELS_PER_STATION);
  return { zone: z, index: s, name: z.stations[s] };
}

export function tierOf(n) {
  if (n % 30 === 0) return 'guvnor';
  if (n % 10 === 0) return 'hard';
  if (n % 5 === 0) return 'tricky';
  if (n % 10 === 1 && n > 1) return 'breather';
  return 'normal';
}
export const TIER_LABEL = { normal: 'Normal', breather: 'Breather', tricky: 'Tricky', hard: 'Proper Hard', guvnor: 'Guv\'nor' };

export function isClubNight(n) { return n % 10 === 7; }

// Difficulty 0..1: rises with level number, spikes on hard levels.
export function difficulty(n) {
  const base = 1 - Math.exp(-n / 140);
  const bump = { normal: 0, breather: -0.12, tricky: 0.08, hard: 0.18, guvnor: 0.26 }[tierOf(n)];
  return Math.max(0, Math.min(1, 0.08 + base * 0.7 + bump));
}

// Target first-go win rate for the robot to tune moves against.
export function targetWin(n) {
  const t = tierOf(n);
  let w = n <= 5 ? 0.95 : n <= 12 ? 0.85 : n <= 30 ? 0.72 : n <= 90 ? 0.55 : n <= 200 ? 0.42 : 0.34;
  if (t === 'breather') w += 0.15;
  if (t === 'tricky') w -= 0.08;
  if (t === 'hard') w -= 0.18;
  if (t === 'guvnor') w -= 0.24;
  return Math.max(0.12, Math.min(0.92, w));
}

const SHAPES = {
  full: () => [],
  corners: (W, H) => [0, W - 1, (H - 1) * W, H * W - 1],
  bigcorners: (W, H) => [0, 1, W, W - 2, W - 1, 2 * W - 1, (H - 2) * W, (H - 1) * W, (H - 1) * W + 1, (H - 1) * W - 1, H * W - 2, H * W - 1],
  middle: (W, H) => { const cx = (W / 2) | 0, cy = (H / 2) | 0; return [cy * W + cx - 1, cy * W + cx, (cy - 1) * W + cx - 1, (cy - 1) * W + cx]; },
  pillars: (W, H) => { const o = []; for (let y = 2; y < H - 2; y++) { o.push(y * W + 2, y * W + W - 3); } return o; },
  notch: (W, H) => { const cx = (W / 2) | 0; return [cx - 1, cx, W + cx - 1, W + cx]; },
  diamond: (W, H) => { const o = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = Math.abs(x - (W - 1) / 2), dy = Math.abs(y - (H - 1) / 2); if (dx + dy > (W + H) / 3.2) o.push(y * W + x); } return o; },
  hourglass: (W, H) => { const o = []; const my = (H / 2) | 0; for (const y of [my - 1, my]) for (const x of [0, 1, W - 2, W - 1]) o.push(y * W + x); return o; },
  arches: (W, H) => { const o = []; for (const x of [2, W - 3]) for (let y = H - 3; y < H; y++) o.push(y * W + x); return o; },
};

let CAL = null; // calibration table from data/levels.json
export function setCalibration(table) { CAL = table; }

function pickFrom(r, arr) { return arr[(r() * arr.length) | 0]; }

export function makeLevel(n, opts = {}) {
  const r = rng(hashStr('ronnie-level-' + n));
  const d = difficulty(n);
  const tier = tierOf(n);
  const club = isClubNight(n);
  const st = stationOf(n);
  const cal0 = CAL && CAL[n];
  const sc = opts.scale ?? (cal0 ? cal0.scale : 1);

  // board
  let cols = 8, rows = 8;
  if (n <= 6) { cols = 7; rows = 7; }
  else if (n <= 20) { cols = 7; rows = 8; }
  let shape = 'full';
  if (n > 40 && r() < 0.35) shape = pickFrom(r, ['corners', 'middle', 'notch']);
  if (n > 90 && r() < 0.45) shape = pickFrom(r, ['corners', 'bigcorners', 'middle', 'pillars', 'notch']);
  if (n > 150 && r() < 0.5) shape = pickFrom(r, ['diamond', 'hourglass', 'arches', 'bigcorners', 'pillars']);
  const holes = SHAPES[shape](cols, rows);
  const holeSet = new Set(holes);

  // colours
  let colours = n <= 30 ? 5 : 6;
  if (n > 200 && (tier === 'hard' || tier === 'guvnor')) colours = 7;
  if (n > 8 && n <= 30 && (tier === 'hard' || tier === 'guvnor')) colours = 6;

  // goals
  const goals = [];
  const intro = {
    puddles: n >= 3, eels: n >= 7, fog: n >= 11, clamps: n >= 16, cones: n >= 31, doublePuddles: n >= 31,
    twoGoals: n >= 91, threeGoals: n >= 200, boxes: n >= 25, pigeons: n >= 121,
  };
  const kinds = ['collect', 'score'];
  if (intro.puddles) kinds.push('puddles', 'puddles');
  if (intro.eels) kinds.push('eels');
  if (intro.fog) kinds.push('blockers');
  let first = club ? 'jack' : n <= 2 ? (n === 1 ? 'score' : 'collect') : pickFrom(r, kinds);
  if (n === 3) first = 'puddles';
  if (n === 7) first = 'eels';
  if (n === 11) first = 'blockers';
  const wanted = [first];
  if (intro.twoGoals && (tier !== 'breather') && r() < 0.5 + d * 0.3) wanted.push(pickFrom(r, kinds.filter((k) => k !== first && k !== 'score')));
  if (intro.threeGoals && (tier === 'hard' || tier === 'guvnor')) wanted.push(pickFrom(r, kinds.filter((k) => !wanted.includes(k) && k !== 'score')));

  const free = [];
  for (let i = 0; i < cols * rows; i++) if (!holeSet.has(i)) free.push(i);
  const shuffled = free.slice().sort(() => r() - 0.5);
  const takeCells = (k, filter = () => true) => { const out = []; for (const i of shuffled) { if (out.length >= k) break; if (filter(i) && !used.has(i)) { out.push(i); used.add(i); } } return out; };
  const used = new Set();

  const puddles = [], blockers = [], clamps = [];
  for (const g of wanted) {
    if (g === 'collect') {
      const nCols = n < 12 ? 1 : r() < 0.4 + d * 0.4 ? 2 : 1;
      const cs = []; while (cs.length < nCols) { const c = (r() * colours) | 0; if (!cs.includes(c)) cs.push(c); }
      const share = wanted.length > 1 ? 0.65 : 1;
      for (const c of cs) goals.push({ type: 'collect', colour: c, count: Math.max(6, Math.round((14 + d * 34) / nCols * share * sc * (0.85 + r() * 0.3))) });
    } else if (g === 'score') {
      goals.push({ type: 'score', count: Math.round((6000 + d * 20000) * sc / 500) * 500 });
    } else if (g === 'puddles') {
      const area = Math.max(6, Math.round(free.length * (0.15 + d * 0.35) * (wanted.length > 1 ? 0.7 : 1) * sc));
      // puddles in a pleasing block pattern: rows from the bottom or a central patch
      const pattern = r() < 0.5 ? 'bottom' : 'centre';
      const cands = free.slice().sort((a, b) => {
        const [ax, ay] = [a % cols, (a / cols) | 0], [bx, by] = [b % cols, (b / cols) | 0];
        if (pattern === 'bottom') return by - ay || Math.abs(ax - cols / 2) - Math.abs(bx - cols / 2);
        const da = Math.hypot(ax - (cols - 1) / 2, ay - (rows - 1) / 2), db = Math.hypot(bx - (cols - 1) / 2, by - (rows - 1) / 2);
        return da - db;
      });
      for (const i of cands.slice(0, area)) puddles.push({ i, layers: intro.doublePuddles && r() < d * 0.7 ? 2 : 1 });
      goals.push({ type: 'puddles', count: 0 });
    } else if (g === 'eels' || g === 'jack') {
      goals.push({ type: g, count: Math.max(1, Math.min(5, Math.round((1 + d * 4 * (0.7 + r() * 0.5)) * (wanted.length > 1 ? 0.7 : 1) * sc))), onBoard: d > 0.5 ? 2 : 1 });
    } else if (g === 'blockers') {
      goals.push({ type: 'blockers', count: 0 });
    }
  }

  // blockers: always on blocker levels, sometimes elsewhere once introduced
  const wantBlockers = wanted.includes('blockers') ? 1 : intro.fog && r() < d * 0.9 ? 0.6 : 0;
  if (wantBlockers) {
    const count = Math.max(3, Math.min(24, Math.round((4 + d * 12) * wantBlockers * sc)));
    const rowsBand = (i) => ((i / cols) | 0) >= 1; // keep the very top row clear so tiles can fall in
    for (const i of takeCells(count, rowsBand)) {
      const cone = intro.cones && r() < 0.25 + d * 0.4;
      blockers.push({ i, type: cone ? B.CONE : B.FOG, hp: cone ? 2 : 1 });
    }
  }
  if (intro.boxes && r() < 0.3) for (const i of takeCells(1 + (r() < d ? 1 : 0), (i) => ((i / cols) | 0) >= 2)) blockers.push({ i, type: B.BOX, hp: 2 });
  if (intro.pigeons && r() < 0.25 + d * 0.3) for (const i of takeCells(1 + Math.round(r() * d * 2), (i) => ((i / cols) | 0) >= 1)) blockers.push({ i, type: B.PIGEON, hp: 1 });
  if (intro.clamps && r() < 0.3 + d * 0.6) {
    for (const i of takeCells(Math.max(2, Math.round((3 + d * 8) * sc)))) clamps.push({ i, layers: n > 120 && r() < d ? 2 : 1 });
  }

  // puddles under blockers make the goal impossible to see; drop them
  const blkSet = new Set(blockers.map((b) => b.i));
  const puddlesOk = puddles.filter((p) => !blkSet.has(p.i));

  const cal = opts.moves ? null : cal0;
  const moves = opts.moves ?? (cal ? cal.moves : estimateMoves(n, d, goals));
  const stars = cal ? cal.stars : estimateStars(moves, d);

  return {
    n, name: st.name, zone: st.zone.name, zoneIndex: st.zone.index, stationIndex: st.index,
    tier, label: TIER_LABEL[tier], club, skin: club ? 'green' : 'normal',
    cols, rows, holes, colours, goals, puddles: puddlesOk, blockers, clamps,
    moves, stars, seed: hashStr('ronnie-board-' + n), difficulty: d, scale: sc,
  };
}

// Used beyond the calibrated range: a fit to the robot's results.
export function estimateMoves(n, d, goals) {
  let m = 16;
  for (const g of goals) {
    if (g.type === 'collect') m += g.count * 0.22;
    if (g.type === 'score') m += g.count / 1400;
    if (g.type === 'puddles') m += 8;
    if (g.type === 'eels' || g.type === 'jack') m += g.count * 3;
    if (g.type === 'blockers') m += 6;
  }
  const w = targetWin(n);
  return Math.max(10, Math.min(45, Math.round(m * (0.75 + w * 0.5))));
}

export function estimateStars(moves, d) {
  const s2 = Math.round((moves * 700 + 4000) / 500) * 500;
  return [0, s2, Math.round(s2 * 1.45 / 500) * 500];
}

// The Daily Ronnie: same board for everyone that day, score as many points as you can in 20 moves.
export function dailyLevel(dateStr) {
  const r = rng(hashStr('daily-' + dateStr));
  const base = makeLevel(35 + ((r() * 60) | 0));
  return {
    ...base, n: 0, daily: dateStr, name: 'The Daily Ronnie', zone: dateStr, tier: 'normal', label: 'Daily',
    goals: [], moves: 20, stars: [0, 18000, 30000], seed: hashStr('daily-board-' + dateStr), club: false, skin: 'normal',
    puddles: [], clamps: [], blockers: base.blockers.slice(0, 6),
  };
}

// Night Bus: endless. Start with 20 moves, earn more by making big matches.
export function nightBusLevel(seed) {
  return {
    n: -1, name: 'The Night Bus', zone: 'Endless', tier: 'normal', label: 'Endless', club: false, skin: 'night',
    cols: 8, rows: 8, holes: [], colours: 6, goals: [], puddles: [], blockers: [], clamps: [],
    moves: 20, stars: [0, 30000, 60000], seed, nightBus: true,
  };
}
