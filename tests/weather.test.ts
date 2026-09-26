import * as T from "three";
import { describe, expect, it, vi } from "vitest";
import {
  createEventDirector,
  EventScheduler,
  type SceneEventKind,
  type EventContext,
} from "../src/scene/systems/events";

function weather(kind: SceneEventKind) {
  const objects = {
    rain: new T.Points(new T.BufferGeometry(), new T.ShaderMaterial()),
    rainbowBoost: 0,
    whale: new T.Group(),
    whaleTail: new T.Group(),
    whaleSpout: new T.Group(),
    whaleFins: [new T.Group(), new T.Group()],
    balloon: new T.Group(),
    shootingStar: new T.Group(),
    shootingStarMat: new T.MeshBasicMaterial(),
  };
  const uniforms = { uRain: { value: 0 }, uTide: { value: 0 } };
  const thunder = vi.fn();
  const director = createEventDirector(objects, uniforms, thunder, () => 0);
  const scheduler = new EventScheduler(() => 0);
  scheduler.start(kind);
  const context: EventContext = { hour: 23, night: 1, season: [0, 1, 0, 0] };
  let time = 0;
  function advance(seconds: number, calm = false) {
    for (let i = 0; i < Math.round(seconds / 0.05); i++) {
      time += 0.05;
      scheduler.update(0.05, context);
      director.update(scheduler, 0.05, time, calm);
    }
  }
  return { objects, uniforms, thunder, director, scheduler, advance };
}

describe("weather lifecycle", () => {
  it("freezes the cloud tide when paused and returns it to zero afterwards", () => {
    const w = weather("seaMist");
    w.advance(25);
    expect(w.director.tide).toBeGreaterThan(0.9);
    const tide = w.uniforms.uTide.value;
    w.director.update(w.scheduler, 0, 25);
    expect(w.uniforms.uTide.value).toBe(tide);
    w.advance(30);
    expect(w.uniforms.uTide.value).toBe(0);
  });

  it("fades lanterns away at the end of a release", () => {
    const w = weather("skyLanterns");
    w.advance(20);
    expect(w.director.lanterns).toBe(1);
    w.advance(21);
    expect(w.director.lanterns).toBe(0);
  });

  it("delays thunder after lightning and clears rain after the storm", () => {
    const w = weather("thunderstorm");
    w.advance(7.4);
    expect(w.director.flash).toBeGreaterThan(0.5);
    expect(w.thunder).not.toHaveBeenCalled();
    const flash = w.director.flash;
    w.director.update(w.scheduler, 0, 7.4);
    expect(w.director.flash).toBe(flash);
    w.advance(0.9);
    expect(w.thunder).toHaveBeenCalledTimes(1);
    w.advance(37);
    expect(w.uniforms.uRain.value).toBe(0);
    expect(w.objects.rain.visible).toBe(false);
    expect(w.director.heavy).toBe(0);
  });

  it("keeps reduced-motion lightning gentle throughout the storm", () => {
    const w = weather("thunderstorm");
    for (let i = 0; i < 720; i++) {
      w.advance(0.05, true);
      expect(w.director.flash).toBeGreaterThanOrEqual(0);
      expect(w.director.flash).toBeLessThanOrEqual(0.35);
    }
    expect(w.thunder).toHaveBeenCalled();
  });
});
