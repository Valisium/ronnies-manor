import puppeteer from '/Users/christopheradams/.cache/howto-video/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const OUT = process.argv[2];
const b = await puppeteer.launch({ headless: 'new' });
const p = await b.newPage();
// never let tests touch the family's real leaderboard sheet
await p.setRequestInterception(true);
p.on('request', (r) => (r.url().includes('script.google') ? r.abort() : r.continue()));
await p.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:8765/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.setItem('ronnies-manor-v1', JSON.stringify({ v: 1, player: { name: 'Chris', avatar: 'cabbie' }, level: 95, stars: {}, bricks: 40 })); });
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 700));
await p.screenshot({ path: `${OUT}/n1-map95.png` });
await p.click('#btn-night'); await new Promise((r) => setTimeout(r, 1200));
for (let k = 0; k < 12; k++) {
  const st = await p.evaluate(() => { const R = window.__ronnie, G = R.G; if (G.over) return 'over'; if (G.busy) return 'busy'; const m = G.board.findMove(); if (m) R.view.onSwap(m[0], m[1]); return 'ok'; });
  if (st === 'over') break;
  await new Promise((r) => setTimeout(r, 900));
}
await p.screenshot({ path: `${OUT}/n2-night.png` });
// level 95 pre-level + game on small phone
await p.evaluate(() => history.back()); await new Promise((r) => setTimeout(r, 400));
await p.evaluate(() => { const b = document.querySelector('[data-act="leave"]'); if (b) b.click(); }); await new Promise((r) => setTimeout(r, 500));
await p.click('#btn-play'); await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: `${OUT}/n3-pre95.png` });
await p.click('[data-act="play"]'); await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: `${OUT}/n4-game95.png` });
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
