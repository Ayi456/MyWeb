import type { ReactNode } from "react";
import type { SceneSnapshot } from "../scene/types";
export function SceneOverlay({
  snapshot,
  hidden,
  onToggle,
  onReset,
  onCloseup,
  onHelp,
  helpOpen,
  children,
}: {
  snapshot: SceneSnapshot | null;
  hidden: boolean;
  onToggle: () => void;
  onReset: () => void;
  onCloseup: () => void;
  onHelp: () => void;
  helpOpen: boolean;
  children: ReactNode;
}) {
  const debug =
    import.meta.env.DEV ||
    new URLSearchParams(location.search).get("debug") === "1";
  return (
    <main className={`overlay ${(snapshot?.night ?? 0) > 0.63 ? "night" : ""}`}>
      {!hidden && (
        <>
          <header className="masthead">
            <div className="eyebrow">POSTCARDS FROM THE SKY</div>
            <h1 className="title">
              云上的
              <br />
              春日邮局
            </h1>
            <div className="subtitle">写给远方，也写给你。</div>
          </header>
          <div className="stamp" aria-hidden="true">
            <span>AIR MAIL</span>
            <b>✿</b>
            <span>SPRING · 01</span>
          </div>
        </>
      )}
      <nav
        className={`side ${hidden ? "side-minimal" : ""}`}
        aria-label="场景视角"
      >
        {!hidden && (
          <>
            <button
              className="round"
              aria-label="复位视角"
              title="复位视角 · R"
              onClick={onReset}
            >
              ↺
            </button>
            <button
              className="round"
              aria-label="走近樱花树"
              onClick={onCloseup}
            >
              ⌕
            </button>
          </>
        )}
        <button
          className="round"
          aria-label={hidden ? "显示界面" : "隐藏界面"}
          title="界面显示 · H"
          onClick={onToggle}
        >
          ⛶
        </button>
        {!hidden && (
          <button
            className="round"
            aria-label="操作指南"
            aria-expanded={helpOpen}
            aria-controls="help-panel"
            onClick={onHelp}
          >
            ?
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
        </output>
      )}
    </main>
  );
}
