import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createNightSky(ctx: SceneContext) {
  const { scene, world, U, rand, range, mesh } = ctx;
  const fireGeo = new T.BufferGeometry(),
    fireSeed = [];
  for (let i = 0; i < 95; i++) fireSeed.push(rand(), rand(), rand());
  fireGeo.setAttribute("position", new T.Float32BufferAttribute(fireSeed, 3));
  const fireMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    vertexShader: `uniform float uTime;uniform float uNight;uniform float uFirefly;uniform float uWind;varying float vAlpha;void main(){vec3 p=vec3(-3.3+position.x*6.,1.3+position.y*2.9,position.z*4.5-2.);p+=vec3(sin(uTime*.4+position.z*25.)*.27,sin(uTime*.7+position.x*28.)*.18,cos(uTime*.36+position.y*20.)*.24);p.x=mix(p.x,-.3+(p.x+.3)*.55,uWind*.55)+uWind*.3;p.z=mix(p.z,p.z*.65,uWind*.55);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(72./-mv.z,2.,7.);vAlpha=uNight*uFirefly*(.35+.65*pow(.5+.5*sin(uTime*1.5+position.x*40.),2.));}`,
    fragmentShader: `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.86,.40,pow(1.-r,1.6)*vAlpha);}`,
  });
  const fireflies = new T.Points(fireGeo, fireMat);
  fireflies.renderOrder = 13;
  world.add(fireflies);
  fireflies.frustumCulled = false;
  const starGeo = new T.BufferGeometry(),
    starPos = [];
  for (let i = 0; i < 520; i++) {
    const a = rand() * TAU,
      el = range(-0.78, 1.45),
      r = 70;
    starPos.push(
      Math.cos(a) * Math.cos(el) * r,
      Math.sin(el) * r,
      Math.sin(a) * Math.cos(el) * r,
    );
  }
  starGeo.setAttribute("position", new T.Float32BufferAttribute(starPos, 3));
  const starsMat = new T.PointsMaterial({
    color: "#fff1df",
    size: 0.16,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new T.Points(starGeo, starsMat);
  scene.add(stars);
  const celestialMat = new T.MeshBasicMaterial({ color: "#ffe4bb" });
  const sun = mesh(
    new T.IcosahedronGeometry(1.8, 2),
    celestialMat,
    scene,
    -18,
    18,
    -35,
  );
  sun.castShadow = false;
  const moon = mesh(
    new T.IcosahedronGeometry(1.1, 2),
    new T.MeshBasicMaterial({ color: "#fff0d1" }),
    scene,
    20,
    18,
    -35,
  );
  moon.castShadow = false;
  return { fireflies, starsMat, sun, moon };
}
