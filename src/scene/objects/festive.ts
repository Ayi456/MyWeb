import * as T from "three";
import type { SceneContext } from "../core/context";
import { VILLAGE_ISLAND } from "../worldLayout";

/** Seasonal decorations are built once, then shown only on their festival. */
export function createFestive(ctx: SceneContext) {
  const { world, scene, Batch, U } = ctx;

  const festivalLanterns = new T.Group();
  festivalLanterns.name = "mid-autumn-sky-lanterns";
  festivalLanterns.position.set(...VILLAGE_ISLAND.center);
  festivalLanterns.visible = false;
  world.add(festivalLanterns);
  const lanternMat = new T.MeshBasicMaterial({
    color: "#ffd49a",
    fog: false,
    transparent: true,
  });
  lanternMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = U.uTime;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y += mod(uTime*.25+instanceMatrix[3].x*.7,4.);\ntransformed.x += sin(uTime*.45+instanceMatrix[3].z*2.)*.18;",
    );
  };
  const lanternMesh = new T.InstancedMesh(
    new T.BoxGeometry(0.24, 0.3, 0.24),
    lanternMat,
    14,
  );
  const dummy = new T.Object3D();
  for (let i = 0; i < lanternMesh.count; i++) {
    dummy.position.set(
      ((i % 7) - 3) * 0.72,
      2.3 + Math.floor(i / 7) * 0.4,
      -1 + (i % 4) * 0.6,
    );
    dummy.updateMatrix();
    lanternMesh.setMatrixAt(i, dummy.matrix);
  }
  lanternMesh.instanceMatrix.needsUpdate = true;
  lanternMesh.frustumCulled = false;
  lanternMesh.castShadow = false;
  festivalLanterns.add(lanternMesh);

  const festivalRedLanterns = new T.Group();
  festivalRedLanterns.name = "lantern-festival-bridge";
  festivalRedLanterns.visible = false;
  world.add(festivalRedLanterns);
  const red = new Batch(festivalRedLanterns);
  const start = new T.Vector3(-3.44, 1.12, -0.84),
    end = new T.Vector3(-5.53, 0.62, -1.06);
  for (let i = 0; i < 8; i++) {
    const p = start.clone().lerp(end, (i + 0.5) / 8);
    p.y += 0.82 - Math.sin(((i + 0.5) / 8) * Math.PI) * 0.28;
    red.add(p.x, p.y, p.z - 0.38, 0.16, 0.2, 0.16, "#d76a6b");
  }
  red.build(false);

  const stars: number[] = [];
  for (let i = 0; i < 48; i++) {
    const t = i / 47;
    stars.push(-7 + t * 28, 12 + Math.sin(t * Math.PI) * 2, -27);
  }
  const starGeo = new T.BufferGeometry();
  starGeo.setAttribute("position", new T.Float32BufferAttribute(stars, 3));
  const festivalStarBridge = new T.Points(
    starGeo,
    new T.PointsMaterial({
      color: "#e6dcff",
      size: 0.24,
      transparent: true,
      opacity: 0.7,
      fog: false,
      depthWrite: false,
    }),
  );
  festivalStarBridge.name = "qixi-star-bridge";
  festivalStarBridge.visible = false;
  scene.add(festivalStarBridge);
  return {
    festivalLanterns,
    festivalLanternMat: lanternMat,
    festivalRedLanterns,
    festivalStarBridge,
  };
}
