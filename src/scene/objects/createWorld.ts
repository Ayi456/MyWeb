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
import { createArchipelago } from "./archipelago";
import { createRainbow } from "./rainbow";
import { createFarIslands } from "./farIslands";
import { createVisitors } from "./visitors";
import { createFestive } from "./festive";
import { createAurora } from "./aurora";
import { createGramophone } from "./gramophone";

export function createWorld(ctx: SceneContext) {
  const sky = createSky(ctx);
  createIsland(ctx);
  const sakura = createSakura(ctx);
  const office = createPostOffice(ctx);
  const dock = createDock(ctx);
  createFlowers(ctx);
  const furniture = createFurniture(ctx, sakura.tree);
  const lanterns = createLanterns(ctx);
  const animals = createAnimals(ctx, furniture.bench);
  const water = createWater(ctx);
  const airship = createAirship(ctx);
  const clouds = createClouds(ctx);
  const wildlife = createWildlife(ctx);
  const petals = createPetals(ctx);
  const nightSky = createNightSky(ctx);
  const archipelago = createArchipelago(ctx);
  const rainbow = createRainbow(ctx);
  const farIslands = createFarIslands(ctx);
  const visitors = createVisitors(ctx);
  const festive = createFestive(ctx);
  const aurora = createAurora(ctx);
  const gramophone = createGramophone(ctx, archipelago.gardenIsland);
  return {
    ...sky,
    ...sakura,
    ...office,
    ...dock,
    ...furniture,
    ...lanterns,
    ...animals,
    ...water,
    ...airship,
    ...clouds,
    ...wildlife,
    ...petals,
    ...nightSky,
    ...archipelago,
    ...rainbow,
    ...farIslands,
    ...visitors,
    ...festive,
    ...aurora,
    ...gramophone,
  };
}
export type WorldObjects = ReturnType<typeof createWorld>;
