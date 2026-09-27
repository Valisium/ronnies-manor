// Save data, kept on the phone. Every read and write is guarded: private windows can refuse storage.
const KEY = 'ronnies-manor-v1';

const fresh = () => ({
  v: 1,
  player: null, // { name, avatar }
  level: 1, // highest unlocked
  stars: {}, best: {},
  bricks: 0,
  boosters: { cab: 0, ben: 0, button: 0 },
  streak: 0, winsSinceSwag: 0,
  settings: { sfx: true, voice: true, vibrate: true, kettle: true },
  daily: { date: '', best: 0, plays: 0, rhyme: null },
  nightBest: 0,
  bigBenHour: '',
  pending: [],
  stats: { played: 0, won: 0 },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const f = fresh();
    return { ...f, ...s, settings: { ...f.settings, ...s.settings }, boosters: { ...f.boosters, ...s.boosters }, daily: { ...f.daily, ...s.daily }, stats: { ...f.stats, ...s.stats } };
  } catch (e) {
    return fresh();
  }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage full or blocked */ }
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
