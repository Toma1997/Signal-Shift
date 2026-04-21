export type Screen =
  | "title"
  | "setup"
  | "calibration"
  | "playing"
  | "paused"
  | "results";

export type Lane = 0 | 1 | 2;

export type BiometricMode = "balanced" | "calm" | "pressure";

export type ModeReason =
  | "default"
  | "low_bpm"
  | "high_bpm"
  | "bpm_spike"
  | "high_focus"
  | "mixed";

export type SignalKind =
  | "stable_signal"
  | "charge_signal"
  | "interference"
  | "anomaly";

export type TimedEventKind =
  | "brain_fog"
  | "pressure_spike"
  | "clear_window"
  | "static_leak";

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
  mode: BiometricMode;
}

export interface DerivedModeState {
  currentMode: BiometricMode;
  previousMode: BiometricMode;
  reason: ModeReason;
  modeStartedAtMs: number | null;
  stabilityWindowMs: number;
  bpmDeltaPct: number;
  bpmSpike: boolean;
  normalizedFocus: number;
}

export interface TimedEvent {
  id: string;
  kind: TimedEventKind;
  startedAtMs: number;
  durationMs: number;
  active: boolean;
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
  biometricMode: BiometricMode;
  modeReason: ModeReason;
  modeChangedAtMs: number | null;
  activeEvents: TimedEvent[];
  lastEventAtMs: number | null;
  eventCooldownMs: number;
  currentEventLabel: string | null;
  clarityMeter: number;
  clarityPulseEndsAtMs: number | null;
  resultBpmHistory: number[];
  resultBaselineBpm: number | null;
  resultEegFocusHistory: number[];
  resultBaselineFocusScore: number | null;
  resultEegChannelHistories: number[][];
  isRunning: boolean;
  isGameOver: boolean;
}
