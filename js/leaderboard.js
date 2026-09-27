// Family leaderboard client for the Google Apps Script web app (backend/Code.gs).
// Scores queue on the phone and send when there's signal.
import { CONFIG } from './config.js';

export const BOARDS = { daily: (d) => 'daily-' + d, night: () => 'nightbus', furthest: () => 'furthest' };

export function configured() { return !!CONFIG.leaderboardUrl; }

export function queueScore(state, entry) {
  state.pending.push({ ...entry, t: Date.now() });
  if (state.pending.length > 200) state.pending.splice(0, state.pending.length - 200);
}

export async function flush(state, persist) {
  if (!configured() || !state.pending.length || !navigator.onLine) return;
  const batch = state.pending.slice(0, 20);
  try {
    // text/plain avoids a CORS preflight, which Apps Script can't answer
    const r = await fetch(CONFIG.leaderboardUrl, { method: 'POST', body: JSON.stringify({ code: CONFIG.familyCode, scores: batch }) });
    const j = await r.json();
    if (j.ok) { state.pending.splice(0, batch.length); persist(); }
  } catch (e) { /* try again later */ }
}

export async function top(board) {
  if (!configured()) return null;
  try {
    const u = `${CONFIG.leaderboardUrl}?code=${encodeURIComponent(CONFIG.familyCode)}&board=${encodeURIComponent(board)}`;
    const r = await fetch(u);
    const j = await r.json();
    return j.ok ? j.rows : null;
  } catch (e) { return null; }
}

// ---------- progress backup (Progress tab in the same sheet) ----------
const KEEP = ['level', 'stars', 'best', 'bricks', 'boosters', 'streak', 'winsSinceSwag', 'nightBest', 'stats', 'pub', 'tries'];

export function progressData(state) {
  const d = { avatar: state.player?.avatar };
  for (const k of KEEP) if (state[k] !== undefined) d[k] = state[k];
  return d;
}

export async function backupProgress(state, persist) {
  if (!configured() || !state.player || !navigator.onLine) { state.backupDue = true; persist(); return false; }
  try {
    const r = await fetch(CONFIG.leaderboardUrl, { method: 'POST', body: JSON.stringify({ code: CONFIG.familyCode, type: 'progress', player: state.player.name, data: progressData(state) }) });
    const j = await r.json();
    state.backupDue = !j.ok; state.backupAt = j.ok ? Date.now() : state.backupAt; persist();
    return !!j.ok;
  } catch (e) { state.backupDue = true; persist(); return false; }
}

export async function fetchProgress(name) {
  if (!configured()) return null;
  try {
    const r = await fetch(`${CONFIG.leaderboardUrl}?code=${encodeURIComponent(CONFIG.familyCode)}&action=progress&player=${encodeURIComponent(name)}`);
    const j = await r.json();
    return j.ok && j.data ? { data: j.data, saved: j.saved } : null;
  } catch (e) { return null; }
}
