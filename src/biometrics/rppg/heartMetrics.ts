export interface HeartReading {
  bpm: number;
  confidence: number;
  timestampMs: number;
}

export interface HeartReadingInputs {
  bpm: number | null | undefined;
  confidence: number;
  timestampMs: number;
  signalQuality?: number | null;
}

const MIN_CONFIDENCE = 0.5;
const MIN_SIGNAL_QUALITY = 0.45;
const MAX_STEP_BPM = 18;
const SMOOTHING_FACTOR = 0.55;
const STALE_READING_MS = 2200;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function toStableHeartReading(
  previous: HeartReading | null,
  next: HeartReadingInputs,
): HeartReading | null {
  const previousIsFresh =
    previous != null && next.timestampMs - previous.timestampMs <= STALE_READING_MS;

  if (
    next.bpm == null ||
    next.confidence < MIN_CONFIDENCE ||
    (next.signalQuality ?? 1) < MIN_SIGNAL_QUALITY
  ) {
    return previousIsFresh ? previous : null;
  }

  if (!previous) {
    return {
      bpm: next.bpm,
      confidence: next.confidence,
      timestampMs: next.timestampMs,
    };
  }

  const limitedBpm =
    previous.bpm + clamp(next.bpm - previous.bpm, -MAX_STEP_BPM, MAX_STEP_BPM);
  const bpm = previous.bpm + (limitedBpm - previous.bpm) * SMOOTHING_FACTOR;

  return {
    bpm,
    confidence: next.confidence,
    timestampMs: next.timestampMs,
  };
}
