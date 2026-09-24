import { useEffect, useRef, useState, type RefObject } from "react";
import type {
  SceneController,
  SceneOptions,
  SceneSnapshot,
} from "../scene/types";

export function useSceneController(
  canvas: RefObject<HTMLCanvasElement | null>,
  attempt: number,
  onMailbox: () => void,
  getInitial?: () => SceneOptions["initial"],
) {
  const controller = useRef<SceneController | null>(null);
  const [snapshot, setSnapshot] = useState<SceneSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false,
      unsubscribe: (() => void) | undefined;
    let owned: SceneController | undefined;
    setError(null);
    setSnapshot(null);
    // Paint the lightweight shell before downloading and constructing the 3D scene.
    const frame = requestAnimationFrame(() => {
      void import("../scene/createScene")
        .then(({ createScene }) => {
          if (cancelled || !canvas.current) return;
          owned = createScene(canvas.current, {
            onMailbox,
            initial: getInitial?.(),
            onError: (message) => {
              if (!cancelled) setError(message);
            },
          });
          if (cancelled) {
            owned.dispose();
            return;
          }
          controller.current = owned;
          unsubscribe = owned.subscribe(setSnapshot);
        })
        .catch((reason) => {
          if (!cancelled)
            setError(
              reason instanceof Error
                ? reason.message
                : "场景加载失败，请重试。",
            );
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      unsubscribe?.();
      owned?.dispose();
      if (controller.current === owned) controller.current = null;
    };
  }, [canvas, attempt, onMailbox, getInitial]);
  return { controller, snapshot, error };
}
