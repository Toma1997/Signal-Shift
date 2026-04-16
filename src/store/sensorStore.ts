import { create } from "zustand";
import type { SensorSnapshot } from "../game/types";
import { MOCK_SENSORS } from "../game/constants";

interface SensorState {
  sensors: SensorSnapshot;
  setMode: (mode: SensorSnapshot["mode"]) => void;
}

export const useSensorStore = create<SensorState>((set) => ({
  sensors: MOCK_SENSORS,
  setMode: (mode) =>
    set((state) => ({
      sensors: {
        ...state.sensors,
        mode,
      },
    })),
}));
