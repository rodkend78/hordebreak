// Sound effects made on the fly with WebAudio: no audio files to load.
// Browsers only allow sound after a tap, so unlock() is called from one.

class Sound {
  constructor() {
    this.ctx = null;
    this.on = true;
    this.last = {};
    this.noiseBuf = {}; // noise bursts, kept by length so rapid fire does not rebuild them
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) {
      this.ctx = null;
    }
  }

  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // A burst of filtered noise that dies away. `type` picks the filter
  // (lowpass for thumps, highpass for cracks, bandpass for hiss), `sweep`
  // slides its frequency there over the burst, `delay` starts it later.
  noise(dur, vol = 0.2, cutoff = 1200, type = 'lowpass', sweep = 0, delay = 0) {
    const c = this.ctx;
    const key = Math.round(dur * 1000);
    let buf = this.noiseBuf[key];
    if (!buf) {
      const n = Math.max(1, Math.floor(c.sampleRate * dur));
      buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      this.noiseBuf[key] = buf;
    }
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(cutoff, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), t + dur);
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // The report of one volley. Every weapon has its own; `delay` is for the
  // armory, which plays it just after the equip click.
  shot(weapon, delay = 0) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (!delay && now - (this.last.shot || 0) < 0.062) return; // rapid weapons would otherwise smear
    this.last.shot = now;
    try {
      (SHOTS[weapon] || SHOTS.rifle)(this, delay);
    } catch (e) {
      /* sound is optional */
    }
  }

  play(name) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = { kill: 0.045, hit: 0.06, breach: 0.09, boom: 0.08, spit: 0.12, splash: 0.1, warn: 0.3 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    try {
      switch (name) {
        case 'kill': this.tone(300 + Math.random() * 120, 0.07, 'triangle', 0.09, -180); break;
        case 'gate': this.tone(520, 0.09, 'square', 0.12); this.tone(780, 0.14, 'square', 0.12, 0, 0.08); break;
        case 'bad': this.tone(260, 0.22, 'sawtooth', 0.13, -150); break;
        case 'locked': this.tone(180, 0.12, 'square', 0.1); break;
        case 'barrier': this.noise(0.3, 0.3, 900); this.tone(140, 0.25, 'sawtooth', 0.14, -80); break;
        case 'crate': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'square', 0.11, 0, i * 0.06)); break;
        case 'breach': this.tone(110, 0.14, 'sawtooth', 0.16, -50); break;
        case 'boom': this.noise(0.35, 0.3, 500); break;
        case 'slam': this.noise(0.5, 0.45, 300); this.tone(70, 0.4, 'sawtooth', 0.25, -30); break;
        case 'boss': this.tone(98, 0.5, 'sawtooth', 0.2); this.tone(92, 0.7, 'sawtooth', 0.2, 0, 0.35); break;
        case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.2, 'square', 0.13, 0, i * 0.11)); break;
        case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.12, 0, i * 0.16)); break;
        case 'buy': this.tone(880, 0.07, 'square', 0.12); this.tone(1320, 0.12, 'square', 0.12, 0, 0.06); break;
        case 'tap': this.tone(440, 0.05, 'square', 0.08); break;
        case 'spit': this.tone(540, 0.2, 'sine', 0.12, -360); break;
        case 'splash': this.noise(0.25, 0.22, 1800); this.tone(200, 0.16, 'sine', 0.1, -120); break;
        case 'warn': this.tone(880, 0.09, 'square', 0.1); this.tone(660, 0.14, 'square', 0.1, 0, 0.11); break;
        case 'jet': this.noise(1.1, 0.4, 2600); this.tone(180, 0.9, 'sawtooth', 0.1, 520); break;
        case 'ready': this.tone(660, 0.08, 'square', 0.1); this.tone(990, 0.16, 'square', 0.1, 0, 0.08); break;
      }
    } catch (e) {
      /* sound is optional */
    }
  }
}

// What each weapon sounds like, built from the two generators above:
// tone(freq, dur, wave, vol, slide, delay) and noise(dur, vol, cutoff, filter, sweep, delay).
const SHOTS = {
  // A dry crack with a short body.
  rifle(s, d) { s.noise(0.05, 0.08, 1800, 'highpass', 0, d); s.tone(420, 0.06, 'square', 0.045, -260, d); },
  // Lighter and tighter: a tick.
  smg(s, d) { s.noise(0.03, 0.055, 2600, 'highpass', 0, d); s.tone(720, 0.035, 'square', 0.035, -380, d); },
  // A boom that rolls off.
  shotgun(s, d) { s.noise(0.16, 0.2, 1100, 'lowpass', 300, d); s.tone(150, 0.16, 'sawtooth', 0.09, -95, d); },
  // The rotary cannon: a heavy, blunt thud.
  mg(s, d) { s.noise(0.045, 0.13, 1300, 'lowpass', 0, d); s.tone(230, 0.05, 'square', 0.06, -130, d); },
  // An electric snap falling to a hum.
  rail(s, d) { s.tone(2200, 0.16, 'sawtooth', 0.06, -2050, d); s.tone(110, 0.14, 'sine', 0.1, -40, d); s.noise(0.05, 0.05, 5000, 'highpass', 0, d); },
  // A whoosh as the rocket leaves the tube.
  rocket(s, d) { s.noise(0.3, 0.16, 500, 'bandpass', 2400, d); s.tone(190, 0.22, 'sine', 0.07, -120, d); },
  // A falling two-voice "pew".
  plasma(s, d) { s.tone(980, 0.13, 'sine', 0.07, -640, d); s.tone(1470, 0.09, 'triangle', 0.035, -900, d); },
  // A thin, bright pip.
  laser(s, d) { s.tone(1700, 0.055, 'square', 0.028, -700, d); s.tone(2550, 0.04, 'sine', 0.03, -900, d); },
  // Three rockets, a beat apart.
  cluster(s, d) {
    for (let i = 0; i < 3; i++) s.noise(0.2, 0.11, 600 + i * 150, 'bandpass', 2600, d + i * 0.06);
    s.tone(170, 0.24, 'sine', 0.06, -110, d);
  },
  // A deep discharge under a falling shriek.
  nova(s, d) { s.tone(260, 0.26, 'sawtooth', 0.09, -200, d); s.tone(1500, 0.2, 'sine', 0.055, -1250, d); s.noise(0.12, 0.08, 3000, 'bandpass', 500, d); },
};

Sound.SHOTS = SHOTS; // reachable from the sound object, for tools

return { Sound, SHOTS };
