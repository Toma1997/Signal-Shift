import type { BiometricMode, SignalKind } from "./types";

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
export const SPAWN_ACCELERATION_STEP_MS = 7_000;
export const INITIAL_CORRECT_LANE_CHANCE = 0.58;
export const LATE_GAME_RAMP_START_MS = 45_000;
export const LATE_GAME_RAMP_FULL_MS = 60_000;
export const catchZoneHeight = 90;
export const CLARITY_METER_MAX = 100;
export const CLARITY_PULSE_COST = 100;
export const CLARITY_PULSE_DURATION_MS = 2200;
export const CLARITY_PULSE_SPEED_MULTIPLIER = 0.72;
export const CALM_BPM_DELTA_MAX = 6;
export const PRESSURE_BPM_DELTA_MIN = 16;
export const BPM_SPIKE_DELTA = 22;
export const CALM_FOCUS_MIN = 58;
export const MODE_MIN_HOLD_MS = 5000;
export const EVENT_COOLDOWN_MS = 12000;
export const EVENT_INITIAL_DELAY_MS = 9000;
export const BRAIN_FOG_DURATION_MS = 5000;
export const PRESSURE_SPIKE_DURATION_MS = 4500;
export const CLEAR_WINDOW_DURATION_MS = 5000;
export const STATIC_LEAK_DURATION_MS = 5500;
export const PRESSURE_SPIKE_SPAWN_INTERVAL_MULTIPLIER = 0.84;
export const CLEAR_WINDOW_SPAWN_INTERVAL_MULTIPLIER = 1.1;
export const BRAIN_FOG_HIDDEN_LABEL_BONUS = 0.32;
export const CLEAR_WINDOW_CLARITY_GAIN_MULTIPLIER = 1.2;
export const STATIC_LEAK_SCORE_PENALTY = 1;
export const STATIC_LEAK_STABILITY_PENALTY = 0;
export const SAFE_MIN_SPAWN_INTERVAL_MS = 520;
export const PRESSURE_CLARITY_PULSE_SPEED_MULTIPLIER = 0.62;
export const PRESSURE_SPIKE_CLARITY_PULSE_SPEED_MULTIPLIER = 0.56;
export const MAX_ANOMALIES_BALANCED = 1;
export const MAX_ANOMALIES_CALM = 1;
export const MAX_ANOMALIES_PRESSURE = 2;

export interface ModeGameplayProfile {
  spawnMultiplier: number;
  anomalyChance: number;
  interferenceChance: number;
  hiddenLabelChance: number;
  scoreMultiplier: number;
  spawnAccelerationPerStepMs: number;
  maxTimeSpawnReductionMs: number;
  correctLaneMaxChance: number;
  correctLaneRampDurationMs: number;
  timeSpeedBonusPerMinute: number;
  maxTimeSpeedBonus: number;
  lateGameSpawnReductionBonusMs: number;
  lateGameCorrectLaneBonus: number;
  lateGameSpeedBonus: number;
  fieldSpeedGainPerMinute: number;
  maxFieldSpeedBonus: number;
  clutterChanceMax: number;
  clutterRampDurationMs: number;
  maxSpawnBurstCount: number;
  secondaryClutterChanceMax: number;
}

const MODE_GAMEPLAY_PROFILES: Record<BiometricMode, ModeGameplayProfile> = {
  balanced: {
    spawnMultiplier: 1,
    anomalyChance: 0.1,
    interferenceChance: 0.22,
    hiddenLabelChance: 0.08,
    scoreMultiplier: 1,
    spawnAccelerationPerStepMs: 62,
    maxTimeSpawnReductionMs: 390,
    correctLaneMaxChance: 0.84,
    correctLaneRampDurationMs: 75_000,
    timeSpeedBonusPerMinute: 22,
    maxTimeSpeedBonus: 48,
    lateGameSpawnReductionBonusMs: 36,
    lateGameCorrectLaneBonus: 0.03,
    lateGameSpeedBonus: 6,
    fieldSpeedGainPerMinute: 0.08,
    maxFieldSpeedBonus: 0.28,
    clutterChanceMax: 0.42,
    clutterRampDurationMs: 70_000,
    maxSpawnBurstCount: 4,
    secondaryClutterChanceMax: 0.12,
  },
  calm: {
    spawnMultiplier: 0.88,
    anomalyChance: 0.08,
    interferenceChance: 0.2,
    hiddenLabelChance: 0.22,
    scoreMultiplier: 1,
    spawnAccelerationPerStepMs: 44,
    maxTimeSpawnReductionMs: 250,
    correctLaneMaxChance: 0.8,
    correctLaneRampDurationMs: 95_000,
    timeSpeedBonusPerMinute: 14,
    maxTimeSpeedBonus: 28,
    lateGameSpawnReductionBonusMs: 18,
    lateGameCorrectLaneBonus: 0.02,
    lateGameSpeedBonus: 3,
    fieldSpeedGainPerMinute: 0.05,
    maxFieldSpeedBonus: 0.16,
    clutterChanceMax: 0.28,
    clutterRampDurationMs: 85_000,
    maxSpawnBurstCount: 3,
    secondaryClutterChanceMax: 0.06,
  },
  pressure: {
    spawnMultiplier: 1.18,
    anomalyChance: 0.16,
    interferenceChance: 0.3,
    hiddenLabelChance: 0.1,
    scoreMultiplier: 1.1,
    spawnAccelerationPerStepMs: 78,
    maxTimeSpawnReductionMs: 460,
    correctLaneMaxChance: 0.88,
    correctLaneRampDurationMs: 60_000,
    timeSpeedBonusPerMinute: 30,
    maxTimeSpeedBonus: 60,
    lateGameSpawnReductionBonusMs: 58,
    lateGameCorrectLaneBonus: 0.05,
    lateGameSpeedBonus: 10,
    fieldSpeedGainPerMinute: 0.12,
    maxFieldSpeedBonus: 0.4,
    clutterChanceMax: 0.62,
    clutterRampDurationMs: 42_000,
    maxSpawnBurstCount: 5,
    secondaryClutterChanceMax: 0.2,
  },
};

export function getModeGameplayProfile(mode: BiometricMode): ModeGameplayProfile {
  return MODE_GAMEPLAY_PROFILES[mode];
}

export const MOCK_SCORE = {
  score: 1280,
  sorted: 24,
  wronglySorted: 2,
  missed: 3,
  survivedSeconds: 78,
};

export const MOCK_SENSORS = {
  bpm: 82,
  focus: 67,
  signalQuality: "high" as const,
  mode: "balanced" as const,
};
