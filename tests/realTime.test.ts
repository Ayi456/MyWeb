import { expect, it } from "vitest";
import {
  realLocalHour,
  realSeasonYear,
  sceneFromSearch,
} from "../src/content/realTime";
import { SeasonClock } from "../src/scene/systems/season";

it("maps local months to four held seasons", () => {
  expect(
    [0, 1, 2, 4, 5, 7, 8, 10, 11].map((month) =>
      Math.floor(realSeasonYear(new Date(2026, month, 1))),
    ),
  ).toEqual([3, 3, 0, 0, 1, 1, 2, 2, 3]);
  expect(realLocalHour(new Date(2026, 8, 24, 21, 30, 45))).toBeCloseTo(21.5125);
  const season = new SeasonClock();
  season.setYear(realSeasonYear(new Date(2026, 8, 24)));
  season.hold = true;
  season.advance(10000);
  expect(season.name).toBe("autumn");
  expect(season.year).toBe(2.08);
  season.hold = false;
  season.advance(1);
  expect(season.year).toBeGreaterThan(2.08);
});

it("accepts bounded share parameters and keeps classic at its reference view", () => {
  expect(sceneFromSearch("?hour=6.5&season=2")).toEqual({
    classic: false,
    hour: 6.5,
    year: 2.08,
  });
  expect(sceneFromSearch("?hour=NaN&season=9")).toEqual({
    classic: false,
    hour: null,
    year: null,
  });
  expect(sceneFromSearch("?hour=24&season=-1").hour).toBeNull();
  expect(sceneFromSearch("?hour=0x10&season=02").hour).toBeNull();
  expect(sceneFromSearch("?classic=1&hour=6.5&season=2")).toEqual({
    classic: true,
    hour: null,
    year: null,
  });
});
