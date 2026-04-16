export type Screen =
  | "title"
  | "setup"
  | "calibration"
  | "playing"
  | "results";

export type Lane = 0 | 1 | 2;

export type SignalKind = "calm" | "focus" | "noise" | "glitch";

export interface FallingSignal {
  id: string;
  lane: Lane;
  y: number;
  speed: number;
  kind: SignalKind;
}

export interface ScoreSummary {
  score: number;
  sorted: number;
  missed: number;
  survivedSeconds: number;
}

export interface SensorSnapshot {
  bpm: number;
  focus: number;
  signalQuality: "low" | "medium" | "high";
  mode: "balanced" | "calm" | "pressure";
}
