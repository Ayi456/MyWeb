/**
 * Procedural ambience with the Web Audio API: no audio files, nothing fetched.
 * Everything hangs off one AudioContext that is only created after a user
 * gesture, and a master gain lets the UI mute it independently of the radio.
 */
import type { SeasonWeights } from "./season";

export type SoundName =
  | "send"
  | "chime"
  | "bell"
  | "splash"
  | "rustle"
  | "pop"
  | "stamp"
  | "whale"
  | "thunder";

export class Ambience {
  onCue?: (name: SoundName) => void;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private crickets: {
    gain: GainNode;
    osc: OscillatorNode;
    lfo: OscillatorNode;
  } | null = null;
  private rain: { gain: GainNode } | null = null;
  private noise: AudioBuffer | null = null;
  enabled = false;
  volume = 0.5;
  get supported() {
    return typeof window !== "undefined" && "AudioContext" in window;
  }
  /** Must be called from a user gesture the first time. */
  enable(on: boolean) {
    this.enabled = on;
    if (on && !this.ctx && this.supported) this.build();
    if (this.ctx?.state === "suspended" && on) void this.ctx.resume();
    this.master?.gain.setTargetAtTime(
      on ? this.volume : 0,
      this.ctx?.currentTime ?? 0,
      0.3,
    );
  }
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.enabled)
      this.master?.gain.setTargetAtTime(
        this.volume,
        this.ctx?.currentTime ?? 0,
        0.1,
      );
  }
  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;
    // Two seconds of white noise, reused for wind, rain and rustles.
    const length = ctx.sampleRate * 2,
      buffer = ctx.createBuffer(1, length, ctx.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 320;
    windFilter.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.02;
    windSrc.connect(windFilter).connect(windGain).connect(master);
    windSrc.start();
    this.wind = { gain: windGain, filter: windFilter };
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buffer;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 1800;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter).connect(rainGain).connect(master);
    rainSrc.start();
    this.rain = { gain: rainGain };
    // Crickets: a high tone chopped by a fast LFO.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 4200;
    const chop = ctx.createGain();
    chop.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 17;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain).connect(chop.gain);
    const cricketGain = ctx.createGain();
    cricketGain.gain.value = 0;
    osc.connect(chop).connect(cricketGain).connect(master);
    osc.start();
    lfo.start();
    this.crickets = { gain: cricketGain, osc, lfo };
  }
  /** Continuous layers follow wind, night, rain and season. Throttled so
   *  AudioParam automation events do not pile up over a long session. */
  private lastUpdate = 0;
  update(
    wind: number,
    night: number,
    rain: number,
    season: SeasonWeights,
    heavy = 0,
  ) {
    if (!this.ctx || !this.enabled) return;
    const now = performance.now();
    if (now - this.lastUpdate < 180) return;
    this.lastUpdate = now;
    const t = this.ctx.currentTime;
    const winter = season[3],
      summer = season[1];
    this.wind?.gain.gain.setTargetAtTime(
      0.018 + wind * 0.09 + winter * 0.03,
      t,
      0.4,
    );
    this.wind?.filter.frequency.setTargetAtTime(
      300 + wind * 500 - winter * 80,
      t,
      0.4,
    );
    this.rain?.gain.gain.setTargetAtTime(rain * (0.07 + heavy * 0.05), t, 0.6);
    const cricket = night * (0.35 + summer * 0.65) * (1 - winter) * (1 - rain);
    this.crickets?.gain.gain.setTargetAtTime(cricket * 0.012, t, 0.8);
  }
  private tone(
    freq: number,
    at: number,
    dur: number,
    gain: number,
    type: OscillatorType = "sine",
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    osc.connect(g).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
  private burst(at: number, dur: number, gain: number, freq: number, q = 1) {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
    src.stop(at + dur + 0.05);
  }
  play(name: SoundName) {
    this.onCue?.(name);
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case "send":
        this.burst(t, 0.5, 0.08, 900, 0.8);
        this.tone(660, t + 0.05, 0.35, 0.05);
        this.tone(990, t + 0.18, 0.4, 0.04);
        break;
      case "chime":
        [1318, 1568, 2093].forEach((f, i) =>
          this.tone(f, t + i * 0.07, 1.1, 0.045),
        );
        break;
      case "bell":
        this.tone(880, t, 1.4, 0.09);
        this.tone(1760, t, 0.9, 0.03, "triangle");
        this.tone(2637, t + 0.01, 0.5, 0.015);
        break;
      case "splash":
        this.burst(t, 0.35, 0.09, 1400, 0.6);
        this.tone(320, t, 0.25, 0.04);
        break;
      case "rustle":
        this.burst(t, 0.7, 0.07, 2600, 0.4);
        this.burst(t + 0.15, 0.6, 0.05, 1900, 0.5);
        break;
      case "pop":
        this.tone(520, t, 0.12, 0.06, "triangle");
        this.tone(780, t + 0.06, 0.15, 0.04, "triangle");
        break;
      case "stamp":
        this.burst(t, 0.12, 0.12, 400, 2);
        this.tone(196, t, 0.2, 0.05, "square");
        break;
      case "whale":
        this.tone(110, t, 2.6, 0.06);
        this.tone(138, t + 0.6, 2.2, 0.04);
        break;
      case "thunder":
        this.burst(t, 3, 0.16, 90, 0.7);
        this.burst(t + 0.3, 2.4, 0.09, 170, 0.8);
        break;
    }
  }
  dispose() {
    this.crickets?.osc.stop();
    this.crickets?.lfo.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.wind = null;
    this.rain = null;
    this.crickets = null;
  }
}
