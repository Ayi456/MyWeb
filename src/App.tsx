import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Guide } from "./components/Guide";
import { nextGuideStep, type GuideStep } from "./components/guideState";
import { hotspotForKey } from "./components/hotspotKeys";
import { decodeReply, encodeReply } from "./scene/systems/postcards";
import {
  emptyCollection,
  loadCollection,
  readPreference,
  saveCollection,
  writePreference,
  type Collection,
} from "./persist/storage";
import {
  dailyLine,
  eventWeights,
  localDateKey,
  solarTerm,
} from "./content/calendar";
import { loadVisits, recordVisit, saveVisits } from "./persist/visits";
import {
  FESTIVAL_GREETING,
  festivalForDate,
  limitedStampForDate,
} from "./scene/systems/festival";
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
const GUIDE_KEY = "spring-post-office:guide-done";
const CLASSIC = new URLSearchParams(location.search).get("classic") === "1";
export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [attempt, setAttempt] = useState(0),
    [mailOpen, setMailOpen] = useState(false),
    [postcardsOpen, setPostcardsOpen] = useState(false),
    [hidden, setHidden] = useState(false),
    [timeCollapsed, setTimeCollapsed] = useState(() =>
      readPreference("time-collapsed", "spring-post-office:time-collapsed"),
    ),
    [helpOpen, setHelpOpen] = useState(false),
    [notices, setNotices] = useState<QueuedNotice[]>([]),
    [replies, setReplies] = useState<Reply[]>([]),
    [captions, setCaptions] = useState(() =>
      readPreference("captions", CAPTIONS_KEY),
    );
  const [collection, setCollection] = useState(loadCollection);
  const [visits, setVisits] = useState(loadVisits);
  const visitsRef = useRef(visits);
  const visitRecorded = useRef(false);
  const [today, setToday] = useState(() => new Date());
  const todayKey = localDateKey(today);
  const term = useMemo(() => solarTerm(today), [today]);
  const festival = useMemo(
    () => (CLASSIC ? null : festivalForDate(today)),
    [today],
  );
  const limitedStamp = useMemo(
    () => (CLASSIC ? null : limitedStampForDate(today)),
    [today],
  );
  const lineToday = term ? `${term.name} · ${term.line}` : dailyLine(today);
  const collectionRef = useRef(collection);
  const [oldReplies, setOldReplies] = useState<Reply[]>(() =>
    collection.replies.flatMap((entry) => {
      const reply = decodeReply(entry);
      return reply ? [reply] : [];
    }),
  );
  const updateCollection = useCallback(
    (change: (value: Collection) => Collection) => {
      const next = change(collectionRef.current);
      collectionRef.current = next;
      setCollection(next);
      saveCollection(next);
    },
    [],
  );
  const getInitial = useCallback(() => {
    const date = new Date();
    return {
      stamps: collectionRef.current.stamps,
      replies: collectionRef.current.replies,
      eventWeights: CLASSIC ? {} : eventWeights(date),
      festival: CLASSIC ? null : festivalForDate(date),
      limitedStamp: CLASSIC ? null : limitedStampForDate(date),
    };
  }, []);
  const soundPref = useRef(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [guideDone, setGuideDone] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [guideStep, setGuideStep] = useState<GuideStep | null>(null);
  const [treeTapped, setTreeTapped] = useState(false);
  const [guideSentBaseline, setGuideSentBaseline] = useState(0);
  const openMail = useCallback(() => setMailOpen(true), []);
  const { controller, snapshot, error } = useSceneController(
    canvas,
    attempt,
    openMail,
    getInitial,
  );
  const wind = useWindInput(
    controller,
    mailOpen || postcardsOpen || !snapshot?.ready || !!error,
  );
  const closeMail = useCallback(() => setMailOpen(false), []);
  useEffect(() => {
    if (visitRecorded.current) return;
    visitRecorded.current = true;
    const next = recordVisit(visitsRef.current, new Date());
    visitsRef.current = next;
    setVisits(next);
    saveVisits(next);
  }, []);
  useEffect(() => {
    const nextMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );
    const timer = setTimeout(
      () => setToday(new Date()),
      Math.max(1000, nextMidnight.getTime() - Date.now() + 50),
    );
    return () => clearTimeout(timer);
  }, [today]);
  useEffect(() => {
    writePreference("time-collapsed", timeCollapsed);
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
    if (!ready || guideDone || guideStep || hidden || blocked || error) return;
    const timer = setTimeout(() => {
      controller.current?.resetOrbitFlag();
      controller.current?.nudge("tree", 0.2);
      setGuideSentBaseline(0);
      setGuideStep("tree");
    }, 4000);
    return () => clearTimeout(timer);
  }, [ready, guideDone, guideStep, hidden, blocked, error, controller]);
  const finishGuide = useCallback(() => {
    setGuideStep(null);
    setGuideDone(true);
    try {
      localStorage.setItem(GUIDE_KEY, "true");
    } catch {
      // The guide still stays dismissed for this visit.
    }
  }, []);
  useEffect(() => {
    if (!guideStep) return;
    const next = nextGuideStep(guideStep, {
      treeTapped,
      orbited: snapshot?.orbited ?? false,
      sentCount: snapshot?.sentCount ?? 0,
      sentBaseline: guideSentBaseline,
    });
    if (next === guideStep) return;
    controller.current?.nudge("tree", 0.35, true);
    if (guideStep === "tree") controller.current?.resetOrbitFlag();
    if (next) setGuideStep(next);
    else finishGuide();
  }, [
    guideStep,
    treeTapped,
    snapshot?.orbited,
    snapshot?.sentCount,
    guideSentBaseline,
    controller,
    finishGuide,
  ]);
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
    writePreference("captions", captions);
  }, [captions, controller, snapshot?.ready]);
  // Taps replace each other; events, replies and stamps stack briefly.
  useEffect(() => {
    const scene = controller.current;
    if (!scene || !snapshot?.ready) return;
    return scene.onNotice((n) => {
      if (n.type === "tap" && n.id === "tree") setTreeTapped(true);
      if (n.type === "reply") {
        notify({
          kind: "keep",
          tone: "reply",
          text: n.text,
          action: "mailbox",
        });
        const reply = { text: n.text, season: n.season, at: Date.now() };
        setReplies((list) => [...list, reply]);
        const saved = encodeReply(reply);
        if (saved)
          updateCollection((current) => ({
            ...current,
            replies: [...current.replies, saved].slice(-40),
          }));
      } else if (n.type === "stamp") {
        notify({ kind: "keep", tone: "stamp", text: n.text });
        updateCollection((current) => ({
          ...current,
          stamps: current.stamps.includes(n.id)
            ? current.stamps
            : [...current.stamps, n.id],
        }));
      } else if (n.type === "sound")
        notify({ kind: "tap", tone: "sound", text: n.text });
      else notify({ kind: n.type === "tap" ? "tap" : "event", text: n.text });
    });
  }, [controller, snapshot?.ready, notify, updateCollection]);
  useEffect(() => {
    if (snapshot?.ready) controller.current?.visitDays(visits.days.length);
  }, [controller, snapshot?.ready, visits.days.length]);
  useEffect(() => {
    if (snapshot?.ready)
      controller.current?.setCalendarContext(festival, limitedStamp);
  }, [controller, snapshot?.ready, festival, limitedStamp]);
  const announcedTerm = useRef("");
  useEffect(() => {
    if (
      !snapshot?.ready ||
      CLASSIC ||
      announcedTerm.current === todayKey ||
      (!term && !festival)
    )
      return;
    announcedTerm.current = todayKey;
    notify({
      kind: "event",
      text: festival
        ? FESTIVAL_GREETING[festival]
        : `今天是${term!.name}。${term!.line}`,
    });
  }, [snapshot?.ready, todayKey, term, festival, notify]);
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
      soundPref.current = readPreference("sound", SOUND_KEY);
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
      writePreference("sound", on);
      try {
        localStorage.setItem(SOUND_ASKED_KEY, "true");
      } catch {
        // Keep the toggle usable without storage.
      }
      soundPref.current = on;
    },
    [controller],
  );
  useEffect(() => {
    const element = canvas.current;
    if (!element || !ready || guideStep) return;
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
  }, [attempt, ready, guideStep, notify]);
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
            onRestartGuide={() => {
              setTreeTapped(false);
              setGuideSentBaseline(snapshot?.sentCount ?? 0);
              controller.current?.resetOrbitFlag();
              controller.current?.nudge("tree", 0.2);
              setGuideDone(false);
              setGuideStep("tree");
              setHelpOpen(false);
            }}
            onPoke={(id) => controller.current?.poke(id)}
            onClose={() => setHelpOpen(false)}
          />
        )}
        <footer className="bottom">
          <div className="notes">
            <div className="tiny">TODAY'S LITTLE JOURNEY</div>
            <p>{snapshot?.journey ?? "飞艇正在等一封信。"}</p>
            {!CLASSIC && (
              <p className="almanac-line">
                {today.getMonth() + 1} 月 {today.getDate()} 日 · {lineToday}
              </p>
            )}
            {!CLASSIC && visits.count > 1 && (
              <p className="returning-line">
                欢迎回来，这是你第 {visits.count} 次来到邮局。
              </p>
            )}
            <p>
              {snapshot?.sentCount || collection.totalSent
                ? `本次已放飞 ${String(snapshot?.sentCount ?? 0).padStart(2, "0")} 封 · 累计 ${collection.totalSent} 封${
                    snapshot?.repliesWaiting
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
          {snapshot?.sentCount || collection.totalSent
            ? `· 本次 ${snapshot?.sentCount ?? 0} 封 · 累计 ${collection.totalSent} 封`
            : ""}
          {!CLASSIC && (
            <>
              <br />
              <span>
                {today.getMonth() + 1} 月 {today.getDate()} 日 · {lineToday}
              </span>
            </>
          )}
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
      {guideStep && !hidden && !blocked && !error && (
        <Guide step={guideStep} onSkip={finishGuide} onWrite={openMail} />
      )}
      {mailOpen && (
        <LetterDialog
          onClose={closeMail}
          paused={snapshot?.speed === 0}
          onSend={(message) => {
            const sent = controller.current?.sendLetter(message) ?? false;
            if (sent) {
              updateCollection((current) => ({
                ...current,
                totalSent: Math.min(10_000_000, current.totalSent + 1),
              }));
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
            }
            return sent;
          }}
        />
      )}
      {postcardsOpen && (
        <PostcardPanel
          replies={replies}
          oldReplies={oldReplies}
          stamps={snapshot?.stamps ?? []}
          totalSent={collection.totalSent}
          onClear={() => {
            controller.current?.clearCollection();
            setReplies([]);
            setOldReplies([]);
            updateCollection(() => emptyCollection());
          }}
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
