export class AlarmSound {
  constructor() {
    this.enabled = true;
    this.playing = false;
    this.timeout = null;
    this.audioContext = null;
  }

  makeDistortionCurve(amount) {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  play() {
    if (!this.enabled || this.playing) return;
    this.playing = true;
    this.loop();
  }

  loop() {
    if (!this.playing || !this.enabled) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = this.audioContext.currentTime;

      const makeSirenLayer = (type, freqLow, freqHigh, volume) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const wave = this.audioContext.createWaveShaper();
        wave.curve = this.makeDistortionCurve(80);
        wave.oversample = '4x';
        osc.connect(wave);
        wave.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freqLow, now);
        osc.frequency.linearRampToValueAtTime(freqHigh, now + 0.55);
        osc.frequency.linearRampToValueAtTime(freqLow, now + 1.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.03);
        gain.gain.setValueAtTime(volume, now + 1.07);
        gain.gain.linearRampToValueAtTime(0, now + 1.1);
        osc.start(now);
        osc.stop(now + 1.1);
      };

      makeSirenLayer('sawtooth', 620, 1080, 0.55);
      makeSirenLayer('square', 310, 540, 0.25);
      makeSirenLayer('sine', 780, 1200, 0.15);
    } catch (e) {
      console.error('Audio error:', e);
    }
    this.timeout = setTimeout(() => this.loop(), 1150);
  }

  stop() {
    this.playing = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }
}