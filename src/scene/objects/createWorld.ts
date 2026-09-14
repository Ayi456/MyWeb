import type { SceneContext } from "../core/context";
import { createSky } from "./sky";
import { createIsland } from "./island";
import { createSakura } from "./sakura";
import { createPostOffice } from "./postOffice";
import { createDock } from "./dock";
import { createFlowers } from "./flowers";
import { createFurniture } from "./furniture";
import { createLanterns } from "./lanterns";
import { createAnimals } from "./animals";
import { createWater } from "./water";
import { createAirship } from "./airship";
import { createClouds } from "./clouds";
import { createWildlife } from "./wildlife";
import { createPetals } from "./petals";
import { createNightSky } from "./nightSky";

export function createWorld(ctx: SceneContext) {
  const sky = createSky(ctx);
  createIsland(ctx);
  const sakura = createSakura(ctx);
  createPostOffice(ctx);
  const dock = createDock(ctx);
  createFlowers(ctx);
  const furniture = createFurniture(ctx, sakura.tree);
  const lanterns = createLanterns(ctx);
  const animals = createAnimals(ctx, furniture.bench);
  createWater(ctx);
  const airship = createAirship(ctx);
  const clouds = createClouds(ctx);
  const wildlife = createWildlife(ctx);
  const petals = createPetals(ctx);
  const nightSky = createNightSky(ctx);
  return {
    ...sky,
    ...sakura,
    ...dock,
    ...furniture,
    ...lanterns,
    ...animals,
    ...airship,
    ...clouds,
    ...wildlife,
    ...petals,
    ...nightSky,
  };
}
export type WorldObjects = ReturnType<typeof createWorld>;
