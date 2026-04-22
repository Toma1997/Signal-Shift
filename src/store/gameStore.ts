import { create } from "zustand";
import {
  EVENT_COOLDOWN_MS,
  CLARITY_METER_MAX,
  CLARITY_PULSE_COST,
  CLARITY_PULSE_DURATION_MS,
  CLARITY_PULSE_SPEED_MULTIPLIER,
  getModeGameplayProfile,
  PRESSURE_CLARITY_PULSE_SPEED_MULTIPLIER,
  PRESSURE_SPIKE_CLARITY_PULSE_SPEED_MULTIPLIER,
  STATIC_LEAK_SCORE_PENALTY,
  STATIC_LEAK_STABILITY_PENALTY,
  initialSpawnIntervalMs,
} from "../game/constants";
import {
  enforceSpawnFairness,
  getFieldSpeedMultiplier,
  getSpawnIntervalMs,
} from "../game/difficulty";
import {
  advanceObjects,
  isObjectCatchable,
  isObjectMissed,
} from "../game/engine";
import {
  expireTimedEvents,
  getEventGameplayModifiers,
  getEventLabel,
  getStaticLeakLane,
  maybeStartTimedEvent,
} from "../game/events";
import {
  getDevGameplayOverrides,
  installDevGameplayDebugControls,
} from "../game/devDebug";
import { scoreCatch, scoreMiss, shouldGameOver } from "../game/scoring";
import {
  shouldSpawnSecondWrongLaneCompanion,
  spawnRandomObject,
  spawnWrongLaneCompanion,
} from "../game/spawn";
import { useSensorStore } from "./sensorStore";
import type { FallingObject, GameState, Lane, Screen } from "../game/types";
import { GAME_CANVAS_HEIGHT } from "../game/engine";

function createInitialScore() {
  return {
    score: 0,
    sorted: 0,
    wronglySorted: 0,
    missed: 0,
    survivedSeconds: 0,
  };
}

function createInitialState(): GameState {
  return {
    screen: "title",
    startedAtMs: null,
    nowMs: 0,
    playfieldHeight: GAME_CANVAS_HEIGHT,
    playerLane: 1,
    objects: [],
    score: createInitialScore(),
    stability: 100,
    corruption: 0,
    combo: 0,
    itemsCaught: 0,
    itemsMissed: 0,
    spawnIntervalMs: initialSpawnIntervalMs,
    lastSpawnAtMs: 0,
    biometricMode: "balanced",
    modeReason: "default",
    modeChangedAtMs: null,
    activeEvents: [],
    lastEventAtMs: null,
    eventCooldownMs: EVENT_COOLDOWN_MS,
    currentEventLabel: null,
    clarityMeter: 0,
    clarityPulseEndsAtMs: null,
    resultBpmHistory: [],
    resultBaselineBpm: null,
    resultEegFocusHistory: [],
    resultBaselineFocusScore: null,
    resultEegChannelHistories: [[], [], [], []],
    isRunning: false,
    isGameOver: false,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSurvivedSeconds(state: GameState, nowMs: number): number {
  if (state.startedAtMs == null) {
    return 0;
  }

  return Math.max(0, Math.floor((nowMs - state.startedAtMs) / 1000));
}

function buildResultsTelemetrySnapshot() {
  const sensorState = useSensorStore.getState();

  return {
    resultBpmHistory: [...sensorState.bpmHistory],
    resultBaselineBpm: sensorState.baselineBpm,
    resultEegFocusHistory: [...sensorState.eegFocusHistory],
    resultBaselineFocusScore: sensorState.calibration.baselineFocusScore,
    resultEegChannelHistories: sensorState.eegChannelHistories.map((history) => [...history]),
  };
}

installDevGameplayDebugControls();

function applyScoreDelta(
  state: GameState,
  delta: ReturnType<typeof scoreCatch>,
  nextSurvivedSeconds: number,
) {
  const nextStability = clamp(state.stability + delta.stabilityDelta, 0, 100);
  const nextCorruption = clamp(state.corruption + delta.corruptionDelta, 0, 100);
  const nextCombo = delta.resetCombo ? 0 : Math.max(0, state.combo + delta.comboDelta);

  return {
    score: {
      score: Math.max(0, state.score.score + delta.scoreDelta),
      sorted: state.score.sorted + delta.sortedDelta,
      wronglySorted: state.score.wronglySorted + delta.wronglySortedDelta,
      missed: state.score.missed + delta.missedDelta,
      survivedSeconds: nextSurvivedSeconds,
    },
    stability: nextStability,
    corruption: nextCorruption,
    combo: nextCombo,
  };
}

function applyMissDelta(
  state: GameState,
  object: FallingObject,
  nextSurvivedSeconds: number,
) {
  const delta = scoreMiss(object.kind, object.lane);
  const nextStability = clamp(state.stability + delta.stabilityDelta, 0, 100);
  const nextCorruption = clamp(state.corruption + delta.corruptionDelta, 0, 100);
  const nextCombo = delta.resetCombo ? 0 : Math.max(0, state.combo + delta.comboDelta);

  return {
    score: {
      score: Math.max(0, state.score.score + delta.scoreDelta),
      sorted: state.score.sorted + delta.sortedDelta,
      wronglySorted: state.score.wronglySorted + delta.wronglySortedDelta,
      missed: state.score.missed + delta.missedDelta,
      survivedSeconds: nextSurvivedSeconds,
    },
    stability: nextStability,
    corruption: nextCorruption,
    combo: nextCombo,
  };
}

interface GameStore extends GameState {
  setScreen: (screen: Screen) => void;
  startRun: (startedAtMs?: number) => void;
  resetRun: () => void;
  setPlayerLane: (lane: Lane) => void;
  moveLeft: () => void;
  moveRight: () => void;
  setPlayfieldHeight: (height: number) => void;
  activateClarityPulse: () => void;
  tick: (nowMs: number) => void;
  spawnObject: () => void;
  resolveCatchAtPlayerLane: () => void;
  removeMissedObjects: () => void;
  setGameOver: () => void;
  resetScore: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),
  setScreen: (screen) =>
    set((state) => {
      if (screen === "playing" && !state.isRunning) {
        const startedAtMs = performance.now();
        const sensorState = useSensorStore.getState();
        return {
          ...createInitialState(),
          screen: "playing",
          startedAtMs,
          nowMs: startedAtMs,
          lastSpawnAtMs: startedAtMs,
          biometricMode: sensorState.derivedModeState.currentMode,
          modeReason: sensorState.derivedModeState.reason,
          modeChangedAtMs: sensorState.derivedModeState.modeStartedAtMs,
          isRunning: true,
        };
      }

      if (screen === "paused") {
        return {
          screen,
          isRunning: false,
        };
      }

      return { screen };
    }),
  startRun: (startedAtMs = performance.now()) =>
    set(() => {
      const sensorState = useSensorStore.getState();

      return {
        ...createInitialState(),
        screen: "playing",
        startedAtMs,
        nowMs: startedAtMs,
        lastSpawnAtMs: startedAtMs,
        biometricMode: sensorState.derivedModeState.currentMode,
        modeReason: sensorState.derivedModeState.reason,
        modeChangedAtMs: sensorState.derivedModeState.modeStartedAtMs,
        isRunning: true,
      };
    }),
  resetRun: () => set(createInitialState()),
  setPlayerLane: (lane) => set({ playerLane: lane }),
  moveLeft: () =>
    set((state) => ({
      playerLane: (state.playerLane > 0 ? state.playerLane - 1 : 0) as Lane,
    })),
  moveRight: () =>
    set((state) => ({
      playerLane: (state.playerLane < 2 ? state.playerLane + 1 : 2) as Lane,
    })),
  setPlayfieldHeight: (height) =>
    set({
      playfieldHeight: Math.max(260, Math.round(height)),
    }),
  activateClarityPulse: () =>
    set((state) => {
      if (
        !state.isRunning ||
        state.isGameOver ||
        state.clarityPulseEndsAtMs != null ||
        state.clarityMeter < CLARITY_PULSE_COST
      ) {
        return state;
      }

      return {
        clarityMeter: Math.max(0, state.clarityMeter - CLARITY_PULSE_COST),
        clarityPulseEndsAtMs: state.nowMs + CLARITY_PULSE_DURATION_MS,
      };
    }),
  tick: (nowMs) =>
    set((state) => {
      if (!state.isRunning || state.isGameOver) {
        return {
          nowMs,
          score: {
            ...state.score,
            survivedSeconds: getSurvivedSeconds(state, nowMs),
          },
        };
      }

      const dtSeconds =
        state.nowMs === 0 ? 0 : Math.min(0.04, Math.max(0, (nowMs - state.nowMs) / 1000));
      const sensorState = useSensorStore.getState();
      const debugOverrides = getDevGameplayOverrides();
      const elapsedMs =
        state.startedAtMs == null ? 0 : Math.max(0, nowMs - state.startedAtMs);
      const clarityGainPerSecond = sensorState.clarityGainPerSecond ?? 0;
      const clarityPulseActive =
        state.clarityPulseEndsAtMs != null && nowMs < state.clarityPulseEndsAtMs;
      const clarityPulseEndsAtMs = clarityPulseActive ? state.clarityPulseEndsAtMs : null;
      const liveBiometricMode =
        debugOverrides.forcedMode ?? sensorState.derivedModeState.currentMode;
      const activeEvents = expireTimedEvents(nowMs, state);
      const expiredEvent = state.activeEvents[0] && activeEvents.length === 0 ? state.activeEvents[0] : null;
      if (expiredEvent) {
        console.debug("[Signal Shift] Event ended:", getEventLabel(expiredEvent.kind));
      }
      const activeEvent = activeEvents[0] ?? null;
      const eventModifiers = getEventGameplayModifiers(activeEvent);
      const pulseSpeedMultiplier =
        activeEvent?.kind === "pressure_spike"
          ? PRESSURE_SPIKE_CLARITY_PULSE_SPEED_MULTIPLIER
          : liveBiometricMode === "pressure"
            ? PRESSURE_CLARITY_PULSE_SPEED_MULTIPLIER
            : CLARITY_PULSE_SPEED_MULTIPLIER;
      const baseSpawnIntervalMs = getSpawnIntervalMs({
        elapsedMs,
        mode: liveBiometricMode,
      });
      const fieldSpeedMultiplier = getFieldSpeedMultiplier(elapsedMs, liveBiometricMode);
      const nextSpawnIntervalMs = Math.max(
        420,
        Math.round(baseSpawnIntervalMs * eventModifiers.spawnIntervalMultiplier),
      );
      const advancedObjects =
        dtSeconds > 0
          ? advanceObjects(
              state.objects,
              dtSeconds *
                fieldSpeedMultiplier *
                (clarityPulseActive ? pulseSpeedMultiplier : 1),
            )
          : state.objects;
      const nextSurvivedSeconds = getSurvivedSeconds(state, nowMs);
      let nextState: GameState = {
        ...state,
        nowMs,
        objects: advancedObjects,
        spawnIntervalMs: nextSpawnIntervalMs,
        clarityMeter: clamp(
          state.clarityMeter +
            clarityGainPerSecond * eventModifiers.clarityGainMultiplier * dtSeconds,
          0,
          CLARITY_METER_MAX,
        ),
        clarityPulseEndsAtMs,
        biometricMode: liveBiometricMode,
        modeReason: sensorState.derivedModeState.reason,
        modeChangedAtMs: sensorState.derivedModeState.modeStartedAtMs,
        activeEvents,
        currentEventLabel: activeEvent ? getEventLabel(activeEvent.kind) : null,
        score: {
          ...state.score,
          survivedSeconds: nextSurvivedSeconds,
        },
      };

      const nextEvent = maybeStartTimedEvent(nowMs, nextState);
      const forcedEvent = debugOverrides.forcedEvent;
      const nextForcedOrRandomEvent = maybeStartTimedEvent(
        nowMs,
        nextState,
        forcedEvent,
      );
      if (nextForcedOrRandomEvent) {
        console.debug("[Signal Shift] Event started:", getEventLabel(nextForcedOrRandomEvent.kind));
        nextState = {
          ...nextState,
          activeEvents: [nextForcedOrRandomEvent],
          lastEventAtMs: nowMs,
          currentEventLabel: getEventLabel(nextForcedOrRandomEvent.kind),
        };
      }

      const elapsedSinceSpawn = nowMs - nextState.lastSpawnAtMs;
      if (elapsedSinceSpawn >= nextState.spawnIntervalMs) {
        const modeProfile = getModeGameplayProfile(nextState.biometricMode);
        const spawnCount = Math.min(
          modeProfile.maxSpawnBurstCount,
          Math.max(1, Math.floor(elapsedSinceSpawn / nextState.spawnIntervalMs)),
        );
        let spawnedObjects = [...nextState.objects];

        for (let spawnIndex = 0; spawnIndex < spawnCount; spawnIndex += 1) {
          const spawnTime = nowMs - (spawnCount - 1 - spawnIndex) * nextState.spawnIntervalMs;
          const primaryObject = enforceSpawnFairness(
            spawnRandomObject(spawnTime, nextState.biometricMode, elapsedMs),
            spawnedObjects,
            nextState.biometricMode,
          );
          const primaryLabelVisible = primaryObject.labelVisible
            ? Math.random() >= eventModifiers.hiddenLabelBonus
            : false;

          spawnedObjects.push({
            ...primaryObject,
            labelVisible: primaryLabelVisible,
          });

          const clutterObject = spawnWrongLaneCompanion(
            spawnTime,
            nextState.biometricMode,
            elapsedMs,
          );

          if (clutterObject) {
            const fairClutterObject = enforceSpawnFairness(
              clutterObject,
              spawnedObjects,
              nextState.biometricMode,
            );
            const clutterLabelVisible = fairClutterObject.labelVisible
              ? Math.random() >= eventModifiers.hiddenLabelBonus
              : false;

            spawnedObjects.push({
              ...fairClutterObject,
              labelVisible: clutterLabelVisible,
            });
          }

          if (shouldSpawnSecondWrongLaneCompanion(elapsedMs, nextState.biometricMode)) {
            const secondClutterObject = spawnWrongLaneCompanion(
              spawnTime + 1,
              nextState.biometricMode,
              elapsedMs,
            );

            if (secondClutterObject) {
              const fairSecondClutterObject = enforceSpawnFairness(
                secondClutterObject,
                spawnedObjects,
                nextState.biometricMode,
              );
              const secondClutterLabelVisible = fairSecondClutterObject.labelVisible
                ? Math.random() >= eventModifiers.hiddenLabelBonus
                : false;

              spawnedObjects.push({
                ...fairSecondClutterObject,
                labelVisible: secondClutterLabelVisible,
              });
            }
          }
        }

        nextState = {
          ...nextState,
          objects: spawnedObjects,
          lastSpawnAtMs: nowMs,
        };
      }

      const remaining: FallingObject[] = [];

      for (const object of nextState.objects) {
        if (!isObjectMissed(object, nextState.playfieldHeight)) {
          remaining.push(object);
          continue;
        }

        const missValues = applyMissDelta(nextState, object, nextSurvivedSeconds);
        nextState = {
          ...nextState,
          ...missValues,
          itemsMissed: nextState.itemsMissed + 1,
        };
      }

      nextState = {
        ...nextState,
        objects: remaining,
      };

      if (shouldGameOver(nextState.stability, nextState.corruption)) {
        return {
          ...nextState,
          ...buildResultsTelemetrySnapshot(),
          isRunning: false,
          isGameOver: true,
          screen: "results",
        };
      }

      return nextState;
    }),
  spawnObject: () =>
    set((state) => {
      if (!state.isRunning || state.isGameOver) {
        return state;
      }

      const sensorState = useSensorStore.getState();
      const elapsedMs =
        state.startedAtMs == null ? 0 : Math.max(0, state.nowMs - state.startedAtMs);
      const nextObject = spawnRandomObject(
        state.nowMs,
        sensorState.derivedModeState.currentMode,
        elapsedMs,
      );

      return {
        objects: [...state.objects, nextObject],
        lastSpawnAtMs: state.nowMs,
      };
    }),
  resolveCatchAtPlayerLane: () =>
    set((state) => {
      if (!state.isRunning || state.isGameOver) {
        return state;
      }

      const target = [...state.objects]
        .filter((object) =>
          isObjectCatchable(object, state.playerLane, state.playfieldHeight),
        )
        .sort((a, b) => b.y - a.y)[0];

      if (!target) {
        return state;
      }

      const nextSurvivedSeconds = getSurvivedSeconds(state, state.nowMs);
      const delta = scoreCatch(target.kind, state.playerLane);
      const activeEvent = state.activeEvents[0] ?? null;
      const staticLeakLane = getStaticLeakLane(activeEvent);
      const nextValues = applyScoreDelta(state, delta, nextSurvivedSeconds);
      const nextState = {
        ...state,
        ...nextValues,
        objects: state.objects.filter((object) => object.id !== target.id),
        itemsCaught: state.itemsCaught + 1,
      };

      if (staticLeakLane != null && state.playerLane === staticLeakLane) {
        nextState.score.score = Math.max(
          0,
          nextState.score.score - STATIC_LEAK_SCORE_PENALTY,
        );
        if (STATIC_LEAK_STABILITY_PENALTY > 0) {
          nextState.stability = clamp(
            nextState.stability - STATIC_LEAK_STABILITY_PENALTY,
            0,
            100,
          );
        }
      }

      if (shouldGameOver(nextState.stability, nextState.corruption)) {
        return {
          ...nextState,
          ...buildResultsTelemetrySnapshot(),
          isRunning: false,
          isGameOver: true,
          screen: "results",
        };
      }

      return nextState;
    }),
  removeMissedObjects: () =>
    set((state) => {
      if (!state.objects.length) {
        return state;
      }

      const remaining: FallingObject[] = [];
      let nextState = state;
      const nextSurvivedSeconds = getSurvivedSeconds(state, state.nowMs);

      for (const object of state.objects) {
        if (!isObjectMissed(object, state.playfieldHeight)) {
          remaining.push(object);
          continue;
        }

        const missValues = applyMissDelta(nextState, object, nextSurvivedSeconds);
        nextState = {
          ...nextState,
          ...missValues,
          itemsMissed: nextState.itemsMissed + 1,
        };
      }

      if (remaining.length === state.objects.length) {
        return state;
      }

      if (shouldGameOver(nextState.stability, nextState.corruption)) {
        return {
          ...nextState,
          objects: remaining,
          ...buildResultsTelemetrySnapshot(),
          isRunning: false,
          isGameOver: true,
          screen: "results",
        };
      }

      return {
        ...nextState,
        objects: remaining,
      };
    }),
  setGameOver: () =>
    set((state) => ({
      ...buildResultsTelemetrySnapshot(),
      isRunning: false,
      isGameOver: true,
      screen: "results",
      score: {
        ...state.score,
        survivedSeconds: getSurvivedSeconds(state, state.nowMs),
      },
    })),
  resetScore: () =>
    set({
      score: createInitialScore(),
    }),
}));
