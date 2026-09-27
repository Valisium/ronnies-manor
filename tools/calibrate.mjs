// Robot playtester: plays every level many times and sets its moves so first-go win rates hit the
// target for its stage. Shrinks a level's goals if it would need more than 38 moves.
//   node tools/calibrate.mjs 1 300 [runs]     -> data/levels.json
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import fs from 'node:fs';
import { makeLevel, targetWin } from '../js/levels.js';
import { play } from './bot.mjs';

const q = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(p * arr.length)))];
const r500 = (v) => Math.max(500, Math.round(v / 500) * 500);

function calibrate(n, runs) {
  let scale = 1, best = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const L = makeLevel(n, { scale, moves: 99 });
    const res = [];
    for (let s = 0; s < runs; s++) res.push(play(L, 7919 * n + s * 104729, 70));
    const need = res.map((r) => (r.won ? r.used : 999)).sort((a, b) => a - b);
    const moves = q(need, targetWin(n));
    const lo = n <= 10 ? 14 : n <= 30 ? 17 : 20, hi = 36;
    const m = Math.max(8, Math.min(40, moves === 999 ? 40 : moves + 1));
    const finals = res.filter((r) => r.won && r.used <= m).map((r) => r.score + (m - r.used) * 1900).sort((a, b) => a - b);
    const med = finals.length ? q(finals, 0.5) : m * 900;
    const top = finals.length ? q(finals, 0.85) : m * 1400;
    const winRate = need.filter((u) => u <= m).length / runs;
    const out = { moves: m, stars: [0, r500(med * 1.05), r500(Math.max(top * 1.2, med * 1.4))], scale: +scale.toFixed(3), win: +winRate.toFixed(2) };
    const miss = (moves < lo ? lo - moves : moves > hi ? moves - hi : 0) + Math.abs(winRate - targetWin(n)) * 40;
    if (!best || miss < best.miss) best = { out, miss };
    if (moves >= lo && moves <= hi) return out;
    const want = (lo + hi) / 2 - 3;
    const ratio = Math.max(0.55, Math.min(2.2, want / Math.min(moves, 90)));
    scale = Math.max(0.4, Math.min(4, scale * Math.pow(ratio, attempt < 3 ? 1 : 0.5)));
  }
  return best.out;
}

if (isMainThread) {
  const [from = 1, to = 300, runs = 40] = process.argv.slice(2).map(Number);
  const out = fs.existsSync('data/levels.json') ? JSON.parse(fs.readFileSync('data/levels.json', 'utf8')) : {};
  const todo = []; for (let n = from; n <= to; n++) todo.push(n);
  const W = Math.max(1, cpus().length - 1);
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: W }, () => new Promise((resolve) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { runs } });
    const next = () => { const n = todo.shift(); if (n === undefined) { w.terminate(); resolve(); } else w.postMessage(n); };
    w.on('message', ({ n, r }) => {
      out[n] = r; done++;
      if (done % 10 === 0 || !todo.length) {
        fs.mkdirSync('data', { recursive: true });
        fs.writeFileSync('data/levels.json', JSON.stringify(out));
        console.log(`${done}/${to - from + 1}  level ${n}: ${JSON.stringify(r)}  ${((Date.now() - t0) / 1000) | 0}s`);
      }
      next();
    });
    next();
  })));
  fs.writeFileSync('data/levels.json', JSON.stringify(out));
  console.log('done', Object.keys(out).length, 'levels');
} else {
  parentPort.on('message', (n) => parentPort.postMessage({ n, r: calibrate(n, workerData.runs) }));
}
