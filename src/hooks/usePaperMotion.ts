import { useEffect, useState } from "react";

/** Decorative paper effects follow the world's pause and quality settings. */
export function usePaperMotion(ready: boolean, paused: boolean, low: boolean) {
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  if (reduced || low) return "still";
  return ready && visible && !paused ? "running" : "paused";
}
