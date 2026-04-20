export interface PressureSnapshot {
  bpmDeltaPct: number | null;
  pressure: number;
  signalReliable: boolean;
}

export interface EegDerivedSnapshot {
  clarityGainPerSecond: number;
}

const MIN_SIGNAL_QUALITY = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
