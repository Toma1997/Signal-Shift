import { create } from "zustand";
import {
  deriveBiometricMode,
  derivePressureSnapshot,
} from "../biometrics/fusion/derivedState";
import {
  startSyntheticEegService,
  type EegServiceController,
} from "../biometrics/eeg/eegService";
import type {
  EegFrameMetadata,
  EegStatus,
} from "../biometrics/eeg/types";
import {
  summarizeCalibration,
} from "../biometrics/fusion/calibration";
import type { WebcamState } from "../biometrics/types";
import type { HeartReading } from "../biometrics/rppg/heartMetrics";
import { toStableHeartReading } from "../biometrics/rppg/heartMetrics";
import {
  startRppgService,
  type RppgDiagnosticsSnapshot,
  type RppgServiceController,
} from "../biometrics/rppg/rppgService";
import {
  requestWebcamPermission,
  startWebcamStream,
  stopWebcamStream,
} from "../biometrics/rppg/webcamService";
import { MOCK_SENSORS, MODE_MIN_HOLD_MS } from "../game/constants";
import type { DerivedModeState, SensorSnapshot } from "../game/types";

interface CalibrationState {
  status: "idle" | "collecting" | "complete" | "error";
  complete: boolean;
  durationMs: number;
  startedAtMs: number | null;
  progress: number;
  acceptedSampleCount: number;
  baselineBpm: number | null;
  latestAcceptedBpm: number | null;
  acceptedReadings: number[];
  baselineFocusScore: number | null;
  focusSampleCount: number;
  latestAcceptedFocusScore: number | null;
  focusAcceptedReadings: number[];
  error?: string;
}

interface SensorState {
  sensors: SensorSnapshot;
  derivedModeState: DerivedModeState;
  webcam: WebcamState;
  webcamStream: MediaStream | null;
  heartReading: HeartReading | null;
  lastLiveBpm: number | null;
  bpmHistory: number[];
  heartConfidence: number;
  heartSignalQuality: number;
  baselineBpm: number | null;
  bpmDeltaPct: number | null;
  pressureLevel: number;
  signalReliable: boolean;
  eegStatus: EegStatus;
  latestEegFrameMetadata: EegFrameMetadata | null;
  latestEegChannelLevels: number[];
  eegFocusHistory: number[];
  eegChannelHistories: number[][];
  eegAlphaPower: number | null;
  eegBetaPower: number | null;
  eegThetaPower: number | null;
  eegSignalQuality: number;
  latestEegFocusScore: number | null;
  clarityCharge: number | null;
  clarityGainPerSecond: number | null;
  eegEnabled: boolean;
  eegCalibrationSamplesCollected: number;
  rppgStatus: "idle" | "initializing" | "running" | "error";
  rppgError?: string;
  eegError?: string;
  calibration: CalibrationState;
  setMode: (mode: SensorSnapshot["mode"]) => void;
  requestCameraPermission: () => Promise<boolean>;
  startCameraStream: () => Promise<void>;
  stopCameraStream: () => void;
  startHeartRateStream: (video?: HTMLVideoElement | null) => Promise<void>;
  stopHeartRateStream: () => Promise<void>;
  startSyntheticEeg: () => Promise<void>;
  stopSyntheticEeg: () => Promise<void>;
  startCalibration: () => boolean;
  cancelCalibration: () => void;
}

const initialWebcamState: WebcamState = {
  permissionGranted: false,
  status: "idle",
  isStreaming: false,
};

let activeRppgController: RppgServiceController | null = null;
let activeEegController: EegServiceController | null = null;
let calibrationTimer: number | null = null;
const CALIBRATION_DURATION_MS = 8_000;
const MIN_CALIBRATION_CONFIDENCE = 0.45;
const MAX_BPM_HISTORY = 2400;
const DEFAULT_DERIVED_MODE_STATE: DerivedModeState = {
  currentMode: "balanced",
  previousMode: "balanced",
  reason: "default",
  modeStartedAtMs: null,
  stabilityWindowMs: MODE_MIN_HOLD_MS,
  bpmDeltaPct: 0,
  bpmSpike: false,
  normalizedFocus: 0,
};

function createInitialCalibrationState(): CalibrationState {
  return {
    status: "idle",
    complete: false,
    durationMs: CALIBRATION_DURATION_MS,
    startedAtMs: null,
    progress: 0,
    acceptedSampleCount: 0,
    baselineBpm: null,
    latestAcceptedBpm: null,
    acceptedReadings: [],
    baselineFocusScore: null,
    focusSampleCount: 0,
    latestAcceptedFocusScore: null,
    focusAcceptedReadings: [],
  };
}

function clearCalibrationTimer(): void {
  if (calibrationTimer != null) {
    window.clearInterval(calibrationTimer);
    calibrationTimer = null;
  }
}

function getDerivedPressureState(
  bpm: number | null | undefined,
  baselineBpm: number | null | undefined,
  signalQuality: number,
) {
  const snapshot = derivePressureSnapshot(bpm, baselineBpm, signalQuality);

  return {
    baselineBpm: baselineBpm ?? null,
    bpmDeltaPct: snapshot.bpmDeltaPct,
    pressureLevel: snapshot.pressure,
    signalReliable: snapshot.signalReliable,
  };
}

function getDerivedModeState(
  bpm: number | null | undefined,
  baselineBpm: number | null | undefined,
  focusScore: number | null | undefined,
  previousState: DerivedModeState | null | undefined,
  nowMs: number,
) {
  const derivedModeState = deriveBiometricMode({
    bpm,
    baselineBpm,
    focusScore,
    previousState,
    nowMs,
  });

  return {
    derivedModeState,
    sensorsMode: derivedModeState.currentMode,
  };
}

function finalizeCalibration(): void {
  clearCalibrationTimer();

  const { calibration } = useSensorStore.getState();
  const summary = summarizeCalibration(calibration.acceptedReadings);
  const focusReadings = calibration.focusAcceptedReadings;
  const baselineFocusScore =
    focusReadings.length > 0
      ? [...focusReadings].sort((a, b) => a - b)[Math.floor(focusReadings.length / 2)] ?? null
      : null;

  if (!summary || baselineFocusScore == null) {
    useSensorStore.setState((state) => ({
      calibration: {
        ...state.calibration,
        status: "error",
        complete: false,
        progress: 1,
        error:
          summary == null
            ? "Not enough stable BPM samples yet. Keep the camera steady and try again."
            : "Not enough stable synthetic EEG samples yet. Keep EEG running and try again.",
      },
    }));
    return;
  }

  useSensorStore.setState((state) => ({
    ...(() => {
      const nextMode = getDerivedModeState(
        state.heartReading?.bpm ?? state.lastLiveBpm,
        summary.baselineBpm,
        state.latestEegFocusScore,
        state.derivedModeState,
        Date.now(),
      );

      return {
        derivedModeState: nextMode.derivedModeState,
        sensors: {
          ...state.sensors,
          mode: nextMode.sensorsMode,
        },
      };
    })(),
    calibration: {
      ...state.calibration,
      status: "complete",
      complete: true,
      progress: 1,
      baselineBpm: summary.baselineBpm,
      acceptedSampleCount: summary.acceptedSampleCount,
      baselineFocusScore,
      focusSampleCount: focusReadings.length,
      error: undefined,
    },
    ...getDerivedPressureState(
      state.heartReading?.bpm ?? null,
      summary.baselineBpm,
      state.heartSignalQuality,
    ),
  }));
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera permission was denied.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera device was found.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to start the camera.";
}

export const useSensorStore = create<SensorState>((set) => ({
  sensors: MOCK_SENSORS,
  derivedModeState: DEFAULT_DERIVED_MODE_STATE,
  webcam: initialWebcamState,
  webcamStream: null,
  heartReading: null,
  lastLiveBpm: null,
  bpmHistory: [],
  heartConfidence: 0,
  heartSignalQuality: 0,
  baselineBpm: null,
  bpmDeltaPct: null,
  pressureLevel: 18,
  signalReliable: false,
  eegStatus: "idle",
  latestEegFrameMetadata: null,
  latestEegChannelLevels: [],
  eegFocusHistory: [],
  eegChannelHistories: [[], [], [], []],
  eegAlphaPower: null,
  eegBetaPower: null,
  eegThetaPower: null,
  eegSignalQuality: 0,
  latestEegFocusScore: null,
  clarityCharge: null,
  clarityGainPerSecond: null,
  eegEnabled: false,
  eegCalibrationSamplesCollected: 0,
  rppgStatus: "idle",
  eegError: undefined,
  calibration: createInitialCalibrationState(),
  setMode: (mode) =>
    set((state) => ({
      derivedModeState: {
        ...state.derivedModeState,
        previousMode: state.derivedModeState.currentMode,
        currentMode: mode,
        reason: "default",
        modeStartedAtMs: Date.now(),
      },
      sensors: {
        ...state.sensors,
        mode,
      },
    })),
  requestCameraPermission: async () => {
    set((state) => ({
      webcam: {
        ...state.webcam,
        status: "initializing",
        streamError: undefined,
      },
    }));

    try {
      const stream = await requestWebcamPermission();
      stopWebcamStream(stream);

      set((state) => ({
        webcam: {
          ...state.webcam,
          permissionGranted: true,
          status: state.webcam.isStreaming ? "ready" : "idle",
          streamError: undefined,
        },
      }));

      return true;
    } catch (error) {
      set({
        webcam: {
          permissionGranted: false,
          status: "error",
          isStreaming: false,
          streamError: getCameraErrorMessage(error),
        },
        webcamStream: null,
      });

      return false;
    }
  },
  startCameraStream: async () => {
    set((state) => ({
      webcam: {
        ...state.webcam,
        status: "initializing",
        streamError: undefined,
      },
    }));

    try {
      const stream = await startWebcamStream();
      const existingStream = useSensorStore.getState().webcamStream;
      stopWebcamStream(existingStream);

      set({
        webcam: {
          permissionGranted: true,
          status: "ready",
          isStreaming: true,
          streamError: undefined,
        },
        webcamStream: stream,
      });
    } catch (error) {
      const existingStream = useSensorStore.getState().webcamStream;
      stopWebcamStream(existingStream);

      set({
        webcam: {
          permissionGranted: false,
          status: "error",
          isStreaming: false,
          streamError: getCameraErrorMessage(error),
        },
        webcamStream: null,
      });
    }
  },
  stopCameraStream: () => {
    void useSensorStore.getState().stopHeartRateStream();
    void useSensorStore.getState().stopSyntheticEeg();
    clearCalibrationTimer();

    const existingStream = useSensorStore.getState().webcamStream;
    stopWebcamStream(existingStream);

    set((state) => ({
      webcam: {
        ...state.webcam,
        status: "idle",
        isStreaming: false,
        streamError: undefined,
      },
      webcamStream: null,
      baselineBpm: null,
      bpmDeltaPct: null,
      pressureLevel: 18,
      signalReliable: false,
      derivedModeState: DEFAULT_DERIVED_MODE_STATE,
      sensors: {
        ...state.sensors,
        mode: DEFAULT_DERIVED_MODE_STATE.currentMode,
      },
      calibration: createInitialCalibrationState(),
    }));
  },
  startHeartRateStream: async () => {
    const webcamStream = useSensorStore.getState().webcamStream;

    if (!webcamStream) {
      set({
        rppgStatus: "error",
        rppgError: "Start the camera before enabling BPM.",
      });
      return;
    }

    set({
      rppgStatus: "initializing",
      rppgError: undefined,
    });

    await useSensorStore.getState().stopHeartRateStream();

    try {
      activeRppgController = await startRppgService(webcamStream, {
        onReading: (reading) => {
          set((state) => {
            const nextReading = toStableHeartReading(state.heartReading, reading);
            const validCalibrationBpm =
              reading.bpm != null && reading.confidence >= MIN_CALIBRATION_CONFIDENCE
                ? reading.bpm
                : null;
            const isCalibrationSampleValid =
              state.calibration.status === "collecting" &&
              validCalibrationBpm != null;
            const acceptedReadings = isCalibrationSampleValid
              ? [...state.calibration.acceptedReadings, validCalibrationBpm]
              : state.calibration.acceptedReadings;
            const derivedPressure = getDerivedPressureState(
              nextReading?.bpm ?? null,
              state.calibration.baselineBpm,
              reading.signalQuality ?? 0,
            );
            const nextMode = getDerivedModeState(
              nextReading?.bpm ?? state.lastLiveBpm,
              state.calibration.baselineBpm,
              state.latestEegFocusScore,
              state.derivedModeState,
              Date.now(),
            );

            return {
              heartReading: nextReading,
              lastLiveBpm: nextReading?.bpm ?? state.lastLiveBpm,
              bpmHistory:
                nextReading != null
                  ? [...state.bpmHistory, nextReading.bpm].slice(-MAX_BPM_HISTORY)
                  : state.bpmHistory,
              heartConfidence: reading.confidence,
              heartSignalQuality: reading.signalQuality ?? 0,
              ...derivedPressure,
              derivedModeState: nextMode.derivedModeState,
              rppgStatus:
                nextReading || state.rppgStatus === "running"
                  ? "running"
                  : state.rppgStatus,
              rppgError: undefined,
              sensors: {
                ...state.sensors,
                bpm: nextReading?.bpm ?? state.sensors.bpm,
                mode: nextMode.sensorsMode,
              },
              calibration:
                state.calibration.status === "collecting"
                  ? {
                      ...state.calibration,
                      acceptedSampleCount: isCalibrationSampleValid
                        ? state.calibration.acceptedSampleCount + 1
                        : state.calibration.acceptedSampleCount,
                      latestAcceptedBpm: isCalibrationSampleValid
                        ? validCalibrationBpm
                        : state.calibration.latestAcceptedBpm,
                      acceptedReadings,
                    }
                  : state.calibration,
            };
          });
        },
        onDiagnostics: (diagnostics: RppgDiagnosticsSnapshot) => {
          set((state) => ({
            heartConfidence: diagnostics.confidence,
            heartSignalQuality: diagnostics.signalQuality,
            ...getDerivedPressureState(
              state.heartReading?.bpm ?? null,
              state.calibration.baselineBpm,
              diagnostics.signalQuality,
            ),
            rppgStatus:
              !state.webcam.isStreaming
                ? "idle"
                : !diagnostics.backendAvailable
                  ? "error"
                  : diagnostics.ready || state.rppgStatus === "running"
                    ? "running"
                    : "initializing",
            rppgError:
              !diagnostics.backendAvailable
                ? "Elata rPPG backend is unavailable."
                : diagnostics.ready || state.rppgStatus === "running"
                  ? undefined
                  : diagnostics.message,
            sensors: {
              ...state.sensors,
              signalQuality:
                diagnostics.signalQuality >= 0.66
                  ? "high"
                  : diagnostics.signalQuality >= 0.33
                    ? "medium"
                    : "low",
            },
          }));
        },
        onError: (message) => {
          set({
            rppgStatus: "error",
            rppgError: message,
          });
        },
      });

      set((state) => ({
        rppgStatus: state.heartReading ? "running" : "initializing",
        rppgError: undefined,
      }));
    } catch (error) {
      set({
        rppgStatus: "error",
        rppgError:
          error instanceof Error ? error.message : "Unable to start Elata rPPG.",
      });
    }
  },
  stopHeartRateStream: async () => {
    if (activeRppgController) {
      await activeRppgController.stop();
      activeRppgController = null;
    }

    clearCalibrationTimer();

    set({
      heartConfidence: 0,
      heartSignalQuality: 0,
      bpmHistory: [],
      bpmDeltaPct: null,
      pressureLevel: 18,
      signalReliable: false,
      derivedModeState: DEFAULT_DERIVED_MODE_STATE,
      sensors: {
        ...MOCK_SENSORS,
        mode: DEFAULT_DERIVED_MODE_STATE.currentMode,
      },
      rppgStatus: "idle",
      rppgError: undefined,
      calibration: createInitialCalibrationState(),
    });
  },
  startSyntheticEeg: async () => {
    await useSensorStore.getState().stopSyntheticEeg();

    set({
      eegStatus: "initializing",
      eegError: undefined,
      eegEnabled: true,
      latestEegFrameMetadata: null,
      latestEegChannelLevels: [],
      eegFocusHistory: [],
      eegChannelHistories: [[], [], [], []],
      eegAlphaPower: null,
      eegBetaPower: null,
      eegThetaPower: null,
      eegSignalQuality: 0,
      latestEegFocusScore: null,
      clarityCharge: null,
      clarityGainPerSecond: null,
      eegCalibrationSamplesCollected: 0,
    });

    try {
      activeEegController = await startSyntheticEegService({
        onStatus: (status) => {
          useSensorStore.setState((state) => ({
            eegStatus: status,
            eegEnabled: status !== "idle" ? state.eegEnabled : false,
          }));
        },
        onFrameMetadata: (metadata) => {
          useSensorStore.setState((state) => ({
            latestEegFrameMetadata: metadata,
            eegCalibrationSamplesCollected:
              state.eegCalibrationSamplesCollected + metadata.sampleCount,
          }));
        },
        onDerivedState: (derived) => {
          useSensorStore.setState((state) => {
            const validFocusScore =
              state.calibration.status === "collecting" &&
              derived.focusScore != null &&
              derived.eegSignalQuality >= 20
                ? derived.focusScore
                : null;
            const nextFocusAcceptedReadings =
              validFocusScore != null
                ? [...state.calibration.focusAcceptedReadings, validFocusScore]
                : state.calibration.focusAcceptedReadings;
            const nextMode = getDerivedModeState(
              state.heartReading?.bpm ?? state.lastLiveBpm,
              state.calibration.baselineBpm,
              derived.focusScore,
              state.derivedModeState,
              Date.now(),
            );

            return {
              latestEegChannelLevels: derived.channelLevels,
              eegAlphaPower: derived.alphaPower,
              eegBetaPower: derived.betaPower,
              eegThetaPower: derived.thetaPower,
              eegSignalQuality: derived.eegSignalQuality,
              latestEegFocusScore: derived.focusScore,
              eegFocusHistory:
                derived.focusScore != null
                  ? [...state.eegFocusHistory, derived.focusScore].slice(-MAX_BPM_HISTORY)
                  : state.eegFocusHistory,
              eegChannelHistories: state.eegChannelHistories.map((history, index) => {
                const nextLevel = derived.channelLevels[index];
                return nextLevel != null
                  ? [...history, nextLevel].slice(-MAX_BPM_HISTORY)
                  : history;
              }),
              clarityCharge: derived.clarityCharge,
              clarityGainPerSecond: derived.clarityGainPerSecond,
              derivedModeState: nextMode.derivedModeState,
              sensors: {
                ...state.sensors,
                focus: derived.focusScore != null
                  ? Math.round(derived.focusScore)
                  : state.sensors.focus,
                mode: nextMode.sensorsMode,
              },
              calibration:
                state.calibration.status === "collecting"
                  ? {
                      ...state.calibration,
                      focusSampleCount: validFocusScore != null
                        ? state.calibration.focusSampleCount + 1
                        : state.calibration.focusSampleCount,
                      latestAcceptedFocusScore:
                        validFocusScore ?? state.calibration.latestAcceptedFocusScore,
                      focusAcceptedReadings: nextFocusAcceptedReadings,
                    }
                  : state.calibration,
            };
          });
        },
        onError: (message) => {
          useSensorStore.setState({
            eegStatus: "error",
            eegEnabled: false,
            eegError: message,
          });
        },
      });

      set({
        eegEnabled: true,
        eegStatus: "ready",
        eegError: undefined,
      });
    } catch (error) {
      set({
        eegStatus: "error",
        eegEnabled: false,
        eegError:
          error instanceof Error ? error.message : "Unable to start synthetic EEG.",
      });
    }
  },
  stopSyntheticEeg: async () => {
    if (activeEegController) {
      await activeEegController.stop();
      activeEegController = null;
    }

    set({
      eegStatus: "idle",
      eegEnabled: false,
      latestEegFrameMetadata: null,
      latestEegChannelLevels: [],
      eegFocusHistory: [],
      eegChannelHistories: [[], [], [], []],
      eegAlphaPower: null,
      eegBetaPower: null,
      eegThetaPower: null,
      eegSignalQuality: 0,
      latestEegFocusScore: null,
      clarityCharge: null,
      clarityGainPerSecond: null,
      eegCalibrationSamplesCollected: 0,
      derivedModeState: DEFAULT_DERIVED_MODE_STATE,
      sensors: {
        ...MOCK_SENSORS,
        mode: DEFAULT_DERIVED_MODE_STATE.currentMode,
      },
      eegError: undefined,
      calibration: createInitialCalibrationState(),
    });
  },
  startCalibration: () => {
    const state = useSensorStore.getState();

    if (
      !state.webcam.isStreaming ||
      state.rppgStatus !== "running" ||
      (state.heartReading == null && state.lastLiveBpm == null) ||
      state.eegStatus !== "ready" ||
      state.latestEegFocusScore == null
    ) {
      set({
        calibration: {
          ...createInitialCalibrationState(),
          status: "error",
          error: "Start the camera, live BPM, and synthetic EEG before calibrating.",
        },
      });
      return false;
    }

    clearCalibrationTimer();
    const startedAtMs = Date.now();

    set({
      calibration: {
        ...createInitialCalibrationState(),
        status: "collecting",
        startedAtMs,
      },
    });

    calibrationTimer = window.setInterval(() => {
      const currentState = useSensorStore.getState();
      if (currentState.calibration.status !== "collecting") {
        clearCalibrationTimer();
        return;
      }

      const elapsedMs = Date.now() - (currentState.calibration.startedAtMs ?? Date.now());
      const progress = Math.min(1, elapsedMs / currentState.calibration.durationMs);

      useSensorStore.setState((snapshot) => ({
        calibration: {
          ...snapshot.calibration,
          progress,
        },
      }));

      if (elapsedMs >= currentState.calibration.durationMs) {
        finalizeCalibration();
      }
    }, 200);

    return true;
  },
  cancelCalibration: () => {
    clearCalibrationTimer();
    set({
      calibration: createInitialCalibrationState(),
    });
  },
}));
