// Robot player: greedy with a little randomness, like a decent human. Used by calibrate.mjs.
import { Board, K } from '../js/engine.js';

function goalWeight(b, st) {
  let s = 0;
  for (const g of b.goals) {
    if (g.done >= g.count) continue;
    if (g.type === 'collect') s += st.cleared[g.colour] * 40;
    if (g.type === 'puddles') s += st.puddles * 60;
    if (g.type === 'blockers') s += st.blockers * 60;
    if (g.type === 'eels' || g.type === 'jack') s += st.ingredients * 900;
  }
  return s;
}

function ingredientHeight(b) {
  let s = 0;
  for (let i = 0; i < b.N; i++) if (b.kind[i] === K.EEL || b.kind[i] === K.JACK) s += (i / b.W) | 0;
  return s;
}

// Plays until goals are met or maxMoves. Returns { won, used, score }.
export function play(level, seed, maxMoves = 90, skill = 0.72) {
  const b = new Board(level, { seed, record: false });
  for (let m = 0; m < maxMoves; m++) {
    if (b.goalsDone()) return { won: true, used: m, score: b.score };
    const moves = b.allMoves();
    if (!moves.length) { b.shuffle(false); continue; }
    let best = null, bestS = -Infinity;
    const sample = moves.length > 14 ? moves.sort(() => b.rand() - 0.5).slice(0, 14) : moves;
    for (const [a, c] of sample) {
      const t = b.clone();
      const h0 = ingredientHeight(t);
      const r = t.trySwap(a, c);
      if (!r.valid) continue;
      const s = r.stats.score * 0.2 + goalWeight(b, r.stats) + r.stats.specials * 120 + (ingredientHeight(t) - h0) * 150 + (t.goalsDone() ? 1e6 : 0);
      if (s > bestS) { bestS = s; best = [a, c]; }
    }
    if (!best || b.rand() > skill) best = moves[(b.rand() * moves.length) | 0];
    b.trySwap(best[0], best[1]);
  }
  return { won: b.goalsDone(), used: maxMoves, score: b.score };
}
