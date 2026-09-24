export type GuideStep = "tree" | "drag" | "send";

export function nextGuideStep(
  step: GuideStep,
  signals: {
    treeTapped: boolean;
    orbited: boolean;
    sentCount: number;
    sentBaseline: number;
  },
): GuideStep | null {
  if (step === "tree") return signals.treeTapped ? "drag" : step;
  if (step === "drag") return signals.orbited ? "send" : step;
  return signals.sentCount > signals.sentBaseline ? null : step;
}
