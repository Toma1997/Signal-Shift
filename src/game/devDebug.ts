import type { BiometricMode, TimedEventKind } from "./types";

export interface DebugGameplayOverrides {
  forcedMode: BiometricMode | null;
  forcedEvent: TimedEventKind | null;
}

const MODE_KEY = "signal-shift:debug-mode";
const EVENT_KEY = "signal-shift:debug-event";

declare global {
  interface Window {
    __SIGNAL_SHIFT_DEBUG__?: {
      setMode: (mode: BiometricMode | null) => void;
      setEvent: (event: TimedEventKind | null) => void;
      clear: () => void;
    };
  }
}

function isBrowserDev(): boolean {
  return import.meta.env.DEV && typeof window !== "undefined";
}

function readStoredValue<T extends string>(key: string, allowed: readonly T[]): T | null {
  if (!isBrowserDev()) {
    return null;
  }

  const value = window.localStorage.getItem(key);
  return value && allowed.includes(value as T) ? (value as T) : null;
}

function writeStoredValue(key: string, value: string | null): void {
  if (!isBrowserDev()) {
    return;
  }

  if (value == null) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

export function getDevGameplayOverrides(): DebugGameplayOverrides {
  const forcedMode = readStoredValue(MODE_KEY, [
    "balanced",
    "calm",
    "pressure",
  ] as const);
  const forcedEvent = readStoredValue(EVENT_KEY, [
    "brain_fog",
    "pressure_spike",
    "clear_window",
    "static_leak",
  ] as const);

  return {
    forcedMode,
    forcedEvent,
  };
}

export function installDevGameplayDebugControls(): void {
  if (!isBrowserDev() || window.__SIGNAL_SHIFT_DEBUG__) {
    return;
  }

  window.__SIGNAL_SHIFT_DEBUG__ = {
    setMode: (mode) => writeStoredValue(MODE_KEY, mode),
    setEvent: (event) => writeStoredValue(EVENT_KEY, event),
    clear: () => {
      writeStoredValue(MODE_KEY, null);
      writeStoredValue(EVENT_KEY, null);
    },
  };
}
