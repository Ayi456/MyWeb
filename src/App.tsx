import { useCallback, useEffect, useRef, useState } from "react";
import { SceneCanvas } from "./components/SceneCanvas";
import { SceneOverlay } from "./components/SceneOverlay";
import { TimeControls } from "./components/TimeControls";
import { SeasonControls } from "./components/SeasonControls";
import { ActionControls } from "./components/ActionControls";
import { LetterDialog } from "./components/LetterDialog";
import { HelpPanel } from "./components/HelpPanel";
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorFallback } from "./components/ErrorFallback";
import { CloudRadio } from "./components/CloudRadio";
import { PostcardPanel, type Reply } from "./components/PostcardPanel";
import { NoticeStack } from "./components/NoticeStack";
import { hotspotForKey } from "./components/hotspotKeys";
import {
  pruneNotices,
  pushNotice,
  type QueuedNotice,
} from "./components/noticeQueue";
import { useSceneController } from "./hooks/useSceneController";
import { isControl, useWindInput } from "./hooks/useWindInput";

const SOUND_KEY = "spring-post-office:sound";
const SOUND_ASKED_KEY = "spring-post-office:sound-asked";
const CAPTIONS_KEY = "spring-post-office:captions";
export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [attempt, setAttempt] = useState(0),
    [mailOpen, setMailOpen] = useState(false),
    [postcardsOpen, setPostcardsOpen] = useState(false),
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
    [notices, setNotices] = useState<QueuedNotice[]>([]),
    [replies, setReplies] = useState<Reply[]>([]),
    [captions, setCaptions] = useState(() => {
      try {
        return localStorage.getItem(CAPTIONS_KEY) === "true";
      } catch {
        return false;
      }
    });
  const soundPref = useRef(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const openMail = useCallback(() => setMailOpen(true), []);
  const { controller, snapshot, error } = useSceneController(
    canvas,
    attempt,
    openMail,
  );
  const wind = useWindInput(
    controller,
    mailOpen || postcardsOpen || !snapshot?.ready || !!error,
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
  // Keep the loader mounted through its 0.7 s fade while the camera glides in,
  // and stagger the chrome in only during that window so H toggles stay instant.
  const ready = !!snapshot?.ready;
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!ready) {
      setLoaderGone(false);
      setSettled(false);
      return;
    }
    const gone = setTimeout(() => setLoaderGone(true), 700),
      done = setTimeout(() => setSettled(true), 1700);
    return () => {
      clearTimeout(gone);
      clearTimeout(done);
    };
  }, [ready]);
  const blocked = mailOpen || helpOpen || postcardsOpen;
  useEffect(() => {
    controller.current?.setInteractionBlocked(blocked);
  }, [controller, blocked, snapshot?.ready]);
  const notify = useCallback(
    (notice: Parameters<typeof pushNotice>[1]) =>
      setNotices((list) => pushNotice(list, notice, Date.now())),
    [],
  );
  useEffect(() => {
    controller.current?.setCaptions(captions);
    try {
      localStorage.setItem(CAPTIONS_KEY, String(captions));
    } catch {
      // Keep captions usable without storage.
    }
  }, [captions, controller, snapshot?.ready]);
  // Taps replace each other; events, replies and stamps stack briefly.
  useEffect(() => {
    const scene = controller.current;
    if (!scene || !snapshot?.ready) return;
    return scene.onNotice((n) => {
      if (n.type === "reply") {
        notify({
          kind: "keep",
          tone: "reply",
          text: n.text,
          action: "mailbox",
        });
        setReplies((list) => [
          ...list,
          { text: n.text, season: n.season, at: Date.now() },
        ]);
      } else if (n.type === "stamp")
        notify({ kind: "keep", tone: "stamp", text: n.text });
      else if (n.type === "sound")
        notify({ kind: "tap", tone: "sound", text: n.text });
      else notify({ kind: n.type === "tap" ? "tap" : "event", text: n.text });
    });
  }, [controller, snapshot?.ready, notify]);
  useEffect(() => {
    if (!notices.length) return;
    const next = Math.min(...notices.map((n) => n.until)) - Date.now();
    const timeout = setTimeout(
      () => setNotices((list) => pruneNotices(list, Date.now())),
      Math.max(0, next) + 20,
    );
    return () => clearTimeout(timeout);
  }, [notices]);
  // Sound needs a user gesture; remember the preference and re-arm on the first click.
  useEffect(() => {
    try {
      soundPref.current = localStorage.getItem(SOUND_KEY) === "true";
    } catch {
      soundPref.current = false;
    }
    if (!soundPref.current) return;
    const arm = () => controller.current?.setSound(true);
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [controller, attempt]);
  const setSound = useCallback(
    (on: boolean) => {
      controller.current?.setSound(on);
      try {
        localStorage.setItem(SOUND_KEY, String(on));
        localStorage.setItem(SOUND_ASKED_KEY, "true");
      } catch {
        // Preference simply does not persist.
      }
      soundPref.current = on;
    },
    [controller],
  );
  useEffect(() => {
    const element = canvas.current;
    if (!element || !ready) return;
    const invite = () => {
      let asked = false;
      try {
        asked = localStorage.getItem(SOUND_ASKED_KEY) === "true";
      } catch {
        // The invitation still appears once in this mounted session.
      }
      if (asked || soundPref.current) return;
      try {
        localStorage.setItem(SOUND_ASKED_KEY, "true");
      } catch {
        // The once listener still prevents repeated prompts this visit.
      }
      notify({
        kind: "keep",
        text: "这座岛有风声和虫鸣，要打开吗？",
        action: "sound",
      });
    };
    element.addEventListener("pointerdown", invite, { once: true });
    return () => element.removeEventListener("pointerdown", invite);
  }, [attempt, ready, notify]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        mailOpen ||
        postcardsOpen ||
        e.isComposing ||
        isControl(e.target) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (e.code === "KeyR") controller.current?.setCameraPreset("reset");
      if (e.code === "KeyF" && !e.repeat)
        controller.current?.setCameraPreset(
          snapshot?.riding ? "reset" : "ride",
        );
      if (e.code === "KeyH" && !e.repeat) {
        setHidden((v) => !v);
        setHelpOpen(false);
      }
      if (e.code === "KeyM" && !e.repeat) setSound(!(snapshot?.sound ?? false));
      if (e.code === "Escape") setHelpOpen(false);
      const hotspot = hotspotForKey(e.code);
      if (hotspot && !e.repeat) controller.current?.poke(hotspot);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    controller,
    mailOpen,
    postcardsOpen,
    snapshot?.riding,
    snapshot?.sound,
    setSound,
  ]);
  const toggleUI = () => {
    setHidden((v) => !v);
    setHelpOpen(false);
  };
  const ride = () =>
    controller.current?.setCameraPreset(snapshot?.riding ? "reset" : "ride");
  return (
    <>
      <SceneCanvas key={attempt} canvasRef={canvas} />
      <SceneOverlay
        snapshot={snapshot}
        hidden={hidden}
        arriving={ready && !settled}
        onToggle={toggleUI}
        onReset={() => controller.current?.setCameraPreset("reset")}
        onCloseup={() => controller.current?.setCameraPreset("tree")}
        onRide={ride}
        onSound={() => setSound(!(snapshot?.sound ?? false))}
        onHelp={() => setHelpOpen((v) => !v)}
        onPostcards={() => setPostcardsOpen(true)}
        helpOpen={helpOpen}
        replyCount={replies.length}
      >
        {helpOpen && (
          <HelpPanel
            quality={snapshot?.quality ?? "auto"}
            onQuality={(mode) => controller.current?.setQuality(mode)}
            sound={snapshot?.sound ?? false}
            onSound={setSound}
            captions={captions}
            onCaptions={setCaptions}
            onPoke={(id) => controller.current?.poke(id)}
            onClose={() => setHelpOpen(false)}
          />
        )}
        <footer className="bottom">
          <div className="notes">
            <div className="tiny">TODAY'S LITTLE JOURNEY</div>
            <p>{snapshot?.journey ?? "飞艇正在等一封信。"}</p>
            <p>
              {snapshot?.sentCount
                ? `已放飞 ${String(snapshot.sentCount).padStart(2, "0")} 封心意${
                    snapshot.repliesWaiting
                      ? ` · ${snapshot.repliesWaiting} 封回信在路上`
                      : ""
                  }`
                : "春天，还很长。"}
            </p>
          </div>
          <div className="time-stack">
            <SeasonControls
              snapshot={snapshot}
              onSeason={(i) => controller.current?.setSeason(i)}
            />
            <TimeControls
              snapshot={snapshot}
              collapsed={timeCollapsed}
              onToggle={() => setTimeCollapsed((v) => !v)}
              onSpeed={(v) => controller.current?.setSpeed(v)}
              onHour={(v) => controller.current?.setTimeOfDay(v)}
            />
          </div>
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
        hidden={hidden || !snapshot?.ready || !!error || blocked}
        night={(snapshot?.night ?? 0) > 0.63}
        onCaption={
          captions
            ? (text) => notify({ kind: "tap", tone: "sound", text })
            : undefined
        }
      />
      <NoticeStack
        notices={notices}
        onAction={(action) => {
          if (action === "mailbox") setPostcardsOpen(true);
          else if (action === "sound") setSound(true);
          else controller.current?.setCameraPreset("ride");
        }}
      />
      {mailOpen && (
        <LetterDialog
          onClose={closeMail}
          paused={snapshot?.speed === 0}
          onSend={(message) => {
            const sent = controller.current?.sendLetter(message) ?? false;
            if (sent)
              notify(
                snapshot?.speed === 0
                  ? {
                      kind: "event",
                      text: "心意已放上邮路，恢复播放后便会出发。",
                    }
                  : {
                      kind: "event",
                      text: "你的心意，正乘着春风飞向飞艇。",
                      action: "ride",
                    },
              );
            return sent;
          }}
        />
      )}
      {postcardsOpen && (
        <PostcardPanel
          replies={replies}
          stamps={snapshot?.stamps ?? []}
          onClose={() => setPostcardsOpen(false)}
        />
      )}
      {error ? (
        <ErrorFallback
          message={error}
          onRetry={() => {
            setMailOpen(false);
            setHelpOpen(false);
            setPostcardsOpen(false);
            setAttempt((v) => v + 1);
          }}
        />
      ) : (
        !loaderGone && <LoadingScreen done={!!snapshot?.ready} />
      )}
    </>
  );
}
