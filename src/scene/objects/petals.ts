import * as T from "three";
import { type SceneContext } from "../core/context";
import { CONFIG } from "../config";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createPetals(ctx: SceneContext) {
  const { world, U, cube, rand } = ctx;
  // Falling sakura petals are GPU-instanced. Gust strength changes flow, not scene geometry count.
  const petalCount = CONFIG.petals,
    petalGeo = cube.clone(),
    petalSeed = [];
  for (let i = 0; i < petalCount; i++)
    petalSeed.push(rand(), rand(), rand(), rand());
  petalGeo.setAttribute(
    "aSeed",
    new T.InstancedBufferAttribute(new Float32Array(petalSeed), 4),
  );
  const petalMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader: `attribute vec4 aSeed;uniform float uTime;uniform float uPetalTime;uniform float uWind;varying float vAlpha;varying float vTint;void main(){float life=fract(aSeed.w+uPetalTime*(.045+aSeed.y*.016));float a=life*6.283185+aSeed.z*25.;vec3 p=vec3(-3.9+aSeed.x*4.8+life*(2.+uWind*4.),5.+aSeed.y*1.35-life*8.,-1.5+aSeed.z*3.0);p.x+=sin(a+uTime*.3)*(.22+uWind*.45);p.z+=sin(a*1.5)*(.34+uWind*.6);p.y+=sin(a*2.)*.16;float t=uTime*(1.6+aSeed.z*2.)+aSeed.x*25.;vec3 q=position*vec3(.062,.010,.092);q.xz=mat2(cos(t),-sin(t),sin(t),cos(t))*q.xz;q.xy=mat2(cos(t*.72),-sin(t*.72),sin(t*.72),cos(t*.72))*q.xy;vAlpha=smoothstep(0.,.09,life)*(1.-smoothstep(.80,1.,life))*step(aSeed.z,.26+uWind*.72);vTint=aSeed.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(p+q,1.);}`,
    fragmentShader: `uniform float uNight;varying float vAlpha;varying float vTint;void main(){vec3 col=mix(vec3(.92,.54,.68),vec3(1.,.85,.87),vTint);col*=1.-uNight*.32;gl_FragColor=vec4(col,vAlpha*.88);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  });
  const petals = new T.InstancedMesh(petalGeo, petalMat, petalCount);
  petals.frustumCulled = false;
  petals.renderOrder = 12;
  world.add(petals);
  return { petals, petalCount };
}
