export const APP_NAME = "Signal Shift";

export const LANE_LABELS = ["Stabilize", "Convert", "Discard"] as const;

export const MOCK_SCORE = {
  score: 1280,
  sorted: 24,
  missed: 3,
  survivedSeconds: 78,
};

export const MOCK_SENSORS = {
  bpm: 82,
  focus: 67,
  signalQuality: "high" as const,
  mode: "balanced" as const,
};
