import * as T from "three";
import type { SceneContext } from "../core/context";

/** A sculpted visitor: rounded cloud body, curved fins and a horizontal fluke. */
export function createCloudWhale(ctx: SceneContext) {
  const whale = new T.Group();
  whale.name = "cloud-whale";
  whale.visible = false;
  ctx.scene.add(whale);

  const skin = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.78,
    emissive: "#b8bddb",
    emissiveIntensity: 0.045,
  });
  const finMaterial = new T.MeshStandardMaterial({
    color: "#aeb9da",
    roughness: 0.8,
  });
  const ivory = new T.MeshStandardMaterial({
    color: "#fff6e8",
    roughness: 0.9,
  });
  const ink = new T.MeshStandardMaterial({ color: "#444961", roughness: 0.3 });

  // Revolve a soft profile along +X, rather than leaving a hollow voxel shell.
  const profile = new T.CatmullRomCurve3(
    [
      [0, -2.8],
      [0.17, -2.6],
      [0.32, -2.0],
      [0.64, -1.3],
      [0.88, -0.4],
      [1.0, 0.65],
      [0.94, 1.45],
      [0.74, 1.95],
      [0.34, 2.26],
      [0, 2.4],
    ].map(([radius, x]) => new T.Vector3(radius, x, 0)),
  );
  const bodyGeometry = new T.LatheGeometry(
    profile.getPoints(48).map((p) => new T.Vector2(Math.max(0, p.x), p.y)),
    24,
  );
  bodyGeometry.rotateZ(-Math.PI / 2);
  bodyGeometry.scale(1, 1, 1.08);
  const positions = bodyGeometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const back = new T.Color("#a7b5d8"),
    flank = new T.Color("#c6cbe6"),
    belly = new T.Color("#fff5e8"),
    color = new T.Color();
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    color.copy(flank).lerp(back, T.MathUtils.smoothstep(y, 0.1, 0.85));
    color.lerp(belly, T.MathUtils.smoothstep(-y, 0.1, 0.5));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  bodyGeometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  whale.add(new T.Mesh(bodyGeometry, skin));

  // Bevelled silhouettes give fins a soft edge without new textures.
  function finGeometry(shape: T.Shape, horizontal = true) {
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      curveSegments: 10,
    });
    geometry.translate(0, 0, -0.0325);
    if (horizontal) geometry.rotateX(Math.PI / 2);
    geometry.computeVertexNormals();
    return geometry;
  }
  const flipper = new T.Shape();
  flipper.moveTo(0.18, 0);
  flipper.bezierCurveTo(0.1, 0.42, -0.7, 1.14, -1.38, 1.45);
  flipper.bezierCurveTo(-1.58, 1.54, -1.36, 0.96, -0.91, 0.46);
  flipper.quadraticCurveTo(-0.46, 0.03, -0.18, 0);
  flipper.closePath();
  const flipperGeometry = finGeometry(flipper);
  const whaleFins = [-1, 1].map((side) => {
    const pivot = new T.Group();
    pivot.position.set(0.67, -0.45, side * 0.78);
    pivot.scale.z = side;
    pivot.rotation.x = side * 0.5;
    pivot.add(new T.Mesh(flipperGeometry, finMaterial));
    whale.add(pivot);
    return pivot;
  });

  const dorsal = new T.Shape();
  dorsal.moveTo(-1.22, 0.68);
  dorsal.quadraticCurveTo(-0.77, 0.88, -0.78, 1.24);
  dorsal.quadraticCurveTo(-0.38, 1.16, -0.3, 0.85);
  dorsal.closePath();
  whale.add(new T.Mesh(finGeometry(dorsal, false), finMaterial));

  const tail = new T.Group();
  tail.name = "whale-fluke";
  tail.position.set(-2.5, 0.03, 0);
  whale.add(tail);
  const fluke = new T.Shape();
  fluke.moveTo(0.08, 0);
  fluke.bezierCurveTo(-0.12, 0.5, -0.66, 1.08, -1.18, 1.22);
  fluke.quadraticCurveTo(-1.45, 1.3, -1.15, 0.8);
  fluke.quadraticCurveTo(-0.8, 0.25, -0.76, 0);
  fluke.closePath();
  const flukeGeometry = finGeometry(fluke);
  for (const side of [-1, 1]) {
    const lobe = new T.Mesh(flukeGeometry, finMaterial);
    lobe.scale.z = side;
    tail.add(lobe);
  }

  const eyeGeometry = new T.SphereGeometry(0.085, 12, 8);
  const sparkleGeometry = new T.SphereGeometry(0.026, 8, 6);
  const cheekMaterial = new T.MeshStandardMaterial({
    color: "#dfb9cb",
    roughness: 0.9,
  });
  for (const side of [-1, 1]) {
    const eye = new T.Mesh(eyeGeometry, ink);
    eye.position.set(1.67, -0.08, side * 0.96);
    eye.scale.set(1.05, 1.12, 0.6);
    whale.add(eye);
    const sparkle = new T.Mesh(sparkleGeometry, ivory);
    sparkle.position.set(1.695, -0.048, side * 1.006);
    whale.add(sparkle);
    const cheek = new T.Mesh(eyeGeometry, cheekMaterial);
    cheek.position.set(1.59, -0.3, side * 0.93);
    cheek.scale.set(1.6, 0.58, 0.2);
    whale.add(cheek);
    const smile = new T.CatmullRomCurve3([
      new T.Vector3(1.85, -0.42, side * 0.79),
      new T.Vector3(2.04, -0.39, side * 0.61),
      new T.Vector3(2.19, -0.3, side * 0.4),
    ]);
    whale.add(new T.Mesh(new T.TubeGeometry(smile, 12, 0.015, 5, false), ink));
  }

  // A small puff dissolves above the blowhole instead of a stack of cubes.
  const spout = new T.Group();
  spout.position.set(1.03, 0.95, 0);
  spout.visible = false;
  whale.add(spout);
  const mistGeometry = new T.IcosahedronGeometry(1, 1);
  const mistMaterial = new T.MeshStandardMaterial({
    color: "#f8f5ff",
    transparent: true,
    opacity: 0.62,
    roughness: 1,
    depthWrite: false,
  });
  for (let i = 0; i < 9; i++) {
    const puff = new T.Mesh(mistGeometry, mistMaterial);
    const size = 0.08 + i * 0.017;
    puff.position.set(
      Math.sin(i * 2.4) * size * 0.7,
      0.16 + i * 0.15,
      Math.cos(i * 2.4) * size * 0.5,
    );
    puff.scale.set(size, size * 1.25, size);
    spout.add(puff);
  }
  whale.traverse((node) => {
    node.castShadow = false;
    node.receiveShadow = false;
  });
  return { whale, whaleTail: tail, whaleSpout: spout, whaleFins };
}
