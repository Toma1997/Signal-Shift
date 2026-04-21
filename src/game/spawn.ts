import {
  baseFallSpeed,
  getModeGameplayProfile,
  laneCount,
  speedVariance,
} from "./constants";
import type { BiometricMode, FallingObject, Lane, SignalKind } from "./types";
import { getTargetLane } from "./scoring";

function randomWrongLane(targetLane: Lane): Lane {
  const candidates = Array.from({ length: laneCount }, (_, lane) => lane as Lane).filter(
    (lane) => lane !== targetLane,
  );
  return candidates[Math.floor(Math.random() * candidates.length)] ?? targetLane;
}

function randomLaneForKind(kind: SignalKind): Lane {
  const targetLane = getTargetLane(kind);
  const placeInCorrectLane = Math.random() < 0.58;
  return placeInCorrectLane ? targetLane : randomWrongLane(targetLane);
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

function randomSpeed(): number {
  const variance = (Math.random() * 2 - 1) * speedVariance;
  return baseFallSpeed + variance;
}

export function spawnRandomObject(
  nowMs: number,
  mode: BiometricMode = "balanced",
): FallingObject {
  const kind = randomKind(mode);
  const profile = getModeGameplayProfile(mode);

  return {
    id: `signal-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    lane: randomLaneForKind(kind),
    y: -120,
    speed: randomSpeed(),
    spawnedAtMs: nowMs,
    labelVisible: Math.random() >= profile.hiddenLabelChance,
  };
}
