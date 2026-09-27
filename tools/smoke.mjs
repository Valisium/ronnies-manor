import { makeLevel } from '../js/levels.js';
import { Board } from '../js/engine.js';
import { play } from './bot.mjs';
const t0 = Date.now();
for (const n of [1, 2, 3, 7, 11, 16, 17, 30, 31, 45, 90, 91, 150, 200, 230, 300, 450]) {
  const L = makeLevel(n);
  const runs = [];
  for (let s = 0; s < 6; s++) runs.push(play(L, 1000 + s));
  const used = runs.map((r) => (r.won ? r.used : 99)).sort((a, b) => a - b);
  // check a recorded board produces steps
  const b = new Board(L); const mv = b.findMove(); const res = b.trySwap(mv[0], mv[1]);
  console.log(n, L.tier.padEnd(8), L.name.padEnd(22), JSON.stringify(L.goals.map((g) => g.type + ':' + g.count)), 'cols', L.colours, 'blk', L.blockers.length, 'clamps', L.clamps.length, 'puddles', L.puddles.length, '| moves needed', used.join(','), '| steps', res.steps.length);
}
console.log('ms', Date.now() - t0);
