// End-to-end check in a phone-sized headless browser. Screenshots go to the scratch folder given.
import puppeteer from '/Users/christopheradams/.cache/howto-video/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const OUT = process.argv[2] || '/tmp';
const URL = process.argv[3] || 'http://localhost:8765/';
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.setViewport({ width: 412, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.goto(URL, { waitUntil: 'networkidle0' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
await p.screenshot({ path: `${OUT}/1-welcome.png` });
await p.type('#in-name', 'Ronnie');
await p.click('.av[data-id="cabbie"]');
await p.click('#btn-welcome');
await new Promise((r) => setTimeout(r, 1200));
await p.screenshot({ path: `${OUT}/2-map.png` });
await p.click('#btn-play');
await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: `${OUT}/3-prelevel.png` });
await p.click('[data-act="play"]');
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: `${OUT}/4-game.png` });
// play with the hint finder until the level ends
let shots = 0;
for (let k = 0; k < 60; k++) {
  const state = await p.evaluate(async () => {
    const R = window.__ronnie; const G = R.G;
    if (!G || G.over) return 'over';
    if (G.busy) return 'busy';
    const m = G.board.findMove(); if (!m) return 'nomove';
    R.view.onSwap(m[0], m[1]);
    return 'moved';
  });
  if (state === 'over') break;
  await new Promise((r) => setTimeout(r, 900));
  if (k === 2 && shots++ === 0) await p.screenshot({ path: `${OUT}/5-midgame.png` });
}
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: `${OUT}/6-celebrate.png` });
await new Promise((r) => setTimeout(r, 5000));
await p.screenshot({ path: `${OUT}/7-result.png` });
const info = await p.evaluate(() => ({ level: window.__ronnie.S.level, stars: window.__ronnie.S.stars, bricks: window.__ronnie.S.bricks, over: window.__ronnie.G.over, moves: window.__ronnie.G.moves, score: window.__ronnie.G.board.score }));
console.log(JSON.stringify(info));
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
