/**
 * Ronnie's Manor family leaderboard. A Google Apps Script web app over a Google Sheet.
 * Setup: see SETUP.md. The sheet gets one row per score; the game asks for the top 10 per board.
 */
const FAMILY_CODE = 'MANOR'; // must match js/config.js
const SHEET = 'Scores';
const PROGRESS = 'Progress';
const BOARD_RE = /^(daily-\d{4}-\d{2}-\d{2}|nightbus|furthest)$/;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['Timestamp', 'Board', 'Player', 'Avatar', 'Score', 'Stars']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function progressSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PROGRESS);
  if (!sh) {
    sh = ss.insertSheet(PROGRESS);
    sh.appendRow(['Saved', 'Player', 'Level', 'Bricks', 'Data']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Progress backups are append-only: a restore picks the save with the highest level (then the newest),
// so a fresh phone that starts at level 1 can never wipe out a good backup.
function saveProgress_(body) {
  const player = clean_(body.player, 16);
  const data = body.data || {};
  const text = JSON.stringify(data);
  if (!player || text.length > 45000) return json_({ ok: false, error: 'bad progress' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { progressSheet_().appendRow([new Date(), player, Number(data.level) || 1, Number(data.bricks) || 0, text]); }
  finally { lock.releaseLock(); }
  return json_({ ok: true });
}

function loadProgress_(player) {
  const sh = progressSheet_();
  const n = sh.getLastRow() - 1;
  const key = String(player || '').trim().toLowerCase();
  let best = null;
  if (n > 0 && key) {
    for (const [saved, who, level, bricks, text] of sh.getRange(2, 1, n, 5).getValues()) {
      if (String(who).toLowerCase() !== key) continue;
      if (!best || level > best.level || (level === best.level && saved > best.saved)) best = { saved: saved, level: level, text: text };
    }
  }
  return json_({ ok: true, data: best ? JSON.parse(best.text) : null, saved: best ? best.saved : null });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(s, max) { return String(s || '').replace(/[<>"]/g, '').trim().slice(0, max); }

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (!body || body.code !== FAMILY_CODE) return json_({ ok: false, error: 'wrong family code' });
  if (body.type === 'progress') return saveProgress_(body);
  const rows = [];
  for (const s of (body.scores || []).slice(0, 50)) {
    const board = String(s.board || '');
    const score = Number(s.score);
    if (!BOARD_RE.test(board) || !isFinite(score) || score < 0 || score > 1e8) continue;
    rows.push([new Date(s.t || Date.now()), board, clean_(s.player, 16), clean_(s.avatar, 24), Math.round(score), Math.max(0, Math.min(3, Number(s.stars) || 0))]);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (rows.length) { const sh = sheet_(); sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows); }
  } finally { lock.releaseLock(); }
  return json_({ ok: true, saved: rows.length });
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.code !== FAMILY_CODE) return json_({ ok: false, error: 'wrong family code' });
  if (p.action === 'progress') return loadProgress_(p.player);
  const board = String(p.board || '');
  if (!BOARD_RE.test(board)) return json_({ ok: false, error: 'unknown board' });
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  const best = {};
  if (n > 0) {
    for (const [t, b, player, avatar, score, stars] of sh.getRange(2, 1, n, 6).getValues()) {
      if (b !== board || !player) continue;
      const k = String(player).toLowerCase();
      if (!best[k] || score > best[k].score) best[k] = { player: player, avatar: avatar, score: score, stars: stars };
    }
  }
  const rows = Object.values(best).sort((a, b) => b.score - a.score).slice(0, 10);
  return json_({ ok: true, rows: rows });
}
