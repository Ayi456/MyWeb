import * as T from "three";
import type { SceneContext } from "../core/context";
import { CONFIG, QUALITY } from "../config";
import { seededRandom } from "../utils/seededRandom";

/** A camera-wide winter atmosphere, independent of the island petal emitter. */
export function createSnow(ctx: SceneContext) {
  const geometry = new T.PlaneGeometry(1, 1);
  const seeds = new Float32Array(QUALITY.high.snow * 4);
  const rand = seededRandom(CONFIG.seed + 101);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
  geometry.setAttribute("aSeed", new T.InstancedBufferAttribute(seeds, 4));
  const snowTime = { value: 0 };
  const material = new T.ShaderMaterial({
    uniforms: { ...ctx.U, uSnowTime: snowTime },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    vertexShader: `
attribute vec4 aSeed;
uniform float uSnowTime;uniform float uWind;
varying vec2 vUv;varying float vOpacity;
void main(){
  // Fill an overscanned view frustum at several depths, including the foreground.
  // Projection scales the volume for any aspect ratio, zoom or camera preset.
  float depth=5.+pow(aSeed.z,1.3)*42.;
  vec3 fall=mat3(viewMatrix)*vec3(.075+uWind*.32,-.5,.018);
  vec2 drift=fall.xy*vec2(projectionMatrix[0][0],projectionMatrix[1][1])/depth;
  vec2 phase=aSeed.xy+uSnowTime*drift/2.44;
  phase.x+=sin(uSnowTime*.35+aSeed.w*6.283185)*.014;
  vec2 screen=fract(phase)*2.44-1.22;
  vec3 p=vec3(screen.x*depth/projectionMatrix[0][0],screen.y*depth/projectionMatrix[1][1],-depth);
  float size=.042+aSeed.w*.036;
  p.xy+=position.xy*size;
  vUv=uv;
  vOpacity=mix(.5,.85,aSeed.w)*(1.-smoothstep(1.04,1.22,max(abs(screen.x),abs(screen.y))));
  gl_Position=projectionMatrix*vec4(p,1.);
}`,
    fragmentShader: `
uniform vec4 uSeason;uniform float uNight;
varying vec2 vUv;varying float vOpacity;
void main(){
  float softness=1.-smoothstep(.28,1.,length(vUv-.5)*2.);
  float alpha=softness*vOpacity*uSeason.w;
  if(alpha<.01)discard;
  vec3 color=mix(vec3(.98,.98,1.),vec3(.72,.79,.94),uNight*.35);
  gl_FragColor=vec4(color,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  });
  const snow = new T.InstancedMesh(geometry, material, QUALITY.high.snow);
  snow.name = "winter-snow";
  snow.frustumCulled = false;
  snow.renderOrder = 13;
  snow.visible = false;
  ctx.scene.add(snow);
  return { snow, snowTime };
}
