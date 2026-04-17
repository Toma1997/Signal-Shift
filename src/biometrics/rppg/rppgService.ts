import {
  createRppgSession,
  type RppgSession,
  type RppgSessionDiagnostics,
} from "@elata-biosciences/rppg-web";
import rppgWasmJsUrl from "@elata-biosciences/rppg-web/pkg/rppg_wasm.js?url";
import rppgWasmBinaryUrl from "@elata-biosciences/rppg-web/pkg/rppg_wasm_bg.wasm?url";
import type { HeartReadingInputs } from "./heartMetrics";

export interface RppgReading extends HeartReadingInputs {}

export interface RppgDiagnosticsSnapshot {
  confidence: number;
  signalQuality: number;
  backendAvailable: boolean;
  issues: string[];
  message: string;
  ready: boolean;
}

export interface RppgServiceHandlers {
  onReading: (reading: RppgReading) => void;
  onDiagnostics?: (diagnostics: RppgDiagnosticsSnapshot) => void;
  onError?: (message: string) => void;
}

export interface RppgServiceController {
  stop: () => Promise<void>;
}

const POLL_INTERVAL_MS = 250;
const ANALYSIS_VIDEO_ID = "signal-shift-rppg-analysis-video";

function createAnalysisVideo(stream: MediaStream): HTMLVideoElement {
  const existing = document.getElementById(ANALYSIS_VIDEO_ID);
  if (existing instanceof HTMLVideoElement) {
    existing.srcObject = stream;
    return existing;
  }

  const video = document.createElement("video");
  video.id = ANALYSIS_VIDEO_ID;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-hidden", "true");
  video.style.position = "fixed";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.style.bottom = "0";
  video.style.right = "0";
  video.srcObject = stream;
  document.body.appendChild(video);
  return video;
}

export async function startRppgService(
  stream: MediaStream,
  handlers: RppgServiceHandlers,
): Promise<RppgServiceController> {
  let session: RppgSession | null = null;
  let pollTimer: number | null = null;
  let video: HTMLVideoElement | null = null;

  try {
    video = createAnalysisVideo(stream);
    await video.play().catch(() => undefined);

    session = await createRppgSession({
      video,
      backend: "auto",
      faceMesh: "off",
      wasmJsUrl: rppgWasmJsUrl,
      wasmBinaryUrl: rppgWasmBinaryUrl,
      ensureVideoPlayback: true,
      autoStart: true,
      onDiagnostics: (diagnostics: RppgSessionDiagnostics) => {
        const metrics = session?.getMetrics();
        const bpmReady =
          metrics?.bpm != null &&
          (metrics?.confidence ?? 0) >= 0.5 &&
          (metrics?.signal_quality ?? 0) >= 0.45;

        handlers.onDiagnostics?.({
          confidence: metrics?.confidence ?? 0,
          signalQuality: metrics?.signal_quality ?? 0,
          backendAvailable: diagnostics.backendMode !== "unavailable",
          issues: diagnostics.issues,
          message: diagnostics.issues.includes("insufficient_window")
            ? "Gathering enough samples for BPM."
            : diagnostics.state.status,
          ready: bpmReady,
        });
      },
      onError: (error) => {
        handlers.onError?.(error.message);
      },
    });

    pollTimer = window.setInterval(() => {
      if (!session) {
        return;
      }

      const metrics = session.getMetrics();
      handlers.onReading({
        bpm: metrics.bpm ?? null,
        confidence: metrics.confidence,
        signalQuality: metrics.signal_quality,
        timestampMs: Date.now(),
      });
    }, POLL_INTERVAL_MS);

    return {
      stop: async () => {
        if (pollTimer != null) {
          window.clearInterval(pollTimer);
          pollTimer = null;
        }

        if (session) {
          await session.stop();
          session = null;
        }

        if (video) {
          video.pause();
          video.srcObject = null;
          video.remove();
          video = null;
        }
      },
    };
  } catch (error) {
    if (pollTimer != null) {
      window.clearInterval(pollTimer);
    }

    if (session) {
      await session.stop();
    }

    if (video) {
      video.pause();
      video.srcObject = null;
      video.remove();
    }

    handlers.onError?.(
      error instanceof Error ? error.message : "Unable to start Elata camera rPPG.",
    );

    throw error;
  }
}
