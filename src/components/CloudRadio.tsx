import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import type { RadioPlayback, RadioPlaylist } from "../music/types";
import { nextPlayable, skipDelay } from "../music/skipPolicy";
import { MusicMeter, canAnalyse } from "../music/meter";
import { readPreference, writePreference } from "../persist/storage";
import "../styles/radio.css";

class RadioError extends Error {
  constructor(
    message: string,
    readonly retryAfter: number,
  ) {
    super(message);
  }
}

async function readRadio<T>(query: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/music${query}`, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new RadioError(
      body.error || "电台暂时连接不上，请稍后重试。",
      Number(response.headers.get("Retry-After")) || 0,
    );
  return body as T;
}

const OFFLINE_TEXT = "离线中 · 岛上一切照常，电台等网络回来再播。";

function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function RadioIcon({ playing = false }: { playing?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={playing ? "radio-waves is-playing" : "radio-waves"}
    >
      <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />
    </svg>
  );
}

export interface RadioControl {
  toggleFromIsland(): void;
}

export function CloudRadio({
  hidden,
  night,
  onCaption,
  controlRef,
  onPlaybackChange,
  onEnergy,
}: {
  hidden: boolean;
  night: boolean;
  onCaption?: (text: string) => void;
  controlRef?: Ref<RadioControl>;
  onPlaybackChange?: (playing: boolean) => void;
  onEnergy?: (energy: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const meterRef = useRef<MusicMeter | null>(null);
  const [audioKey, setAudioKey] = useState(0);
  const replacement = useRef<{
    old: HTMLAudioElement;
    resolve: (audio: HTMLAudioElement | null) => void;
  } | null>(null);
  const [pulse, setPulse] = useState(() => readPreference("music-pulse"));
  const [pulseStatus, setPulseStatus] =
    useState("播放后，灯笼会跟着旋律轻轻呼吸。");
  const loadedPulse = useRef(false);
  const loadedCors = useRef(false);
  const nativeFallback = useRef(new Set<string>());
  const reportEnergy = useEffectEvent((value: number) => onEnergy?.(value));
  useEffect(() => {
    if (!pulse || !playing) {
      reportEnergy(0);
      return;
    }
    let frame = 0;
    const tick = () => {
      reportEnergy(document.hidden ? 0 : (meterRef.current?.read() ?? 0));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      reportEnergy(0);
    };
  }, [pulse, playing]);
  const [open, setOpen] = useState(false);
  const [playlist, setPlaylist] = useState<RadioPlaylist | null>(null);
  const [playlistError, setPlaylistError] = useState("");
  const [retry, setRetry] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [trial, setTrial] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [playMode, setPlayMode] = useState<"order" | "loop" | "random">("loop");
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const intent = useRef(false);
  const pendingPlay = useRef(false);
  const loaded = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const failures = useRef(0);
  const failed = useRef(new Set<string>());
  const lastFail = useRef({ id: "", at: 0 });
  const track = playlist?.tracks[index];

  useEffect(() => {
    if (!open || playlist || offline) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let active = true;
    readRadio<RadioPlaylist>("", controller.signal)
      .then((value) => {
        if (active) {
          setPlaylist(value);
          setPlaylistError("");
        }
      })
      .catch(() => {
        if (active) {
          pendingPlay.current = false;
          setPlaylistError("电台暂时连接不上，请稍后重试。");
        }
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [open, playlist, retry, offline]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // The island runs offline from the service worker cache; only the radio
  // needs the network, so it waits quietly and reconnects when it returns.
  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      if (!navigator.onLine) pendingPlay.current = false;
      if (navigator.onLine) {
        setPlaylistError("");
        setRetry((v) => v + 1);
      }
    };
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const requestGeneration = generation;
    const requestSkip = skipTimer;
    return () => {
      requestGeneration.current++;
      request.current?.abort();
      clearTimeout(timer.current);
      clearTimeout(requestSkip.current);
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
      const currentAudio = audioRef.current;
      if (currentAudio !== audio) {
        currentAudio?.pause();
        currentAudio?.removeAttribute("src");
        currentAudio?.load();
      }
      meterRef.current?.dispose();
      meterRef.current = null;
      replacement.current?.resolve(null);
      replacement.current = null;
    };
  }, []);

  function cancel() {
    pendingPlay.current = false;
    generation.current++;
    request.current?.abort();
    clearTimeout(timer.current);
    clearTimeout(skipTimer.current);
    intent.current = false;
    audioRef.current?.pause();
    setPlaying(false);
    onPlaybackChange?.(false);
    setBusy(false);
  }

  // play() rejections and <audio> errors share one policy: remember the
  // failed track, back off, and stop after a few misses in a row.
  function fail(id: string, text: string, autoplay: boolean, retryAfter = 0) {
    loaded.current = "";
    // Offline is not the track's fault: don't mark it or burn the skip budget.
    if (!navigator.onLine) {
      clearTimeout(skipTimer.current);
      return setMessage(OFFLINE_TEXT);
    }
    // A broken source both rejects play() and fires <audio> error; count once.
    const now = Date.now();
    if (lastFail.current.id === id && now - lastFail.current.at < 1000) return;
    lastFail.current = { id, at: now };
    clearTimeout(skipTimer.current);
    failed.current.add(id);
    failures.current++;
    const delay = skipDelay(failures.current, retryAfter);
    if (!playlist || !autoplay) return setMessage(text);
    if (delay === null) {
      failures.current = 0;
      return setMessage("连续几首都没能接通，稍后再试试吧。");
    }
    setMessage(text);
    skipTimer.current = setTimeout(() => move(1, true), delay);
  }

  function userAction() {
    failures.current = 0;
    if (pulse) primeMeter();
  }

  function primeMeter() {
    meterRef.current ??= new MusicMeter();
    return meterRef.current.prime();
  }
  function replaceAudio(old: HTMLAudioElement) {
    old.pause();
    old.removeAttribute("src");
    old.load();
    meterRef.current?.detach();
    return new Promise<HTMLAudioElement | null>((resolve) => {
      replacement.current = { old, resolve };
      setAudioKey((key) => key + 1);
    });
  }

  async function play(
    nextIndex: number,
    autoplay = true,
    analyse = pulse,
    resumeAt = 0,
  ) {
    let audio = audioRef.current;
    const nextTrack = playlist?.tracks[nextIndex];
    if (!audio || !nextTrack) return;
    const meterReady = analyse && primeMeter();
    cancel();
    const version = generation.current;
    const controller = new AbortController();
    request.current = controller;
    intent.current = true;
    setBusy(true);
    setMessage("");
    timer.current = setTimeout(() => {
      if (version !== generation.current) return;
      cancel();
      loaded.current = "";
      audio?.removeAttribute("src");
      audio?.load();
      setMessage("这首歌连接超时了，可以重试或换一首。");
    }, 20_000);
    try {
      if (
        loaded.current !== nextTrack.id ||
        audio.error ||
        (analyse &&
          !loadedPulse.current &&
          !nativeFallback.current.has(nextTrack.id))
      ) {
        audio.removeAttribute("src");
        audio.load();
        const result = await readRadio<RadioPlayback>(
          `?action=play&id=${nextTrack.id}`,
          controller.signal,
        );
        if (generation.current !== version) return;
        const eligible =
          meterReady &&
          !nativeFallback.current.has(nextTrack.id) &&
          (await canAnalyse(result.url, controller.signal));
        if (generation.current !== version) return;
        if (!eligible && meterRef.current?.hasSource(audio)) {
          audio = await replaceAudio(audio);
          if (!audio || generation.current !== version) return;
        }
        if (eligible) audio.crossOrigin = "anonymous";
        else audio.removeAttribute("crossorigin");
        audio.src = result.url;
        loadedCors.current = !!eligible;
        loadedPulse.current = !!eligible && !!meterRef.current?.attach(audio);
        if (analyse)
          setPulseStatus(
            loadedPulse.current
              ? "灯笼与螺旋桨正在倾听这首歌。"
              : "本曲暂不支持律动，音乐照常播放。",
          );
        loaded.current = nextTrack.id;
        setTrial(result.trial);
      }
      await audio.play();
      if (resumeAt > 0 && generation.current === version)
        audio.currentTime = resumeAt;
    } catch (error) {
      if (generation.current !== version) return;
      if (
        loadedCors.current &&
        !nativeFallback.current.has(nextTrack.id) &&
        !(error instanceof DOMException && error.name === "NotAllowedError")
      ) {
        nativeFallback.current.add(nextTrack.id);
        loaded.current = "";
        setPulseStatus("本曲暂不支持律动，音乐照常播放。");
        void play(nextIndex, autoplay, false, audio?.currentTime ?? 0);
        return;
      }
      intent.current = false;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setMessage("歌曲已准备好，再点一次播放吧。");
      } else {
        const errorMessage =
          error instanceof Error && !(error instanceof DOMException)
            ? error.message
            : "这首歌暂时无法播放，换一首听听吧。";
        fail(
          nextTrack.id,
          errorMessage,
          autoplay,
          error instanceof RadioError ? error.retryAfter : 0,
        );
      }
    } finally {
      if (generation.current === version) {
        clearTimeout(timer.current);
        setBusy(false);
      }
    }
  }

  const playPending = useEffectEvent(() => {
    if (!pendingPlay.current) return;
    pendingPlay.current = false;
    void play(indexRef.current);
  });
  useEffect(() => {
    if (playlist) playPending();
  }, [playlist]);

  useImperativeHandle(controlRef, () => ({
    toggleFromIsland() {
      setOpen(true);
      if (playing || busy || pendingPlay.current) {
        cancel();
        setMessage("");
        return;
      }
      if (!navigator.onLine) {
        setMessage(OFFLINE_TEXT);
        return;
      }
      userAction();
      if (playlist) void play(indexRef.current);
      else {
        pendingPlay.current = true;
        setPlaylistError("");
        setRetry((value) => value + 1);
      }
    },
  }));

  function move(step: number, autoplay = intent.current) {
    if (!playlist) return;
    cancel();
    let nextIndex: number;
    if (playMode === "random") {
      // Random mode: pick a random track different from current
      do {
        nextIndex = Math.floor(Math.random() * playlist.tracks.length);
      } while (nextIndex === indexRef.current && playlist.tracks.length > 1);
    } else {
      // Order or loop mode, stepping over tracks that failed this session
      const tracks = playlist.tracks;
      nextIndex = nextPlayable(indexRef.current, step, tracks.length, (i) =>
        failed.current.has(tracks[i].id),
      );
    }
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    loaded.current = "";
    const audio = audioRef.current;
    audio?.removeAttribute("src");
    audio?.load();
    setTime(0);
    setDuration(0);
    setTrial(false);
    setMessage("");
    if (autoplay) void play(nextIndex);
  }

  const status =
    (offline && !playing ? OFFLINE_TEXT : message) ||
    (busy
      ? "正在接收云端的旋律…"
      : trial
        ? "试听片段 · 可前往网易云收听"
        : playing
          ? "让旋律，陪心意一起远行。"
          : "点一下播放，让春天有声音。");
  return (
    <>
      <audio
        key={audioKey}
        ref={(node) => {
          audioRef.current = node;
          if (node) {
            node.volume = volume;
            if (replacement.current && node !== replacement.current.old) {
              replacement.current.resolve(node);
              replacement.current = null;
            }
          }
        }}
        preload="none"
        aria-label="云上电台音频"
        onPlaying={() => {
          failures.current = 0;
          setPlaying(true);
          onPlaybackChange?.(true);
          if (track)
            onCaption?.(`电台正在播放：${track.name} · ${track.artist}`);
        }}
        onPause={() => {
          setPlaying(false);
          onPlaybackChange?.(false);
        }}
        onWaiting={() => onPlaybackChange?.(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) =>
          setDuration(
            Number.isFinite(e.currentTarget.duration)
              ? e.currentTarget.duration
              : 0,
          )
        }
        onEnded={() => {
          if (
            playMode === "order" &&
            indexRef.current === (playlist?.tracks.length ?? 0) - 1
          ) {
            // Order mode: stop at the last track
            cancel();
            setMessage("歌单播放完毕。");
          } else {
            move(1, true);
          }
        }}
        onError={(e) => {
          if (e.currentTarget !== audioRef.current) return;
          if (!audioRef.current?.getAttribute("src") || !track) return;
          if (loadedCors.current && !nativeFallback.current.has(track.id)) {
            nativeFallback.current.add(track.id);
            loaded.current = "";
            setPulseStatus("本曲暂不支持律动，音乐照常播放。");
            void play(
              indexRef.current,
              intent.current,
              false,
              audioRef.current.currentTime,
            );
            return;
          }
          const autoplay = intent.current;
          cancel();
          fail(track.id, "这首歌暂时无法播放，换一首听听吧。", autoplay);
        }}
      />
      <aside
        className={`cloud-radio ${night ? "radio-night" : ""}`}
        hidden={hidden}
        aria-label="云上电台"
      >
        <button
          className="radio-toggle"
          aria-expanded={open}
          aria-controls="radio-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <RadioIcon playing={playing} />
          <span>云上电台</span>
          {playing && <span className="radio-on-air">正在播放</span>}
          {offline && !playing && <span className="radio-on-air">离线中</span>}
          <span className="radio-chevron" aria-hidden="true">
            {open ? "−" : "+"}
          </span>
        </button>
        {open && (
          <section
            className="radio-panel"
            id="radio-panel"
            aria-label="音乐播放器"
          >
            <div className="radio-kicker">A LITTLE SOUND OF SPRING</div>
            {!playlist ? (
              <>
                <p className="radio-status" role="status">
                  {offline
                    ? OFFLINE_TEXT
                    : playlistError || "正在接收公开歌单…"}
                </p>
                {playlistError && !offline && (
                  <button
                    className="radio-retry"
                    onClick={() => {
                      setPlaylistError("");
                      setRetry((v) => v + 1);
                    }}
                  >
                    重新连接
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="radio-track">
                  <div
                    className={`radio-record ${playing ? "is-playing" : ""}`}
                    aria-hidden="true"
                  >
                    <span>✿</span>
                  </div>
                  <div className="radio-track-copy">
                    <h2 title={track?.name}>{track?.name}</h2>
                    <p title={track?.artist}>{track?.artist}</p>
                  </div>
                  {trial && <span className="radio-trial">试听</span>}
                </div>
                <p className="radio-status" role="status">
                  {status}
                </p>
                <div className="radio-progress">
                  <span>{formatTime(time)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    step="1"
                    value={Math.min(time, duration || 1)}
                    disabled={!duration || busy}
                    aria-label="音乐播放进度"
                    aria-valuetext={`${formatTime(time)} / ${formatTime(duration)}`}
                    onChange={(e) => {
                      if (audioRef.current)
                        audioRef.current.currentTime = Number(e.target.value);
                      setTime(Number(e.target.value));
                    }}
                  />
                  <span>{formatTime(duration || track?.duration || 0)}</span>
                </div>
                <div className="radio-controls">
                  <button
                    aria-label="上一首"
                    onClick={() => {
                      userAction();
                      move(-1, true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 5v14M18 5L8 12l10 7Z" />
                    </svg>
                  </button>
                  <button
                    className="radio-play"
                    aria-label={
                      busy ? "取消音乐加载" : playing ? "暂停音乐" : "播放音乐"
                    }
                    onClick={() => {
                      if (playing || busy) {
                        cancel();
                        setMessage("");
                      } else {
                        userAction();
                        void play(indexRef.current);
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {busy ? (
                        <path d="M7 7l10 10M17 7L7 17" />
                      ) : playing ? (
                        <path d="M8 5v14M16 5v14" />
                      ) : (
                        <path d="M8 5l11 7-11 7Z" />
                      )}
                    </svg>
                  </button>
                  <button
                    aria-label="下一首"
                    onClick={() => {
                      userAction();
                      move(1, true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18 5v14M6 5l10 7-10 7Z" />
                    </svg>
                  </button>
                  <button
                    className="radio-mode"
                    aria-label={
                      playMode === "order"
                        ? "顺序播放"
                        : playMode === "loop"
                          ? "循环播放"
                          : "随机播放"
                    }
                    title={
                      playMode === "order"
                        ? "顺序播放"
                        : playMode === "loop"
                          ? "循环播放"
                          : "随机播放"
                    }
                    onClick={() =>
                      setPlayMode((m) =>
                        m === "order"
                          ? "loop"
                          : m === "loop"
                            ? "random"
                            : "order",
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {playMode === "order" ? (
                        <path d="M4 12h13m0 0l-4-4m4 4l-4 4m4-8V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
                      ) : playMode === "loop" ? (
                        <path d="M4 12h13m0 0l-4-4m4 4l-4 4M3 8V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M3 16v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
                      ) : (
                        <path d="M9 4l2 4-2 4M15 4l2 4-2 4M5 16h4M15 16h4M7 20l2-4 2 4" />
                      )}
                    </svg>
                  </button>
                  <label className="radio-volume">
                    <span>音量</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      aria-label="音乐音量"
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="radio-source">
                  <a href={playlist.sourceUrl} target="_blank" rel="noreferrer">
                    网易云 · {playlist.name} ↗
                  </a>
                  <span>
                    {index + 1} / {playlist.tracks.length}
                  </span>
                </div>
                <label className="radio-pulse">
                  <input
                    type="checkbox"
                    checked={pulse}
                    onChange={(e) => {
                      const on = e.target.checked;
                      if (on) primeMeter();
                      setPulse(on);
                      writePreference("music-pulse", on);
                      if (on && playing && !loadedPulse.current)
                        void play(
                          indexRef.current,
                          true,
                          true,
                          audioRef.current?.currentTime ?? 0,
                        );
                    }}
                  />
                  音乐律动
                </label>
                {pulse && <p className="radio-pulse-status">{pulseStatus}</p>}
              </>
            )}
          </section>
        )}
      </aside>
    </>
  );
}
