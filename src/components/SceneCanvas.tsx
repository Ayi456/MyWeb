import type { RefObject } from "react";
export function SceneCanvas({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <canvas
      id="world"
      ref={canvasRef}
      tabIndex={0}
      aria-label="云上的春日邮局：拖动环视、滚轮或双指缩放；方向键环视，加减键缩放，按住空格唤起春风"
    />
  );
}
