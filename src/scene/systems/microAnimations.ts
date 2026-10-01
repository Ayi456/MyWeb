import * as T from "three";
import type { SceneContext } from "../core/context";
import type { Bunny } from "../objects/bunny";

interface AnimatableElements {
  tree?: T.Group;
  postOffice?: {
    house: T.Group;
    bell?: T.Group;
    windowMesh?: T.Mesh;
  };
  swing?: T.Group;
  bunnies?: Bunny[];
}

/**
 * Subtle micro-animations that add life to static scene elements.
 * - Trees sway gently in the wind
 * - Window lights flicker naturally
 * - Bunnies breathe
 * - Bell sways when idle
 */
export function createMicroAnimations(
  ctx: SceneContext,
  elements: AnimatableElements,
) {
  const clock = new T.Clock();

  // Store initial scales for relative animations
  const bunnySeeds = new Map<Bunny, number>();
  elements.bunnies?.forEach((bunny, index) => {
    bunnySeeds.set(bunny, index * 1.3 + Math.random() * 0.5);
  });

  return {
    update() {
      const t = clock.getElapsedTime();

      // Tree sway - gentle wind motion
      if (elements.tree) {
        elements.tree.rotation.z = Math.sin(t * 0.3) * 0.008;
        elements.tree.rotation.x = Math.cos(t * 0.4) * 0.005;
      }

      // Window light flicker - very subtle, natural variation
      if (elements.postOffice?.windowMesh) {
        const material = elements.postOffice.windowMesh.material;
        if (material instanceof T.MeshStandardMaterial && material.emissive) {
          const flicker = 1 + Math.sin(t * 3 + Math.sin(t * 7)) * 0.02;
          material.emissiveIntensity = flicker * 0.8;
        }
      }

      // Bell gentle sway when idle
      if (elements.postOffice?.bell) {
        const bellSway = Math.sin(t * 0.8) * 0.015;
        elements.postOffice.bell.rotation.z = bellSway;
      }

      // Bunny breathing - subtle body scale
      elements.bunnies?.forEach((bunny) => {
        const seed = bunnySeeds.get(bunny) || 0;
        const breath = 1 + Math.sin(t * 2 + seed) * 0.012;
        bunny.g.scale.y = breath * (bunny.g.userData.baseScale || 1);

        // Store base scale on first run
        if (!bunny.g.userData.baseScale) {
          bunny.g.userData.baseScale = 1;
        }
      });

      // Swing gentle idle motion
      if (elements.swing) {
        const swingSway = Math.sin(t * 0.5) * 0.02;
        elements.swing.rotation.z = swingSway;
      }
    },
  };
}
