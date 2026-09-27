// Sound: synthesised effects (bells, bongs, pops) and the Cabbie's voice lines.
import { VOICE_LINES } from './voices.js';

export class Sound {
  constructor(settings) {
    this.settings = settings; // { sfx: bool, voice: bool }
    this.ctx = null; this.master = null;
    this.buffers = new Map(); this.loading = new Map();
    this.lastVoice = 0; this.lastByGroup = {};
  }

  // Must be called from a tap: browsers only allow sound after the player interacts.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      const vg = this.ctx.createGain(); vg.gain.value = 1.25; vg.connect(this.master); this.voiceBus = vg;
      const sg = this.ctx.createGain(); sg.gain.value = 0.55; sg.connect(this.master); this.sfxBus = sg;
      this.preload(['start', 'good', 'big', 'win', 'lose', 'welcome']);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  // ---------- synth ----------
  tone(freq, at, len, { type = 'sine', gain = 0.3, attack = 0.005, bus, harmonics } = {}) {
    if (!this.ctx) return;
    const t = this.now + at;
    const hs = harmonics || [[1, 1]];
    for (const [h, g0] of hs) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq * h;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * g0), t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(bus || this.sfxBus); o.start(t); o.stop(t + len + 0.05);
    }
  }

  bell(freq, at = 0, len = 1.1, gain = 0.3) { this.tone(freq, at, len, { gain, harmonics: [[1, 1], [2.76, 0.35], [5.4, 0.14]] }); }

  noise(at, len, { gain = 0.2, from = 800, to = 3000, q = 1 } = {}) {
    if (!this.ctx) return;
    const t = this.now + at;
    const n = Math.floor(this.ctx.sampleRate * len);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + len);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(this.sfxBus); src.start(t); src.stop(t + len);
  }

  sfx(name, v = 0) {
    if (!this.ctx || !this.settings.sfx) return;
    const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
    switch (name) {
      case 'tap': this.tone(880, 0, 0.08, { type: 'triangle', gain: 0.12 }); break;
      case 'swap': this.noise(0, 0.12, { gain: 0.12, from: 600, to: 1800, q: 2 }); break;
      case 'nope': this.tone(220, 0, 0.12, { type: 'square', gain: 0.06 }); this.tone(180, 0.1, 0.14, { type: 'square', gain: 0.06 }); break;
      case 'pop': { const f = scale[Math.min(scale.length - 1, v)]; this.tone(f, 0, 0.18, { type: 'triangle', gain: 0.22 }); this.tone(f * 1.5, 0.03, 0.14, { type: 'sine', gain: 0.1 }); break; }
      case 'ding': this.bell(1568, 0, 0.5, 0.2); this.bell(1568, 0.16, 0.7, 0.2); break; // bus bell
      case 'bong': this.bell(196, 0, 2.2, 0.45); this.bell(98, 0, 2.4, 0.2); break;
      case 'clack': this.noise(0, 0.06, { gain: 0.5, from: 2500, to: 1200, q: 4 }); this.tone(1400, 0, 0.08, { type: 'square', gain: 0.05 }); break;
      case 'roll': this.noise(0, 0.5, { gain: 0.12, from: 200, to: 400, q: 0.8 }); break;
      case 'whoosh': this.noise(0, 0.35, { gain: 0.25, from: 400, to: 4000, q: 1.2 }); this.tone(660, 0, 0.3, { type: 'sawtooth', gain: 0.03 }); break;
      case 'honk': this.tone(415, 0, 0.18, { type: 'square', gain: 0.08 }); this.tone(415, 0.22, 0.2, { type: 'square', gain: 0.08 }); break;
      case 'sparkle': for (let k = 0; k < 8; k++) this.bell(1319 + k * 180, k * 0.04, 0.35, 0.08); break;
      case 'star': this.bell([523, 659, 784][Math.min(2, v)], 0, 1.4, 0.35); break;
      case 'win': [1047, 1319, 1047, 1319, 1568].forEach((f, k) => this.bell(f, k * 0.14, 0.5, 0.2)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, k) => this.tone(f, k * 0.22, 0.4, { type: 'triangle', gain: 0.15 })); break;
      case 'coin': this.bell(1976, 0, 0.3, 0.12); this.bell(2637, 0.07, 0.4, 0.12); break;
      case 'block': this.noise(0, 0.1, { gain: 0.3, from: 900, to: 300, q: 2 }); break;
      case 'collect': [784, 988, 1175, 1568].forEach((f, k) => this.bell(f, k * 0.07, 0.4, 0.15)); break;
      case 'shuffle': this.noise(0, 0.5, { gain: 0.15, from: 300, to: 3000, q: 1 }); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047].forEach((f, k) => this.tone(f, k * 0.13, 0.35, { type: 'sawtooth', gain: 0.07 })); break;
      case 'chime': [659, 523, 587, 392].forEach((f, k) => this.bell(f, k * 0.5, 1.4, 0.25)); break; // Westminster quarter
      case 'van': [659, 587, 523, 587, 659, 659, 659].forEach((f, k) => this.tone(f * 2, k * 0.2, 0.18, { type: 'square', gain: 0.04 })); break;
      default: break;
    }
  }

  // ---------- voice ----------
  async buffer(id) {
    if (this.buffers.has(id)) return this.buffers.get(id);
    if (this.loading.has(id)) return this.loading.get(id);
    const p = fetch(`audio/voice/${id}.mp3`).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => { this.buffers.set(id, buf); return buf; }).catch(() => null);
    this.loading.set(id, p);
    return p;
  }

  preload(groups) { if (!this.ctx) return; for (const l of VOICE_LINES) if (groups.includes(l.group)) this.buffer(l.id); }

  // Say a line from a group. Lines mentioning Ron only play for players whose name starts with Ron.
  async say(group, { ron = false, force = false } = {}) {
    if (!this.ctx || !this.settings.voice) return null;
    const t = performance.now();
    if (!force && t - this.lastVoice < 1600) return null;
    let lines = VOICE_LINES.filter((l) => l.group === group && (!l.ron || ron));
    if (!lines.length) return null;
    const ronLines = lines.filter((l) => l.ron);
    if (ronLines.length && Math.random() < 0.5) lines = ronLines;
    const recent = this.lastByGroup[group];
    if (lines.length > 1) lines = lines.filter((l) => l.id !== recent);
    const line = lines[(Math.random() * lines.length) | 0];
    this.lastVoice = t; this.lastByGroup[group] = line.id;
    const buf = await this.buffer(line.id);
    if (!buf) return line;
    if (this.current) { try { this.current.stop(); } catch (e) { /* already stopped */ } }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.connect(this.voiceBus); src.start();
    this.current = src;
    return line;
  }
}

export function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported */ }
}
