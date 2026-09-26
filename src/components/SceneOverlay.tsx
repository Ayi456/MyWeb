import { useState, type ReactNode } from "react";
import type { SceneSnapshot } from "../scene/types";
import { PhotoButton } from "./PhotoButton";
import { SceneIcon } from "./SceneIcon";
export function SceneOverlay({
  snapshot,
  hidden,
  arriving,
  onToggle,
  onReset,
  onCloseup,
  onRide,
  onSound,
  onHelp,
  onPostcards,
  onPhoto,
  onCopy,
  helpOpen,
  replyCount,
  children,
}: {
  snapshot: SceneSnapshot | null;
  hidden: boolean;
  /** Staggered fade-in while the opening camera glide plays. */
  arriving: boolean;
  onToggle: () => void;
  onReset: () => void;
  onCloseup: () => void;
  onRide: () => void;
  onSound: () => void;
  onHelp: () => void;
  onPostcards: () => void;
  onPhoto: () => void;
  onCopy: () => void;
  helpOpen: boolean;
  replyCount: number;
  children: ReactNode;
}) {
  const debug =
    import.meta.env.DEV ||
    new URLSearchParams(location.search).get("debug") === "1";
  const stampCount = snapshot?.stamps.length ?? 0;
  const [toolsOpen, setToolsOpen] = useState(false);
  const runTool = (action: () => void) => () => {
    setToolsOpen(false);
    action();
  };
  return (
    <main
      className={`overlay ${(snapshot?.night ?? 0) > 0.63 ? "night" : ""} ${arriving ? "arriving" : ""}`}
    >
      {!hidden && (
        <>
          <header className="masthead">
            <div className="brand-line">
              <SceneIcon name="letter" />
              <span className="eyebrow">POSTCARDS FROM THE SKY</span>
            </div>
            <h1 className="title">
              <span className="title-prefix">云上的</span>
              <span>春日邮局</span>
            </h1>
            <div className="subtitle">写给远方，也写给你。</div>
          </header>
          <button
            className={`stamp stamp-button ${replyCount || stampCount ? "has-mail" : ""}`}
            aria-label={`信箱与集章：${replyCount} 封回信，${stampCount} 枚邮戳`}
            title="信箱与集章"
            onClick={onPostcards}
          >
            <span>AIR MAIL</span>
            <b>✿</b>
            <span>
              {stampCount
                ? `STAMPS · ${String(stampCount).padStart(2, "0")}`
                : "SPRING · 01"}
            </span>
            <span className="stamp-caption">信箱 · 集章</span>
            {replyCount > 0 && (
              <i className="stamp-badge" aria-hidden="true">
                {replyCount}
              </i>
            )}
          </button>
        </>
      )}
      <nav
        className={`side ${hidden ? "side-minimal" : ""} ${toolsOpen ? "tools-open" : ""}`}
        aria-label="场景视角"
      >
        {!hidden && (
          <>
            <button
              className="side-toggle"
              aria-label={toolsOpen ? "收起漫游工具" : "展开漫游工具"}
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((open) => !open)}
            >
              <SceneIcon name="compass" />
              <span>{toolsOpen ? "收起" : "漫游"}</span>
            </button>
            <span className="side-label" aria-hidden="true">
              云间漫游
            </span>
            <button
              className="round"
              aria-label="复位视角"
              title="复位视角 · R"
              onClick={runTool(onReset)}
            >
              <SceneIcon name="reset" />
            </button>
            <button
              className="round"
              aria-label="走近樱花树"
              onClick={runTool(onCloseup)}
            >
              <SceneIcon name="search" />
            </button>
            <button
              className={`round ${snapshot?.riding ? "pressed" : ""}`}
              aria-label={snapshot?.riding ? "离开飞艇" : "登上飞艇，跟随邮路"}
              aria-pressed={!!snapshot?.riding}
              title="登上飞艇 · F"
              onClick={runTool(onRide)}
            >
              <SceneIcon name="ride" />
            </button>
            <button
              className={`round ${snapshot?.sound ? "pressed" : ""}`}
              aria-label={snapshot?.sound ? "关闭环境音效" : "打开环境音效"}
              aria-pressed={!!snapshot?.sound}
              title="环境音效 · M"
              onClick={runTool(onSound)}
            >
              <SceneIcon name="sound" />
            </button>
            <PhotoButton
              onClick={runTool(onPhoto)}
              disabled={!snapshot?.ready}
            />
            <button
              className="round"
              aria-label="复制此刻链接"
              title="复制此刻链接"
              disabled={!snapshot?.ready}
              onClick={runTool(onCopy)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="camera-icon"
              >
                <path d="M9 15l6-6M8.5 9H7a4 4 0 0 0 0 8h4a4 4 0 0 0 3.5-2M15.5 15H17a4 4 0 0 0 0-8h-4a4 4 0 0 0-3.5 2" />
              </svg>
            </button>
          </>
        )}
        <button
          className="round"
          aria-label={hidden ? "显示界面" : "隐藏界面"}
          title="界面显示 · H"
          onClick={runTool(onToggle)}
        >
          <SceneIcon name="frame" />
        </button>
        {!hidden && (
          <button
            className="round"
            aria-label="操作指南"
            aria-expanded={helpOpen}
            aria-controls="help-panel"
            onClick={runTool(onHelp)}
          >
            <SceneIcon name="help" />
          </button>
        )}
      </nav>
      {!hidden && children}
      {!hidden && debug && snapshot && (
        <output className="diagnostics" aria-label="渲染诊断">
          {snapshot.fps} FPS · {snapshot.drawCalls} calls
          <br />
          {snapshot.instances} instances · {snapshot.resolution}
          <br />
          {snapshot.actualQuality} · {snapshot.geometries} geometries ·{" "}
          {snapshot.textures} textures
          <br />
          {snapshot.season} · {snapshot.event ?? "quiet"} · rain{" "}
          {snapshot.rain.toFixed(2)}
        </output>
      )}
    </main>
  );
}
