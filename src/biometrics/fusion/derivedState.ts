import {
  BPM_SPIKE_DELTA,
  CALM_BPM_DELTA_MAX,
  CALM_FOCUS_MIN,
  MODE_MIN_HOLD_MS,
  PRESSURE_BPM_DELTA_MIN,
} from "../../game/constants";
import type { DerivedModeState, ModeReason } from "../../game/types";

export interface PressureSnapshot {
  bpmDeltaPct: number | null;
  pressure: number;
  signalReliable: boolean;
}

export interface EegDerivedSnapshot {
  clarityGainPerSecond: number;
}

export interface DeriveBiometricModeInput {
  bpm: number | null | undefined;
  baselineBpm: number | null | undefined;
  focusScore: number | null | undefined;
  previousState?: DerivedModeState | null;
  nowMs: number;
}

const MIN_SIGNAL_QUALITY = 0.2;
const DEFAULT_MODE_STATE: DerivedModeState = {
  currentMode: "balanced",
  previousMode: "balanced",
  reason: "default",
  modeStartedAtMs: null,
  stabilityWindowMs: MODE_MIN_HOLD_MS,
  bpmDeltaPct: 0,
  bpmSpike: false,
  normalizedFocus: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getCandidateModeReason(
  candidateMode: DerivedModeState["currentMode"],
  bpmDeltaPct: number,
  bpmSpike: boolean,
  normalizedFocus: number,
): ModeReason {
  if (bpmSpike) {
    return "bpm_spike";
  }

  if (candidateMode === "pressure") {
    return "high_bpm";
  }

  if (candidateMode === "calm") {
    if (bpmDeltaPct < 0) {
      return "low_bpm";
    }

    if (normalizedFocus >= CALM_FOCUS_MIN) {
      return "high_focus";
    }
  }

  if (Math.abs(bpmDeltaPct) > CALM_BPM_DELTA_MAX || normalizedFocus >= CALM_FOCUS_MIN) {
    return "mixed";
  }

  return "default";
}

export function deriveBiometricMode(
  input: DeriveBiometricModeInput,
): DerivedModeState {
  const previousState = input.previousState ?? DEFAULT_MODE_STATE;
  const normalizedFocus = clamp(input.focusScore ?? 0, 0, 100);
  const hasValidBpm =
    input.bpm != null &&
    input.baselineBpm != null &&
    input.baselineBpm > 0 &&
    Number.isFinite(input.bpm) &&
    Number.isFinite(input.baselineBpm);
  const bpmDeltaPct = hasValidBpm
    ? ((input.bpm as number) - (input.baselineBpm as number)) / (input.baselineBpm as number) * 100
    : 0;
  const bpmSpike = hasValidBpm && bpmDeltaPct >= BPM_SPIKE_DELTA;

  let candidateMode: DerivedModeState["currentMode"] = "balanced";
  if (bpmSpike || bpmDeltaPct >= PRESSURE_BPM_DELTA_MIN) {
    candidateMode = "pressure";
  } else if (
    bpmDeltaPct <= CALM_BPM_DELTA_MAX &&
    normalizedFocus >= CALM_FOCUS_MIN
  ) {
    candidateMode = "calm";
  }

  const candidateReason = getCandidateModeReason(
    candidateMode,
    bpmDeltaPct,
    bpmSpike,
    normalizedFocus,
  );
  const holdActive =
    previousState.modeStartedAtMs != null &&
    input.nowMs - previousState.modeStartedAtMs < MODE_MIN_HOLD_MS;
  const shouldKeepPrevious =
    holdActive &&
    previousState.currentMode !== candidateMode &&
    !bpmSpike;
  const currentMode = shouldKeepPrevious
    ? previousState.currentMode
    : candidateMode;
  const reason = shouldKeepPrevious
    ? previousState.reason
    : candidateReason;
  const modeStartedAtMs =
    currentMode === previousState.currentMode
      ? previousState.modeStartedAtMs
      : input.nowMs;

  return {
    currentMode,
    previousMode: previousState.currentMode,
    reason,
    modeStartedAtMs,
    stabilityWindowMs: MODE_MIN_HOLD_MS,
    bpmDeltaPct,
    bpmSpike,
    normalizedFocus,
  };
}

export function derivePressureSnapshot(
  bpm: number | null | undefined,
  baselineBpm: number | null | undefined,
  signalQuality: number,
): PressureSnapshot {
  const signalReliable = signalQuality >= MIN_SIGNAL_QUALITY;

  if (
    bpm == null ||
    baselineBpm == null ||
    baselineBpm <= 0 ||
    !Number.isFinite(bpm) ||
    !Number.isFinite(baselineBpm) ||
    !signalReliable
  ) {
    return {
      bpmDeltaPct: null,
      pressure: 18,
      signalReliable,
    };
  }

  const bpmDeltaPct = ((bpm - baselineBpm) / baselineBpm) * 100;
  const qualityWeight = clamp((signalQuality - MIN_SIGNAL_QUALITY) / 0.45, 0.4, 1);
  const scaledPressure = bpmDeltaPct * 2.4 * qualityWeight;

  return {
    bpmDeltaPct,
    pressure: clamp(18 + scaledPressure, 0, 100),
    signalReliable,
  };
}

export function deriveEegDerivedSnapshot(
  focusScore: number | null | undefined,
  eegSignalQuality: number | null | undefined,
  fallbackClarityGainPerSecond: number | null | undefined,
): EegDerivedSnapshot {
  if (
    focusScore == null ||
    eegSignalQuality == null ||
    eegSignalQuality < 15 ||
    !Number.isFinite(focusScore)
  ) {
    return {
      clarityGainPerSecond: fallbackClarityGainPerSecond ?? 0,
    };
  }

  return {
    clarityGainPerSecond: fallbackClarityGainPerSecond ?? 0,
  };
}
