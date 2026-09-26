import { expect, test } from "@playwright/test";

test("sky covers distant reverse views and portrait zoom without black holes", async ({
  page,
}) => {
  await page.goto("/tests/browser.html?mode=visual&hour=19.5");
  const coverage = await page.evaluate(async () => {
    // @ts-expect-error Vite resolves the browser-only module imports.
    const { THREE: T } = await import("/tests/browser.ts");
    // @ts-expect-error Vite resolves the browser-only module imports.
    const { createContext } = await import("/src/scene/core/context.ts");
    // @ts-expect-error Vite resolves the browser-only module imports.
    const { createSky } = await import("/src/scene/objects/sky.ts");
    const ctx = createContext();
    createSky(ctx);
    const renderer = new T.WebGLRenderer();
    renderer.setSize(160, 100);
    const camera = new T.PerspectiveCamera(37, 1.6, 0.1, 150);
    const pixels = new Uint8Array(160 * 100 * 4);
    const gl = renderer.getContext();
    const results = [];
    for (const [x, y, z, aspect, far, targetZ] of [
      [0.55, 15.29, -64, 1.6, 150, 0],
      [-85, 40, -85, 1.6, 150, 0],
      [30, 55, 180, 0.46, 326, 0],
      [0, 0, 0, 1.6, 50, 0],
      [0, 0, 180, 1.6, 150, 300],
    ]) {
      camera.position.set(x, y, z);
      camera.aspect = aspect;
      camera.far = far;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 1.55, targetZ);
      renderer.render(ctx.scene, camera);
      gl.readPixels(0, 0, 160, 100, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let black = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) < 5) black++;
      results.push(black);
    }
    ctx.scene.traverse((object: import("three").Object3D) => {
      if (object instanceof T.Mesh) {
        const mesh = object as import("three").Mesh<
          import("three").BufferGeometry,
          import("three").Material
        >;
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  expect(coverage).toEqual([0, 0, 0, 0, 0]);
});
