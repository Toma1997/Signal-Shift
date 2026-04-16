import { useGameStore } from "./store/gameStore";
import { TitleScreen } from "./ui/screens/TitleScreen";
import { SetupScreen } from "./ui/screens/SetupScreen";
import { CalibrationScreen } from "./ui/screens/CalibrationScreen";
import { GameScreen } from "./ui/screens/GameScreen";
import { ResultsScreen } from "./ui/screens/ResultsScreen";

export default function App() {
  const screen = useGameStore((state) => state.screen);

  return (
    <div className="app-shell">
      {screen === "title" && <TitleScreen />}
      {screen === "setup" && <SetupScreen />}
      {screen === "calibration" && <CalibrationScreen />}
      {screen === "playing" && <GameScreen />}
      {screen === "results" && <ResultsScreen />}
    </div>
  );
}
