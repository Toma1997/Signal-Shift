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

const POLL_INTERVAL_MS = 300;
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
  video.style.left = "-10000px";
  video.style.top = "0";
  video.style.width = "640px";
  video.style.height = "480px";
  video.style.opacity = "0.001";
  video.style.pointerEvents = "none";
  video.srcObject = stream;
  document.body.appendChild(video);
  return video;
}

function buildMessage(diagnostics: RppgSessionDiagnostics): string {
  if (diagnostics.issues.includes("insufficient_window")) {
    return "Gathering enough samples for BPM.";
  }

  if (diagnostics.issues.includes("low_skin_ratio")) {
    return "Move closer and keep your face centered for a stronger signal.";
  }

  if (diagnostics.issues.includes("backend_unavailable")) {
    return "Elata rPPG backend is unavailable.";
  }

  return diagnostics.state.status;
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
      sampleRate: 30,
      backend: "auto",
      faceMesh: "auto",
      wasmJsUrl: rppgWasmJsUrl,
      wasmBinaryUrl: rppgWasmBinaryUrl,
      ensureVideoPlayback: true,
      autoStart: true,
      onDiagnostics: (diagnostics: RppgSessionDiagnostics) => {
        const metrics = session?.getMetrics();
        const ready =
          diagnostics.backendMode !== "unavailable" &&
          (metrics?.bpm != null || diagnostics.estimationAvailable);

        handlers.onDiagnostics?.({
          confidence: metrics?.confidence ?? 0,
          signalQuality: metrics?.signal_quality ?? 0,
          backendAvailable: diagnostics.backendMode !== "unavailable",
          issues: diagnostics.issues,
          message: buildMessage(diagnostics),
          ready,
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
        confidence: metrics.confidence ?? 0,
        signalQuality: metrics.signal_quality ?? 0,
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
          await session.dispose();
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
      await session.dispose();
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
