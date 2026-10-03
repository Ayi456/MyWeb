import { useEffect, useRef, type PointerEvent } from "react";

/** Update only the card's paint, at most once per frame, without React renders. */
export function usePaperLight(enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const position = useRef({ x: 28, y: 16 });
  const reset = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    ref.current?.style.removeProperty("--paper-light-x");
    ref.current?.style.removeProperty("--paper-light-y");
  };
  useEffect(() => {
    // Capture the mounted node so cleanup also works when the ref detaches.
    const node = ref.current;
    if (!enabled) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      node?.style.removeProperty("--paper-light-x");
      node?.style.removeProperty("--paper-light-y");
    }
    return () => cancelAnimationFrame(frame.current);
  }, [enabled]);
  return {
    ref,
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (
        !enabled ||
        event.pointerType !== "mouse" ||
        !matchMedia("(hover: hover) and (pointer: fine)").matches
      )
        return;
      const rect = event.currentTarget.getBoundingClientRect();
      position.current = {
        x:
          20 +
          Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) *
            60,
        y:
          10 +
          Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) *
            70,
      };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        ref.current?.style.setProperty(
          "--paper-light-x",
          `${position.current.x}%`,
        );
        ref.current?.style.setProperty(
          "--paper-light-y",
          `${position.current.y}%`,
        );
      });
    },
    onPointerLeave: reset,
    onPointerCancel: reset,
  };
}
