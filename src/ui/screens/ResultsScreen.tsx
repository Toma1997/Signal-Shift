import { useGameStore } from "../../store/gameStore";

export function ResultsScreen() {
  const { score, setScreen, resetScore } = useGameStore();

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Results</h2>
        <p>Score: {score.score}</p>
        <p>Sorted: {score.sorted}</p>
        <p>Missed: {score.missed}</p>
        <p>Time: {score.survivedSeconds}s</p>
        <div className="button-row">
          <button
            className="secondary-btn"
            onClick={() => {
              resetScore();
              setScreen("title");
            }}
          >
            Back to Title
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              resetScore();
              setScreen("setup");
            }}
          >
            Restart
          </button>
        </div>
      </div>
    </section>
  );
}
