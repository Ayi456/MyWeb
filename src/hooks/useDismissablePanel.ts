import { useEffect, type RefObject } from "react";

/** Dismiss a floating panel without taking focus from an outside pointer target. */
export function useDismissablePanel(
  panel: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  trigger?: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target)
      )
        onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || document.querySelector("dialog[open]"))
        return;
      onClose();
      if (panel.current?.contains(document.activeElement))
        trigger?.current?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel, open, onClose, trigger]);
}
