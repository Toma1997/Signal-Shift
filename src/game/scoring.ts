import type { SignalKind } from "./types";

export interface ScoreDelta {
  scoreDelta: number;
  stabilityDelta: number;
  corruptionDelta: number;
  comboDelta: number;
  resetCombo: boolean;
}

export function scoreCatch(kind: SignalKind): ScoreDelta {
  switch (kind) {
    case "calm":
      return {
        scoreDelta: 8,
        stabilityDelta: 4,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
      };
    case "focus":
      return {
        scoreDelta: 10,
        stabilityDelta: 0,
        corruptionDelta: 0,
        comboDelta: 1,
        resetCombo: false,
      };
    case "noise":
      return {
        scoreDelta: 6,
        stabilityDelta: 0,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
      };
    case "glitch":
      return {
        scoreDelta: 0,
        stabilityDelta: -10,
        corruptionDelta: 8,
        comboDelta: 0,
        resetCombo: false,
      };
  }
}

export function scoreMiss(kind: SignalKind): ScoreDelta {
  switch (kind) {
    case "calm":
      return {
        scoreDelta: 0,
        stabilityDelta: -4,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
      };
    case "focus":
      return {
        scoreDelta: 0,
        stabilityDelta: 0,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: true,
      };
    case "noise":
      return {
        scoreDelta: 0,
        stabilityDelta: 0,
        corruptionDelta: 0,
        comboDelta: 0,
        resetCombo: false,
      };
    case "glitch":
      return {
        scoreDelta: 0,
        stabilityDelta: -8,
        corruptionDelta: 10,
        comboDelta: 0,
        resetCombo: false,
      };
  }
}

export function shouldGameOver(stability: number, corruption: number): boolean {
  return stability <= 0 || corruption >= 100;
}
