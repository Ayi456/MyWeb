import type { QualityMode } from "../scene/types";
export function HelpPanel({
  quality,
  onQuality,
  onClose,
}: {
  quality: QualityMode;
  onQuality: (q: QualityMode) => void;
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
        <br />R · 复位视角 H · 隐藏界面
      </p>
      <p>春风按钮获得焦点后，Enter 可切换持续春风。离开窗口会停止吹风。</p>
      <p>点击邮筒或「寄一封春天」，让信封飞向飞艇。文字仅留在当前页面。</p>
      <p>时间轴可以前往任意时刻。暂停会冻结场景，仍可自由环视。</p>
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
      <div className="fine">
        自动画质根据设备与运行表现逐级调整。遵循系统的减少动态效果设置。
      </div>
    </aside>
  );
}
