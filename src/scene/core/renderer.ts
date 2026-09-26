import * as T from "three";
import { CONFIG, QUALITY } from "../config";
import type { QualityLevel } from "../types";
/** Preserve the reference's linear HDR target and one final ACES/sRGB output pass. */
export function createRenderer(canvas: HTMLCanvasElement) {
  let renderer: T.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    throw new Error(
      "此浏览器无法创建 WebGL 2 场景，请更新浏览器或检查硬件加速后重试。",
    );
  }
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  let shaderError = false;
  renderer.debug.onShaderError = () => {
    shaderError = true;
  };
  const rt = new T.WebGLRenderTarget(1, 1, {
    type: T.HalfFloatType,
  });
  rt.samples = 2;
  const postScene = new T.Scene(),
    postCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postU = {
    image: { value: rt.texture },
    resolution: { value: new T.Vector2() },
    bloom: { value: 1 },
  };
  const postMat = new T.ShaderMaterial({
    uniforms: postU,
    depthTest: false,
    depthWrite: false,
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `uniform sampler2D image;uniform vec2 resolution;uniform float bloom;varying vec2 vUv;void main(){vec3 c=texture2D(image,vUv).rgb;for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))/resolution;c+=max(texture2D(image,vUv+d*5.).rgb-.88,0.)*.027*bloom;c+=max(texture2D(image,vUv+d*13.).rgb-.90,0.)*.014*bloom;}c*=1.-.085*pow(length((vUv-.5)*vec2(1.,.8)),1.4);c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/350.;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  });
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
  const size = new T.Vector2();
  return {
    renderer,
    get resolution() {
      return `${size.x} × ${size.y}`;
    },
    resize(camera: T.PerspectiveCamera, quality: QualityLevel) {
      const rect = canvas.getBoundingClientRect(),
        w = Math.max(1, rect.width),
        h = Math.max(1, rect.height);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, QUALITY[quality].dpr),
      );
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.far = Math.max(150, 150 / camera.aspect);
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(size);
      rt.setSize(size.x, size.y);
      postU.resolution.value.copy(size);
      postU.bloom.value = QUALITY[quality].bloom;
    },
    render(scene: T.Scene, camera: T.Camera) {
      renderer.info.autoReset = false;
      renderer.info.reset();
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
      if (shaderError)
        throw new Error(
          "当前显卡未能编译场景着色器，请更新浏览器或检查硬件加速。",
        );
    },
    dispose() {
      rt.dispose();
      postMat.dispose();
      postScene.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    },
  };
}
