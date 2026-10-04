import { describe, expect, it } from "vitest";
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { createFireflies } from "../src/scene/systems/romanticElements";

describe("firefly lighting", () => {
  it("keeps five light slots across day/night while preserving all 35 insects", () => {
    const ctx = createContext();
    const fireflies = createFireflies(ctx);
    const insects = fireflies.group.children.filter(
      (object): object is T.Mesh<T.SphereGeometry, T.MeshStandardMaterial> =>
        object instanceof T.Mesh,
    );
    const lights = fireflies.group.children.filter(
      (object): object is T.PointLight => object instanceof T.PointLight,
    );
    expect(insects).toHaveLength(35);
    expect(lights).toHaveLength(5);
    expect(
      lights.every((light) => light.visible && light.intensity === 0),
    ).toBe(true);
    for (const night of [0, 0.05, 0.5, 1, 0.5, 0]) {
      ctx.U.uNight.value = night;
      fireflies.update(0);
      const visibleLights: T.PointLight[] = [];
      fireflies.group.traverseVisible((object) => {
        if (object instanceof T.PointLight) visibleLights.push(object);
      });
      expect(visibleLights).toEqual(lights);
      expect(insects.filter((insect) => insect.visible)).toHaveLength(
        night > 0.1 ? 35 : 0,
      );
      if (night === 0)
        expect(lights.every((light) => light.intensity === 0)).toBe(true);
      else expect(lights.some((light) => light.intensity > 0)).toBe(true);
    }
  });

  it("preserves motion and fades insect emission and pooled light with the season", () => {
    const ctx = createContext();
    const fireflies = createFireflies(ctx);
    const insects = fireflies.group.children.filter(
      (object): object is T.Mesh<T.SphereGeometry, T.MeshStandardMaterial> =>
        object instanceof T.Mesh,
    );
    const lights = fireflies.group.children.filter(
      (object): object is T.PointLight => object instanceof T.PointLight,
    );
    ctx.U.uNight.value = 1;
    ctx.U.uTime.value = 3;
    fireflies.update(0);
    const emissions = insects.map(
      (insect) => insect.material.emissiveIntensity,
    );
    const intensities = lights.map((light) => light.intensity);
    const positions = insects.map((insect) => insect.position.clone());
    ctx.U.uFirefly.value = 0.5;
    fireflies.update(0);
    insects.forEach((insect, index) => {
      expect(insect.material.emissiveIntensity).toBeCloseTo(
        emissions[index] / 2,
      );
    });
    lights.forEach((light, index) => {
      expect(light.intensity).toBeCloseTo(intensities[index] / 2);
    });
    ctx.U.uTime.value = 6;
    fireflies.update(0);
    expect(
      insects.every(
        (insect, index) => !insect.position.equals(positions[index]),
      ),
    ).toBe(true);
    ctx.U.uFirefly.value = 0;
    fireflies.update(0);
    expect(
      lights.every((light) => light.visible && light.intensity === 0),
    ).toBe(true);
    expect(
      insects.every((insect) => insect.material.emissiveIntensity === 0),
    ).toBe(true);
  });
});
