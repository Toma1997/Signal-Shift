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
      const envelope =
        1 +
        Math.sin(2 * Math.PI * 0.045 * t + channelIndex * 0.3) * 0.14 +
        Math.sin(2 * Math.PI * 0.018 * t + channelIndex * 0.55) * 0.08;
      const carrier =
        Math.sin(2 * Math.PI * (8 + channelIndex * 0.22) * t) * 8.5 * envelope +
        Math.sin(2 * Math.PI * (10.5 + channelIndex * 0.18) * t) * 3.4 * envelope;
      const beta =
        Math.sin(2 * Math.PI * (15 + channelIndex * 0.25) * t) * 1.8;
      const drift =
        Math.sin(2 * Math.PI * 0.1 * t + channelIndex * 0.45) * 1.4 +
        Math.sin(2 * Math.PI * 0.035 * t + channelIndex * 0.7) * 0.8;

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
