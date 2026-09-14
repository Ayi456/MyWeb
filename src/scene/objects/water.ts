import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createWater(ctx: SceneContext) {
  const { world, U, Batch, mesh } = ctx;
  // A small spring pool spills over the island's edge into cloud mist.
  const poolMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime;uniform float uWind;varying vec3 vP;varying float vH;void main(){vec4 p=instanceMatrix*vec4(position,1.);vH=sin(p.x*6.+uTime)*sin(p.z*5.+uTime*.6)*(.012+uWind*.016);p.y+=vH;vP=p.xyz;gl_Position=projectionMatrix*modelViewMatrix*p;}`,
    fragmentShader: `uniform float uTime;uniform float uNight;varying vec3 vP;varying float vH;void main(){float glint=pow(max(0.,sin(vP.x*17.+vP.z*10.+uTime)),30.);vec3 c=mix(vec3(.32,.66,.68),vec3(.76,.91,.84),.25+glint*.65);c*=1.-uNight*.48;gl_FragColor=vec4(c,.90);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  });
  const pool = new Batch(world, poolMat);
  for (let x = -0.64; x < 0.65; x += 0.13)
    for (let z = -0.5; z < 0.5; z += 0.13)
      if ((x * x) / 0.42 + (z * z) / 0.25 < 1)
        pool.add(-2.72 + x, 1.14, 1.38 + z, 0.134, 0.035, 0.134, "#c9ede2");
  for (let k = 0; k < 6; k++)
    pool.add(
      -3.05 - k * 0.1,
      1.1 - k * 0.012,
      1.55 + k * 0.045,
      0.19,
      0.035,
      0.23,
      "#c9ede2",
    );
  const poolMesh = pool.build(false);
  poolMesh.renderOrder = 8;
  const pondStones = new Batch();
  for (let i = 0; i < 15; i++) {
    const a = (i * TAU) / 15;
    pondStones.add(
      -2.72 + Math.cos(a) * 0.69,
      1.14,
      1.38 + Math.sin(a) * 0.53,
      0.17,
      0.1,
      0.14,
      i % 3 ? "#d1c4b3" : "#e9dac0",
      0,
      a,
      0,
    );
  }
  pondStones.build();
  const fallMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader: `uniform float uTime;varying vec3 vP;void main(){vP=position;vec3 p=position;p.x+=sin(position.y*3.+uTime*1.3)*.025;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float uTime;uniform float uNight;varying vec3 vP;void main(){float f=.5+.5*sin(vP.y*26.+uTime*7.);float side=1.-smoothstep(.05,.21,abs(vP.x));vec3 c=mix(vec3(.49,.74,.74),vec3(.91,.97,.88),pow(f,6.));c*=1.-uNight*.40;float fade=smoothstep(-3.35,-2.7,vP.y);gl_FragColor=vec4(c,(.45+.2*f)*side*fade);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  });
  const waterfall = mesh(
    new T.PlaneGeometry(0.43, 4.25, 2, 48),
    fallMat,
    world,
    -3.54,
    -1.1,
    1.8,
  );
  waterfall.rotation.y = -0.4;
  waterfall.renderOrder = 9;
  waterfall.castShadow = false;
  return { poolMesh, waterfall };
}
