export interface PressureSnapshot {
  bpmDeltaPct: number | null;
  pressure: number;
  signalReliable: boolean;
}

const MIN_SIGNAL_QUALITY = 0.45;

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
  const positiveDelta = Math.max(0, bpmDeltaPct);
  const scaledPressure = positiveDelta * 2.3;

  return {
    bpmDeltaPct,
    pressure: clamp(18 + scaledPressure, 0, 100),
    signalReliable,
  };
}
