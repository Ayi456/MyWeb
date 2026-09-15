import { useCallback, useEffect, useRef, useState } from "react";
import { SceneCanvas } from "./components/SceneCanvas";
import { SceneOverlay } from "./components/SceneOverlay";
import { TimeControls } from "./components/TimeControls";
import { ActionControls } from "./components/ActionControls";
import { LetterDialog } from "./components/LetterDialog";
import { HelpPanel } from "./components/HelpPanel";
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorFallback } from "./components/ErrorFallback";
import { CloudRadio } from "./components/CloudRadio";
import { useSceneController } from "./hooks/useSceneController";
import { isControl, useWindInput } from "./hooks/useWindInput";

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [attempt, setAttempt] = useState(0),
    [mailOpen, setMailOpen] = useState(false),
    [hidden, setHidden] = useState(false),
    [timeCollapsed, setTimeCollapsed] = useState(() => {
      try {
        return (
          localStorage.getItem("spring-post-office:time-collapsed") === "true"
        );
      } catch {
        return false;
      }
    }),
    [helpOpen, setHelpOpen] = useState(false),
    [notice, setNotice] = useState("");
  const openMail = useCallback(() => setMailOpen(true), []);
  const { controller, snapshot, error } = useSceneController(
    canvas,
    attempt,
    openMail,
  );
  const wind = useWindInput(
    controller,
    mailOpen || !snapshot?.ready || !!error,
  );
  const closeMail = useCallback(() => setMailOpen(false), []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "spring-post-office:time-collapsed",
        String(timeCollapsed),
      );
    } catch {
      // Keep the toggle usable when browser storage is unavailable.
    }
  }, [timeCollapsed]);
  useEffect(() => {
    controller.current?.setInteractionBlocked(mailOpen || helpOpen);
  }, [controller, mailOpen, helpOpen]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        mailOpen ||
        e.isComposing ||
        isControl(e.target) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (e.code === "KeyR") controller.current?.setCameraPreset("reset");
      if (e.code === "KeyH" && !e.repeat) {
        setHidden((v) => !v);
        setHelpOpen(false);
      }
      if (e.code === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [controller, mailOpen]);
  const toggleUI = () => {
    setHidden((v) => !v);
    setHelpOpen(false);
  };
  return (
    <>
      <SceneCanvas key={attempt} canvasRef={canvas} />
      <SceneOverlay
        snapshot={snapshot}
        hidden={hidden}
        onToggle={toggleUI}
        onReset={() => controller.current?.setCameraPreset("reset")}
        onCloseup={() => controller.current?.setCameraPreset("tree")}
        onHelp={() => setHelpOpen((v) => !v)}
        helpOpen={helpOpen}
      >
        {helpOpen && (
          <HelpPanel
            quality={snapshot?.quality ?? "auto"}
            onQuality={(mode) => controller.current?.setQuality(mode)}
            onClose={() => setHelpOpen(false)}
          />
        )}
        <footer className="bottom">
          <div className="notes">
            <div className="tiny">TODAY'S LITTLE JOURNEY</div>
            <p>{snapshot?.journey ?? "飞艇正在等一封信。"}</p>
            <p>
              {snapshot?.sentCount
                ? `已放飞 ${String(snapshot.sentCount).padStart(2, "0")} 封心意`
                : "春天，还很长。"}
            </p>
          </div>
          <TimeControls
            snapshot={snapshot}
            collapsed={timeCollapsed}
            onToggle={() => setTimeCollapsed((v) => !v)}
            onSpeed={(v) => controller.current?.setSpeed(v)}
            onHour={(v) => controller.current?.setTimeOfDay(v)}
          />
          <ActionControls
            onWrite={openMail}
            wind={wind}
            disabled={!snapshot?.ready || !!error}
          />
        </footer>
        <p className="mobile-journey">
          {snapshot?.journey}{" "}
          {snapshot?.sentCount ? `· 已放飞 ${snapshot.sentCount} 封` : ""}
        </p>
      </SceneOverlay>
      <CloudRadio
        hidden={hidden || !snapshot?.ready || !!error || mailOpen || helpOpen}
        night={(snapshot?.night ?? 0) > 0.63}
      />
      <div
        className={`hint ${notice ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
      {mailOpen && (
        <LetterDialog
          onClose={closeMail}
          paused={snapshot?.speed === 0}
          onSend={(message) => {
            const sent = controller.current?.sendLetter(message) ?? false;
            if (sent)
              setNotice(
                snapshot?.speed === 0
                  ? "心意已放上邮路，恢复播放后便会出发。"
                  : "你的心意，正乘着春风飞向飞艇。",
              );
            return sent;
          }}
        />
      )}
      {error ? (
        <ErrorFallback
          message={error}
          onRetry={() => {
            setMailOpen(false);
            setHelpOpen(false);
            setAttempt((v) => v + 1);
          }}
        />
      ) : (
        !snapshot?.ready && <LoadingScreen />
      )}
    </>
  );
}
