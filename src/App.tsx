import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SceneCanvas } from "./components/SceneCanvas";
import { SceneOverlay } from "./components/SceneOverlay";
import { TimeControls } from "./components/TimeControls";
import { SeasonControls } from "./components/SeasonControls";
import { ActionControls } from "./components/ActionControls";
import { LetterDialog } from "./components/LetterDialog";
import { HelpPanel } from "./components/HelpPanel";
import { TreasureHunt } from "./components/TreasureHunt";
import { WalkControls } from "./components/WalkControls";
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorFallback } from "./components/ErrorFallback";
import { CloudRadio, type RadioControl } from "./components/CloudRadio";
import { PostcardPanel, type Reply } from "./components/PostcardPanel";
import { PhotoDialog } from "./components/PhotoDialog";
import { NoticeStack } from "./components/NoticeStack";
import { Guide } from "./components/Guide";
import { nextGuideStep, type GuideStep } from "./components/guideState";
import { hotspotForKey } from "./components/hotspotKeys";
import { STAMPS, decodeReply, encodeReply } from "./scene/systems/postcards";
import { composePostcard, shareOrDownloadPostcard } from "./share/postcard";
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
import { loadTreasure, saveTreasure } from "./persist/treasure";
import {
  emptyTreasure,
  findTreasure,
  treasureRoute,
  TREASURE_STOPS,
  validateTreasure,
  type TreasureProgress,
} from "./content/treasure";
import { buildSceneLink, parseSceneLink } from "./content/sceneLink";
import { moonPhase } from "./content/moon";
import { letterPrompt } from "./scene/systems/script";
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
const SCENE_LINK = parseSceneLink(location.search);
const CLASSIC = SCENE_LINK.classic;
export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const radioControl = useRef<RadioControl>(null);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0),
    [mailOpen, setMailOpen] = useState(false),
    [postcardsOpen, setPostcardsOpen] = useState(false),
    [photoOpen, setPhotoOpen] = useState(false),
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
  const [lastLetter, setLastLetter] = useState("");
  const [visits, setVisits] = useState(loadVisits);
  const visitsRef = useRef(visits);
  const visitRecorded = useRef(false);
  const [today, setToday] = useState(() => new Date());
  const [treasure, setTreasure] = useState(() => loadTreasure());
  const treasureRef = useRef(treasure);
  const updateTreasure = useCallback((next: TreasureProgress) => {
    const current = treasureRef.current;
    if (
      current.week === next.week &&
      current.started === next.started &&
      current.found === next.found
    )
      return;
    treasureRef.current = next;
    setTreasure(next);
    saveTreasure(next);
  }, []);
  const weeklyTreasure = useMemo(
    () => validateTreasure(treasure, today),
    [treasure, today],
  );
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
    const linked =
      SCENE_LINK.hour !== null ||
      SCENE_LINK.year !== null ||
      SCENE_LINK.cameraPreset !== null ||
      SCENE_LINK.cameraView !== null ||
      SCENE_LINK.walkView !== null ||
      SCENE_LINK.event !== null;
    return {
      stamps: collectionRef.current.stamps,
      replies: collectionRef.current.replies,
      eventWeights: CLASSIC ? {} : eventWeights(date),
      festival: CLASSIC ? null : festivalForDate(date),
      limitedStamp: CLASSIC ? null : limitedStampForDate(date),
      moonPhase: CLASSIC
        ? 0.5
        : moonPhase(date, festivalForDate(date) === "midAutumn"),
      realTime: !CLASSIC && !linked && readPreference("real-time"),
      hour: SCENE_LINK.hour ?? undefined,
      year: SCENE_LINK.year ?? undefined,
      cameraPreset: SCENE_LINK.cameraPreset ?? undefined,
      cameraView: SCENE_LINK.cameraView ?? undefined,
      walkView: SCENE_LINK.walkView ?? undefined,
      event: SCENE_LINK.event ?? undefined,
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
  useEffect(() => {
    updateTreasure(validateTreasure(treasureRef.current, today));
  }, [today, updateTreasure]);
  useEffect(() => {
    const refreshDate = () => {
      if (document.hidden) return;
      const date = new Date();
      if (localDateKey(date) !== todayKey) setToday(date);
    };
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => {
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, [todayKey]);
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
  const blocked = mailOpen || helpOpen || postcardsOpen || photoOpen;
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
  const setRealTime = useCallback(
    (on: boolean) => {
      if (CLASSIC) return;
      controller.current?.setRealTime(on);
      writePreference("real-time", on);
      if (on) {
        const hour = new Date().getHours();
        notify({
          kind: "event",
          text:
            hour >= 20 || hour < 5
              ? "已跟随现实。此刻是星夜，可以拖动时间滑块回到白天。"
              : "已跟随现实，岛上的时辰与季节会随你所在的时间变化。",
        });
      }
    },
    [controller, notify],
  );
  const stopRealTime = useCallback(() => {
    if (!snapshot?.realTime) return;
    writePreference("real-time", false);
    notify({ kind: "event", text: "已退出跟随现实，岛上的时间继续自然流动。" });
  }, [snapshot?.realTime, notify]);
  useEffect(() => {
    controller.current?.setCaptions(captions);
    writePreference("captions", captions);
  }, [captions, controller, snapshot?.ready]);
  // Taps replace each other; events, replies and stamps stack briefly.
  useEffect(() => {
    const scene = controller.current;
    if (!scene || !snapshot?.ready) return;
    return scene.onNotice((n) => {
      if (n.type === "tap" && n.id === "gramophone") {
        setHelpOpen(false);
        setHidden(false);
        radioControl.current?.toggleFromIsland();
      }
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
      if (n.type === "tap") {
        const date = new Date();
        setToday((currentDate) =>
          localDateKey(currentDate) === localDateKey(date) ? currentDate : date,
        );
        const current = validateTreasure(treasureRef.current, date);
        const next = findTreasure(current, n.id, date);
        updateTreasure(next);
        if (next.found > current.found) {
          const clue = treasureRoute(date)[next.found];
          notify({
            kind: "event",
            text: clue
              ? `找到第 ${next.found} 处。下一张线索：${clue.clue}`
              : "本周群岛线索已找齐，下周一再来走一条新邮路。",
          });
        }
      }
    });
  }, [controller, snapshot?.ready, notify, updateCollection, updateTreasure]);
  useEffect(() => {
    if (
      snapshot?.ready &&
      weeklyTreasure.started &&
      weeklyTreasure.found === TREASURE_STOPS.length
    )
      controller.current?.completeTreasure();
  }, [controller, snapshot?.ready, weeklyTreasure]);
  useEffect(() => {
    if (snapshot?.ready) controller.current?.visitDays(visits.days.length);
  }, [controller, snapshot?.ready, visits.days.length]);
  useEffect(() => {
    if (snapshot?.ready) controller.current?.setRadioPlaying(radioPlaying);
  }, [controller, snapshot?.ready, radioPlaying]);
  useEffect(() => {
    if (snapshot?.ready)
      controller.current?.setCalendarContext(
        festival,
        limitedStamp,
        CLASSIC ? 0.5 : moonPhase(today, festival === "midAutumn"),
      );
  }, [controller, snapshot?.ready, festival, limitedStamp, today]);
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
      if (e.code === "Escape" && !mailOpen && !postcardsOpen) {
        setHelpOpen(false);
        return;
      }
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
  const copyMoment = async () => {
    if (!snapshot?.ready) return;
    const url = buildSceneLink(location.href, snapshot);
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(url);
      else {
        const field = document.createElement("textarea");
        field.value = url;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("复制失败");
      }
      notify({ kind: "event", text: "这一刻的链接已复制，可以寄给远方。" });
    } catch {
      notify({
        kind: "event",
        text: "链接暂时无法复制，请检查浏览器剪贴板权限。",
      });
    }
  };
  return (
    <>
      <SceneCanvas key={attempt} canvasRef={canvas} />
      {snapshot?.walkView && !blocked && !error && (
        <WalkControls
          onInput={(direction, on) =>
            controller.current?.walkInput(direction, on)
          }
          onExit={() => controller.current?.setWalking(false)}
        />
      )}
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
        onPhoto={() => setPhotoOpen(true)}
        onCopy={() => void copyMoment()}
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
            realTime={snapshot?.realTime ?? false}
            onRealTime={setRealTime}
            classic={CLASSIC}
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
            onVisit={(preset) => {
              controller.current?.setCameraPreset(preset);
              setHelpOpen(false);
            }}
            walking={!!snapshot?.walkView}
            onWalking={() => {
              controller.current?.setWalking(!snapshot?.walkView);
              setHelpOpen(false);
            }}
            treasure={
              <TreasureHunt
                progress={weeklyTreasure}
                date={today}
                onStart={() => {
                  const date = new Date();
                  setToday(date);
                  const next = validateTreasure(treasureRef.current, date);
                  updateTreasure({ ...next, started: true });
                }}
                onVisit={(preset) => {
                  controller.current?.setCameraPreset(preset);
                  setHelpOpen(false);
                }}
              />
            }
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
              onSeason={(i) => {
                stopRealTime();
                controller.current?.setSeason(i);
              }}
            />
            <TimeControls
              snapshot={snapshot}
              collapsed={timeCollapsed}
              onToggle={() => setTimeCollapsed((v) => !v)}
              onSpeed={(v) => controller.current?.setSpeed(v)}
              onHour={(v) => {
                stopRealTime();
                controller.current?.setTimeOfDay(v);
              }}
              onRealTime={setRealTime}
              classic={CLASSIC}
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
        controlRef={radioControl}
        onPlaybackChange={setRadioPlaying}
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
          invitation={letterPrompt(
            snapshot?.season ?? "spring",
            snapshot?.night ?? 0,
            snapshot?.rain ?? 0,
          )}
          onSend={(message) => {
            const sent = controller.current?.sendLetter(message) ?? false;
            if (sent) {
              setLastLetter(message);
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
            const next = emptyTreasure(new Date());
            updateTreasure(next);
            saveTreasure(next);
          }}
          onClose={() => setPostcardsOpen(false)}
        />
      )}
      {photoOpen && (
        <PhotoDialog
          hasLetter={!!lastLetter}
          onClose={() => setPhotoOpen(false)}
          onExport={async (includeLetter) => {
            const frame = await controller.current?.captureFrame();
            if (!frame) throw new Error("画面还没准备好，请稍后重试。");
            const date = new Date();
            const stamp = STAMPS.find(
              (item) => item.id === snapshot?.stamps.at(-1),
            );
            const postcard = await composePostcard(frame, {
              season: snapshot?.season ?? "spring",
              date,
              stamp: stamp?.label ?? "✿",
              letter: includeLetter ? lastLetter : undefined,
            });
            await shareOrDownloadPostcard(postcard, date);
          }}
        />
      )}
      {error ? (
        <ErrorFallback
          message={error}
          onRetry={() => {
            setMailOpen(false);
            setHelpOpen(false);
            setPostcardsOpen(false);
            setPhotoOpen(false);
            setAttempt((v) => v + 1);
          }}
        />
      ) : (
        !loaderGone && <LoadingScreen done={!!snapshot?.ready} />
      )}
    </>
  );
}
