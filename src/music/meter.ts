/** Inspect CORS before routing the user's audio through WebAudio. Never proxy the song. */
export async function canAnalyse(
  url: string,
  signal: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      credentials: "omit",
      signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
    });
    return response.ok && response.type !== "opaque";
  } catch {
    return false;
  }
}
export function bassEnergy(
  data: Uint8Array,
  sampleRate: number,
  fftSize: number,
) {
  const lo = Math.max(1, Math.ceil((60 * fftSize) / sampleRate)),
    hi = Math.min(data.length - 1, Math.ceil((420 * fftSize) / sampleRate));
  if (hi < lo) return 0;
  let total = 0;
  for (let i = lo; i <= hi; i++) total += (data[i] / 255) ** 2;
  return Math.min(1, Math.sqrt(total / (hi - lo + 1)) * 1.8);
}
export class MusicMeter {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private element: HTMLAudioElement | null = null;
  private data = new Uint8Array(256);
  private disposed = false;
  /** Called synchronously from a user gesture, before playlist/URL awaits. */
  prime() {
    if (this.disposed) return false;
    try {
      this.context ??= new AudioContext();
      if (!this.analyser) {
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.65;
        this.analyser.connect(this.context.destination);
      }
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }
  hasSource(element: HTMLAudioElement) {
    return element === this.element;
  }
  attach(element: HTMLAudioElement) {
    if (!this.context || !this.analyser || this.disposed) return false;
    if (this.hasSource(element)) return true;
    try {
      const source = this.context.createMediaElementSource(element);
      this.source?.disconnect();
      source.connect(this.analyser);
      this.source = source;
      this.element = element;
      return true;
    } catch {
      return false;
    }
  }
  read() {
    if (
      !this.analyser ||
      this.context?.state !== "running" ||
      !this.element ||
      this.element.paused ||
      this.element.muted ||
      this.element.volume === 0 ||
      this.element.readyState < 3
    )
      return 0;
    this.analyser.getByteFrequencyData(this.data);
    return bassEnergy(
      this.data,
      this.context.sampleRate,
      this.analyser.fftSize,
    );
  }
  detach() {
    this.source?.disconnect();
    this.source = null;
    this.element = null;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.source?.disconnect();
    this.analyser?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.source = null;
    this.analyser = null;
    this.element = null;
  }
}
