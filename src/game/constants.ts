import type { SignalKind } from "./types";

export const APP_NAME = "Signal Shift";

export const LANE_LABELS = ["Stabilize", "Convert", "Discard"] as const;

export const SIGNAL_KIND_MEANINGS: Record<SignalKind, string> = {
  calm: "healthy signal",
  focus: "useful signal",
  noise: "discardable unstable signal",
  glitch: "dangerous hostile fragment",
};

export const laneCount = 3;
export const initialSpawnIntervalMs = 900;
export const minSpawnIntervalMs = 420;
export const baseFallSpeed = 180;
export const speedVariance = 40;
export const catchZoneHeight = 90;

export const MOCK_SCORE = {
  score: 1280,
  sorted: 24,
  missed: 3,
  survivedSeconds: 78,
};

export const MOCK_SENSORS = {
  bpm: 82,
  focus: 67,
  signalQuality: "high" as const,
  mode: "balanced" as const,
};
