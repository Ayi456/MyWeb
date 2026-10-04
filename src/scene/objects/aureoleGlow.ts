import * as T from "three";
import type { SceneContext } from "../core/context";
import { AUREOLE } from "./sacredAureole";

/** A single depth-tested veil lights the aureole without washing over the tree. */
export function createAureoleGlow(ctx: SceneContext, parent: T.Object3D) {
  const material = new T.ShaderMaterial({
    uniforms: { uNight: ctx.U.uNight },
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    forceSinglePass: true,
    blending: T.AdditiveBlending,
    vertexShader: `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
    fragmentShader: `uniform float uNight;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - .5) * 2.6;
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float outer = exp(-pow((radius - 1.) / .018, 2.));
  float inner = exp(-pow((radius - .92) / .012, 2.));
  float haze = exp(-pow((radius - .98) / .085, 2.));
  float flutes = pow(max(0., cos(angle * 24.)), 18.);
  float rays = flutes * smoothstep(.95, 1.015, radius)
    * (1. - smoothstep(1.025, 1.22, radius));
  float alpha = (outer * .58 + inner * .27 + haze * .12 + rays * .15)
    * mix(.42, .78, uNight);
  if (alpha < .002) discard;
  vec3 color = mix(vec3(1., .67, .24), vec3(1., .9, .63), outer);
  gl_FragColor = vec4(color, min(alpha, .62));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  const glow = new T.Mesh(
    new T.PlaneGeometry(AUREOLE.radius[0] * 2.6, AUREOLE.radius[1] * 2.6),
    material,
  );
  glow.name = "sacred-aureole-radiance";
  glow.position.set(
    AUREOLE.center[0],
    AUREOLE.center[1],
    AUREOLE.center[2] - 0.045,
  );
  glow.renderOrder = 3;
  parent.add(glow);
  return glow;
}
