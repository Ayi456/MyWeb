import type { SeasonName } from "../scene/systems/season";
import { localDateKey } from "../content/calendar";

const PALETTE: Record<SeasonName, { edge: string; ink: string; name: string }> =
  {
    spring: { edge: "#c989a3", ink: "#765267", name: "春" },
    summer: { edge: "#87aba5", ink: "#47756e", name: "夏" },
    autumn: { edge: "#bb916f", ink: "#795b49", name: "秋" },
    winter: { edge: "#94a6bd", ink: "#546b86", name: "冬" },
  };

function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("明信片生成失败，请重试。")),
      "image/png",
    ),
  );
}

function lines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const output: string[] = [];
  let line = "";
  for (const char of Array.from(text)) {
    if (char === "\n") {
      output.push(line);
      line = "";
      continue;
    }
    if (ctx.measureText(line + char).width > maxWidth && line) {
      output.push(line);
      line = char;
    } else line += char;
  }
  if (line) output.push(line);
  return output;
}

/** Draws the current WebGL frame and postcard chrome on a separate 2D canvas. */
export async function composePostcard(
  frame: Blob,
  options: { season: SeasonName; date: Date; stamp: string; letter?: string },
) {
  const picture = await createImageBitmap(frame);
  try {
    const width = Math.min(1400, Math.max(800, picture.width));
    const margin = Math.round(width * 0.035);
    const imageWidth = width - margin * 2;
    const imageHeight = Math.round(
      (imageWidth * picture.height) / picture.width,
    );
    const note = options.letter?.trim() ?? "";
    const footer = note
      ? Math.max(196, Math.round(width * 0.2))
      : Math.max(135, Math.round(width * 0.13));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = margin + imageHeight + footer;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("此浏览器无法绘制明信片。 ");
    const palette = PALETTE[options.season];
    ctx.fillStyle = "#fff9ef";
    ctx.fillRect(0, 0, width, canvas.height);
    ctx.fillStyle = palette.edge;
    ctx.fillRect(0, 0, width, Math.max(8, margin / 4));
    ctx.drawImage(picture, margin, margin, imageWidth, imageHeight);
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = Math.max(2, width / 450);
    ctx.strokeRect(margin, margin, imageWidth, imageHeight);

    const bottom = margin + imageHeight;
    ctx.fillStyle = palette.ink;
    ctx.textBaseline = "top";
    // Keep the export offline; use the same local serif stack as the page.
    ctx.font = `${Math.round(width * 0.026)}px Georgia, "Songti SC", "SimSun", serif`;
    ctx.fillText("云上的春日邮局", margin, bottom + margin * 0.65);
    ctx.font = `${Math.round(width * 0.014)}px Georgia, "Songti SC", "SimSun", serif`;
    ctx.fillText(
      `${options.date.getFullYear()} 年 ${options.date.getMonth() + 1} 月 ${options.date.getDate()} 日 · ${palette.name}日来信`,
      margin,
      bottom + margin * 1.75,
    );
    const radius = Math.round(width * 0.046);
    const stampX = width - margin - radius;
    const stampY = bottom + margin + radius;
    ctx.beginPath();
    ctx.arc(stampX, stampY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = `${Math.round(width * 0.018)}px Georgia, "Songti SC", "SimSun", serif`;
    ctx.fillText(options.stamp, stampX, stampY - width * 0.01, radius * 1.6);
    ctx.textAlign = "left";
    if (note) {
      ctx.font = `${Math.round(width * 0.017)}px Georgia, "Songti SC", "SimSun", serif`;
      lines(ctx, note, imageWidth - radius * 2.5)
        .slice(0, 4)
        .forEach((line, i) =>
          ctx.fillText(
            line,
            margin,
            bottom + margin * 2.75 + i * width * 0.024,
          ),
        );
    }
    return await png(canvas);
  } finally {
    picture.close();
  }
}

export async function shareOrDownloadPostcard(blob: Blob, date: Date) {
  const filename = `spring-post-office-${localDateKey(date)}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: "云上的春日邮局" });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        return "cancelled" as const;
      // A browser may deny sharing after asynchronous capture; download below.
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded" as const;
}
