import { create } from "zustand";
import type { Screen, ScoreSummary } from "../game/types";
import { MOCK_SCORE } from "../game/constants";

interface GameState {
  screen: Screen;
  score: ScoreSummary;
  setScreen: (screen: Screen) => void;
  resetScore: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: "title",
  score: MOCK_SCORE,
  setScreen: (screen) => set({ screen }),
  resetScore: () => set({ score: MOCK_SCORE }),
}));
