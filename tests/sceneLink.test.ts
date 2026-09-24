import { expect, it } from "vitest";
import { buildSceneLink, parseSceneLink } from "../src/content/sceneLink";
import type { SceneSnapshot } from "../src/scene/types";

it("parses only allowed scene values", () => {
  expect(
    parseSceneLink("?hour=6.5&season=2&preset=tree&event=whale"),
  ).toMatchObject({
    hour: 6.5,
    year: 2.08,
    cameraPreset: "tree",
    event: "whale",
    cameraView: null,
  });
  expect(
    parseSceneLink(
      "?hour=Infinity&season=9&preset=evil&event=unknown&cam=1,2,3,4,5,6",
    ),
  ).toMatchObject({
    hour: null,
    year: null,
    cameraPreset: null,
    event: null,
    cameraView: null,
  });
  expect(parseSceneLink("?cam=0.5,0.36,25,0.55,1.55,0").cameraView).toEqual({
    azimuth: 0.5,
    elevation: 0.36,
    distance: 25,
    focus: [0.55, 1.55, 0],
  });
  expect(
    parseSceneLink("?classic=1&preset=tree&event=whale&cam=0.5,0.36,25,0,0,0"),
  ).toMatchObject({
    cameraPreset: null,
    cameraView: null,
    event: null,
  });
});

it("builds an allowlisted link without carrying existing query or user text", () => {
  const snapshot = {
    hour: 23.125,
    season: "autumn",
    cameraPreset: null,
    cameraView: {
      azimuth: 0.53,
      elevation: 0.36,
      distance: 25,
      focus: [0.55, 1.55, 0],
    },
    event: "shootingStar",
  } as SceneSnapshot;
  const link = buildSceneLink(
    "https://example.test/?message=secret&debug=1#private",
    snapshot,
  );
  expect(link).toBe(
    "https://example.test/?hour=23.13&season=2&cam=0.53%2C0.36%2C25%2C0.55%2C1.55%2C0&event=shootingStar",
  );
  expect(parseSceneLink(new URL(link).search)).toMatchObject({
    hour: 23.13,
    year: 2.08,
    event: "shootingStar",
  });
});
