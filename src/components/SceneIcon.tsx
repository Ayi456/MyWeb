const paths = {
  compass: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM16 8l-2 6-6 2 2-6 6-2Z",
  reset: "M4 10a8 8 0 1 1 1.5 7M4 4v6h6",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  ride: "m3 10 18-7-7 18-3-8-8-3Zm8 3L21 3",
  sound:
    "M9 18V5l11-2v13M9 8l11-2M9 18a3 2 0 1 1-3-2c1.7 0 3 .9 3 2Zm11-2a3 2 0 1 1-3-2c1.7 0 3 .9 3 2Z",
  frame: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  help: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01",
  wind: "M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M5 16h4a3 3 0 1 1-3 3",
  letter: "M3 5h18v14H3V5Zm0 1 9 7 9-7M3 19l6-6m12 6-6-6",
  spring:
    "M12 9c-5-9-11-2-5 2-9 2-5 11 2 6 0 9 9 7 8 0 8 3 11-6 3-7 5-6-3-12-6-4L12 9Zm0 3h.01",
  summer:
    "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  autumn: "M20 3C9 2 3 7 5 14s13 7 15-11ZM3 21 15 9m-8 8v-5m0 5h5",
  winter:
    "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3.5 10l4-1-1-4m11 14-1-4 4-1M6.5 19l1-4-4-1m17-4-4-1 1-4",
} as const;

export function SceneIcon({
  name,
  className = "scene-icon",
}: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
