import { initialSpawnIntervalMs, minSpawnIntervalMs } from "./constants";
import type { FallingObject, SignalKind } from "./types";

export interface SpawnPressureInputs {
  elapsedMs: number;
  pressure?: number;
  signalReliable?: boolean;
}

export function getSpawnIntervalMs({
  elapsedMs,
  pressure = 18,
  signalReliable = false,
}: SpawnPressureInputs): number {
  const elapsedReduction = Math.floor(Math.max(0, elapsedMs) / 10000) * 40;
  const pressureReduction = signalReliable ? Math.round((pressure / 100) * 140) : 0;
  const nextInterval = initialSpawnIntervalMs - elapsedReduction - pressureReduction;
  return Math.max(minSpawnIntervalMs, nextInterval);
}

function chooseWeightedKind(pressure: number): SignalKind {
  const normalizedPressure = Math.max(0, Math.min(1, pressure / 100));
  const weights: Array<{ kind: SignalKind; weight: number }> = [
    { kind: "stable_signal", weight: 3.2 - normalizedPressure * 0.7 },
    { kind: "charge_signal", weight: 3.1 - normalizedPressure * 0.4 },
    { kind: "interference", weight: 2.7 + normalizedPressure * 1.5 },
    { kind: "anomaly", weight: 1.1 + normalizedPressure * 1.0 },
  ];

  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const entry of weights) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.kind;
    }
  }

  return "interference";
}

export function applyPressureToSpawnObject(
  object: FallingObject,
  pressure: number,
  signalReliable: boolean,
): FallingObject {
  if (!signalReliable) {
    return object;
  }

  const normalizedPressure = Math.max(0, Math.min(1, pressure / 100));

  return {
    ...object,
    kind: chooseWeightedKind(pressure),
    speed: object.speed + normalizedPressure * 22,
  };
}
