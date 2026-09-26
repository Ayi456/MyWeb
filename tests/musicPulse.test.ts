import { afterEach, expect, it, vi } from "vitest";
import { bassEnergy, MusicMeter, canAnalyse } from "../src/music/meter";
import { MusicPulse } from "../src/scene/systems/musicPulse";
afterEach(() => vi.unstubAllGlobals());
it("uses real low-frequency bins and ignores silence and high-frequency-only content", () => {
  const data = new Uint8Array(256);
  expect(bassEnergy(data, 44100, 512)).toBe(0);
  data[80] = 255;
  expect(bassEnergy(data, 44100, 512)).toBe(0);
  data[2] = 255;
  expect(bassEnergy(data, 44100, 512)).toBeGreaterThan(0.5);
  data.fill(255);
  expect(bassEnergy(data, 44100, 512)).toBe(1);
});
it("bounds brightness energy, smooths decay and freezes during pause or reduced motion", () => {
  const pulse = new MusicPulse();
  for (let i = 0; i < 100; i++) pulse.update(0.05, 2, true, false, false);
  expect(pulse.level).toBeCloseTo(1);
  const angle = pulse.angle;
  pulse.update(0.05, 0, true, true, false);
  expect(pulse.level).toBeCloseTo(1);
  expect(pulse.angle).toBe(angle);
  pulse.update(0.05, 1, true, false, true);
  expect(pulse.level).toBe(0);
  expect(pulse.angle).toBe(angle);
  for (let i = 0; i < 30; i++) pulse.update(0.05, 1, true, false, false);
  const before = pulse.level;
  pulse.update(0.05, 0, false, false, false);
  expect(pulse.level).toBeLessThan(before);
  expect(pulse.level).toBeGreaterThan(0);
  for (let i = 0; i < 100; i++) pulse.update(0.05, NaN, true, false, false);
  expect(pulse.level).toBeLessThan(0.001);
});
it("fails closed on blocked CORS, failed HTTP and request cancellation", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, type: "cors" });
  vi.stubGlobal("fetch", fetch);
  expect(
    await canAnalyse(
      "https://music.example/song",
      new AbortController().signal,
    ),
  ).toBe(true);
  expect(fetch.mock.calls[0][1]).toMatchObject({
    method: "HEAD",
    mode: "cors",
    credentials: "omit",
  });
  for (const value of [
    { ok: false, type: "cors" },
    { ok: true, type: "opaque" },
  ]) {
    fetch.mockResolvedValueOnce(value);
    expect(
      await canAnalyse(
        "https://music.example/song",
        new AbortController().signal,
      ),
    ).toBe(false);
  }
  fetch.mockRejectedValueOnce(new DOMException("abort", "AbortError"));
  expect(
    await canAnalyse(
      "https://music.example/song",
      new AbortController().signal,
    ),
  ).toBe(false);
});
it("owns a single media source per audio element, passes audio through and releases resources once", () => {
  const disconnect = vi.fn(),
    connect = vi.fn(),
    close = vi.fn().mockResolvedValue(undefined);
  const createMediaElementSource = vi.fn(() => ({ connect, disconnect }));
  const analyser = {
    connect,
    disconnect,
    fftSize: 512,
    smoothingTimeConstant: 0,
    getByteFrequencyData: (data: Uint8Array) => {
      data.fill(0);
      data[2] = 255;
    },
  };
  class Context {
    state = "running";
    sampleRate = 44100;
    destination = {};
    createAnalyser = () => analyser;
    createMediaElementSource = createMediaElementSource;
    close = close;
  }
  vi.stubGlobal("AudioContext", Context);
  const meter = new MusicMeter(),
    audio = {
      paused: false,
      muted: false,
      volume: 0.3,
      readyState: 4,
    } as HTMLAudioElement;
  expect(meter.prime()).toBe(true);
  expect(meter.attach(audio)).toBe(true);
  expect(meter.attach(audio)).toBe(true);
  expect(createMediaElementSource).toHaveBeenCalledTimes(1);
  expect(meter.read()).toBeGreaterThan(0);
  audio.muted = true;
  expect(meter.read()).toBe(0);
  audio.muted = false;
  audio.volume = 0;
  expect(meter.read()).toBe(0);
  meter.dispose();
  meter.dispose();
  expect(close).toHaveBeenCalledTimes(1);
  expect(meter.read()).toBe(0);
  expect(meter.prime()).toBe(false);
});
