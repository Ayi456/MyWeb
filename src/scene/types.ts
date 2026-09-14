export type Speed = 0 | 1 | 4 | 12;
export type QualityLevel = "high" | "medium" | "low";
export type QualityMode = "auto" | QualityLevel;
export type CameraPreset = "reset" | "tree";
export interface SceneSnapshot {
  ready: boolean;
  hour: number;
  speed: Speed;
  night: number;
  wind: number;
  journey: string;
  sentCount: number;
  deliveredCount: number;
  lettersInFlight: number;
  quality: QualityMode;
  actualQuality: QualityLevel;
  fps: number;
  drawCalls: number;
  instances: number;
  resolution: string;
  simTime: number;
  geometries: number;
  textures: number;
  autoOrbit: boolean;
}
export interface SceneController {
  setSpeed(speed: Speed): void;
  setTimeOfDay(hour: number): void;
  setWind(active: boolean): void;
  setCameraPreset(preset: CameraPreset): void;
  setQuality(mode: QualityMode): void;
  setInteractionBlocked(blocked: boolean): void;
  sendLetter(message: string): boolean;
  subscribe(listener: (snapshot: SceneSnapshot) => void): () => void;
  dispose(): void;
}
export interface SceneOptions {
  onMailbox: () => void;
  onError: (message: string) => void;
}
