import {
  getModeGameplayProfile,
  initialSpawnIntervalMs,
  minSpawnIntervalMs,
  MAX_ANOMALIES_BALANCED,
  MAX_ANOMALIES_CALM,
  MAX_ANOMALIES_PRESSURE,
  SAFE_MIN_SPAWN_INTERVAL_MS,
} from "./constants";
import type { BiometricMode, FallingObject } from "./types";

export interface SpawnPressureInputs {
  elapsedMs: number;
  mode: BiometricMode;
}

export function getSpawnIntervalMs({
  elapsedMs,
  mode,
}: SpawnPressureInputs): number {
  const modeProfile = getModeGameplayProfile(mode);
  const elapsedReduction = Math.floor(Math.max(0, elapsedMs) / 10000) * 40;
  const baseInterval = initialSpawnIntervalMs - elapsedReduction;
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
