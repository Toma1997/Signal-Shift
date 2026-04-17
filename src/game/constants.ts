import type { SignalKind } from "./types";

export const APP_NAME = "Signal Shift";

export const LANE_LABELS = ["Stabilize", "Convert", "Discard"] as const;

export const SIGNAL_KIND_LABELS: Record<SignalKind, string> = {
  stable_signal: "stable signal",
  charge_signal: "charge signal",
  interference: "interference",
  anomaly: "anomaly",
};

export const SIGNAL_KIND_MEANINGS: Record<SignalKind, string> = {
  stable_signal: "stabilized reactor material that belongs in the Stabilize lane",
  charge_signal: "convertible energy packet that belongs in the Convert lane",
  interference: "discardable signal clutter that belongs in the Discard lane",
  anomaly: "hostile system fragment that belongs in the Discard lane",
};

export const SIGNAL_ROUTING_LANES: Record<SignalKind, (typeof LANE_LABELS)[number]> = {
  stable_signal: "Stabilize",
  charge_signal: "Convert",
  interference: "Discard",
  anomaly: "Discard",
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
