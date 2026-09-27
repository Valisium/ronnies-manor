// The Ronnie Arms: spend bricks to do up Ronnie's own boozer, one job at a time.
// Each chapter is a scene; each job adds a layer to it. Costs rise gently through the chapters.

export const CHAPTERS = [
  {
    id: 'front', name: 'The Ronnie Arms', place: 'Upper Street', intro: 'The old place has seen better days. Let\'s do her up.',
    jobs: [
      { id: 'clean', name: 'Clear the rubbish and board-ups', cost: 40, line: 'That\'s better. You can see the windows now!' },
      { id: 'paint', name: 'Fresh coat of bottle green', cost: 70, line: 'Lovely bit of paint, that.' },
      { id: 'sign', name: 'New gold-leaf pub sign', cost: 110, line: 'The Ronnie Arms! Now that\'s a sign.' },
      { id: 'door', name: 'Proper front door and brass handle', cost: 140, line: 'Door\'s open. Come on in!' },
      { id: 'lamps', name: 'Gas lamps either side', cost: 170, line: 'Lit up like Christmas.' },
      { id: 'baskets', name: 'Hanging baskets', cost: 200, line: 'Hanging baskets! Proper London boozer.' },
      { id: 'dartboard', name: 'Dartboard and oche', cost: 240, line: 'One hundred and eighty!' },
      { id: 'piano', name: 'The old Joanna (piano)', cost: 280, line: 'Get the Joanna going, it\'s a knees-up!' },
      { id: 'jukebox', name: 'Jukebox', cost: 320, line: 'Stick a record on!' },
      { id: 'trophies', name: 'Trophy cabinet for the bowls cups', cost: 380, line: 'Look at all them cups. Champion!' },
      { id: 'bunting', name: 'Bunting across the front', cost: 420, line: 'Bunting up. Party time!' },
      { id: 'cat', name: 'A pub cat called Guv\'nor', cost: 480, line: 'Every good boozer needs a cat.' },
    ],
  },
  {
    id: 'garden', name: 'The Beer Garden', place: 'Out the back', intro: 'Round the back there\'s a yard full of weeds. Could be a lovely garden.',
    jobs: [
      { id: 'weeds', name: 'Pull up the weeds', cost: 300, line: 'Weeds gone. Not bad at all.' },
      { id: 'fence', name: 'New fence', cost: 360, line: 'Good fences, good neighbours.' },
      { id: 'lawn', name: 'Lay a lawn', cost: 420, line: 'Lovely bit of grass, that.' },
      { id: 'benches', name: 'Picnic benches', cost: 480, line: 'Take a seat, guv\'nor.' },
      { id: 'brollies', name: 'Big garden brollies', cost: 540, line: 'Shade for when the currant bun comes out.' },
      { id: 'lights', name: 'Fairy lights', cost: 600, line: 'Pretty as a picture.' },
      { id: 'bbq', name: 'Barbecue', cost: 680, line: 'Sausages on! Who\'s hungry?' },
      { id: 'green', name: 'A little bowling green', cost: 800, line: 'Your own green! Right on the jack.' },
      { id: 'flowers', name: 'Flower beds', cost: 880, line: 'Smells lovely out here.' },
      { id: 'fountain', name: 'Fountain with a pearly king statue', cost: 1000, line: 'Would you Adam and Eve it! A statue!' },
    ],
  },
];

export function allJobs() { return CHAPTERS.flatMap((c) => c.jobs.map((j) => ({ ...j, chapter: c.id }))); }

export function nextJob(done) {
  for (const c of CHAPTERS) for (const j of c.jobs) if (!done.includes(j.id)) return { ...j, chapter: c.id };
  return null;
}

export function chapterOf(done) {
  for (const c of CHAPTERS) if (c.jobs.some((j) => !done.includes(j.id))) return c;
  return CHAPTERS[CHAPTERS.length - 1];
}

// ---------- scenes ----------
// Pub front, 360 x 300. Layers switch on as jobs are done.
export function frontScene(done) {
  const has = (k) => done.includes(k);
  const wall = has('paint') ? '#0F4A36' : '#5B5A52';
  const trim = has('paint') ? '#D9A93A' : '#8C8676';
  const glass = has('clean') ? '#1B2B3A' : '#3A3A36';
  const warm = has('lamps') ? '#F6C862' : '#9A8E6A';
  let g = '';
  // sky and street
  g += `<rect width="360" height="300" fill="${has('lamps') ? '#1B2440' : '#8FA3B5'}"/>`;
  g += `<rect y="262" width="360" height="38" fill="#6F6A62"/><rect y="258" width="360" height="6" fill="#8D877C"/>`;
  // building
  g += `<rect x="20" y="30" width="320" height="232" fill="${has('paint') ? '#6E4B32' : '#6B5E54'}"/>`;
  for (let y = 38; y < 110; y += 12) g += `<path d="M20 ${y} H340" stroke="#5A3D29" stroke-width="1" opacity=".5"/>`;
  g += `<rect x="60" y="44" width="50" height="50" fill="${glass}" stroke="#E8DFC7" stroke-width="4"/><rect x="155" y="44" width="50" height="50" fill="${glass}" stroke="#E8DFC7" stroke-width="4"/><rect x="250" y="44" width="50" height="50" fill="${glass}" stroke="#E8DFC7" stroke-width="4"/>`;
  // pub front (ground floor)
  g += `<rect x="20" y="118" width="320" height="140" fill="${wall}"/><rect x="20" y="112" width="320" height="10" fill="${trim}"/>`;
  // fascia / sign
  g += `<rect x="30" y="122" width="300" height="30" fill="${has('sign') ? '#0A2B21' : '#4A463F'}" stroke="${trim}" stroke-width="3"/>`;
  g += has('sign') ? `<text x="180" y="144" text-anchor="middle" font-family="Ultra, Georgia, serif" font-size="20" fill="#D9A93A">The Ronnie Arms</text>` : `<text x="180" y="143" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#8C8676" opacity=".7">TH  R  NN E  A MS</text>`;
  // windows (interior visible)
  const win = (x) => `<rect x="${x}" y="162" width="92" height="74" fill="${has('clean') ? (has('lamps') ? '#5A3A1E' : '#3A2A1E') : glass}" stroke="${trim}" stroke-width="5"/>`;
  g += win(36) + win(232);
  if (!has('clean')) g += `<rect x="40" y="166" width="84" height="66" fill="#8B6B45"/><path d="M40 180 H124 M40 200 H124 M40 220 H124" stroke="#6E5234" stroke-width="3"/><rect x="236" y="166" width="84" height="66" fill="#8B6B45"/><path d="M236 180 H320 M236 200 H320 M236 220 H320" stroke="#6E5234" stroke-width="3"/>`;
  // interior items in the left window: dartboard, piano; right window: jukebox, trophies
  if (has('clean')) {
    if (has('dartboard')) g += `<circle cx="62" cy="188" r="14" fill="#1B1B1B"/><circle cx="62" cy="188" r="10" fill="#D6202B"/><circle cx="62" cy="188" r="6" fill="#F5EEDC"/><circle cx="62" cy="188" r="2" fill="#2F7A3A"/>`;
    if (has('piano')) g += `<rect x="80" y="206" width="40" height="26" fill="#2A1A10"/><rect x="82" y="210" width="36" height="6" fill="#F5EEDC"/><path d="M86 210v6M90 210v6M96 210v6M100 210v6M106 210v6M110 210v6" stroke="#1B1B1B" stroke-width="1.5"/>`;
    if (has('jukebox')) g += `<path d="M244 234 V200 a14 14 0 0 1 28 0 V234 Z" fill="#D6202B"/><path d="M248 230 V202 a10 10 0 0 1 20 0 V230 Z" fill="#F6C862"/><rect x="252" y="212" width="12" height="10" fill="#2F62D6"/>`;
    if (has('trophies')) g += `<rect x="280" y="176" width="36" height="58" fill="#3A2A1E" stroke="#D9A93A" stroke-width="2"/><path d="M288 190 h8 v4 a4 4 0 0 1 -8 0 z M302 188 h8 v4 a4 4 0 0 1 -8 0 z M290 210 h8 v4 a4 4 0 0 1 -8 0 z M304 212 h6 v3 a3 3 0 0 1 -6 0 z" fill="#E8B640"/><path d="M280 202 H316 M280 222 H316" stroke="#D9A93A" stroke-width="1.5"/>`;
    if (has('cat')) g += `<g transform="translate(96 150)"><path d="M0 12 q2 -10 10 -10 q8 0 10 10 z" fill="#1B1B1B"/><path d="M2 4 l2 -6 l3 5 z M18 4 l-2 -6 l-3 5 z" fill="#1B1B1B"/><circle cx="7" cy="6" r="1.2" fill="#F6C862"/><circle cx="13" cy="6" r="1.2" fill="#F6C862"/><path d="M20 10 q8 -2 6 -10" stroke="#1B1B1B" stroke-width="2.5" fill="none"/></g>`;
    g += `<path d="M36 162 L128 236 M232 162 L324 236" stroke="#FFFFFF" stroke-width="2" opacity=".08"/>`;
  }
  // door
  g += `<rect x="150" y="160" width="60" height="98" fill="${has('door') ? '#0A2B21' : '#5C4B3C'}" stroke="${trim}" stroke-width="4"/>`;
  if (has('door')) g += `<rect x="158" y="168" width="44" height="36" fill="${warm}" opacity=".85"/><circle cx="200" cy="214" r="3.5" fill="#E8B640"/><rect x="156" y="226" width="48" height="4" fill="#E8B640"/>`;
  else g += `<path d="M150 190 L210 230 M210 190 L150 230" stroke="#3A3028" stroke-width="5"/>`;
  // lamps
  if (has('lamps')) for (const x of [138, 222]) g += `<circle cx="${x}" cy="176" r="16" fill="#F6C862" opacity=".22"/><rect x="${x - 6}" y="166" width="12" height="18" rx="2" fill="#F6C862" stroke="#1B1B1B" stroke-width="2"/><path d="M${x} 166 V156 H${x + (x < 180 ? 10 : -10)}" stroke="#1B1B1B" stroke-width="2" fill="none"/>`;
  // hanging baskets
  if (has('baskets')) for (const x of [44, 120, 240, 316]) g += `<path d="M${x} 152 V158" stroke="#1B1B1B" stroke-width="1.5"/><path d="M${x - 11} 158 a11 9 0 0 0 22 0 z" fill="#5A3D29"/><circle cx="${x - 7}" cy="157" r="4" fill="#D6202B"/><circle cx="${x}" cy="155" r="4" fill="#F2A7C3"/><circle cx="${x + 7}" cy="157" r="4" fill="#9A55D0"/><circle cx="${x - 3}" cy="162" r="3" fill="#4CB85A"/><circle cx="${x + 4}" cy="163" r="3" fill="#4CB85A"/>`;
  // bunting
  if (has('bunting')) { const cols = ['#D6202B', '#F5EEDC', '#2F62D6']; let b = '<path d="M20 104 Q180 124 340 104" stroke="#F5EEDC" stroke-width="1.5" fill="none"/>'; for (let k = 0; k < 16; k++) { const x = 30 + k * 19.5, y = 106 + Math.sin((k / 15) * Math.PI) * 9; b += `<path d="M${x - 6} ${y} L${x + 6} ${y} L${x} ${y + 11} Z" fill="${cols[k % 3]}"/>`; } g += b; }
  // rubbish
  if (!has('clean')) g += `<rect x="236" y="240" width="30" height="20" fill="#3A3A36"/><circle cx="290" cy="252" r="10" fill="#2A2A28"/><path d="M60 250 l14 -8 l10 12 z" fill="#8B6B45"/>`;
  // pavement sign board
  if (has('sign')) g += `<g transform="translate(300 222)"><path d="M0 36 L10 0 L20 36 Z" fill="#1B1B1B"/><rect x="2" y="6" width="16" height="22" fill="#1B1B1B"/><text x="10" y="16" font-size="4" fill="#F5EEDC" text-anchor="middle" font-family="sans-serif">PIE</text><text x="10" y="22" font-size="4" fill="#F5EEDC" text-anchor="middle" font-family="sans-serif">&amp; MASH</text></g>`;
  return `<svg class="scene" viewBox="0 0 360 300" role="img" aria-label="The Ronnie Arms pub front">${g}</svg>`;
}

// Beer garden, 360 x 300.
export function gardenScene(done) {
  const has = (k) => done.includes(k);
  let g = `<rect width="360" height="300" fill="${has('lights') ? '#22305A' : '#9CC3DA'}"/>`;
  if (!has('lights')) g += `<circle cx="300" cy="50" r="22" fill="#F6D57A"/>`;
  else for (let k = 0; k < 30; k++) g += `<circle cx="${(k * 97) % 360}" cy="${(k * 53) % 90 + 10}" r="1.2" fill="#F5EEDC" opacity=".7"/>`;
  // back wall of pub
  g += `<rect x="0" y="80" width="360" height="70" fill="#6E4B32"/><rect x="150" y="96" width="50" height="54" fill="#0A2B21" stroke="#D9A93A" stroke-width="3"/>`;
  // ground
  g += `<rect y="150" width="360" height="150" fill="${has('lawn') ? '#4C9A45' : '#7A6A4E'}"/>`;
  if (has('lawn')) for (let x = 0; x < 360; x += 30) g += `<rect x="${x}" y="150" width="15" height="150" fill="#57A74F" opacity=".45"/>`;
  if (!has('weeds')) for (let k = 0; k < 22; k++) { const x = (k * 71) % 350 + 5, y = 170 + ((k * 37) % 110); g += `<path d="M${x} ${y} l3 -12 l3 12 M${x + 3} ${y} l-6 -8 M${x + 3} ${y} l6 -9" stroke="#3E5A2A" stroke-width="2" fill="none"/>`; }
  // fence
  if (has('fence')) { for (let x = 4; x < 360; x += 16) g += `<path d="M${x} 150 V112 l5 -6 l5 6 V150 Z" fill="#C9A26A" stroke="#8C6D2F" stroke-width="1"/>`; g += `<rect y="122" width="360" height="5" fill="#8C6D2F"/><rect y="138" width="360" height="5" fill="#8C6D2F"/>`; }
  else g += `<path d="M0 140 L40 130 L60 145 L110 128 L140 146 L200 132 L260 147 L300 131 L360 142" stroke="#5A4A3A" stroke-width="4" fill="none"/>`;
  // bowling green
  if (has('green')) g += `<rect x="200" y="200" width="150" height="90" fill="#2E7D32" stroke="#E8DFC7" stroke-width="3"/><rect x="200" y="200" width="150" height="90" fill="url(#stripes)"/><circle cx="310" cy="240" r="4" fill="#FFF7C2"/><circle cx="290" cy="248" r="7" fill="#2A2320"/><circle cx="322" cy="232" r="7" fill="#2A2320"/>`;
  // benches
  if (has('benches')) for (const [x, y] of [[40, 200], [110, 238]]) g += `<rect x="${x}" y="${y}" width="56" height="10" fill="#8C6D2F"/><rect x="${x - 6}" y="${y + 16}" width="68" height="6" fill="#8C6D2F"/><path d="M${x + 6} ${y + 10} V${y + 32} M${x + 50} ${y + 10} V${y + 32}" stroke="#6E5234" stroke-width="4"/><rect x="${x + 16}" y="${y - 12}" width="8" height="12" fill="#E08A1E"/><rect x="${x + 32}" y="${y - 12}" width="8" height="12" fill="#E08A1E"/>`;
  if (has('brollies')) for (const [x, y, c] of [[68, 150, '#D6202B'], [138, 190, '#2F62D6']]) g += `<path d="M${x} ${y + 8} V${y + 52}" stroke="#E8DFC7" stroke-width="3"/><path d="M${x - 34} ${y + 14} Q${x} ${y - 16} ${x + 34} ${y + 14} Z" fill="${c}"/><path d="M${x - 34} ${y + 14} Q${x - 17} ${y + 6} ${x} ${y + 14} Q${x + 17} ${y + 6} ${x + 34} ${y + 14}" fill="#F5EEDC" opacity=".5"/>`;
  if (has('lights')) { let p = '<path d="M0 88 Q90 108 180 88 Q270 108 360 88" stroke="#1B1B1B" stroke-width="1" fill="none"/>'; for (let k = 0; k < 18; k++) { const x = k * 20 + 10; const y = 88 + Math.sin(((x % 180) / 180) * Math.PI) * 10; p += `<circle cx="${x}" cy="${y + 3}" r="3" fill="${['#F6C862', '#F2A7C3', '#9FD3F5'][k % 3]}"/>`; } g += p; }
  if (has('bbq')) g += `<rect x="24" y="262" width="44" height="12" rx="3" fill="#1B1B1B"/><path d="M30 274 l-6 18 M62 274 l6 18" stroke="#1B1B1B" stroke-width="3"/><path d="M30 258 q4 -8 0 -14 M44 258 q4 -8 0 -14 M58 258 q4 -8 0 -14" stroke="#C9C3AE" stroke-width="2" fill="none" opacity=".7"/><rect x="32" y="258" width="10" height="4" rx="2" fill="#8A4A2B"/><rect x="48" y="258" width="10" height="4" rx="2" fill="#8A4A2B"/>`;
  if (has('flowers')) for (const x of [10, 330]) for (let k = 0; k < 6; k++) g += `<circle cx="${x + (k % 2) * 12}" cy="${170 + k * 16}" r="5" fill="${['#D6202B', '#F2A7C3', '#F6D57A', '#9A55D0'][k % 4]}"/>`;
  if (has('fountain')) g += `<ellipse cx="250" cy="178" rx="34" ry="10" fill="#9FB3C8" stroke="#E8DFC7" stroke-width="3"/><rect x="244" y="132" width="12" height="44" fill="#E8DFC7"/><circle cx="250" cy="126" r="8" fill="#E8DFC7"/><path d="M240 120 Q250 108 260 120 Z" fill="#1B1B1B"/><circle cx="246" cy="118" r="1" fill="#fff"/><circle cx="250" cy="115" r="1" fill="#fff"/><circle cx="254" cy="118" r="1" fill="#fff"/>`;
  return `<svg class="scene" viewBox="0 0 360 300" role="img" aria-label="The Ronnie Arms beer garden"><defs><pattern id="stripes" width="20" height="90" patternUnits="userSpaceOnUse"><rect width="10" height="90" fill="#FFFFFF" opacity=".06"/></pattern></defs>${g}</svg>`;
}

export function sceneFor(chapterId, done) { return chapterId === 'garden' ? gardenScene(done) : frontScene(done); }
