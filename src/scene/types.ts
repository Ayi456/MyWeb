import type { SeasonName } from "./systems/season";
import type { HotspotId } from "./systems/interactions";
import type { SceneEventKind } from "./systems/events";
import type { StampId, StoredReply } from "./systems/postcards";
import type { FestivalKind } from "./systems/festival";

export type Speed = 0 | 1 | 4 | 12;
export type QualityLevel = "high" | "medium" | "low";
export type QualityMode = "auto" | QualityLevel;
export type CameraPreset = "reset" | "tree" | "ride";
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
  orbited: boolean;
  season: SeasonName;
  /** 0..1 progress through the current season. */
  seasonProgress: number;
  riding: boolean;
  event: SceneEventKind | null;
  rain: number;
  repliesWaiting: number;
  stamps: StampId[];
  sound: boolean;
  festival: FestivalKind | null;
  realTime: boolean;
  moonPhase: number;
}
export type SceneNotice =
  | { type: "tap"; id: HotspotId; text: string }
  | { type: "event"; kind: SceneEventKind; text: string }
  | { type: "reply"; text: string; season: SeasonName }
  | { type: "stamp"; id: StampId; text: string }
  | { type: "season"; season: SeasonName; text: string }
  | { type: "sound"; text: string };
export interface SceneController {
  setSpeed(speed: Speed): void;
  setTimeOfDay(hour: number): void;
  setSeason(index: number): void;
  setWind(active: boolean): void;
  setCameraPreset(preset: CameraPreset): void;
  setQuality(mode: QualityMode): void;
  setInteractionBlocked(blocked: boolean): void;
  setSound(on: boolean): void;
  resetOrbitFlag(): void;
  /** Trigger a gentle hotspot reaction without a tap notice or stamp. */
  nudge(id: HotspotId, amount: number, pop?: boolean): void;
  setCaptions(on: boolean): void;
  setSoundVolume(volume: number): void;
  clearCollection(): void;
  visitDays(days: number): void;
  setCalendarContext(
    kind: FestivalKind | null,
    stamp: StampId | null,
    phase?: number,
  ): void;
  setRealTime(on: boolean): void;
  setYear(year: number): void;
  sendLetter(message: string): boolean;
  /** Trigger a hotspot as if tapped; used by tests and keyboard shortcuts. */
  poke(id: HotspotId): void;
  /** Start a surprise now (debug and tests). */
  triggerEvent(kind: SceneEventKind): void;
  subscribe(listener: (snapshot: SceneSnapshot) => void): () => void;
  onNotice(listener: (notice: SceneNotice) => void): () => void;
  dispose(): void;
}
export interface SceneOptions {
  onMailbox: () => void;
  onError: (message: string) => void;
  /** Start on the final framing instead of gliding in (tests, screenshots). */
  skipArrival?: boolean;
  initial?: {
    stamps?: StampId[];
    replies?: StoredReply[];
    eventWeights?: Partial<Record<SceneEventKind, number>>;
    festival?: FestivalKind | null;
    limitedStamp?: StampId | null;
    hour?: number;
    year?: number;
    realTime?: boolean;
    moonPhase?: number;
  };
}
