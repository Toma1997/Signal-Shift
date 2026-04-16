import { GameCanvas } from "../components/GameCanvas";
import { HudPanel } from "../components/HudPanel";
import { SensorPanel } from "../components/SensorPanel";
import { useGameStore } from "../../store/gameStore";

export function GameScreen() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <section className="screen game-layout">
      <div className="top-bar">
        <div className="camera-card panel">Camera Preview Placeholder</div>
        <button className="secondary-btn" onClick={() => setScreen("results")}>
          End Mock Run
        </button>
      </div>

      <div className="main-grid">
        <GameCanvas />
        <HudPanel />
      </div>

      <SensorPanel />
    </section>
  );
}
