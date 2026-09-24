export function realLocalHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function realSeasonYear(date = new Date()) {
  return Math.floor(((date.getMonth() + 10) % 12) / 3) + 0.08;
}

/** A share link chooses one stable scene; it never silently enables live time. */
export function sceneFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const classic = params.get("classic") === "1";
  const hourText = params.get("hour");
  const seasonText = params.get("season");
  const hour = hourText === null ? null : Number(hourText);
  const season = seasonText === null ? null : Number(seasonText);
  return {
    classic,
    hour:
      !classic &&
      hourText !== null &&
      /^(?:\d{1,2})(?:\.\d+)?$/.test(hourText) &&
      Number.isFinite(hour) &&
      hour! >= 0 &&
      hour! < 24
        ? hour
        : null,
    year:
      !classic &&
      seasonText !== null &&
      /^[0-3]$/.test(seasonText) &&
      Number.isInteger(season)
        ? season! + 0.08
        : null,
  };
}
