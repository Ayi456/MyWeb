import * as T from "three";
import type { SceneContext } from "../core/context";
import type { WorldObjects } from "../objects/createWorld";
import type { SeasonWeights } from "./season";
const frames: [number, string, string][] = [
  [0, "#172c47", "#424463"],
  [5, "#858fae", "#d5b4c1"],
  [6.5, "#e3b6cd", "#ffebce"],
  [10, "#b0d7df", "#f4e8d4"],
  [14, "#b7d6df", "#fae7d5"],
  [17, "#c4c4df", "#f4c8b8"],
  [19.5, "#696c94", "#b08faa"],
  [22, "#263956", "#515475"],
  [24, "#172c47", "#424463"],
];
const skyFrames = frames.map(([hour, top, bottom]) => ({
  hour,
  top: new T.Color(top),
  bottom: new T.Color(bottom),
}));
// Seasonal tints multiply the spring sky: clearer summer blue, amber autumn, pale winter.
const seasonTop = [
  new T.Color(1, 1, 1),
  new T.Color(0.9, 1.0, 1.1),
  new T.Color(1.06, 0.95, 0.84),
  new T.Color(0.9, 0.94, 1.02),
];
const seasonBottom = [
  new T.Color(1, 1, 1),
  new T.Color(0.96, 1.0, 1.02),
  new T.Color(1.06, 0.92, 0.8),
  new T.Color(0.96, 0.97, 1.0),
];
const dayHemi = new T.Color("#e8f3e8"),
  nightHemi = new T.Color("#b8cae7");
const dayGround = new T.Color("#cda197"),
  nightGround = new T.Color("#8d799d");
const warmSun = new T.Color("#ffd4bd"),
  daySun = new T.Color("#fff1dc");
const NO_SEASON: SeasonWeights = [1, 0, 0, 0];
const rainTop = new T.Color(0.62, 0.64, 0.7),
  rainBottom = new T.Color(0.78, 0.78, 0.82),
  lightning = new T.Color(0.86, 0.87, 1);
export function createDayNight(ctx: SceneContext, o: WorldObjects) {
  const skyTop = new T.Color(),
    skyBottom = new T.Color(),
    tint = new T.Color(),
    scratch = new T.Color();
  const blend = (set: T.Color[], season: SeasonWeights) => {
    tint.setRGB(0, 0, 0);
    for (let k = 0; k < 4; k++)
      if (season[k]) tint.add(scratch.copy(set[k]).multiplyScalar(season[k]));
    return tint;
  };
  return (
    hour: number,
    season: SeasonWeights = NO_SEASON,
    rain = 0,
    flash = 0,
  ) => {
    const angle = ((hour - 6) / 24) * Math.PI * 2,
      altitude = Math.sin(angle),
      night = 1 - T.MathUtils.smoothstep(altitude, -0.14, 0.33);
    const winter = season[3],
      summer = season[1];
    for (let i = 1; i < skyFrames.length; i++)
      if (hour <= skyFrames[i].hour) {
        const a = skyFrames[i - 1],
          b = skyFrames[i],
          f = (hour - a.hour) / (b.hour - a.hour);
        skyTop.copy(a.top).lerp(b.top, f);
        skyBottom.copy(a.bottom).lerp(b.bottom, f);
        break;
      }
    skyTop.multiply(blend(seasonTop, season));
    skyBottom.multiply(blend(seasonBottom, season));
    // Rain flattens the sky towards a soft grey.
    const grey = 0.4 * rain;
    skyTop.lerp(rainTop, grey);
    skyBottom.lerp(rainBottom, grey);
    // Lightning washes the sky pale for a moment.
    skyTop.lerp(lightning, flash * 0.55);
    skyBottom.lerp(lightning, flash * 0.4);
    ctx.U.uNight.value = night;
    o.skyUniforms.top.value.copy(skyTop);
    o.skyUniforms.bottom.value.copy(skyBottom);
    ctx.scene.fog!.color.copy(skyBottom);
    o.hemi.intensity =
      T.MathUtils.lerp(1.6, 0.95, night) * (1 - rain * 0.25) + flash * 1.4;
    o.hemi.color.copy(dayHemi).lerp(nightHemi, night);
    o.hemi.groundColor.copy(dayGround).lerp(nightGround, night);
    o.sunLight.intensity =
      T.MathUtils.lerp(2.3 + summer * 0.3 - winter * 0.35, 0.42, night) *
      (1 - rain * 0.55);
    o.sunLight.color
      .copy(warmSun)
      .lerp(daySun, T.MathUtils.smoothstep(Math.abs(altitude), 0.3, 0.5));
    // Winter sun sits lower in the sky.
    o.sunLight.position.set(
      Math.cos(angle) * 8,
      5 + Math.max(0.1, altitude) * (9 - winter * 3),
      7,
    );
    o.fill.intensity = 0.8;
    ctx.lampMat.emissiveIntensity = 0.2 + night * 2.2;
    o.officeLight.intensity = 0.5 + night * 4.8;
    o.treeLight.intensity = night * 8 * (1 - winter * 0.6);
    o.beaconLight.intensity = 0.15 + night * 5;
    o.beaconGlow.material.opacity = 0.06 + night * 0.72;
    o.teaLight.intensity = night * 3.2;
    o.villageLight.intensity = 0.2 + night * 4.5;
    o.rainbowMat.uniforms.uStrength.value =
      (0.46 + o.rainbowBoost) * (1 - night) * (1 - rain);
    o.rainbow.visible = night < 0.99 && rain < 0.99;
    o.cloudMat.color.setRGB(
      (1 - night * 0.26) * (1 - rain * 0.18),
      (1 - night * 0.29) * (1 - rain * 0.16),
      (1 - night * 0.2) * (1 - rain * 0.1) + winter * 0.03,
    );
    o.glows.forEach((g) => (g.material.opacity = 0.06 + night * 0.65));
    o.starsMat.opacity = night * 0.82 * (1 - rain);
    // Fireflies belong to warm nights; snow and rain keep them away.
    o.fireflies.visible = night > 0.03 && winter < 0.9 && rain < 0.9;
    ctx.U.uFirefly.value = (0.55 + summer * 0.45) * (1 - winter) * (1 - rain);
    o.sun.visible = altitude > -0.08;
    o.moon.visible = altitude < 0.12;
    o.sun.position.set(Math.cos(angle) * 30, 5 + altitude * 27, -35);
    o.moon.position.set(-Math.cos(angle) * 30, 5 - altitude * 27, -35);
    return night;
  };
}
