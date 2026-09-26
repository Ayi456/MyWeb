import * as T from "three";
import { type SceneContext } from "../core/context";
import { CONFIG } from "../config";

/**
 * Island-local cherry petals and falling leaves. Winter uses a separate,
 * camera-wide snow volume. Blend weights arrive via uSeason.
 */
export function createPetals(ctx: SceneContext) {
  const { world, U, cube, rand } = ctx;
  // Falling particles are GPU-instanced. Gust strength changes flow, not scene geometry count.
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
    vertexShader: `
attribute vec4 aSeed;
uniform float uTime;uniform float uPetalTime;uniform float uWind;
uniform vec4 uSeason;uniform vec4 uPointer;uniform float uBurst;
varying float vAlpha;varying float vTint;
void main(){
  float summer=uSeason.y,autumn=uSeason.z;
  float speed=.045+aSeed.y*.016;
  float life=fract(aSeed.w+uPetalTime*speed);
  float a=life*6.283185+aSeed.z*25.;
  vec3 p=vec3(-3.9+aSeed.x*4.8,5.+aSeed.y*1.35-life*8.,-1.5+aSeed.z*3.0);
  p.x+=life*(2.+uWind*4.);
  p.x+=sin(a+uTime*.3)*(.22+uWind*.45);
  p.z+=sin(a*1.5)*(.34+uWind*.6);
  p.y+=sin(a*2.)*.16;
  // The pointer brushes nearby particles aside.
  vec2 d=p.xz-uPointer.xz;
  float push=uPointer.w*smoothstep(1.7,0.,length(d))*smoothstep(3.2,0.,abs(p.y-uPointer.y));
  p.xz+=normalize(d+vec2(.001,.002))*push*1.2;
  p.y+=push*.45;
  float t=uTime*(1.6+aSeed.z*2.)+aSeed.x*25.;
  vec3 size=vec3(.062,.010,.092);
  size=mix(size,vec3(.05,.01,.07),summer);
  size=mix(size,vec3(.085,.012,.11),autumn);
  vec3 q=position*size;
  q.xz=mat2(cos(t),-sin(t),sin(t),cos(t))*q.xz;
  q.xy=mat2(cos(t*.72),-sin(t*.72),sin(t*.72),cos(t*.72))*q.xy;
  float density=.26+uWind*.72+uBurst;
  density=mix(density,.1+uWind*.5+uBurst,summer);
  density=mix(density,.48+uWind*.5+uBurst,autumn);
  vAlpha=smoothstep(0.,.09,life)*(1.-smoothstep(.80,1.,life))*step(aSeed.z,density)*(1.-uSeason.w);
  vTint=aSeed.x;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p+q,1.);
}`,
    fragmentShader: `
uniform float uNight;uniform vec4 uSeason;
varying float vAlpha;varying float vTint;
void main(){
  vec3 spring=mix(vec3(.92,.54,.68),vec3(1.,.85,.87),vTint);
  vec3 summer=mix(vec3(.55,.74,.45),vec3(.78,.88,.6),vTint);
  vec3 autumn=mix(vec3(.86,.40,.18),vec3(.97,.74,.32),vTint);
  vec3 col=(spring*uSeason.x+summer*uSeason.y+autumn*uSeason.z)/max(.001,1.-uSeason.w);
  col*=1.-uNight*.32;
  gl_FragColor=vec4(col,vAlpha*.88);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  });
  const petals = new T.InstancedMesh(petalGeo, petalMat, petalCount);
  petals.frustumCulled = false;
  petals.renderOrder = 12;
  world.add(petals);
  return { petals, petalCount };
}
