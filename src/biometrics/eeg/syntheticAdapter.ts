import type {
  SyntheticEegAdapterController,
  SyntheticEegAdapterOptions,
  SyntheticEegFrame,
} from "./types";

const DEFAULT_SAMPLE_RATE_HZ = 256;
const DEFAULT_CHANNEL_COUNT = 4;
const DEFAULT_FRAME_SIZE = 32;

function createSyntheticFrame(
  frameIndex: number,
  sampleRateHz: number,
  channelCount: number,
  frameSize: number,
): SyntheticEegFrame {
  const samples = new Float64Array(frameSize * channelCount);
  const baseSampleIndex = frameIndex * frameSize;
  const timestampMs = Math.round((baseSampleIndex / sampleRateHz) * 1000);

  for (let sampleIndex = 0; sampleIndex < frameSize; sampleIndex += 1) {
    const absoluteSample = baseSampleIndex + sampleIndex;
    const t = absoluteSample / sampleRateHz;

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const offset = sampleIndex * channelCount + channelIndex;
      const carrier =
        Math.sin(2 * Math.PI * (8 + channelIndex * 0.6) * t) * 18 +
        Math.sin(2 * Math.PI * (12 + channelIndex * 0.4) * t) * 9;
      const beta =
        Math.sin(2 * Math.PI * (18 + channelIndex * 0.8) * t) * 5;
      const drift =
        Math.sin(2 * Math.PI * 0.2 * t + channelIndex * 0.45) * 3;

      samples[offset] = carrier + beta + drift;
    }
  }

  return {
    samples,
    sampleRateHz,
    timestampMs,
    synthetic: true,
  };
}

export function startSyntheticEegAdapter({
  sampleRateHz = DEFAULT_SAMPLE_RATE_HZ,
  channelCount = DEFAULT_CHANNEL_COUNT,
  frameSize = DEFAULT_FRAME_SIZE,
  onFrame,
}: SyntheticEegAdapterOptions): SyntheticEegAdapterController {
  let frameIndex = 0;
  const intervalMs = Math.max(16, Math.round((frameSize / sampleRateHz) * 1000));

  const emitFrame = () => {
    onFrame(createSyntheticFrame(frameIndex, sampleRateHz, channelCount, frameSize));
    frameIndex += 1;
  };

  emitFrame();
  const intervalId = window.setInterval(emitFrame, intervalMs);

  return {
    stop: () => {
      window.clearInterval(intervalId);
    },
  };
}
