// All artwork as small SVGs, drawn once into images for the board canvas.

export const TILE_COLOURS = ['#D6202B', '#2F62D6', '#E8B640', '#F5EEDC', '#4CB85A', '#9A55D0', '#E08A1E'];
export const TILE_NAMES = ['Routemaster', 'Roundel', 'Crown', 'Rosie Lee', 'Pie & mash', 'Brolly', 'Pint'];

const svg = (body, vb = '0 0 48 48') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

export const TILES = [
  // 0 Routemaster
  svg(`<rect x="6" y="8" width="36" height="29" rx="7" fill="#D6202B"/><rect x="10" y="12" width="28" height="7" rx="2" fill="#F5EEDC"/><rect x="6" y="20.5" width="36" height="2" fill="#9E1119"/><rect x="10" y="24" width="28" height="6" rx="2" fill="#F5EEDC" opacity=".85"/><circle cx="15" cy="38" r="4.2" fill="#1B1B1B"/><circle cx="33" cy="38" r="4.2" fill="#1B1B1B"/>`),
  // 1 Roundel
  svg(`<circle cx="24" cy="24" r="13.5" fill="none" stroke="#2F62D6" stroke-width="7"/><rect x="3" y="19.5" width="42" height="9" rx="2" fill="#2F62D6"/><rect x="9" y="23" width="30" height="2" rx="1" fill="#F5EEDC"/>`),
  // 2 Crown
  svg(`<path d="M8 36 L8 15 L17 24 L24 9 L31 24 L40 15 L40 36 Z" fill="#E8B640"/><circle cx="8" cy="14" r="2.6" fill="#F6D57A"/><circle cx="24" cy="8.5" r="2.6" fill="#F6D57A"/><circle cx="40" cy="14" r="2.6" fill="#F6D57A"/><rect x="7" y="32" width="34" height="6" rx="1.5" fill="#B5861F"/><circle cx="24" cy="35" r="2.2" fill="#D6202B"/><circle cx="15" cy="35" r="1.6" fill="#2F62D6"/><circle cx="33" cy="35" r="1.6" fill="#2F62D6"/>`),
  // 3 Rosie Lee
  svg(`<path d="M34 18 h3 a6 6 0 0 1 0 12 h-3" fill="none" stroke="#F5EEDC" stroke-width="4"/><path d="M9 14 H35 V31 a9 9 0 0 1 -9 9 H18 a9 9 0 0 1 -9 -9 Z" fill="#F5EEDC"/><ellipse cx="22" cy="14.5" rx="13" ry="3.2" fill="#8A5A2B"/><rect x="9" y="25" width="26" height="4" fill="#B07A45"/><path d="M17 9 q2 -3 0 -6 M23 9 q2 -3 0 -6 M29 9 q2 -3 0 -6" stroke="#F5EEDC" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>`),
  // 4 Pie & mash
  svg(`<ellipse cx="24" cy="32" rx="20" ry="10" fill="#4CB85A"/><path d="M9 29 Q24 7 39 29 Z" fill="#D39247"/><path d="M18 22 l3 3 M24 18 v4 M30 22 l-3 3" stroke="#A86D2A" stroke-width="2" stroke-linecap="round"/><rect x="8" y="27" width="32" height="4.5" rx="2.2" fill="#A86D2A"/>`),
  // 5 Brolly
  svg(`<path d="M24 26 V38 a3.6 3.6 0 0 1 -7.2 0" fill="none" stroke="#E8DFC7" stroke-width="3" stroke-linecap="round"/><path d="M4 26 Q24 -2 44 26 Q39.5 21.5 34.5 26 Q29 21.5 24 26 Q19 21.5 13.5 26 Q8.5 21.5 4 26 Z" fill="#9A55D0"/><path d="M24 5 V26" stroke="#7B3FA0" stroke-width="1.5"/>`),
  // 6 Pint
  svg(`<path d="M13 8 H35 L32 42 H16 Z" fill="#E08A1E"/><path d="M13 8 H35 L34.4 14 H13.6 Z" fill="#FFF6E0"/><path d="M12 6 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 v3 H12 Z" fill="#FFF6E0"/><path d="M18 18 L19.5 38" stroke="#FFD08A" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`),
];

export const SPECIALS = {
  cabh: svg(`<rect x="20" y="7" width="8" height="4" rx="1" fill="#FFC72C"/><path d="M4 34 V27 Q5 22.5 11 21.5 L15 13.5 Q16 11 19 11 H29 Q32 11 33 13.5 L37 21.5 Q43 22.5 44 27 V34 Z" fill="#1B1B1B" stroke="#F5EEDC" stroke-width="1.5"/><path d="M17 14 H23 V21 H13.5 Z M25 14 H31 L34.5 21 H25 Z" fill="#9FB3C8"/><circle cx="13" cy="35" r="4.5" fill="#2A2A2A" stroke="#F5EEDC" stroke-width="1.5"/><circle cx="35" cy="35" r="4.5" fill="#2A2A2A" stroke="#F5EEDC" stroke-width="1.5"/><path d="M1 24 l3 -3 v6 Z M47 24 l-3 -3 v6 Z" fill="#FFC72C"/>`),
  cabv: svg(`<g transform="rotate(90 24 24)"><rect x="20" y="7" width="8" height="4" rx="1" fill="#FFC72C"/><path d="M4 34 V27 Q5 22.5 11 21.5 L15 13.5 Q16 11 19 11 H29 Q32 11 33 13.5 L37 21.5 Q43 22.5 44 27 V34 Z" fill="#1B1B1B" stroke="#F5EEDC" stroke-width="1.5"/><path d="M17 14 H23 V21 H13.5 Z M25 14 H31 L34.5 21 H25 Z" fill="#9FB3C8"/><circle cx="13" cy="35" r="4.5" fill="#2A2A2A" stroke="#F5EEDC" stroke-width="1.5"/><circle cx="35" cy="35" r="4.5" fill="#2A2A2A" stroke="#F5EEDC" stroke-width="1.5"/></g><path d="M24 1 l-3 3 h6 Z M24 47 l-3 -3 h6 Z" fill="#FFC72C"/>`),
  ben: svg(`<path d="M17 15 L24 3 L31 15 Z" fill="#8C6D2F"/><rect x="17" y="15" width="14" height="29" fill="#D1AE63"/><rect x="17" y="15" width="14" height="3" fill="#8C6D2F"/><circle cx="24" cy="24.5" r="5" fill="#F5EEDC" stroke="#8C6D2F" stroke-width="1.5"/><path d="M24 24.5 V21 M24 24.5 H26.5" stroke="#1B1B1B" stroke-width="1.2" stroke-linecap="round"/><path d="M20 33 V42 M24 33 V42 M28 33 V42" stroke="#8C6D2F" stroke-width="1.5"/>`),
  button: svg(`<circle cx="24" cy="24" r="19" fill="#FBF8F0" stroke="#D9A93A" stroke-width="2.5"/><circle cx="24" cy="24" r="13" fill="none" stroke="#E4DCC6" stroke-width="1.5"/><circle cx="20" cy="20" r="2.4" fill="#B9AE92"/><circle cx="28" cy="20" r="2.4" fill="#B9AE92"/><circle cx="20" cy="28" r="2.4" fill="#B9AE92"/><circle cx="28" cy="28" r="2.4" fill="#B9AE92"/><path d="M12 15 q4 -6 10 -7" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  wood: svg(`<circle cx="24" cy="24" r="17" fill="#2A2320"/><ellipse cx="18" cy="17" rx="6" ry="4" fill="#FFFFFF" opacity=".22"/><circle cx="29" cy="27" r="6" fill="none" stroke="#D9A93A" stroke-width="2"/><circle cx="29" cy="27" r="2.2" fill="#D9A93A"/>`),
  eel: svg(`<path d="M8 22 H40 L37 40 Q24 46 11 40 Z" fill="#F5EEDC"/><ellipse cx="24" cy="22" rx="16" ry="5" fill="#C9C3AE"/><path d="M12 22 q4 -8 9 -2 q5 6 9 -2 q4 -7 8 0" stroke="#5E6B73" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="37.5" cy="19.5" r="1.2" fill="#111"/><rect x="11" y="30" width="26" height="4" fill="#2F62D6"/><text x="24" y="44" font-size="5" text-anchor="middle" fill="#2F62D6" font-family="sans-serif" font-weight="700">EELS</text>`),
  jack: svg(`<circle cx="24" cy="26" r="13" fill="#FFF7C2" stroke="#D9A93A" stroke-width="2.5"/><ellipse cx="19" cy="21" rx="4" ry="3" fill="#FFFFFF"/><path d="M14 40 h20" stroke="#0A2B21" stroke-width="2" opacity=".4" stroke-linecap="round"/>`),
};

export const OVERLAYS = {
  clamp: svg(`<circle cx="24" cy="24" r="15" fill="none" stroke="#FFC72C" stroke-width="5" opacity=".95"/><circle cx="24" cy="24" r="15" fill="none" stroke="#1B1B1B" stroke-width="5" stroke-dasharray="4 6"/><rect x="18" y="36" width="12" height="9" rx="2" fill="#FFC72C" stroke="#1B1B1B" stroke-width="1.5"/><circle cx="24" cy="40.5" r="1.8" fill="#1B1B1B"/>`),
  clamp2: svg(`<circle cx="24" cy="24" r="15" fill="none" stroke="#FFC72C" stroke-width="6"/><circle cx="24" cy="24" r="15" fill="none" stroke="#1B1B1B" stroke-width="6" stroke-dasharray="4 5"/><circle cx="24" cy="24" r="20" fill="none" stroke="#FFC72C" stroke-width="3"/><rect x="18" y="36" width="12" height="9" rx="2" fill="#FFC72C" stroke="#1B1B1B" stroke-width="1.5"/><circle cx="24" cy="40.5" r="1.8" fill="#1B1B1B"/>`),
  fog: svg(`<circle cx="16" cy="27" r="11" fill="#D6DBD6"/><circle cx="29" cy="21" r="13" fill="#E6E9E4"/><circle cx="33" cy="31" r="10" fill="#CBD1CC"/><circle cx="20" cy="33" r="9" fill="#DDE1DC"/><path d="M11 25 h14 M22 32 h15" stroke="#B5BCB6" stroke-width="2" stroke-linecap="round"/>`),
  cone: svg(`<rect x="8" y="38" width="32" height="5" rx="1.5" fill="#1B1B1B"/><path d="M19 6 H29 L37 38 H11 Z" fill="#F26A1B"/><path d="M16.6 16 H31.4 L33 23 H15 Z M13.7 28 H34.3 L35.5 33 H12.5 Z" fill="#F5EEDC"/>`),
  box: svg(`<rect x="7" y="12" width="34" height="28" rx="3" fill="#B07A45" stroke="#6E4B2A" stroke-width="2"/><path d="M7 20 H41 M24 12 V40" stroke="#6E4B2A" stroke-width="2"/><rect x="12" y="26" width="24" height="9" rx="1.5" fill="#F5EEDC"/><text x="24" y="32.5" font-size="4.6" font-family="sans-serif" font-weight="700" fill="#D6202B" text-anchor="middle">LOST PROPERTY</text><path d="M17 12 q7 -8 14 0" stroke="#D9A93A" stroke-width="2.5" fill="none"/>`),
  box1: svg(`<rect x="7" y="12" width="34" height="28" rx="3" fill="#B07A45" stroke="#6E4B2A" stroke-width="2"/><path d="M7 20 H41 M24 12 V40 M10 14 l10 10 M36 30 l-6 8" stroke="#6E4B2A" stroke-width="2"/><rect x="12" y="26" width="24" height="9" rx="1.5" fill="#F5EEDC" transform="rotate(-8 24 30)"/><text x="24" y="32.5" font-size="4.6" font-family="sans-serif" font-weight="700" fill="#D6202B" text-anchor="middle" transform="rotate(-8 24 30)">LOST PROPERTY</text><circle cx="34" cy="16" r="3" fill="#F0C861"/>`),
  pigeon: svg(`<ellipse cx="22" cy="30" rx="15" ry="11" fill="#8E96A3"/><path d="M10 28 q10 -10 22 -2 q-10 10 -22 2 z" fill="#6F7885"/><circle cx="33" cy="19" r="8" fill="#8E96A3"/><path d="M28 25 q5 4 10 0" stroke="#6FA38F" stroke-width="3" fill="none"/><path d="M40 18 l7 2 l-7 3 z" fill="#D9A93A"/><circle cx="35" cy="17" r="2.2" fill="#F08A24"/><circle cx="35.4" cy="17" r="1" fill="#111"/><path d="M18 40 v5 M26 40 v5" stroke="#D9885A" stroke-width="2"/><path d="M3 30 q-2 -14 8 -12 q2 8 -2 14 z" fill="#F5EEDC" stroke="#1B1B1B" stroke-width="1.2"/><text x="6.5" y="26.5" font-size="5" font-family="sans-serif" font-weight="700" fill="#1B1B1B" text-anchor="middle">£</text>`),
  lucky: svg(`<circle cx="24" cy="24" r="10" fill="#FFF7C2" stroke="#D9A93A" stroke-width="3"/><ellipse cx="21" cy="21" rx="3" ry="2" fill="#FFFFFF"/>`),
  cone1: svg(`<rect x="8" y="38" width="32" height="5" rx="1.5" fill="#1B1B1B"/><path d="M19 6 H29 L37 38 H11 Z" fill="#F26A1B" transform="rotate(-18 24 38)"/><path d="M16.6 16 H31.4 L33 23 H15 Z" fill="#F5EEDC" transform="rotate(-18 24 38)"/>`),
};

// ---------- avatars ----------
const SKIN = ['#F1C7A5', '#E0AC84', '#C68A5E', '#8D5A3B', '#F5D3B8'];
function face(skin) {
  return `<circle cx="32" cy="37" r="15" fill="${skin}"/><circle cx="26.5" cy="37" r="1.9" fill="#1B1B1B"/><circle cx="37.5" cy="37" r="1.9" fill="#1B1B1B"/><circle cx="23" cy="42" r="2.4" fill="#E38A7A" opacity=".45"/><circle cx="41" cy="42" r="2.4" fill="#E38A7A" opacity=".45"/><path d="M26.5 43 Q32 48 37.5 43" stroke="#1B1B1B" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}
const dots = (list) => list.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#FFFFFF"/>`).join('');

export const AVATARS = [
  { id: 'pearly-king', name: 'Pearly King', bg: '#2451B7', art: face(SKIN[0]) + '<path d="M16 30 Q17 17 32 17 Q47 17 48 30 Z" fill="#1D1D1D"/><rect x="14" y="28.5" width="38" height="4" rx="2" fill="#111"/>' + dots([[22, 26], [27, 22], [32, 20], [37, 22], [42, 26], [27, 27], [32, 25], [37, 27], [18, 30.5], [24, 30.5], [30, 30.5], [36, 30.5], [42, 30.5], [48, 30.5]]) },
  { id: 'pearly-queen', name: 'Pearly Queen', bg: '#D6202B', art: face(SKIN[4]) + '<path d="M40 18 Q52 2 59 9 Q50 10 43 22 Z" fill="#F2A7C3"/><path d="M20 26 Q21 12 32 12 Q43 12 44 26 Z" fill="#4A2D66"/><ellipse cx="32" cy="26" rx="22" ry="4.5" fill="#3A2350"/>' + dots([[16, 26], [22, 27.5], [28, 28], [34, 28], [40, 27.5], [46, 26], [26, 19], [32, 16], [38, 19]]) },
  { id: 'cabbie', name: 'Cabbie', bg: '#FFC72C', art: face(SKIN[2]) + '<path d="M17 29 Q18 17 32 17 Q46 17 47 29 Z" fill="#222"/><path d="M15 29 H44 Q41 33.5 30 33.5 H17 Q15 33.5 15 29 Z" fill="#111"/><circle cx="32" cy="23" r="2.8" fill="#FFC72C"/>' },
  { id: 'bowls', name: 'Bowls Champ', bg: '#7B3FA0', art: '<ellipse cx="32" cy="57" rx="15" ry="5" fill="#FFFFFF"/>' + face(SKIN[1]) + '<path d="M21 25 Q21 12 32 12 Q43 12 43 25 Z" fill="#FFFFFF"/><rect x="21" y="21" width="22" height="2.6" fill="#0F3B2E"/><ellipse cx="32" cy="25.5" rx="21" ry="4.5" fill="#F5EEDC"/>' },
  { id: 'beefeater', name: 'Beefeater', bg: '#9E1B2A', art: '<ellipse cx="32" cy="55" rx="15" ry="5" fill="#F5EEDC"/>' + face(SKIN[0]) + '<path d="M28 44 Q32 52 36 44" fill="#9A9A9A"/><path d="M22 24 Q23 13 32 13 Q41 13 42 24 Z" fill="#141414"/><ellipse cx="32" cy="24.5" rx="18" ry="4.5" fill="#111"/><rect x="22" y="20" width="20" height="2.6" fill="#D6202B"/><circle cx="23" cy="24" r="2" fill="#D6202B"/><circle cx="41" cy="24" r="2" fill="#D6202B"/>' },
  { id: 'guard', name: 'Queen\'s Guard', bg: '#C8A03A', art: '<ellipse cx="32" cy="57" rx="15" ry="5" fill="#D6202B"/>' + face(SKIN[4]) + '<path d="M17 33 Q13 3 32 3 Q51 3 47 33 Q40 29 32 29 Q24 29 17 33 Z" fill="#151515"/><path d="M19 34 Q24 52 32 52 Q40 52 45 34" stroke="#D9A93A" stroke-width="1.6" fill="none"/>' },
  { id: 'bobby', name: 'Bobby', bg: '#5E8FD6', art: face(SKIN[1]) + '<path d="M19 30 Q19 8 32 7 Q45 8 45 30 Z" fill="#16213E"/><rect x="15" y="28" width="34" height="3.6" rx="1.8" fill="#0F172E"/><circle cx="32" cy="7" r="2.3" fill="#C8CDD6"/><path d="M32 15 l3.5 4 -3.5 4 -3.5 -4 Z" fill="#C8CDD6"/>' },
  { id: 'trader', name: 'Market Trader', bg: '#4CB85A', art: face(SKIN[3]) + '<path d="M15 31 Q17 17 33 18 Q46 19 50 27 L56 30 Q46 33 15 33 Z" fill="#7A5A3A"/><path d="M20 24 L46 24 M18 28 L50 28" stroke="#5E4329" stroke-width="1.2"/>' },
  { id: 'gent', name: 'City Gent', bg: '#C9C3AE', art: face(SKIN[0]) + '<path d="M26 45 Q32 42 38 45 Q32 47 26 45 Z" fill="#6B4A2E"/><path d="M21 27 Q21 11 32 11 Q43 11 43 27 Z" fill="#1A1A1A"/><rect x="21" y="23" width="22" height="2.4" fill="#3B3B3B"/><ellipse cx="32" cy="27.5" rx="16" ry="3.3" fill="#111"/>' },
  { id: 'nan', name: 'Nan', bg: '#F2A7C3', art: face(SKIN[4]) + '<circle cx="26.5" cy="37" r="4.3" fill="none" stroke="#6B4A2E" stroke-width="1.5"/><circle cx="37.5" cy="37" r="4.3" fill="none" stroke="#6B4A2E" stroke-width="1.5"/><path d="M30.8 37 H33.2" stroke="#6B4A2E" stroke-width="1.5"/><path d="M15 44 Q12 17 32 16 Q52 17 49 44 Q47 29 32 27 Q17 29 15 44 Z" fill="#B8336A"/><path d="M28 52 L32 57 L36 52 Z" fill="#B8336A"/><circle cx="24" cy="22" r="1.5" fill="#F5EEDC"/><circle cx="32" cy="20" r="1.5" fill="#F5EEDC"/><circle cx="40" cy="22" r="1.5" fill="#F5EEDC"/><circle cx="19" cy="30" r="1.5" fill="#F5EEDC"/><circle cx="45" cy="30" r="1.5" fill="#F5EEDC"/>' },
  { id: 'corgi', name: 'Corgi', bg: '#1D4F8F', art: '<path d="M18 30 L14 10 L28 23 Z" fill="#E08A3C"/><path d="M46 30 L50 10 L36 23 Z" fill="#E08A3C"/><path d="M19 27 L17 15 L25 23 Z M45 27 L47 15 L39 23 Z" fill="#F2B7A0"/><ellipse cx="32" cy="38" rx="17" ry="15" fill="#E08A3C"/><path d="M29 24 Q32 34 26 44 L38 44 Q32 34 35 24 Z" fill="#FBF3E6"/><ellipse cx="32" cy="46" rx="9" ry="6.5" fill="#FBF3E6"/><ellipse cx="32" cy="43" rx="2.8" ry="2" fill="#222"/><circle cx="25" cy="35" r="2" fill="#1B1B1B"/><circle cx="39" cy="35" r="2" fill="#1B1B1B"/><path d="M29 47.5 Q32 50 35 47.5" stroke="#222" stroke-width="1.6" fill="none" stroke-linecap="round"/>' },
  { id: 'pigeon', name: 'Pigeon', bg: '#D9A93A', art: '<path d="M18 50 Q32 60 46 50 L44 44 Q32 50 20 44 Z" fill="#6FA38F"/><path d="M20 46 Q32 52 44 46 L45 50 Q32 57 19 50 Z" fill="#8A5FA8" opacity=".85"/><circle cx="31" cy="33" r="14" fill="#8E96A3"/><path d="M43 31 L53 34.5 L43 37 Z" fill="#D9A93A"/><circle cx="37" cy="29.5" r="3.4" fill="#F08A24"/><circle cx="37.6" cy="29.5" r="1.6" fill="#111"/>' },
];

let avatarN = 0;
export function avatarSvg(id, extraClass = '') {
  const a = AVATARS.find((v) => v.id === id) || AVATARS[0];
  const k = 'av' + avatarN++;
  return `<svg class="avatar ${extraClass}" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${k}"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#${k})"><rect width="64" height="64" fill="${a.bg}"/>${a.art}</g></svg>`;
}

// ---------- rasterising for the canvas ----------
function toImage(svgText) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  });
}

export async function loadImages() {
  const out = { tiles: [], specials: {}, overlays: {} };
  out.tiles = await Promise.all(TILES.map(toImage));
  for (const [k, v] of Object.entries(SPECIALS)) out.specials[k] = await toImage(v);
  for (const [k, v] of Object.entries(OVERLAYS)) out.overlays[k] = await toImage(v);
  return out;
}

// Inline SVG for the DOM (goal chips, legend)
export function tileSvg(c) { return TILES[c].replace('<svg ', '<svg class="tile-ico" aria-hidden="true" '); }
export function specialSvg(k) { return SPECIALS[k].replace('<svg ', '<svg class="tile-ico" aria-hidden="true" '); }
export function overlaySvg(k) { return OVERLAYS[k].replace('<svg ', '<svg class="tile-ico" aria-hidden="true" '); }
