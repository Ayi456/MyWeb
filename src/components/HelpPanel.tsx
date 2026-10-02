import { useEffect, useRef, type ReactNode } from "react";
import type { CameraPreset, QualityMode } from "../scene/types";
import { ISLAND_VIEWS } from "../scene/core/cameraViews";
import type { HotspotId } from "../scene/systems/interactions";
import { KEY_HOTSPOTS, keyLabel } from "./hotspotKeys";

const DESTINATION_NOTES = {
  garden: "听风车转过一个午后",
  lighthouse: "等一艘归来的飞艇",
  teahouse: "在茶香里慢下来",
  village: "把疲惫交给热气",
  depot: "看缆车捎来远方的信",
} as const;

export function HelpPanel({
  quality,
  onQuality,
  sound,
  onSound,
  captions,
  onCaptions,
  realTime,
  onRealTime,
  classic,
  onRestartGuide,
  onPoke,
  onVisit,
  walking,
  onWalking,
  treasure,
  onClose,
  autoTour,
  onAutoTour,
}: {
  quality: QualityMode;
  onQuality: (q: QualityMode) => void;
  sound: boolean;
  onSound: (on: boolean) => void;
  captions: boolean;
  onCaptions: (on: boolean) => void;
  realTime: boolean;
  onRealTime: (on: boolean) => void;
  classic: boolean;
  onRestartGuide: () => void;
  onPoke: (id: HotspotId) => void;
  onVisit: (preset: CameraPreset) => void;
  walking: boolean;
  onWalking: () => void;
  treasure: ReactNode;
  onClose: () => void;
  autoTour: boolean;
  onAutoTour: (enabled: boolean) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const panel = heading.current?.closest(".handbook");
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (
        trigger instanceof HTMLElement &&
        trigger.isConnected &&
        (document.activeElement === document.body ||
          panel?.contains(document.activeElement))
      )
        trigger.focus({ preventScroll: true });
    };
  }, []);
  function jump(id: string) {
    const section = body.current?.querySelector<HTMLElement>("#" + id);
    section?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    section?.focus({ preventScroll: true });
  }
  return (
    <aside className="help handbook" id="help-panel" aria-label="操作指南">
      <header className="handbook-header">
        <span className="handbook-kicker">A FIELD GUIDE TO THE SKY</span>
        <button className="close" aria-label="关闭操作指南" onClick={onClose}>
          ×
        </button>
        <h2 ref={heading} tabIndex={-1}>
          云间漫游手册
        </h2>
        <p>每一座小岛，都有一点值得停留的事。</p>
        <nav className="handbook-index" aria-label="手册章节">
          <button onClick={() => jump("handbook-explore")}>
            01 <span>去看看</span>
          </button>
          <button onClick={() => jump("handbook-play")}>
            02 <span>点一点</span>
          </button>
          <button onClick={() => jump("handbook-settings")}>
            03 <span>慢下来</span>
          </button>
        </nav>
      </header>
      <div className="handbook-body" ref={body}>
        <section
          className="handbook-section"
          id="handbook-explore"
          tabIndex={-1}
          aria-labelledby="explore-heading"
        >
          <h3 id="explore-heading">
            <span>01</span> 选一个地方，出发。
          </h3>
          <div
            className="destination-list"
            role="group"
            aria-label="去看看群岛"
          >
            {ISLAND_VIEWS.map(({ preset, label }, i) => (
              <button
                key={preset}
                type="button"
                aria-label={"去看" + label}
                onClick={() => onVisit(preset)}
              >
                <span className="destination-number" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="destination-copy">
                  <b>{label}</b>
                  <small>{DESTINATION_NOTES[preset]}</small>
                </span>
                <span className="destination-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
          <p>
            也可以从小兔的高度，走进邮局。用
            WASD、方向键或屏幕按钮移动，拖动画面看四周。
          </p>
          <button
            type="button"
            className="handbook-action"
            onClick={onWalking}
            aria-pressed={walking}
          >
            {walking ? "结束散步" : "开始岛上散步"}
            <span aria-hidden="true">↗</span>
          </button>
        </section>
        <section
          className="handbook-section"
          id="handbook-play"
          tabIndex={-1}
          aria-labelledby="play-heading"
        >
          <h3 id="play-heading">
            <span>02</span> 小岛会回应你。
          </h3>
          <p>
            点一点树、小兔或门铃。双击一个角落，镜头会慢慢靠近；长按春风，让花瓣飞一会儿。
          </p>
          <div
            className="hotspot-keys"
            role="group"
            aria-label="点一点岛上的角落"
          >
            {KEY_HOTSPOTS.map(({ id, label }, i) => (
              <button
                key={id}
                type="button"
                onClick={() => onPoke(id)}
                aria-keyshortcuts={keyLabel(i) || undefined}
              >
                {keyLabel(i) && <kbd>{keyLabel(i)}</kbd>}
                {label}
              </button>
            ))}
          </div>
          {treasure}
          <p>
            寄出的信送达后，飞艇会捎来回信。点右上角的邮戳，收藏属于你的问候。
          </p>
          <button
            type="button"
            className="guide-restart"
            onClick={onRestartGuide}
          >
            重看三步引导
          </button>
        </section>
        <section
          className="handbook-section"
          id="handbook-settings"
          tabIndex={-1}
          aria-labelledby="settings-heading"
        >
          <h3 id="settings-heading">
            <span>03</span> 按你的节奏。
          </h3>
          <label className="handbook-setting">
            <span>
              <b>闲置时自动漫游</b>
              <small>沿群岛缓缓移动。关闭后停留在当前视角。</small>
            </span>
            <input
              type="checkbox"
              checked={autoTour}
              onChange={(e) => onAutoTour(e.target.checked)}
              aria-label="闲置时自动漫游"
            />
          </label>
          <label className="handbook-setting">
            <span>
              <b>环境音效</b>
              <small>风声、虫鸣与远处灯塔的低鸣。</small>
            </span>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => onSound(e.target.checked)}
              aria-label="环境音效（风声、虫鸣、雨声、灯塔低鸣、互动提示音）"
            />
          </label>
          <label className="handbook-setting">
            <span>
              <b>音效字幕</b>
              <small>静音时，也能读到岛上的声音。</small>
            </span>
            <input
              type="checkbox"
              checked={captions}
              onChange={(e) => onCaptions(e.target.checked)}
              aria-label="音效字幕（静音时也显示岛上的声音）"
            />
          </label>
          {!classic && (
            <label className="handbook-setting">
              <span>
                <b>跟随现实时间与季节</b>
                <small>让岛上的日夜，与你同步。</small>
              </span>
              <input
                type="checkbox"
                checked={realTime}
                onChange={(e) => onRealTime(e.target.checked)}
                aria-label="跟随现实时间与季节（默认关闭）"
              />
            </label>
          )}
          <label className="quality-label">
            画质
            <select
              value={quality}
              aria-label="场景画质"
              onChange={(e) => onQuality(e.target.value as QualityMode)}
            >
              <option value="auto">自动</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
          <p className="handbook-fine">
            自动画质随设备表现调整。镜头和界面动效遵循系统的「减少动态效果」设置。
          </p>
          <details className="handbook-shortcuts">
            <summary>键盘与手势</summary>
            <dl>
              <dt>拖动 / 方向键</dt>
              <dd>环视小岛</dd>
              <dt>滚轮 / 双指 / ＋ −</dt>
              <dd>拉近或远离</dd>
              <dt>Space</dt>
              <dd>唤起春风</dd>
              <dt>R / H / F / M</dt>
              <dd>复位 / 界面 / 飞艇 / 声音</dd>
              <dt>数字键 1–0</dt>
              <dd>拜访岛上的角落</dd>
            </dl>
          </details>
        </section>
      </div>
      <footer className="handbook-footer">不用赶路，春天会等你。</footer>
    </aside>
  );
}
