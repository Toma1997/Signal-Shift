import { create } from "zustand";
import { initialSpawnIntervalMs } from "../game/constants";
import {
  advanceObjects,
  isObjectCatchable,
  isObjectMissed,
} from "../game/engine";
import { scoreCatch, scoreMiss, shouldGameOver } from "../game/scoring";
import { spawnRandomObject } from "../game/spawn";
import type { FallingObject, GameState, Lane, Screen } from "../game/types";

function createInitialScore() {
  return {
    score: 0,
    sorted: 0,
    missed: 0,
    survivedSeconds: 0,
  };
}

function createInitialState(): GameState {
  return {
    screen: "title",
    startedAtMs: null,
    nowMs: 0,
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
      sorted: state.score.sorted + (delta.scoreDelta > 0 ? 1 : 0),
      missed: state.score.missed,
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
  const delta = scoreMiss(object.kind);
  const nextStability = clamp(state.stability + delta.stabilityDelta, 0, 100);
  const nextCorruption = clamp(state.corruption + delta.corruptionDelta, 0, 100);
  const nextCombo = delta.resetCombo ? 0 : Math.max(0, state.combo + delta.comboDelta);

  return {
    score: {
      score: Math.max(0, state.score.score + delta.scoreDelta),
      sorted: state.score.sorted,
      missed: state.score.missed + 1,
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
        return {
          ...createInitialState(),
          screen: "playing",
          startedAtMs,
          nowMs: startedAtMs,
          lastSpawnAtMs: startedAtMs,
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
    set({
      ...createInitialState(),
      screen: "playing",
      startedAtMs,
      nowMs: startedAtMs,
      lastSpawnAtMs: startedAtMs,
      isRunning: true,
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
  tick: (nowMs) =>
    set((state) => {
      const dtSeconds =
        state.nowMs === 0 ? 0 : Math.max(0, (nowMs - state.nowMs) / 1000);

      return {
        nowMs,
        objects: dtSeconds > 0 ? advanceObjects(state.objects, dtSeconds) : state.objects,
        score: {
          ...state.score,
          survivedSeconds: getSurvivedSeconds(state, nowMs),
        },
      };
    }),
  spawnObject: () =>
    set((state) => {
      if (!state.isRunning || state.isGameOver) {
        return state;
      }

      return {
        objects: [...state.objects, spawnRandomObject(state.nowMs)],
        lastSpawnAtMs: state.nowMs,
      };
    }),
  resolveCatchAtPlayerLane: () =>
    set((state) => {
      if (!state.isRunning || state.isGameOver) {
        return state;
      }

      const target = [...state.objects]
        .filter((object) => isObjectCatchable(object, state.playerLane))
        .sort((a, b) => b.y - a.y)[0];

      if (!target) {
        return state;
      }

      const nextSurvivedSeconds = getSurvivedSeconds(state, state.nowMs);
      const delta = scoreCatch(target.kind);
      const nextValues = applyScoreDelta(state, delta, nextSurvivedSeconds);
      const nextState = {
        ...state,
        ...nextValues,
        objects: state.objects.filter((object) => object.id !== target.id),
        itemsCaught: state.itemsCaught + 1,
      };

      if (shouldGameOver(nextState.stability, nextState.corruption)) {
        return {
          ...nextState,
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
        if (!isObjectMissed(object)) {
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
