export type EegStatus = "idle" | "initializing" | "ready" | "error";

export interface SyntheticEegFrame {
  samples: Float64Array;
  sampleRateHz: number;
  timestampMs: number;
  synthetic: true;
}

export interface EegFrameMetadata {
  sampleRateHz: number;
  timestampMs: number;
  sampleCount: number;
  channelCount: number;
  synthetic: true;
}

export interface EegDerivedState {
  alphaPower: number;
  betaPower: number;
  thetaPower: number;
  channelLevels: number[];
  focusScore: number | null;
  clarityCharge: number | null;
  clarityGainPerSecond: number | null;
  eegSignalQuality: number;
}

export interface EegServiceState {
  status: EegStatus;
  latestFrameMetadata: EegFrameMetadata | null;
  alphaPower: number | null;
  betaPower: number | null;
  thetaPower: number | null;
  latestFocusScore: number | null;
  clarityCharge: number | null;
  clarityGainPerSecond: number | null;
  eegSignalQuality: number;
  enabled: boolean;
  calibrationSamplesCollected: number;
  error?: string;
}

export interface SyntheticEegAdapterOptions {
  sampleRateHz?: number;
  channelCount?: number;
  frameSize?: number;
  onFrame: (frame: SyntheticEegFrame) => void;
}

export interface SyntheticEegAdapterController {
  stop: () => void;
}

export interface StartSyntheticEegServiceOptions {
  onStatus?: (status: EegStatus) => void;
  onFrameMetadata?: (metadata: EegFrameMetadata) => void;
  onDerivedState?: (state: EegDerivedState) => void;
  onError?: (message: string) => void;
}

export interface EegServiceController {
  stop: () => Promise<void>;
}
