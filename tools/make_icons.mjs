// Renders the home-screen icons with the headless browser from the how-to video tools.
import puppeteer from '/Users/christopheradams/.cache/howto-video/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import fs from 'node:fs';
const art = (pad) => `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect width="512" height="512" fill="#0F3B2E"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
<rect x="36" y="36" width="440" height="440" rx="70" fill="#0A2B21" stroke="#D9A93A" stroke-width="14"/>
<rect x="62" y="62" width="388" height="388" rx="52" fill="none" stroke="#D9A93A" stroke-opacity=".5" stroke-width="5"/>
<g transform="translate(106 92) scale(6.25)"><path d="M8 36 L8 15 L17 24 L24 9 L31 24 L40 15 L40 36 Z" fill="#E8B640"/><circle cx="8" cy="14" r="2.6" fill="#F6D57A"/><circle cx="24" cy="8.5" r="2.6" fill="#F6D57A"/><circle cx="40" cy="14" r="2.6" fill="#F6D57A"/><rect x="7" y="32" width="34" height="6" rx="1.5" fill="#B5861F"/><circle cx="24" cy="35" r="2.2" fill="#D6202B"/><circle cx="15" cy="35" r="1.6" fill="#2F62D6"/><circle cx="33" cy="35" r="1.6" fill="#2F62D6"/></g>
<rect x="96" y="352" width="320" height="64" rx="12" fill="#D6202B"/>
<text x="256" y="398" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" fill="#F5EEDC" text-anchor="middle" letter-spacing="2">MANOR</text>
</g></svg></body></html>`;
fs.mkdirSync('icons', { recursive: true });
const b = await puppeteer.launch({ headless: 'new' });
const p = await b.newPage();
for (const [name, size, pad] of [['icon-512', 512, 1], ['icon-192', 192, 1], ['icon-maskable-512', 512, 0.8]]) {
  await p.setViewport({ width: 512, height: 512, deviceScaleFactor: size / 512 });
  await p.setContent(art(pad));
  await p.screenshot({ path: `icons/${name}.png`, clip: { x: 0, y: 0, width: 512, height: 512 } });
}
await b.close();
console.log('icons done');
