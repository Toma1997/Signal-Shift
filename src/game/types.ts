export type Screen =
  | "title"
  | "setup"
  | "calibration"
  | "playing"
  | "paused"
  | "results";

export type Lane = 0 | 1 | 2;

export type SignalKind =
  | "stable_signal"
  | "charge_signal"
  | "interference"
  | "anomaly";

export interface FallingObject {
  id: string;
  kind: SignalKind;
  lane: Lane;
  y: number;
  speed: number;
  spawnedAtMs: number;
  labelVisible: boolean;
}

export interface ScoreSummary {
  score: number;
  sorted: number;
  wronglySorted: number;
  missed: number;
  survivedSeconds: number;
}

export interface SensorSnapshot {
  bpm: number;
  focus: number;
  signalQuality: "low" | "medium" | "high";
  mode: "balanced" | "calm" | "pressure";
}

export interface GameState {
  screen: Screen;
  startedAtMs: number | null;
  nowMs: number;
  playerLane: Lane;
  objects: FallingObject[];
  score: ScoreSummary;
  stability: number;
  corruption: number;
  combo: number;
  itemsCaught: number;
  itemsMissed: number;
  spawnIntervalMs: number;
  lastSpawnAtMs: number;
  resultBpmHistory: number[];
  resultBaselineBpm: number | null;
  isRunning: boolean;
  isGameOver: boolean;
}
