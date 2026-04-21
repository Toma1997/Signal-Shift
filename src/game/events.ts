import {
  BRAIN_FOG_DURATION_MS,
  BRAIN_FOG_HIDDEN_LABEL_BONUS,
  CLEAR_WINDOW_CLARITY_GAIN_MULTIPLIER,
  CLEAR_WINDOW_DURATION_MS,
  CLEAR_WINDOW_SPAWN_INTERVAL_MULTIPLIER,
  EVENT_COOLDOWN_MS,
  EVENT_INITIAL_DELAY_MS,
  PRESSURE_SPIKE_DURATION_MS,
  PRESSURE_SPIKE_SPAWN_INTERVAL_MULTIPLIER,
  STATIC_LEAK_DURATION_MS,
} from "./constants";
import type { BiometricMode, GameState, Lane, TimedEvent, TimedEventKind } from "./types";

export interface EventGameplayModifiers {
  spawnIntervalMultiplier: number;
  hiddenLabelBonus: number;
  clarityGainMultiplier: number;
  staticLeakLane: Lane | null;
}

const DEFAULT_EVENT_MODIFIERS: EventGameplayModifiers = {
  spawnIntervalMultiplier: 1,
  hiddenLabelBonus: 0,
  clarityGainMultiplier: 1,
  staticLeakLane: null,
};

const EVENT_DURATIONS: Record<TimedEventKind, number> = {
  brain_fog: BRAIN_FOG_DURATION_MS,
  pressure_spike: PRESSURE_SPIKE_DURATION_MS,
  clear_window: CLEAR_WINDOW_DURATION_MS,
  static_leak: STATIC_LEAK_DURATION_MS,
};

const EVENT_LABELS: Record<TimedEventKind, string> = {
  brain_fog: "Brain Fog",
  pressure_spike: "Pressure Spike",
  clear_window: "Clear Window",
  static_leak: "Static Leak",
};

function chooseWeightedEvent(mode: BiometricMode): TimedEventKind {
  const weightsByMode: Record<BiometricMode, Array<{ kind: TimedEventKind; weight: number }>> = {
    balanced: [
      { kind: "brain_fog", weight: 1.2 },
      { kind: "pressure_spike", weight: 1.1 },
      { kind: "clear_window", weight: 1.2 },
      { kind: "static_leak", weight: 1.1 },
    ],
    calm: [
      { kind: "brain_fog", weight: 1.3 },
      { kind: "pressure_spike", weight: 0.5 },
      { kind: "clear_window", weight: 2.1 },
      { kind: "static_leak", weight: 0.7 },
    ],
    pressure: [
      { kind: "brain_fog", weight: 0.8 },
      { kind: "pressure_spike", weight: 2.2 },
      { kind: "clear_window", weight: 0.5 },
      { kind: "static_leak", weight: 1.7 },
    ],
  };
  const weights = weightsByMode[mode];
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = Math.random() * total;

  for (const entry of weights) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.kind;
    }
  }

  return "brain_fog";
}

export function getEventLabel(kind: TimedEventKind): string {
  return EVENT_LABELS[kind];
}

export function getStaticLeakLane(event: TimedEvent | null | undefined): Lane | null {
  if (!event || event.kind !== "static_leak") {
    return null;
  }

  return (Math.floor(event.startedAtMs / 100) % 3) as Lane;
}

export function getEventGameplayModifiers(
  activeEvent: TimedEvent | null | undefined,
): EventGameplayModifiers {
  if (!activeEvent || !activeEvent.active) {
    return DEFAULT_EVENT_MODIFIERS;
  }

  switch (activeEvent.kind) {
    case "brain_fog":
      return {
        ...DEFAULT_EVENT_MODIFIERS,
        hiddenLabelBonus: BRAIN_FOG_HIDDEN_LABEL_BONUS,
      };
    case "pressure_spike":
      return {
        ...DEFAULT_EVENT_MODIFIERS,
        spawnIntervalMultiplier: PRESSURE_SPIKE_SPAWN_INTERVAL_MULTIPLIER,
      };
    case "clear_window":
      return {
        ...DEFAULT_EVENT_MODIFIERS,
        spawnIntervalMultiplier: CLEAR_WINDOW_SPAWN_INTERVAL_MULTIPLIER,
        clarityGainMultiplier: CLEAR_WINDOW_CLARITY_GAIN_MULTIPLIER,
      };
    case "static_leak":
      return {
        ...DEFAULT_EVENT_MODIFIERS,
        staticLeakLane: getStaticLeakLane(activeEvent),
      };
  }
}

export function maybeStartTimedEvent(
  nowMs: number,
  gameState: GameState,
  forcedEvent: TimedEventKind | null = null,
): TimedEvent | null {
  if (!gameState.isRunning || gameState.isGameOver) {
    return null;
  }

  if (gameState.activeEvents.some((event) => event.active)) {
    return null;
  }

  if (
    gameState.lastEventAtMs != null &&
    nowMs - gameState.lastEventAtMs < gameState.eventCooldownMs
  ) {
    return null;
  }

  if (
    forcedEvent == null &&
    gameState.startedAtMs != null &&
    nowMs - gameState.startedAtMs < EVENT_INITIAL_DELAY_MS
  ) {
    return null;
  }

  const kind = forcedEvent ?? chooseWeightedEvent(gameState.biometricMode);

  return {
    id: `event-${kind}-${nowMs}`,
    kind,
    startedAtMs: nowMs,
    durationMs: EVENT_DURATIONS[kind],
    active: true,
  };
}

export function expireTimedEvents(
  nowMs: number,
  gameState: GameState,
): TimedEvent[] {
  return gameState.activeEvents.filter(
    (event) => event.active && nowMs - event.startedAtMs < event.durationMs,
  );
}
