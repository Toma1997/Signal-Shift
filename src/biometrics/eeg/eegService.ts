import {
  band_powers,
  initEegWasm,
} from "@elata-biosciences/eeg-web";
import eegWasmUrl from "@elata-biosciences/eeg-web/wasm/eeg_wasm_bg.wasm?url";
import { deriveEegMetrics } from "./eegMetrics";
import { startSyntheticEegAdapter } from "./syntheticAdapter";
import type {
  EegDerivedState,
  EegFrameMetadata,
  EegServiceController,
  StartSyntheticEegServiceOptions,
  SyntheticEegFrame,
} from "./types";

const EEG_CHANNEL_COUNT = 4;
const EEG_SAMPLE_RATE_HZ = 256;
const EEG_FRAME_SIZE = 32;

let eegWasmInitPromise: Promise<void> | null = null;

async function ensureEegWasmReady(): Promise<void> {
  if (!eegWasmInitPromise) {
    eegWasmInitPromise = initEegWasm(eegWasmUrl).then(() => undefined);
  }

  await eegWasmInitPromise;
}

function getFrameMetadata(frame: SyntheticEegFrame, channelCount: number): EegFrameMetadata {
  return {
    sampleRateHz: frame.sampleRateHz,
    timestampMs: frame.timestampMs,
    sampleCount: frame.samples.length,
    channelCount,
    synthetic: true,
  };
}

function getPrimaryChannel(samples: Float32Array, channelCount: number): Float32Array {
  const sampleFrames = Math.floor(samples.length / channelCount);
  const channelSamples = new Float32Array(sampleFrames);

  for (let sampleIndex = 0; sampleIndex < sampleFrames; sampleIndex += 1) {
    channelSamples[sampleIndex] = samples[sampleIndex * channelCount] ?? 0;
  }

  return channelSamples;
}

function deriveMetrics(
  samples: Float32Array,
  sampleRateHz: number,
  channelCount: number,
  previousDerivedState: EegDerivedState | null,
): EegDerivedState {
  const primaryChannel = getPrimaryChannel(samples, channelCount);
  const powers = band_powers(primaryChannel, sampleRateHz);

  try {
    return deriveEegMetrics({
      bandPowers: {
        alpha: powers.alpha,
        beta: powers.beta,
        theta: powers.theta,
        total: powers.total,
      },
      previousFocusScore: previousDerivedState?.focusScore ?? null,
      previousClarityCharge: previousDerivedState?.clarityCharge ?? null,
      previousClarityGainPerSecond:
        previousDerivedState?.clarityGainPerSecond ?? null,
    });
  } finally {
    powers.free();
  }
}

export async function startSyntheticEegService(
  options: StartSyntheticEegServiceOptions = {},
): Promise<EegServiceController> {
  const {
    onStatus,
    onFrameMetadata,
    onDerivedState,
    onError,
  } = options;

  try {
    onStatus?.("initializing");
    await ensureEegWasmReady();
    let latestDerivedState: EegDerivedState | null = null;

    const adapter = startSyntheticEegAdapter({
      sampleRateHz: EEG_SAMPLE_RATE_HZ,
      channelCount: EEG_CHANNEL_COUNT,
      frameSize: EEG_FRAME_SIZE,
      onFrame: (frame) => {
        const metadata = getFrameMetadata(frame, EEG_CHANNEL_COUNT);
        const samples = Float32Array.from(frame.samples);
        const derived = deriveMetrics(
          samples,
          frame.sampleRateHz,
          EEG_CHANNEL_COUNT,
          latestDerivedState,
        );
        latestDerivedState = derived;

        onFrameMetadata?.(metadata);
        onDerivedState?.(derived);
        onStatus?.("ready");
      },
    });

    return {
      stop: async () => {
        adapter.stop();
        onStatus?.("idle");
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start synthetic EEG.";
    onStatus?.("error");
    onError?.(message);
    throw error;
  }
}

export type { EegServiceController };
