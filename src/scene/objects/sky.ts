import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createSky(ctx: SceneContext) {
  const { scene, mesh } = ctx;
  const skyUniforms = {
    top: { value: new T.Color("#bdd1e3") },
    bottom: { value: new T.Color("#f9ddcd") },
  };
  const sky = mesh(
    new T.SphereGeometry(95, 24, 16),
    new T.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader:
        "varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform vec3 top;uniform vec3 bottom;varying vec3 vP;void main(){float h=smoothstep(-.25,.65,normalize(vP).y);vec3 c=mix(bottom,top,h);gl_FragColor=vec4(c,1.);}",
      side: T.BackSide,
      depthWrite: false,
      toneMapped: false,
    }),
    scene,
  );
  sky.castShadow = false;
  sky.renderOrder = -50;
  const hemi = new T.HemisphereLight("#e9f4f0", "#c99a99", 2.4);
  scene.add(hemi);
  const sunLight = new T.DirectionalLight("#ffe0b6", 3.0);
  sunLight.position.set(-7, 11, 8);
  sunLight.target.position.set(0, 1, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, {
    left: -9,
    right: 9,
    top: 9,
    bottom: -9,
    near: 0.1,
    far: 38,
  });
  sunLight.shadow.normalBias = 0.04;
  sunLight.shadow.bias = -0.0003;
  scene.add(sunLight, sunLight.target);
  const fill = new T.DirectionalLight("#b9dbe4", 1.4);
  fill.position.set(5, 4, -8);
  scene.add(fill);
  const treeLight = new T.PointLight("#ffc3d4", 0, 10, 2);
  treeLight.position.set(-1, 3, 1);
  scene.add(treeLight);
  const officeLight = new T.PointLight("#ffd79e", 1.8, 6, 2);
  officeLight.position.set(1.1, 2.1, 1.2);
  scene.add(officeLight);
  return { sky, skyUniforms, hemi, sunLight, fill, treeLight, officeLight };
}
