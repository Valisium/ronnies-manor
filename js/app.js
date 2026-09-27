// Ronnie's Manor: screens, the game loop, wins and losses, pop-ups and modes.
import { Board, K, hashStr } from './engine.js';
import { makeLevel, dailyLevel, nightBusLevel, setCalibration, zoneOf, stationOf, LEVELS_PER_ZONE, LEVELS_PER_STATION, TIER_LABEL } from './levels.js';
import { loadImages, AVATARS, avatarSvg, tileSvg, specialSvg, overlaySvg, TILE_NAMES } from './art.js';
import { BoardView } from './render.js';
import { Sound, buzz } from './audio.js';
import { load, save, today } from './store.js';
import { queueScore, flush, top, configured, BOARDS } from './leaderboard.js';
import { rhymeFor } from './slang.js';

const $ = (id) => document.getElementById(id);
const S = load();
const persist = () => save(S);
const sound = new Sound(S.settings);
const isRon = () => /^ron/i.test(S.player?.name || '');
const fmt = (n) => Math.round(n).toLocaleString('en-GB');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STAR = (on, cls = '') => `<svg viewBox="0 0 24 24" class="${on ? '' : 'off'} ${cls}" aria-hidden="true"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="#F0C861" stroke="#6E4F12" stroke-width="1.2"/></svg>`;
const say = (group, opts = {}) => sound.say(group, { ron: isRon(), ...opts });
const vibe = (p) => { if (S.settings.vibrate) buzz(p); };

let images = null, view = null, G = null;
let kettleAt = Date.now();

// ---------- screens ----------
const SCREENS = ['scr-welcome', 'scr-map', 'scr-game', 'scr-board', 'scr-settings'];
let current = '';
function show(id, push = true) {
  for (const s of SCREENS) $(s).hidden = s !== id;
  if (push && id !== 'scr-map' && id !== 'scr-welcome' && current !== id) history.pushState({ s: id }, '');
  current = id;
}

function toast(msg, ms = 3200) {
  const t = $('toast');
  t.hidden = true; void t.offsetWidth;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}

function openSheet(html, { onClose } = {}) {
  const sh = $('sheet'), card = $('sheet-card');
  card.innerHTML = html;
  sh.hidden = false;
  sh.onclick = (e) => { if (e.target === sh && onClose !== false) closeSheet(); };
  return card;
}
function closeSheet() { $('sheet').hidden = true; $('sheet-card').innerHTML = ''; }

// ---------- welcome ----------
function renderWelcome() {
  const chosen = S.player?.avatar || 'pearly-king';
  $('in-name').value = S.player?.name || '';
  $('welcome-avatars').innerHTML = AVATARS.map((a) => `<button type="button" class="av" data-id="${a.id}" aria-pressed="${a.id === chosen}" aria-label="${esc(a.name)}">${avatarSvg(a.id)}<span>${esc(a.name)}</span></button>`).join('');
  show('scr-welcome');
}
$('welcome-avatars').addEventListener('click', (e) => {
  const b = e.target.closest('.av'); if (!b) return;
  sound.unlock(); sound.sfx('tap');
  for (const x of $('welcome-avatars').querySelectorAll('.av')) x.setAttribute('aria-pressed', x === b);
});
$('btn-welcome').addEventListener('click', () => {
  sound.unlock();
  const name = $('in-name').value.trim().slice(0, 16);
  if (!name) { toast('Go on, tell us your name first.'); $('in-name').focus(); return; }
  const av = $('welcome-avatars').querySelector('[aria-pressed="true"]')?.dataset.id || 'pearly-king';
  const first = !S.player;
  S.player = { name, avatar: av }; persist();
  sound.sfx('win');
  say('welcome', { force: true });
  renderMap();
  if (first) setTimeout(() => toast(`Welcome to the Manor, ${name}! Tap Play to start at Angel.`, 4200), 400);
});

// ---------- happy hour ----------
function happyHour() {
  const d = today();
  const h = 11 + (hashStr('happy-' + d) % 11); // between 11am and 9pm
  const now = new Date();
  return { hour: h, active: now.getHours() === h, lastOrders: now.getHours() === h && now.getMinutes() >= 55 };
}
function hourLabel(h) { const p = h >= 12 ? 'pm' : 'am'; return `${((h + 11) % 12) + 1}${p}`; }

// ---------- map ----------
function levelStars(n) { return S.stars[n] || 0; }

function renderMap() {
  $('map-avatar').innerHTML = avatarSvg(S.player.avatar);
  $('map-name').textContent = S.player.name;
  $('map-bricks').textContent = fmt(S.bricks);
  $('map-streak').textContent = S.streak;
  const L = makeLevel(S.level);
  $('play-title').textContent = `Level ${S.level}`;
  $('play-sub').innerHTML = `${esc(L.name)} &middot; ${esc(L.zone)}${L.tier !== 'normal' ? ` <span class="badge ${L.tier}">${esc(L.label)}</span>` : ''}${L.club ? ' <span class="badge club">Club Night</span>' : ''}`;
  $('daily-sub').textContent = S.daily.date === today() && S.daily.plays ? `Today's best: ${fmt(S.daily.best)}. Have another go?` : 'Today\'s puzzle + Rhyme Time';
  $('night-sub').textContent = S.nightBest ? `Your best: ${fmt(S.nightBest)}` : 'Endless. How far can you go?';
  const hh = happyHour();
  $('happy-banner').hidden = !hh.active;
  if (hh.active) $('happy-banner').textContent = `Happy Hour at the Ronnie Arms! Double points and bricks until ${hourLabel(hh.hour + 1)}.`;

  const lastZone = zoneOf(S.level).index + 1;
  let html = '';
  for (let z = 0; z <= lastZone; z++) {
    const first = z * LEVELS_PER_ZONE + 1;
    const zo = zoneOf(first);
    const zoneDone = S.level > first + LEVELS_PER_ZONE - 1;
    let zs = 0; for (let n = first; n < first + LEVELS_PER_ZONE; n++) zs += levelStars(n);
    html += zoneDone ? `<details class="zone-done"><summary class="zone-head"><h3>Zone ${z + 1} &middot; ${esc(zo.name)}</h3><span>All done &middot; ${zs} of ${LEVELS_PER_ZONE * 3} stars &middot; tap to show</span></summary>` : `<div class="zone-head"><h3>Zone ${z + 1} &middot; ${esc(zo.name)}</h3><span>Levels ${first}&ndash;${first + LEVELS_PER_ZONE - 1}</span></div>`;
    for (let s = 0; s < LEVELS_PER_ZONE / LEVELS_PER_STATION; s++) {
      const n0 = first + s * LEVELS_PER_STATION;
      const st = stationOf(n0);
      const here = S.level >= n0 && S.level < n0 + LEVELS_PER_STATION;
      const done = S.level >= n0 + LEVELS_PER_STATION;
      const locked = S.level < n0;
      let lv = '';
      for (let k = 0; k < LEVELS_PER_STATION; k++) {
        const n = n0 + k;
        const tier = n % 30 === 0 ? 'guvnor' : n % 10 === 0 ? 'hard' : '';
        const stars = levelStars(n);
        lv += `<button type="button" class="lvl ${n === S.level ? 'here' : ''} ${tier}" data-n="${n}" ${n > S.level ? 'disabled' : ''} aria-label="Level ${n}${stars ? `, ${stars} stars` : ''}">${n}${stars ? `<small>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</small>` : ''}</button>`;
      }
      html += `<div class="station ${done ? 'done' : ''} ${here ? 'here' : ''} ${locked ? 'locked' : ''}" ${here ? 'id="st-here"' : ''}><span class="dot"></span><div class="st-body"><span class="st-name">${esc(st.name)}</span><div class="st-levels">${lv}</div></div></div>`;
    }
    if (zoneDone) html += '</details>';
  }
  $('tube').innerHTML = html;
  show('scr-map', false);
  flush(S, persist);
}

$('tube').addEventListener('click', (e) => { const b = e.target.closest('.lvl'); if (b && !b.disabled) { sound.sfx('tap'); openPreLevel(+b.dataset.n); } });
$('btn-play').addEventListener('click', () => { sound.unlock(); sound.sfx('tap'); openPreLevel(S.level); });
$('btn-profile').addEventListener('click', () => renderWelcome());
$('btn-settings').addEventListener('click', () => { renderSettings(); show('scr-settings'); });
$('btn-board').addEventListener('click', () => { sound.unlock(); show('scr-board'); loadBoard('daily'); });
$('btn-daily').addEventListener('click', () => { sound.unlock(); openDaily(); });
$('btn-night').addEventListener('click', () => { sound.unlock(); startGame(nightBusLevel((Math.random() * 1e9) | 0), 'night'); });
for (const b of document.querySelectorAll('.back')) b.addEventListener('click', () => history.back());

// ---------- goals text ----------
function goalIcon(g) {
  if (g.type === 'collect') return tileSvg(g.colour);
  if (g.type === 'puddles') return '<svg class="tile-ico" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 C30 16 38 22 38 30 a14 14 0 0 1 -28 0 C10 22 18 16 24 6 Z" fill="#4E96DE"/><ellipse cx="19" cy="28" rx="3" ry="5" fill="#BFE0FA" opacity=".7"/></svg>';
  if (g.type === 'blockers') return overlaySvg('fog');
  if (g.type === 'eels') return specialSvg('eel');
  if (g.type === 'jack') return specialSvg('jack');
  return '<svg class="tile-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="#F0C861"/></svg>';
}
function goalText(g, count) {
  if (g.type === 'collect') return `Collect ${count} ${TILE_NAMES[g.colour]}${count === 1 ? '' : 's'}`;
  if (g.type === 'puddles') return 'Mop up every puddle';
  if (g.type === 'blockers') return 'Clear all the fog and cones';
  if (g.type === 'eels') return `Bring ${count} pot${count === 1 ? '' : 's'} of jellied eels home`;
  if (g.type === 'jack') return `Roll ${count} jack${count === 1 ? '' : 's'} to the bottom`;
  return `Score ${fmt(g.count)} points`;
}

// ---------- pre-level ----------
function freeBoosters() {
  const out = [];
  if (S.streak >= 3) out.push('cab');
  if (S.streak >= 5) out.push('ben');
  if (S.streak >= 10) out.push('button');
  return out;
}

function openPreLevel(n) {
  const L = makeLevel(n);
  const probe = new Board(L, { record: false }); // fills in puddle and blocker counts
  const best = S.best[n] || 0;
  const free = freeBoosters();
  const inv = S.boosters;
  const b = (k, name, desc) => `<button type="button" class="booster" data-k="${k}" aria-pressed="false" ${inv[k] ? '' : 'disabled'}>${specialSvg(k === 'cab' ? 'cabh' : k)}<b>${name}</b><small>${inv[k] ? `You've got ${inv[k]}` : desc}</small></button>`;
  const card = openSheet(`
    <span class="eyebrow">${esc(L.zone)} &middot; ${esc(L.name)}</span>
    <h2>Level ${n}</h2>
    <div class="row" style="flex-wrap:wrap;gap:6px">${L.tier !== 'normal' ? `<span class="badge ${L.tier}">${esc(L.label)}</span>` : ''}${L.club ? '<span class="badge club">Club Night on the green</span>' : ''}<span class="badge">${L.moves} moves</span></div>
    <div class="sheet-goals">${probe.goals.map((g) => `<div class="sheet-goal">${goalIcon(g)}<span>${esc(goalText(g, g.count))}</span></div>`).join('')}</div>
    <div class="big-stars">${[1, 2, 3].map((k) => STAR(levelStars(n) >= k)).join('')}</div>
    ${best ? `<p class="note" style="text-align:center">Your best: ${fmt(best)}</p>` : ''}
    ${free.length ? `<p class="note">On a roll! You start with a free ${free.map((k) => ({ cab: 'Black Cab', ben: 'Big Ben', button: 'Pearly Button' }[k])).join(', ')}.</p>` : ''}
    <p class="big-label small">Bring a power-up in?</p>
    <div class="boosters">${b('cab', 'Black Cab', 'Win some in a bag of swag')}${b('ben', 'Big Ben', 'Win some in a bag of swag')}${b('button', 'Pearly Button', 'Win some in a bag of swag')}</div>
    <div class="row"><button type="button" class="btn btn-ghost" data-act="close">Not now</button><button type="button" class="btn btn-gold" data-act="play">Play</button></div>`);
  card.querySelector('.boosters').addEventListener('click', (e) => {
    const x = e.target.closest('.booster'); if (!x || x.disabled) return;
    x.setAttribute('aria-pressed', x.getAttribute('aria-pressed') !== 'true'); sound.sfx('tap');
  });
  card.querySelector('[data-act="close"]').onclick = closeSheet;
  card.querySelector('[data-act="play"]').onclick = () => {
    const chosen = [...card.querySelectorAll('.booster[aria-pressed="true"]')].map((x) => x.dataset.k);
    for (const k of chosen) S.boosters[k]--;
    persist(); closeSheet();
    startGame(L, 'level', [...free, ...chosen]);
  };
}

// ---------- the game ----------
async function startGame(L, mode, boosters = []) {
  sound.unlock();
  closeSheet();
  const board = new Board(L, { seed: L.seed });
  const hh = happyHour();
  if (hh.active) board.mult = 2;
  G = { L, mode, board, moves: L.moves, busy: false, over: false, used: 0, van: -1, pigeon: -1, hintT: 0, bonusTotal: 0 };
  const placed = [];
  for (const k of boosters) placed.push(board.placeSpecial({ cab: Math.random() < 0.5 ? K.CABH : K.CABV, ben: K.BEN, button: K.BUTTON }[k]));
  let bigBen = false;
  if (mode !== 'daily') {
    const key = `${today()}-${new Date().getHours()}`;
    if (S.bigBenHour !== key) { S.bigBenHour = key; persist(); board.placeSpecial(K.BEN); bigBen = true; }
  }
  if (mode !== 'daily' && Math.random() < 0.2) G.van = 3 + ((Math.random() * Math.max(2, L.moves - 8)) | 0);
  if (mode !== 'daily' && Math.random() < 0.12) G.pigeon = 2 + ((Math.random() * Math.max(2, L.moves - 6)) | 0);

  $('g-title').textContent = mode === 'level' ? `Level ${L.n}` : L.name;
  $('g-sub').textContent = mode === 'level' ? `${L.name}${L.tier !== 'normal' ? ' · ' + L.label : ''}${L.club ? ' · Club Night' : ''}` : mode === 'daily' ? `Score as much as you can in ${L.moves} moves` : 'Big matches earn extra moves';
  show('scr-game');
  const wrap = $('board-wrap');
  await sleep(0);
  view.layout(L, wrap.clientWidth, wrap.clientHeight);
  view.setBoard(board.snapshot());
  view.speed = 1;
  updateHud();
  $('van').hidden = true; $('pigeon').hidden = true;

  if (mode === 'night') say('nightbus', { force: true });
  else if (mode === 'daily') say('daily', { force: true });
  else if (L.club) say('club', { force: true });
  else say('start', { force: true });
  sound.sfx('ding');
  const notes = [];
  if (hh.active) notes.push('Happy Hour: double points!');
  if (boosters.length) notes.push(`${boosters.length === 1 ? 'Power-up' : 'Power-ups'} on the board.`);
  if (bigBen) { notes.push('Big Ben\'s struck the hour: free Big Ben, on the house!'); setTimeout(() => { sound.sfx('chime'); say('bighour', { force: true }); }, 1400); }
  if (hh.active && S.happySaid !== today()) { S.happySaid = today(); persist(); setTimeout(() => say('happy', { force: true }), 3200); }
  if (notes.length) toast(notes.join(' '));
  armHint();
}

function updateHud() {
  const { board, L, mode } = G;
  $('g-moves').textContent = G.moves;
  $('g-moves').parentElement.classList.toggle('low', G.moves <= 5 && !G.over);
  $('g-score').textContent = fmt(board.score);
  const s2 = L.stars[1], s3 = L.stars[2], max = s3 * 1.08;
  $('g-starfill').style.width = Math.min(100, (board.score / max) * 100) + '%';
  $('g-s2').style.left = (s2 / max) * 100 + '%';
  $('g-s3').style.left = (s3 / max) * 100 + '%';
  if (mode === 'level') {
    $('g-goals').innerHTML = board.goals.map((g) => {
      const left = Math.max(0, g.count - g.done);
      const done = left === 0;
      return `<div class="goal ${done ? 'done' : ''}" title="${esc(goalText(g, g.count))}">${goalIcon(g)}<b>${done ? '✓' : g.type === 'score' ? fmt(left) : left}</b></div>`;
    }).join('');
  } else {
    const best = mode === 'daily' ? (S.daily.date === today() ? S.daily.best : 0) : S.nightBest;
    $('g-goals').innerHTML = `<div class="goal"><span class="txt">Best<br>${fmt(best)}</span></div>`;
  }
}

function armHint() {
  clearTimeout(G?.hintT);
  if (!G || G.over) return;
  view.clearHint();
  G.hintT = setTimeout(() => showHint(false), 5000);
}
function showHint(asked) {
  if (!G || G.busy || G.over) return;
  const m = G.board.findMove();
  if (!m) return;
  view.setHint(m);
  if (asked || Math.random() < 0.3) say('hint', { force: asked });
}
$('btn-hint').addEventListener('click', () => { sound.unlock(); sound.sfx('tap'); showHint(true); });

const SHOUTS = ['', '', 'Tidy!', 'Pukka!', 'Blinding!', 'Lovely jubbly!', 'Would you Adam and Eve it!'];
function shout(text) {
  const el = $('shout');
  el.classList.remove('go'); void el.offsetWidth;
  el.textContent = text; el.classList.add('go');
}
function shake() {
  const w = $('board-wrap');
  w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
}

function onStep(st) {
  for (const f of st.fx || []) {
    if (f.t === 'match') sound.sfx('pop', Math.max(0, (st.cascade || 1) - 1));
    else if (f.t === 'made') {
      sound.sfx('ding');
      const g = { [K.CABH]: 'cab', [K.CABV]: 'cab', [K.BEN]: 'ben', [K.BUTTON]: 'button', [K.WOOD]: 'wood' }[f.kind];
      if (g && !G.over && Math.random() < 0.45) say(g);
    } else if (f.t === 'cab') { sound.sfx('whoosh'); sound.sfx('honk'); vibe(30); }
    else if (f.t === 'ben' || f.t === 'rush') { sound.sfx('bong'); shake(); vibe([40, 30, 60]); }
    else if (f.t === 'button') { sound.sfx('sparkle'); vibe([20, 20, 20, 20, 60]); if (f.cells.length > 20) shake(); }
    else if (f.t === 'wood') { sound.sfx('roll'); setTimeout(() => sound.sfx('clack'), 120 + f.path.length * 55); }
    else if (f.t === 'collect') { sound.sfx('collect'); toast('Home and dry!'); }
    else if (f.t === 'shuffle') { sound.sfx('shuffle'); toast('No moves left. Shuffling the board!'); }
  }
  const c = st.cascade || 0;
  if (c >= 2 && !G.over) {
    shout(SHOUTS[Math.min(6, c)]);
    if (c >= 6) { say('huge'); vibe([50, 40, 80]); } else if (c >= 4) say('big'); else if (Math.random() < 0.35) say('good');
  }
  $('g-score').textContent = fmt(st.score ?? G.board.score);
}

async function doMove(run) {
  if (!G || G.busy || G.over) return;
  sound.unlock();
  view.clearHint(); clearTimeout(G.hintT);
  const res = run();
  if (!res.valid) { sound.sfx('nope'); return false; }
  G.busy = true; view.locked = true;
  G.moves--; G.used++;
  updateHud();
  sound.sfx('swap');
  await view.play(res.steps, onStep);
  await afterMove(res.stats);
  G.busy = false; view.locked = false;
  return true;
}

async function afterMove(st) {
  const { board, mode } = G;
  if (mode === 'night') {
    const bonus = st.specials + (st.cascade >= 4 ? 2 : st.cascade >= 3 ? 1 : 0);
    if (bonus) { G.moves += bonus; G.bonusTotal += bonus; toast(`+${bonus} move${bonus > 1 ? 's' : ''}!`, 1400); sound.sfx('coin'); }
  }
  updateHud();
  if (mode === 'level' && board.goalsDone()) return win();
  if (G.moves <= 0) return mode === 'level' ? lose() : finishScoreMode();
  if (G.moves === 5 && mode === 'level') say('low', { force: true });
  if (G.used === G.van) popVan();
  if (G.used === G.pigeon) popPigeon();
  const hh = happyHour();
  if (hh.lastOrders && S.ordersSaid !== today()) { S.ordersSaid = today(); persist(); toast('Last orders! Five minutes left of Happy Hour.'); say('orders', { force: true }); }
  armHint();
}

function bindBoard() {
  view.onSwap = async (a, b) => {
    const ok = await doMove(() => G.board.trySwap(a, b));
    if (ok === false) await view.nope(a, b);
  };
  view.onTapSpecial = (i) => doMove(() => G.board.tapSpecial(i));
  view.onAnyInput = () => { sound.unlock(); if (G && G.toucher) view.speed = 0.12; else if (G && !G.over) armHint(); };
}

// ---------- pop-ups ----------
function popVan() {
  const v = $('van');
  v.hidden = true; void v.offsetWidth; v.hidden = false;
  sound.sfx('van'); say('icecream', { force: true });
  clearTimeout(popVan.t); popVan.t = setTimeout(() => { v.hidden = true; }, 7000);
}
$('van').addEventListener('click', () => {
  if (!G || G.over) return;
  $('van').hidden = true;
  G.moves += 5; updateHud(); sound.sfx('coin'); vibe(40);
  toast('Five more moves, on the house!'); say('moves', { force: true });
});
function popPigeon() {
  const p = $('pigeon');
  p.hidden = true; void p.offsetWidth; p.hidden = false;
  say('pigeon', { force: true });
  clearTimeout(popPigeon.t); popPigeon.t = setTimeout(() => { p.hidden = true; }, 4500);
}
$('pigeon').addEventListener('click', () => {
  $('pigeon').hidden = true;
  S.bricks += 50; persist(); sound.sfx('coin'); sound.sfx('sparkle'); vibe(40);
  toast('Caught the golden pigeon! +50 bricks');
});

// ---------- winning ----------
function starsFor(score, L) { return 1 + (score >= L.stars[1] ? 1 : 0) + (score >= L.stars[2] ? 1 : 0); }

async function win() {
  G.over = true; clearTimeout(G.hintT); view.clearHint();
  $('g-moves').parentElement.classList.remove('low');
  const { board, L } = G;
  if (G.moves > 0) {
    shout('Toucher finish!');
    say('toucher', { force: true });
    await sleep(700);
    view.speed = 0.45; G.toucher = true;
    const left = G.moves;
    const res = board.toucher(left, 5);
    let shown = left;
    await view.play(res.steps, (st) => {
      onStep(st);
      if ((st.fx || []).some((f) => f.t === 'made' && f.kind === K.WOOD) && shown > 0) { shown--; G.moves = shown; $('g-moves').textContent = shown; }
    });
    G.moves = 0; view.speed = 1; G.toucher = false; updateHud();
  }
  const score = board.score;
  const stars = starsFor(score, L);
  const n = L.n;
  const hh = happyHour();
  let bricks = stars * 5 + (L.tier === 'hard' ? 10 : L.tier === 'guvnor' ? 25 : 0);
  if (hh.active) bricks *= 2;
  const prevStars = S.stars[n] || 0;
  S.stars[n] = Math.max(prevStars, stars);
  S.best[n] = Math.max(S.best[n] || 0, score);
  const newLevel = n === S.level;
  if (newLevel) S.level = n + 1;
  S.bricks += bricks; S.streak++; S.winsSinceSwag++; S.stats.played++; S.stats.won++;
  queueScore(S, { board: BOARDS.furthest(), player: S.player.name, avatar: S.player.avatar, score: Math.max(n, S.level - 1), stars });
  persist(); flush(S, persist);

  const word = stars === 3 ? 'DIAMOND!' : L.tier === 'guvnor' ? 'GUV\'NOR!' : L.tier === 'hard' ? 'PROPER!' : ['BLINDING!', 'PUKKA!', 'LOVELY JUBBLY!', 'COR BLIMEY!'][(Math.random() * 4) | 0];
  const voice = stars === 3 ? 'three' : (L.tier === 'hard' || L.tier === 'guvnor') ? 'hard' : 'win';
  await celebrate({ word, stars, score, sub: stars === 3 ? 'Three stars!' : 'Level done!', bus: `${L.name.toUpperCase()} · LEVEL ${n} DONE`, voice });

  const zoneDone = n % LEVELS_PER_ZONE === 0 && newLevel;
  if (zoneDone) setTimeout(() => say('zone', { force: true }), 600);
  if (S.streak === 3 || S.streak === 5 || S.streak === 10) setTimeout(() => say('streak', { force: true }), 1400);
  const nextFree = S.streak < 3 ? `${3 - S.streak} more for a free Black Cab` : S.streak < 5 ? `${5 - S.streak} more for a free Big Ben too` : S.streak < 10 ? `${10 - S.streak} more for a free Pearly Button too` : 'All three power-ups free each level!';
  const card = openSheet(`
    <span class="eyebrow">${esc(L.zone)} &middot; ${esc(L.name)}</span>
    <h2>${zoneDone ? `Zone ${L.zoneIndex + 1} done!` : `Level ${n} done!`}</h2>
    <div class="big-stars">${[1, 2, 3].map((k) => STAR(stars >= k)).join('')}</div>
    <div>
      <div class="stat-row"><span>Score</span><b>${fmt(score)}</b></div>
      <div class="stat-row"><span>Bricks earned${hh.active ? ' (Happy Hour x2)' : ''}</span><b>+${bricks}</b></div>
      <div class="stat-row"><span>Win streak</span><b>${S.streak}</b></div>
    </div>
    <p class="note">${esc(nextFree)}</p>
    <div class="row"><button type="button" class="btn btn-ghost" data-act="map">Map</button><button type="button" class="btn btn-gold" data-act="next">Next level</button></div>`, { onClose: false });
  const afterwards = () => {
    if (S.winsSinceSwag >= 5) { S.winsSinceSwag = 0; persist(); openSwag(); return true; }
    return kettle();
  };
  card.querySelector('[data-act="map"]').onclick = () => { closeSheet(); renderMap(); afterwards(); };
  card.querySelector('[data-act="next"]').onclick = () => { closeSheet(); if (!afterwards()) openPreLevel(S.level); else renderMap(); };
}

async function lose() {
  G.over = true; clearTimeout(G.hintT); view.clearHint();
  $('g-moves').parentElement.classList.remove('low');
  const { board, L } = G;
  const lost = S.streak;
  S.streak = 0; S.stats.played++; persist();
  sound.sfx('lose'); say('lose', { force: true });
  const left = board.goals.filter((g) => g.done < g.count);
  const close = left.every((g) => (g.count - g.done) / g.count <= 0.15);
  const card = openSheet(`
    <h2>${close ? 'So close!' : 'Out of moves!'}</h2>
    <div class="sheet-goals">${left.map((g) => `<div class="sheet-goal">${goalIcon(g)}<span>${g.type === 'score' ? `${fmt(g.count - g.done)} points short` : `${fmt(g.count - g.done)} to go`}</span></div>`).join('')}</div>
    ${lost >= 3 ? `<p class="note">Your win streak of ${lost} has ended.</p>` : ''}
    <div class="row"><button type="button" class="btn btn-ghost" data-act="map">Map</button><button type="button" class="btn btn-gold" data-act="again">Have another go</button></div>`, { onClose: false });
  card.querySelector('[data-act="map"]').onclick = () => { closeSheet(); renderMap(); kettle(); };
  card.querySelector('[data-act="again"]').onclick = () => { closeSheet(); if (!kettle()) openPreLevel(L.n); else renderMap(); };
}

async function finishScoreMode() {
  G.over = true; clearTimeout(G.hintT); view.clearHint();
  $('g-moves').parentElement.classList.remove('low');
  const { board, L, mode } = G;
  const score = board.score;
  const stars = starsFor(score, L);
  let best = false, rows = null;
  const boardKey = mode === 'daily' ? BOARDS.daily(today()) : BOARDS.night();
  if (mode === 'daily') {
    if (S.daily.date !== today()) S.daily = { date: today(), best: 0, plays: 0, rhyme: null };
    S.daily.plays++;
    if (score > S.daily.best) { S.daily.best = score; best = true; }
  } else if (score > S.nightBest) { S.nightBest = score; best = true; }
  S.bricks += stars * 4; persist();
  queueScore(S, { board: boardKey, player: S.player.name, avatar: S.player.avatar, score, stars });
  await celebrate({ word: best ? 'PERSONAL BEST!' : stars === 3 ? 'DIAMOND!' : 'LAST ORDERS!', stars, score, sub: mode === 'night' ? `End of the line. ${G.bonusTotal} bonus moves earned.` : 'That\'s your Daily Ronnie.', bus: mode === 'night' ? 'NIGHT BUS · TERMINUS' : 'THE DAILY RONNIE', voice: best || stars === 3 ? 'three' : 'win' });
  await flush(S, persist);
  rows = await top(boardKey);
  let crown = false;
  if (rows && rows[0] && rows[0].player === S.player.name && rows[0].score === score) crown = true;
  if (crown) { sound.sfx('fanfare'); say('crown', { force: true }); }
  const card = openSheet(`
    <span class="eyebrow">${mode === 'daily' ? 'The Daily Ronnie' : 'Night Bus'}</span>
    <h2>${crown ? 'Top of the Manor!' : best ? 'Personal best!' : 'Nice one!'}</h2>
    <div class="big-stars">${[1, 2, 3].map((k) => STAR(stars >= k)).join('')}</div>
    <div class="stat-row"><span>Score</span><b>${fmt(score)}</b></div>
    <div class="stat-row"><span>Your best</span><b>${fmt(mode === 'daily' ? S.daily.best : S.nightBest)}</b></div>
    ${rows ? `<ol class="lb">${rows.slice(0, 5).map(lbRow).join('')}</ol>` : '<p class="note">Family scores will show here once the leaderboard is switched on.</p>'}
    <div class="row"><button type="button" class="btn btn-ghost" data-act="map">Map</button><button type="button" class="btn btn-gold" data-act="again">Another go</button></div>`, { onClose: false });
  card.querySelector('[data-act="map"]').onclick = () => { closeSheet(); renderMap(); kettle(); };
  card.querySelector('[data-act="again"]').onclick = () => { closeSheet(); if (mode === 'daily') startGame(dailyLevel(today()), 'daily'); else startGame(nightBusLevel((Math.random() * 1e9) | 0), 'night'); };
}

// ---------- celebration ----------
function celebrate({ word, stars, score, sub, bus, voice }) {
  return new Promise((resolve) => {
    const el = $('celebrate');
    $('cel-stamp').textContent = word;
    $('cel-stars').innerHTML = [0, 1, 2].map(() => STAR(true)).join('');
    $('cel-score').textContent = '0';
    $('cel-sub').textContent = sub;
    $('cel-bus-text').textContent = bus;
    el.classList.remove('play'); el.hidden = false; void el.offsetWidth; el.classList.add('play');
    vibe([60, 500, 40, 360, 40, 360, 90]);
    const svgs = [...$('cel-stars').children];
    const timers = [];
    svgs.forEach((s, k) => timers.push(setTimeout(() => {
      if (k >= stars) s.classList.add('off');
      s.classList.add('in');
      if (k < stars) sound.sfx('star', k);
    }, 650 + k * 420)));
    timers.push(setTimeout(() => sound.sfx('win'), 650 + 3 * 420));
    timers.push(setTimeout(() => say(voice, { force: true }), 500));
    const t0 = performance.now() + 300;
    const tick = (now) => {
      const k = Math.max(0, Math.min(1, (now - t0) / 1600));
      $('cel-score').textContent = fmt(score * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && !el.hidden) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    confetti(stars === 3 ? 220 : 130);
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      $('cel-score').textContent = fmt(score);
      el.hidden = true; el.classList.remove('play');
      resolve();
    };
    timers.push(setTimeout(finish, 4300));
    el.onclick = () => { if (performance.now() - t0 > 700) finish(); };
  });
}

function confetti(count) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('confetti'), ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = (cv.width = innerWidth * dpr), h = (cv.height = innerHeight * dpr);
  const cols = ['#D9A93A', '#F0C861', '#D6202B', '#2F62D6', '#FBF8F0', '#4CB85A'];
  const ps = [];
  for (let i = 0; i < count; i++) ps.push({ x: w / 2 + (Math.random() - 0.5) * w * 0.4, y: h * 0.4, vx: (Math.random() - 0.5) * 30 * dpr, vy: (-Math.random() * 24 - 8) * dpr, s: (5 + Math.random() * 7) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], pearl: i % 4 === 3 });
  const start = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.vy += 0.8 * dpr; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      if (p.pearl) { ctx.fillStyle = '#FBF8F0'; ctx.strokeStyle = '#D9A93A'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.arc(0, 0, p.s, 0, 7); ctx.fill(); ctx.stroke(); }
      else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      ctx.restore();
    }
    if (now - start < 3200 && !$('celebrate').hidden) requestAnimationFrame(frame); else ctx.clearRect(0, 0, w, h);
  })(start);
}

// ---------- bag of swag ----------
function openSwag() {
  say('swag', { force: true });
  const card = openSheet(`
    <span class="eyebrow">Five wins!</span>
    <h2>Bag of swag</h2>
    <button type="button" class="btn btn-gold btn-wide" data-act="open" style="min-height:120px;font-size:26px">Tap to open the sack</button>`, { onClose: false });
  card.querySelector('[data-act="open"]').onclick = () => {
    const r = Math.random();
    const k = r < 0.5 ? 'cab' : r < 0.85 ? 'ben' : 'button';
    const bricks = 20 + ((Math.random() * 5) | 0) * 10;
    S.boosters[k]++; S.bricks += bricks; persist();
    sound.sfx('fanfare'); confetti(90); vibe([40, 40, 80]);
    const name = { cab: 'a Black Cab', ben: 'a Big Ben', button: 'a Pearly Button' }[k];
    const c2 = openSheet(`
      <h2>Lovely jubbly!</h2>
      <div class="big-stars">${specialSvg(k === 'cab' ? 'cabh' : k).replace('class="tile-ico"', 'class="tile-ico" style="width:96px;height:96px"')}</div>
      <p class="big-label" style="text-align:center">You got ${name} and ${bricks} bricks.</p>
      <p class="note" style="text-align:center">Bring power-ups into any level from the level screen.</p>
      <button type="button" class="btn btn-gold btn-wide" data-act="ok">Sorted</button>`);
    c2.querySelector('[data-act="ok"]').onclick = () => { closeSheet(); renderMap(); };
  };
}

// ---------- kettle ----------
function kettle() {
  if (!S.settings.kettle || Date.now() - kettleAt < 2 * 3600 * 1000) return false;
  kettleAt = Date.now();
  say('kettle', { force: true });
  toast('You\'ve been at it two hours. Kettle on?', 5000);
  return false;
}

// ---------- daily ----------
function openDaily() {
  const d = today();
  if (S.daily.date !== d) S.daily = { date: d, best: 0, plays: 0, rhyme: null };
  const q = rhymeFor(d, hashStr('rhyme-' + d));
  const answered = S.daily.rhyme;
  const card = openSheet(`
    <span class="eyebrow">Rhyme Time &middot; bonus 5 bricks</span>
    <p class="big-label">What does "<span class="slang">${esc(q.slang)}</span>" mean?</p>
    <div class="opts">${q.options.map((o) => `<button type="button" class="opt ${answered ? (o === q.answer ? 'right' : o === answered ? 'wrong' : '') : ''}" data-o="${esc(o)}" ${answered ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
    <p class="note" id="rhyme-out">${answered ? (answered === q.answer ? 'Spot on! You got today\'s bricks.' : `It's "${esc(q.answer)}". New one tomorrow.`) : ''}</p>
    <span class="eyebrow">The Daily Ronnie</span>
    <p>Same board for the whole family today. Score as much as you can in 20 moves.${S.daily.best ? ` Your best today: <b>${fmt(S.daily.best)}</b>.` : ''}</p>
    <div class="row"><button type="button" class="btn btn-ghost" data-act="close">Not now</button><button type="button" class="btn btn-gold" data-act="play">Play the Daily</button></div>`);
  card.querySelector('.opts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b || S.daily.rhyme) return;
    const o = b.dataset.o; S.daily.rhyme = o;
    const right = o === q.answer;
    for (const x of card.querySelectorAll('.opt')) { x.disabled = true; if (x.dataset.o === q.answer) x.classList.add('right'); }
    if (!right) b.classList.add('wrong');
    if (right) { S.bricks += 5; sound.sfx('coin'); say('rhymeyes', { force: true }); } else { sound.sfx('nope'); say('rhymeno', { force: true }); }
    card.querySelector('#rhyme-out').textContent = right ? 'Spot on! +5 bricks.' : `Close, but no cigar. It's "${q.answer}".`;
    persist();
  });
  card.querySelector('[data-act="close"]').onclick = () => { closeSheet(); renderMap(); };
  card.querySelector('[data-act="play"]').onclick = () => startGame(dailyLevel(d), 'daily');
}

// ---------- leaderboard ----------
function lbRow(r, k) {
  const val = r.board === 'furthest' || r.furthest ? `Level ${r.score}` : fmt(r.score);
  return `<li><span class="pos">${k + 1}</span>${avatarSvg(r.avatar)}<span class="nm">${esc(r.player)}</span><span class="pts">${val}</span></li>`;
}
async function loadBoard(kind) {
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('on', t.dataset.board === kind);
  const key = kind === 'daily' ? BOARDS.daily(today()) : kind === 'night' ? BOARDS.night() : BOARDS.furthest();
  $('lb').innerHTML = '<li><span></span><span></span><span class="nm">Loading&hellip;</span><span></span></li>';
  await flush(S, persist);
  const rows = await top(key);
  if (rows) {
    $('lb').innerHTML = rows.length ? rows.map((r, k) => lbRow({ ...r, furthest: kind === 'furthest' }, k)).join('') : '';
    $('lb-note').textContent = rows.length ? '' : kind === 'daily' ? 'Nobody\'s played today\'s Daily Ronnie yet. Be the first!' : 'No scores yet.';
  } else {
    const mine = kind === 'daily' ? (S.daily.date === today() ? S.daily.best : 0) : kind === 'night' ? S.nightBest : S.level - 1;
    $('lb').innerHTML = mine ? lbRow({ player: S.player.name, avatar: S.player.avatar, score: mine, furthest: kind === 'furthest' }, 0) : '';
    $('lb-note').textContent = configured() ? 'Can\'t reach the family scores right now. Your scores are saved and will send later.' : 'Family scores aren\'t switched on yet. Your own best is shown here.';
  }
}
for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => { sound.sfx('tap'); loadBoard(t.dataset.board); });

// ---------- settings ----------
function renderSettings() {
  for (const k of ['sfx', 'voice', 'vibrate', 'kettle']) {
    const el = $('set-' + k);
    el.checked = !!S.settings[k];
    el.onchange = () => { S.settings[k] = el.checked; sound.settings = S.settings; persist(); if (k === 'voice' && el.checked) { sound.unlock(); say('good', { force: true }); } };
  }
}
$('btn-change').addEventListener('click', () => renderWelcome());

// ---------- back button (Android) ----------
window.addEventListener('popstate', () => {
  if (current === 'scr-game' && G && !G.over) {
    history.pushState({ s: 'scr-game' }, '');
    const card = openSheet(`<h2>Leave this level?</h2><p>You'll lose this go${S.streak >= 3 ? ` and your win streak of ${S.streak}` : ''}.</p><div class="row"><button type="button" class="btn btn-ghost" data-act="stay">Keep playing</button><button type="button" class="btn btn-red" data-act="leave">Leave</button></div>`);
    card.querySelector('[data-act="stay"]').onclick = closeSheet;
    card.querySelector('[data-act="leave"]').onclick = () => { closeSheet(); if (G.mode === 'level') { S.streak = 0; S.stats.played++; persist(); } G.over = true; clearTimeout(G.hintT); renderMap(); };
    return;
  }
  if (!$('sheet').hidden) closeSheet();
  if (S.player) renderMap();
});
$('btn-quit').addEventListener('click', () => history.back());

window.addEventListener('resize', () => {
  if (current !== 'scr-game' || !G) return;
  const wrap = $('board-wrap');
  view.layout(G.L, wrap.clientWidth, wrap.clientHeight);
});
document.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
window.addEventListener('online', () => flush(S, persist));

// ---------- boot ----------
async function boot() {
  try {
    const r = await fetch('data/levels.json');
    if (r.ok) setCalibration(await r.json());
  } catch (e) { /* the level maker estimates moves instead */ }
  images = await loadImages();
  view = new BoardView($('board'), images);
  bindBoard();
  if (S.player) renderMap(); else renderWelcome();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__ronnie = { S, get G() { return G; }, view, startGame, makeLevel, sound }; // for testing
}
boot();
