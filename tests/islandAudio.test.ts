import { describe, expect, it, vi } from "vitest";
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { ResourceTracker } from "../src/scene/core/resourceTracker";
import {
  createGramophone,
  updateGramophone,
} from "../src/scene/objects/gramophone";
import { Foghorn, foghornWeather } from "../src/scene/systems/foghorn";
import { Ambience } from "../src/scene/systems/ambience";
import { GARDEN_ISLAND } from "../src/scene/worldLayout";

describe("lighthouse foghorn", () => {
  it("requires night and existing rain, mist or winter fog", () => {
    expect(foghornWeather(1, 0, 0, 0)).toBe(false);
    expect(foghornWeather(0, 1, 1, 1)).toBe(false);
    expect(foghornWeather(0.65, 1, 1, 1)).toBe(false);
    expect(foghornWeather(1, 0.6, 0, 0)).toBe(true);
    expect(foghornWeather(1, 0, 0.4, 0)).toBe(true);
    expect(foghornWeather(1, 0, 0, 1)).toBe(true);
  });
  it("sounds after six eligible seconds, then once per simulated minute", () => {
    const horn = new Foghorn();
    expect(horn.update(5, true)).toBe(false);
    expect(horn.update(1, true)).toBe(true);
    expect(horn.update(59, true)).toBe(false);
    expect(horn.update(1, true)).toBe(true);
    expect(horn.count).toBe(2);
  });
  it("freezes when paused, discards invalid time and resets on clearing weather", () => {
    const horn = new Foghorn();
    horn.update(3, true);
    for (const dt of [0, -1, NaN, Infinity])
      expect(horn.update(dt, true)).toBe(false);
    expect(horn.remaining).toBe(3);
    horn.update(1, false);
    expect(horn.remaining).toBe(6);
    expect(horn.update(5, true)).toBe(false);
    expect(horn.count).toBe(0);
  });
  it("never replays a backlog, even when a long interval is provided", () => {
    const horn = new Foghorn();
    expect(horn.update(600, true)).toBe(true);
    expect(horn.count).toBe(1);
    expect(horn.remaining).toBe(60);
    expect(horn.update(0.1, true)).toBe(false);
  });
  it("emits a caption cue without requiring an audio context or audible sound", () => {
    const audio = new Ambience();
    const cue = vi.fn();
    audio.onCue = cue;
    audio.play("foghorn");
    expect(audio.enabled).toBe(false);
    expect(cue).toHaveBeenCalledWith("foghorn");
    audio.dispose();
  });
});

describe("garden gramophone", () => {
  function build() {
    const ctx = createContext(),
      garden = new T.Group();
    garden.position.set(...GARDEN_ISLAND.center);
    ctx.world.add(garden);
    return { ctx, garden, ...createGramophone(ctx, garden) };
  }
  it("adds two shared-resource furniture batches on the garden and leaves the main seed alone", () => {
    const o = build(),
      reference = createContext();
    expect(o.ctx.rand()).toBe(reference.rand());
    expect(o.gramophone.parent).toBe(o.garden);
    const batches: T.InstancedMesh[] = [];
    o.gramophone.traverse((node) => {
      if (node instanceof T.InstancedMesh) batches.push(node);
    });
    expect(batches).toHaveLength(2);
    expect(
      batches.every(
        (node) =>
          node.geometry === o.ctx.softCube &&
          node.material === o.ctx.matte &&
          !node.castShadow,
      ),
    ).toBe(true);
    const tracker = new ResourceTracker();
    const disposed = vi.fn();
    o.ctx.softCube.addEventListener("dispose", disposed);
    tracker.track(o.ctx.scene);
    tracker.dispose();
    tracker.dispose();
    expect(disposed).toHaveBeenCalledTimes(1);
  });
  it("turns only during actual playback and freezes for pause or reduced motion", () => {
    const o = build();
    updateGramophone(o, 1, true, false);
    const angle = o.gramophoneRecord.rotation.y;
    expect(angle).toBeGreaterThan(0);
    for (const [dt, playing, reduced] of [
      [0, true, false],
      [1, false, false],
      [1, true, true],
    ] as const) {
      updateGramophone(o, dt, playing, reduced);
      expect(o.gramophoneRecord.rotation.y).toBe(angle);
    }
    updateGramophone(o, 1000, true, false);
    expect(o.gramophoneRecord.rotation.y).toBeLessThan(Math.PI * 2);
  });
});
