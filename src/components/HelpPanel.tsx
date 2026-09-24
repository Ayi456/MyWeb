import type { QualityMode } from "../scene/types";
import type { HotspotId } from "../scene/systems/interactions";
import { KEY_HOTSPOTS, keyLabel } from "./hotspotKeys";
export function HelpPanel({
  quality,
  onQuality,
  sound,
  onSound,
  captions,
  onCaptions,
  onRestartGuide,
  onPoke,
  onClose,
}: {
  quality: QualityMode;
  onQuality: (q: QualityMode) => void;
  sound: boolean;
  onSound: (on: boolean) => void;
  captions: boolean;
  onCaptions: (on: boolean) => void;
  onRestartGuide: () => void;
  onPoke: (id: HotspotId) => void;
  onClose: () => void;
}) {
  return (
    <aside className="help" id="help-panel" aria-label="操作指南">
      <button className="close" aria-label="关闭操作指南" onClick={onClose}>
        ×
      </button>
      <h2>欢迎来到春天。</h2>
      <p>
        拖动 · 环绕这座小岛
        <br />
        滚轮 / 双指 · 拉近或远离
        <br />
        方向键 / 加减键 · 调整视角
        <br />
        按住 Space / 春风按钮 · 花瓣纷飞
        <br />R · 复位视角 H · 隐藏界面 F · 登上飞艇 M · 环境音效
        <br />
        数字键 1–0 · 点一点岛上的角落
      </p>
      <p>
        岛上的樱花树、灯笼、写信的小兔、猫咪、风车、门铃、水池、飞艇、灯塔、茶山和温泉村都可以点一点，它们会回应你。鼠标划过树冠，花瓣会被拨开。
      </p>
      <div className="hotspot-keys" role="group" aria-label="点一点岛上的角落">
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
      <p>
        寄出的信送达后，飞艇会从灯塔带回一张明信片，落进邮筒。点邮票图章查看回信与集章。
      </p>
      <button type="button" className="guide-restart" onClick={onRestartGuide}>
        重看三步引导
      </button>
      <p>
        季节按钮切换春夏秋冬，四季也会随时间自然轮换。云鲸、热气球、太阳雨和流星会不定期出现。
      </p>
      <label className="quality-label">
        画质{" "}
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
      <label className="quality-label sound-label">
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => onSound(e.target.checked)}
        />
        环境音效（风声、虫鸣、雨声、互动提示音）
      </label>
      <label className="quality-label sound-label">
        <input
          type="checkbox"
          checked={captions}
          onChange={(e) => onCaptions(e.target.checked)}
        />
        音效字幕（静音时也显示岛上的声音）
      </label>
      <div className="fine">
        自动画质根据设备与运行表现逐级调整，低画质会隐藏远处岛屿的细节。遵循系统的减少动态效果设置。音效由浏览器实时合成，不加载任何音频文件。
      </div>
    </aside>
  );
}
