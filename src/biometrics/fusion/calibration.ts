export interface CalibrationSummary {
  baselineBpm: number;
  acceptedSampleCount: number;
}

export function computeMedian(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint];
}

export function computeTrimmedMean(values: number[], trimRatio = 0.15): number | null {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimRatio);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  const source = trimmed.length ? trimmed : sorted;
  const total = source.reduce((sum, value) => sum + value, 0);
  return total / source.length;
}

export function summarizeCalibration(values: number[]): CalibrationSummary | null {
  const median = computeMedian(values);
  const trimmedMean = computeTrimmedMean(values);

  if (median == null || trimmedMean == null) {
    return null;
  }

  return {
    baselineBpm: (median + trimmedMean) / 2,
    acceptedSampleCount: values.length,
  };
}
