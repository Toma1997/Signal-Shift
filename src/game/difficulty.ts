import {
  getModeGameplayProfile,
  initialSpawnIntervalMs,
  LATE_GAME_RAMP_FULL_MS,
  LATE_GAME_RAMP_START_MS,
  minSpawnIntervalMs,
  MAX_ANOMALIES_BALANCED,
  MAX_ANOMALIES_CALM,
  MAX_ANOMALIES_PRESSURE,
  SAFE_MIN_SPAWN_INTERVAL_MS,
  SPAWN_ACCELERATION_STEP_MS,
} from "./constants";
import type { BiometricMode, FallingObject } from "./types";

export interface SpawnPressureInputs {
  elapsedMs: number;
  mode: BiometricMode;
}

export function getLateGameRampProgress(elapsedMs: number): number {
  if (elapsedMs <= LATE_GAME_RAMP_START_MS) {
    return 0;
  }

  if (elapsedMs >= LATE_GAME_RAMP_FULL_MS) {
    return 1;
  }

  return (
    (elapsedMs - LATE_GAME_RAMP_START_MS) /
    Math.max(1, LATE_GAME_RAMP_FULL_MS - LATE_GAME_RAMP_START_MS)
  );
}

export function getFieldSpeedMultiplier(
  elapsedMs: number,
  mode: BiometricMode,
): number {
  const modeProfile = getModeGameplayProfile(mode);
  const timeProgressBonus = Math.min(
    modeProfile.maxFieldSpeedBonus,
    (Math.max(0, elapsedMs) / 60_000) * modeProfile.fieldSpeedGainPerMinute,
  );

  return 1 + timeProgressBonus;
}

export function getSpawnIntervalMs({
  elapsedMs,
  mode,
}: SpawnPressureInputs): number {
  const modeProfile = getModeGameplayProfile(mode);
  const lateGameProgress = getLateGameRampProgress(elapsedMs);
  const elapsedReduction = Math.min(
    modeProfile.maxTimeSpawnReductionMs,
    Math.floor(Math.max(0, elapsedMs) / SPAWN_ACCELERATION_STEP_MS) *
      modeProfile.spawnAccelerationPerStepMs,
  );
  const lateGameReduction = Math.round(
    modeProfile.lateGameSpawnReductionBonusMs * lateGameProgress,
  );
  const baseInterval = initialSpawnIntervalMs - elapsedReduction - lateGameReduction;
  const nextInterval = Math.round(baseInterval / modeProfile.spawnMultiplier);
  return Math.max(Math.max(minSpawnIntervalMs, SAFE_MIN_SPAWN_INTERVAL_MS), nextInterval);
}

function getAnomalyCap(mode: BiometricMode): number {
  switch (mode) {
    case "calm":
      return MAX_ANOMALIES_CALM;
    case "pressure":
      return MAX_ANOMALIES_PRESSURE;
    default:
      return MAX_ANOMALIES_BALANCED;
  }
}

export function enforceSpawnFairness(
  object: FallingObject,
  existingObjects: FallingObject[],
  mode: BiometricMode,
): FallingObject {
  if (object.kind !== "anomaly") {
    return object;
  }

  const anomalyCount = existingObjects.filter((entry) => entry.kind === "anomaly").length;
  if (anomalyCount < getAnomalyCap(mode)) {
    return object;
  }

  return {
    ...object,
    kind: "interference",
  };
}
