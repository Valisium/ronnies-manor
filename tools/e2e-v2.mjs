import puppeteer from '/Users/christopheradams/.cache/howto-video/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const OUT = process.argv[2];
const b = await puppeteer.launch({ headless: 'new' });
const p = await b.newPage();
// never let tests touch the family's real leaderboard sheet
await p.setRequestInterception(true);
p.on('request', (r) => (r.url().includes('script.google') ? r.abort() : r.continue()));
await p.setViewport({ width: 412, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('console: ' + m.text()); });
await p.goto('http://localhost:8765/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.setItem('ronnies-manor-v1', JSON.stringify({ v: 1, player: { name: 'Ronnie', avatar: 'bowls' }, level: 140, stars: {}, bricks: 1200, pub: { done: ['clean', 'paint', 'sign', 'door', 'lamps', 'baskets'] } })); });
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 700));
await p.screenshot({ path: `${OUT}/v1-map.png` });
await p.click('#btn-pub'); await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: `${OUT}/v2-pub.png` });
await p.click('#btn-build'); await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: `${OUT}/v3-built.png` });
// finish chapter 1 quickly to see the garden
await p.evaluate(() => { const S = window.__ronnie.S; S.pub.done = ['clean', 'paint', 'sign', 'door', 'lamps', 'baskets', 'dartboard', 'piano', 'jukebox', 'trophies', 'bunting', 'cat', 'weeds', 'fence', 'lawn', 'benches', 'brollies', 'lights', 'bbq', 'green']; S.bricks = 5000; });
await p.evaluate(() => history.back()); await new Promise((r) => setTimeout(r, 400));
await p.click('#btn-pub'); await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: `${OUT}/v4-garden.png` });
await p.evaluate(() => history.back()); await new Promise((r) => setTimeout(r, 400));
await p.click('#btn-wheel'); await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: `${OUT}/v5-wheel.png` });
await p.click('[data-act="spin"]'); await new Promise((r) => setTimeout(r, 4400));
await p.screenshot({ path: `${OUT}/v6-wheelwin.png` });
await p.evaluate(() => { document.getElementById('sheet').hidden = true; });
// a level with pigeons
const n = await p.evaluate(() => { for (let n = 121; n < 300; n++) { const L = window.__ronnie.makeLevel(n); if (L.blockers.some((b) => b.type === 4)) return n; } return 0; });
await p.evaluate((n) => { const R = window.__ronnie; R.startGame(R.makeLevel(n), 'level', []); }, n);
await new Promise((r) => setTimeout(r, 1500));
await p.evaluate(() => { const G = window.__ronnie.G; for (let k = 0; k < 6; k++) { const i = G.board.placeSpecial(1); if (i >= 0) G.board.lucky[i] = 1; } window.__ronnie.view.setBoard(G.board.snapshot()); });
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({ path: `${OUT}/v7-pigeons-level${n}.png` });
for (let k = 0; k < 4; k++) { await p.evaluate(() => { const R = window.__ronnie, G = R.G; if (!G.busy && !G.over) { const m = G.board.findMove(); if (m) R.view.onSwap(m[0], m[1]); } }); await new Promise((r) => setTimeout(r, 1600)); }
await p.screenshot({ path: `${OUT}/v8-after-moves.png` });
console.log('pigeon level', n);
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
