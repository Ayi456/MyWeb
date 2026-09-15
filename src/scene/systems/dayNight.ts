import * as T from "three";
import type { SceneContext } from "../core/context";
import type { WorldObjects } from "../objects/createWorld";
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
const dayHemi = new T.Color("#e8f3e8"),
  nightHemi = new T.Color("#b8cae7");
const dayGround = new T.Color("#cda197"),
  nightGround = new T.Color("#8d799d");
const warmSun = new T.Color("#ffd4bd"),
  daySun = new T.Color("#fff1dc");
export function createDayNight(ctx: SceneContext, o: WorldObjects) {
  const skyTop = new T.Color(),
    skyBottom = new T.Color();
  return (hour: number) => {
    const angle = ((hour - 6) / 24) * Math.PI * 2,
      altitude = Math.sin(angle),
      night = 1 - T.MathUtils.smoothstep(altitude, -0.14, 0.33);
    for (let i = 1; i < skyFrames.length; i++)
      if (hour <= skyFrames[i].hour) {
        const a = skyFrames[i - 1],
          b = skyFrames[i],
          f = (hour - a.hour) / (b.hour - a.hour);
        skyTop.copy(a.top).lerp(b.top, f);
        skyBottom.copy(a.bottom).lerp(b.bottom, f);
        break;
      }
    ctx.U.uNight.value = night;
    o.skyUniforms.top.value.copy(skyTop);
    o.skyUniforms.bottom.value.copy(skyBottom);
    ctx.scene.fog!.color.copy(skyBottom);
    o.hemi.intensity = T.MathUtils.lerp(1.6, 0.95, night);
    o.hemi.color.copy(dayHemi).lerp(nightHemi, night);
    o.hemi.groundColor.copy(dayGround).lerp(nightGround, night);
    o.sunLight.intensity = T.MathUtils.lerp(2.3, 0.42, night);
    o.sunLight.color
      .copy(warmSun)
      .lerp(daySun, T.MathUtils.smoothstep(Math.abs(altitude), 0.3, 0.5));
    o.sunLight.position.set(
      Math.cos(angle) * 8,
      5 + Math.max(0.1, altitude) * 9,
      7,
    );
    o.fill.intensity = 0.8;
    ctx.lampMat.emissiveIntensity = 0.2 + night * 2.2;
    o.officeLight.intensity = 0.5 + night * 4.8;
    o.treeLight.intensity = night * 8;
    o.beaconLight.intensity = 0.15 + night * 5;
    o.beaconGlow.material.opacity = 0.06 + night * 0.72;
    o.rainbowMat.uniforms.uStrength.value = 0.46 * (1 - night);
    o.rainbow.visible = night < 0.99;
    o.cloudMat.color.setRGB(
      1 - night * 0.26,
      1 - night * 0.29,
      1 - night * 0.2,
    );
    o.glows.forEach((g) => (g.material.opacity = 0.06 + night * 0.65));
    o.starsMat.opacity = night * 0.82;
    o.fireflies.visible = night > 0.03;
    o.sun.visible = altitude > -0.08;
    o.moon.visible = altitude < 0.12;
    o.sun.position.set(Math.cos(angle) * 30, 5 + altitude * 27, -35);
    o.moon.position.set(-Math.cos(angle) * 30, 5 - altitude * 27, -35);
    return night;
  };
}
