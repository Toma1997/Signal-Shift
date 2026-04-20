import {
  baseFallSpeed,
  laneCount,
  speedVariance,
} from "./constants";
import type { FallingObject, Lane, SignalKind } from "./types";
import { getTargetLane } from "./scoring";

const KIND_TABLE: Array<{ kind: SignalKind; weight: number }> = [
  { kind: "stable_signal", weight: 3 },
  { kind: "charge_signal", weight: 3 },
  { kind: "interference", weight: 3 },
  { kind: "anomaly", weight: 1.5 },
];

const TOTAL_WEIGHT = KIND_TABLE.reduce((sum, entry) => sum + entry.weight, 0);

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

function randomKind(): SignalKind {
  let threshold = Math.random() * TOTAL_WEIGHT;

  for (const entry of KIND_TABLE) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.kind;
    }
  }

  return "interference";
}

function randomSpeed(): number {
  const variance = (Math.random() * 2 - 1) * speedVariance;
  return baseFallSpeed + variance;
}

export function spawnRandomObject(nowMs: number): FallingObject {
  const kind = randomKind();

  return {
    id: `signal-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    lane: randomLaneForKind(kind),
    y: -120,
    speed: randomSpeed(),
    spawnedAtMs: nowMs,
    labelVisible: Math.random() > 0.35,
  };
}
