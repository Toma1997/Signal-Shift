import {
  AthenaWasmDecoder,
  band_powers,
  initEegWasm,
} from "@elata-biosciences/eeg-web";
import { BleTransport } from "@elata-biosciences/eeg-web-ble";
import eegWasmUrl from "@elata-biosciences/eeg-web/wasm/eeg_wasm_bg.wasm?url";
import { deriveEegMetrics } from "./eegMetrics";
import { startSyntheticEegAdapter } from "./syntheticAdapter";
import type {
  EegDerivedState,
  EegFrameMetadata,
  EegServiceController,
  StartEegServiceOptions,
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
    channelNames: Array.from({ length: channelCount }, (_, index) => `Ch${index + 1}`),
    synthetic: true,
    source: "synthetic",
  };
}

function getBleFrameMetadata(
  channelCount: number,
  sampleRateHz: number,
  sampleFrames: number,
  channelNames?: string[],
): EegFrameMetadata {
  return {
    sampleRateHz,
    timestampMs: Date.now(),
    sampleCount: sampleFrames * channelCount,
    channelCount,
    channelNames,
    synthetic: false,
    source: "ble",
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

function getChannelLevels(samples: Float32Array, channelCount: number): number[] {
  const sampleFrames = Math.floor(samples.length / channelCount);
  const sums = new Array<number>(channelCount).fill(0);

  for (let sampleIndex = 0; sampleIndex < sampleFrames; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const value = samples[sampleIndex * channelCount + channelIndex] ?? 0;
      sums[channelIndex] += Math.abs(value);
    }
  }

  return sums.map((sum) => Number((sum / Math.max(1, sampleFrames)).toFixed(2)));
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
    const channelLevels = getChannelLevels(samples, channelCount);
    return deriveEegMetrics({
      bandPowers: {
        alpha: powers.alpha,
        beta: powers.beta,
        theta: powers.theta,
        total: powers.total,
      },
      channelLevels,
      previousFocusScore: previousDerivedState?.focusScore ?? null,
      previousClarityCharge: previousDerivedState?.clarityCharge ?? null,
      previousClarityGainPerSecond:
        previousDerivedState?.clarityGainPerSecond ?? null,
    });
  } finally {
    powers.free();
  }
}

function deriveMetricsFromChannels(
  channelSamples: number[][],
  sampleRateHz: number,
  previousDerivedState: EegDerivedState | null,
): EegDerivedState {
  const primaryChannel = Float32Array.from(channelSamples[0] ?? []);
  const powers = band_powers(primaryChannel, sampleRateHz);

  try {
    const channelLevels = channelSamples.map((samples) => {
      if (samples.length === 0) {
        return 0;
      }

      const average = samples.reduce((sum, value) => sum + Math.abs(value), 0) / samples.length;
      return Number(average.toFixed(2));
    });

    return deriveEegMetrics({
      bandPowers: {
        alpha: powers.alpha,
        beta: powers.beta,
        theta: powers.theta,
        total: powers.total,
      },
      channelLevels,
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
  options: StartEegServiceOptions = {},
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
        onStatus?.("running");
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

export async function startBleEegService(
  options: StartEegServiceOptions = {},
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

    const transport = new BleTransport({
      deviceOptions: {
        athenaDecoderFactory: () => new AthenaWasmDecoder(),
      },
      sourceName: "signal-shift-ble",
    });

    transport.onStatus = (status) => {
      if (status.state === "error") {
        onStatus?.("error");
        onError?.(status.reason ?? "Unable to connect to Bluetooth EEG.");
        return;
      }

      if (status.state === "streaming" || status.state === "connected") {
        onStatus?.("running");
        return;
      }

      if (status.state === "idle" || status.state === "disconnected") {
        onStatus?.("idle");
        return;
      }

      onStatus?.("initializing");
    };

    transport.onFrame = (frame) => {
      const sampleFrames = frame.eeg.samples[0]?.length ?? 0;
      const derived = deriveMetricsFromChannels(
        frame.eeg.samples,
        frame.eeg.sampleRateHz,
        latestDerivedState,
      );
      latestDerivedState = derived;

      onFrameMetadata?.(
        getBleFrameMetadata(
          frame.eeg.channelCount,
          frame.eeg.sampleRateHz,
          sampleFrames,
          frame.eeg.channelNames,
        ),
      );
      onDerivedState?.(derived);
        onStatus?.("running");
    };

    await transport.connect();
    await transport.startStreaming();

    return {
      stop: async () => {
        await transport.stop();
        await transport.disconnect();
        onStatus?.("idle");
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start Bluetooth EEG.";
    onStatus?.("error");
    onError?.(message);
    throw error;
  }
}

export type { EegServiceController };
