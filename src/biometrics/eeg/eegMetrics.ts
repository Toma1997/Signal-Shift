import type { EegDerivedState } from "./types";
import { clamp, lerp } from "../../utils/math";

export interface RawEegBandPowers {
  alpha: number;
  beta: number;
  theta: number;
  total: number;
}

export interface EegMetricInputs {
  bandPowers: RawEegBandPowers;
  previousFocusScore: number | null;
  previousClarityCharge: number | null;
  previousClarityGainPerSecond: number | null;
}

const FOCUS_RATIO_EPSILON = 0.0001;
const FOCUS_RATIO_MIN = 0.6;
const FOCUS_RATIO_MAX = 1.8;
const FOCUS_SMOOTHING_ALPHA = 0.18;
const CLARITY_CHARGE_SMOOTHING_ALPHA = 0.16;
const CLARITY_GAIN_SMOOTHING_ALPHA = 0.2;
const SIGNAL_QUALITY_FLOOR_TOTAL_POWER = 0.08;
const SIGNAL_QUALITY_FULL_TOTAL_POWER = 0.42;
const BASE_CLARITY_GAIN_PER_SECOND = 0.06;
const MAX_CLARITY_GAIN_PER_SECOND = 1.8;

function normalizeFocusRatio(alphaPower: number, betaPower: number): number {
  // First-pass focus proxy: stronger alpha relative to beta pushes the score up.
  const focusRatio = alphaPower / Math.max(betaPower, FOCUS_RATIO_EPSILON);
  const normalized =
    (focusRatio - FOCUS_RATIO_MIN) / (FOCUS_RATIO_MAX - FOCUS_RATIO_MIN);

  return clamp(normalized * 100, 0, 100);
}

function normalizeSignalQuality(totalPower: number): number {
  // Synthetic EEG has no true SDK confidence yet, so total power is a simple placeholder.
  const normalized =
    (totalPower - SIGNAL_QUALITY_FLOOR_TOTAL_POWER) /
    (SIGNAL_QUALITY_FULL_TOTAL_POWER - SIGNAL_QUALITY_FLOOR_TOTAL_POWER);

  return clamp(normalized * 100, 0, 100);
}

function smoothValue(previous: number | null, next: number, alpha: number): number {
  return previous == null ? next : lerp(previous, next, alpha);
}

export function deriveEegMetrics({
  bandPowers,
  previousFocusScore,
  previousClarityCharge,
  previousClarityGainPerSecond,
}: EegMetricInputs): EegDerivedState {
  const rawFocusScore = normalizeFocusRatio(bandPowers.alpha, bandPowers.beta);
  const focusScore = smoothValue(
    previousFocusScore,
    rawFocusScore,
    FOCUS_SMOOTHING_ALPHA,
  );

  const rawClarityCharge = clamp(
    bandPowers.alpha * 120 + bandPowers.beta * 55,
    0,
    100,
  );
  const clarityCharge = smoothValue(
    previousClarityCharge,
    rawClarityCharge,
    CLARITY_CHARGE_SMOOTHING_ALPHA,
  );

  // Gameplay can later treat this as a simple passive charge rate driven by focus.
  const focusIntensity = Math.pow(focusScore / 100, 2);
  const rawClarityGainPerSecond =
    BASE_CLARITY_GAIN_PER_SECOND +
    (MAX_CLARITY_GAIN_PER_SECOND - BASE_CLARITY_GAIN_PER_SECOND) * focusIntensity;
  const clarityGainPerSecond = smoothValue(
    previousClarityGainPerSecond,
    rawClarityGainPerSecond,
    CLARITY_GAIN_SMOOTHING_ALPHA,
  );

  return {
    alphaPower: bandPowers.alpha,
    betaPower: bandPowers.beta,
    thetaPower: bandPowers.theta,
    focusScore,
    clarityCharge,
    clarityGainPerSecond,
    eegSignalQuality: normalizeSignalQuality(bandPowers.total),
  };
}

export const EEG_METRIC_CONSTANTS = {
  FOCUS_RATIO_EPSILON,
  FOCUS_RATIO_MIN,
  FOCUS_RATIO_MAX,
  FOCUS_SMOOTHING_ALPHA,
  CLARITY_CHARGE_SMOOTHING_ALPHA,
  CLARITY_GAIN_SMOOTHING_ALPHA,
  SIGNAL_QUALITY_FLOOR_TOTAL_POWER,
  SIGNAL_QUALITY_FULL_TOTAL_POWER,
  BASE_CLARITY_GAIN_PER_SECOND,
  MAX_CLARITY_GAIN_PER_SECOND,
} as const;
