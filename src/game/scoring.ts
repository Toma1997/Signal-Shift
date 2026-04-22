import type { Lane, SignalKind } from "./types";

export interface ScoreDelta {
  scoreDelta: number;
  stabilityDelta: number;
  corruptionDelta: number;
  comboDelta: number;
  resetCombo: boolean;
  sortedDelta: number;
  wronglySortedDelta: number;
  missedDelta: number;
}

export function getTargetLane(kind: SignalKind): Lane {
  switch (kind) {
    case "stable_signal":
      return 0;
    case "charge_signal":
      return 1;
    case "interference":
    case "anomaly":
      return 2;
  }
}

export function isCorrectLane(kind: SignalKind, lane: Lane): boolean {
  return getTargetLane(kind) === lane;
}

export function scoreCatch(kind: SignalKind, lane: Lane): ScoreDelta {
  const routedCorrectly = isCorrectLane(kind, lane);

  switch (kind) {
    case "stable_signal":
      return {
        scoreDelta: routedCorrectly ? 8 : -4,
        stabilityDelta: routedCorrectly ? 4 : -2,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
        sortedDelta: routedCorrectly ? 1 : 0,
        wronglySortedDelta: routedCorrectly ? 0 : 1,
        missedDelta: 0,
      };
    case "charge_signal":
      return {
        scoreDelta: routedCorrectly ? 10 : -5,
        stabilityDelta: routedCorrectly ? 3 : -5,
        corruptionDelta: 0,
        comboDelta: routedCorrectly ? 1 : 0,
        resetCombo: !routedCorrectly,
        sortedDelta: routedCorrectly ? 1 : 0,
        wronglySortedDelta: routedCorrectly ? 0 : 1,
        missedDelta: 0,
      };
    case "interference":
      return {
        scoreDelta: routedCorrectly ? 6 : -4,
        stabilityDelta: routedCorrectly ? 2 : -5,
        corruptionDelta: routedCorrectly ? -1 : 2,
        comboDelta: 0,
        resetCombo: false,
        sortedDelta: routedCorrectly ? 1 : 0,
        wronglySortedDelta: routedCorrectly ? 0 : 1,
        missedDelta: 0,
      };
    case "anomaly":
      return {
        scoreDelta: routedCorrectly ? 4 : -8,
        stabilityDelta: routedCorrectly ? 2 : -7,
        corruptionDelta: routedCorrectly ? -2 : 6,
        comboDelta: 0,
        resetCombo: false,
        sortedDelta: routedCorrectly ? 1 : 0,
        wronglySortedDelta: routedCorrectly ? 0 : 1,
        missedDelta: 0,
      };
  }
}

export function scoreMiss(kind: SignalKind, lane: Lane): ScoreDelta {
  const routedCorrectly = isCorrectLane(kind, lane);

  switch (kind) {
    case "stable_signal":
      return {
        scoreDelta: 0,
        stabilityDelta: routedCorrectly ? -4 : 0,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
        sortedDelta: 0,
        wronglySortedDelta: 0,
        missedDelta: routedCorrectly ? 1 : 0,
      };
    case "charge_signal":
      return {
        scoreDelta: 0,
        stabilityDelta: routedCorrectly ? -4 : 0,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: routedCorrectly,
        sortedDelta: 0,
        wronglySortedDelta: 0,
        missedDelta: routedCorrectly ? 1 : 0,
      };
    case "interference":
      return {
        scoreDelta: 0,
        stabilityDelta: routedCorrectly ? -4 : 0,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
        sortedDelta: 0,
        wronglySortedDelta: 0,
        missedDelta: routedCorrectly ? 1 : 0,
      };
    case "anomaly":
      return {
        scoreDelta: 0,
        stabilityDelta: routedCorrectly ? -5 : 0,
        corruptionDelta: routedCorrectly ? 4 : 0,
        comboDelta: 0,
        resetCombo: false,
        sortedDelta: 0,
        wronglySortedDelta: 0,
        missedDelta: routedCorrectly ? 1 : 0,
      };
  }
}

export function shouldGameOver(stability: number, corruption: number): boolean {
  return stability <= 0 || corruption >= 100;
}
