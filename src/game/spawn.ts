import {
  baseFallSpeed,
  getModeGameplayProfile,
  INITIAL_CORRECT_LANE_CHANCE,
  laneCount,
  speedVariance,
} from "./constants";
import { getLateGameRampProgress } from "./difficulty";
import type { BiometricMode, FallingObject, Lane, SignalKind } from "./types";
import { getTargetLane } from "./scoring";

function randomWrongLane(targetLane: Lane): Lane {
  const candidates = Array.from({ length: laneCount }, (_, lane) => lane as Lane).filter(
    (lane) => lane !== targetLane,
  );
  return candidates[Math.floor(Math.random() * candidates.length)] ?? targetLane;
}

function getCorrectLaneChance(elapsedMs: number, mode: BiometricMode): number {
  const profile = getModeGameplayProfile(mode);
  const progress = Math.max(0, Math.min(1, elapsedMs / profile.correctLaneRampDurationMs));
  const lateGameProgress = getLateGameRampProgress(elapsedMs);
  return (
    INITIAL_CORRECT_LANE_CHANCE +
    (profile.correctLaneMaxChance - INITIAL_CORRECT_LANE_CHANCE) * progress +
    profile.lateGameCorrectLaneBonus * lateGameProgress
  );
}

function randomLaneForKind(kind: SignalKind, elapsedMs: number, mode: BiometricMode): Lane {
  const targetLane = getTargetLane(kind);
  const placeInCorrectLane = Math.random() < getCorrectLaneChance(elapsedMs, mode);
  return placeInCorrectLane ? targetLane : randomWrongLane(targetLane);
}

function forceWrongLaneForKind(kind: SignalKind): Lane {
  return randomWrongLane(getTargetLane(kind));
}

function randomKind(mode: BiometricMode): SignalKind {
  const profile = getModeGameplayProfile(mode);
  const anomalyChance = profile.anomalyChance;
  const interferenceChance = profile.interferenceChance;
  const stableChance = (1 - anomalyChance - interferenceChance) / 2;
  const chargeChance = stableChance;
  const roll = Math.random();

  if (roll < stableChance) {
    return "stable_signal";
  }

  if (roll < stableChance + chargeChance) {
    return "charge_signal";
  }

  if (roll < stableChance + chargeChance + interferenceChance) {
    return "interference";
  }

  return "anomaly";
}

function randomSpeedForMode(elapsedMs: number, mode: BiometricMode): number {
  const variance = (Math.random() * 2 - 1) * speedVariance;
  const profile = getModeGameplayProfile(mode);
  const lateGameProgress = getLateGameRampProgress(elapsedMs);
  const timeBonus = Math.min(
    profile.maxTimeSpeedBonus,
    (Math.max(0, elapsedMs) / 60_000) * profile.timeSpeedBonusPerMinute,
  );
  return baseFallSpeed + variance + timeBonus + profile.lateGameSpeedBonus * lateGameProgress;
}

function getClutterChance(elapsedMs: number, mode: BiometricMode): number {
  const profile = getModeGameplayProfile(mode);
  const progress = Math.max(0, Math.min(1, elapsedMs / profile.clutterRampDurationMs));
  return profile.clutterChanceMax * progress;
}

function getSecondaryClutterChance(elapsedMs: number, mode: BiometricMode): number {
  const profile = getModeGameplayProfile(mode);
  const progress = Math.max(0, Math.min(1, elapsedMs / profile.clutterRampDurationMs));
  return profile.secondaryClutterChanceMax * progress;
}

export function spawnRandomObject(
  nowMs: number,
  mode: BiometricMode = "balanced",
  elapsedMs = 0,
): FallingObject {
  const kind = randomKind(mode);
  const profile = getModeGameplayProfile(mode);

  return {
    id: `signal-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    lane: randomLaneForKind(kind, elapsedMs, mode),
    y: -120,
    speed: randomSpeedForMode(elapsedMs, mode),
    spawnedAtMs: nowMs,
    labelVisible: Math.random() >= profile.hiddenLabelChance,
  };
}

export function spawnWrongLaneCompanion(
  nowMs: number,
  mode: BiometricMode = "balanced",
  elapsedMs = 0,
): FallingObject | null {
  if (Math.random() >= getClutterChance(elapsedMs, mode)) {
    return null;
  }

  const profile = getModeGameplayProfile(mode);
  const kind = randomKind(mode);

  return {
    id: `signal-clutter-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    lane: forceWrongLaneForKind(kind),
    y: -120,
    speed: randomSpeedForMode(elapsedMs, mode),
    spawnedAtMs: nowMs,
    labelVisible: Math.random() >= profile.hiddenLabelChance,
  };
}

export function shouldSpawnSecondWrongLaneCompanion(
  elapsedMs: number,
  mode: BiometricMode = "balanced",
): boolean {
  return Math.random() < getSecondaryClutterChance(elapsedMs, mode);
}
