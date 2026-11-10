// Sound effects made on the fly with WebAudio: no audio files to load.
// Browsers only allow sound after a tap, so unlock() is called from one.

class Sound {
  constructor() {
    this.ctx = null;
    this.on = true;
    this.last = {};
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

  noise(dur, vol = 0.2, cutoff = 1200) {
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }

  play(name) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = { shot: 0.07, kill: 0.045, hit: 0.06, breach: 0.09, boom: 0.08, spit: 0.12, splash: 0.1, warn: 0.3 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    try {
      switch (name) {
        case 'shot': this.tone(620, 0.04, 'square', 0.035, -300); break;
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

return { Sound };
