import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { SceneController } from "../scene/types";

export function isControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      "input,textarea,select,button,[contenteditable=true],[role=dialog]",
    )
  );
}
export function useWindInput(
  controller: RefObject<SceneController | null>,
  blocked: boolean,
) {
  const sources = useRef({ keyboard: false, pointer: false, latched: false });
  const [active, setActive] = useState(false);
  const update = useCallback(() => {
    const s = sources.current,
      value = s.keyboard || s.pointer || s.latched;
    setActive(value);
    controller.current?.setWind(value);
  }, [controller]);
  const reset = useCallback(() => {
    sources.current = { keyboard: false, pointer: false, latched: false };
    update();
  }, [update]);
  useEffect(() => {
    if (blocked) reset();
    const abort = new AbortController(),
      options = { signal: abort.signal };
    window.addEventListener(
      "keydown",
      (e) => {
        if (blocked || e.isComposing || isControl(e.target)) return;
        if (e.code === "Space") {
          e.preventDefault();
          sources.current.keyboard = true;
          update();
        }
      },
      options,
    );
    window.addEventListener(
      "keyup",
      (e) => {
        if (e.code === "Space") {
          sources.current.keyboard = false;
          update();
        }
      },
      options,
    );
    window.addEventListener("blur", reset, options);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) reset();
      },
      options,
    );
    return () => {
      abort.abort();
      reset();
    };
  }, [blocked, reset, update]);
  return {
    active,
    reset,
    pointer(value: boolean) {
      sources.current.pointer = value;
      update();
    },
    key(value: boolean) {
      sources.current.keyboard = value;
      update();
    },
    toggle() {
      sources.current.latched = !sources.current.latched;
      update();
    },
  };
}
