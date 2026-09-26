import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createClouds(ctx: SceneContext) {
  const { scene, U, rand, range, PuffBatch: Batch, rod } = ctx;
  // Sea of clouds. One instanced draw call, gently drifting with depth-faded color.
  const cloudMat = new T.MeshStandardMaterial({
    roughness: 1,
    flatShading: false,
  });
  cloudMat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.uTime;
    s.uniforms.uCloudTravel = U.uCloudTravel;
    s.uniforms.uTide = U.uTide;
    s.vertexShader =
      "uniform float uTime;\nuniform float uCloudTravel;\nuniform float uTide;\n" +
      s.vertexShader;
    // uTide lifts the whole sea for the morning mist, in world units.
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y+=sin(instanceMatrix[3].x*.18+uTime*.08)*.11;\ntransformed.x+=(mod(instanceMatrix[3].x+uCloudTravel+34.,68.)-34.-instanceMatrix[3].x)/instanceMatrix[0].x;\ntransformed.y+=uTide*(1.7+.35*sin(instanceMatrix[3].z*.3+uTime*.2))/instanceMatrix[1].y;",
    );
  };
  const cloudBatch = new Batch(scene, cloudMat);
  const cloudCenters = [
    [-8, -3.6, 3, 2.7],
    [8, -4.5, 5, 3.4],
    [-1, -5.5, -1, 3.1],
  ];
  for (let i = 0; i < 37; i++) {
    const a = rand() * TAU,
      r = range(11, 31);
    cloudCenters.push([
      Math.cos(a) * r,
      range(-6.7, -3.2),
      Math.sin(a) * r,
      range(1.8, 3.2),
    ]);
  }
  for (const [x, y, z, s] of cloudCenters) {
    for (let j = 0; j < 7; j++) {
      const t = j / 6,
        dx = (t - 0.5) * s * 1.8;
      const size = s * (0.62 + Math.sin(t * Math.PI) * 0.34);
      cloudBatch.add(
        x + dx,
        y + Math.sin(t * Math.PI) * 0.35,
        z + Math.sin(j * 2.3) * s * 0.13,
        size * 1.65,
        size * 0.85,
        size * 1.1,
        j % 3 ? "#fff4ea" : "#efe4ed",
      );
    }
  }
  cloudBatch.build(false);
  for (const [x, y, z, s] of [
    [-12, -1.2, -12, 0.58],
    [10, -0.7, -18, 0.44],
  ]) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    scene.add(g);
    const b = new Batch(g);
    for (let k = 0; k < 4; k++)
      b.add(
        0,
        -k * 0.45,
        0,
        2.1 - k * 0.38,
        0.5,
        1.7 - k * 0.29,
        ["#b4c2ab", "#bdaca8", "#aaa0ad", "#bbaeba"][k],
      );
    rod(b, [0, 0, 0], [0, 1.8, 0], 0.17, "#b29590");
    for (let j = 0; j < 10; j++)
      b.add(
        range(-0.9, 0.9),
        1.6 + rand() * 0.7,
        range(-0.7, 0.7),
        0.7,
        0.46,
        0.6,
        j % 2 ? "#e7b6c7" : "#efd3d6",
      );
    b.build(false);
  }
  return { cloudMat };
}
