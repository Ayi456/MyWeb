import { useEffect, useRef, useState } from "react";
import type { RadioPlayback, RadioPlaylist } from "../music/types";
import "../styles/radio.css";

async function readRadio<T>(query: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/music${query}`, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "电台暂时连接不上，请稍后重试。");
  return body as T;
}

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

export function CloudRadio({
  hidden,
  night,
}: {
  hidden: boolean;
  night: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [open, setOpen] = useState(false);
  const [playlist, setPlaylist] = useState<RadioPlaylist | null>(null);
  const [playlistError, setPlaylistError] = useState("");
  const [retry, setRetry] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [trial, setTrial] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [playMode, setPlayMode] = useState<"order" | "loop" | "random">("loop");
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const intent = useRef(false);
  const loaded = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const track = playlist?.tracks[index];

  useEffect(() => {
    if (!open || playlist) return;
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
        if (active) setPlaylistError("电台暂时连接不上，请稍后重试。");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [open, playlist, retry]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    const requestGeneration = generation;
    return () => {
      requestGeneration.current++;
      request.current?.abort();
      clearTimeout(timer.current);
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, []);

  function cancel() {
    generation.current++;
    request.current?.abort();
    clearTimeout(timer.current);
    intent.current = false;
    audioRef.current?.pause();
    setBusy(false);
  }

  async function play(nextIndex: number, autoplay = true) {
    const audio = audioRef.current;
    const nextTrack = playlist?.tracks[nextIndex];
    if (!audio || !nextTrack) return;
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
      audio.removeAttribute("src");
      audio.load();
      setMessage("这首歌连接超时了，可以重试或换一首。");
    }, 20_000);
    try {
      if (loaded.current !== nextTrack.id || audio.error) {
        audio.removeAttribute("src");
        audio.load();
        const result = await readRadio<RadioPlayback>(
          `?action=play&id=${nextTrack.id}`,
          controller.signal,
        );
        if (generation.current !== version) return;
        audio.src = result.url;
        loaded.current = nextTrack.id;
        setTrial(result.trial);
      }
      await audio.play();
    } catch (error) {
      if (generation.current !== version) return;
      intent.current = false;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setMessage("歌曲已准备好，再点一次播放吧。");
      } else {
        loaded.current = "";
        const errorMessage =
          error instanceof Error && !(error instanceof DOMException)
            ? error.message
            : "这首歌暂时无法播放，换一首听听吧。";
        setMessage(errorMessage);
        // Auto-skip to next track if current song is unavailable
        if (playlist && autoplay) {
          setTimeout(() => move(1, true), 1500);
        }
      }
    } finally {
      if (generation.current === version) {
        clearTimeout(timer.current);
        setBusy(false);
      }
    }
  }

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
      // Order or loop mode
      nextIndex =
        (indexRef.current + step + playlist.tracks.length) %
        playlist.tracks.length;
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
    message ||
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
        ref={audioRef}
        preload="none"
        aria-label="云上电台音频"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
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
        onError={() => {
          if (!audioRef.current?.getAttribute("src")) return;
          cancel();
          loaded.current = "";
          setMessage("这首歌暂时无法播放，换一首听听吧。");
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
                  {playlistError || "正在接收公开歌单…"}
                </p>
                {playlistError && (
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
                  <button aria-label="上一首" onClick={() => move(-1, true)}>
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
                      } else void play(indexRef.current);
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
                  <button aria-label="下一首" onClick={() => move(1, true)}>
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
              </>
            )}
          </section>
        )}
      </aside>
    </>
  );
}
