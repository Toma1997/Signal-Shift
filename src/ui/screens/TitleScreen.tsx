import { APP_NAME } from "../../game/constants";
import { useGameStore } from "../../store/gameStore";

export function TitleScreen() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <p className="eyebrow">Elata app concept</p>
        <h1>{APP_NAME}</h1>
        <p>
          A biometric arcade game where signal state changes the feel of play.
        </p>
        <button className="primary-btn" onClick={() => setScreen("setup")}>
          Start
        </button>
      </div>
    </section>
  );
}
