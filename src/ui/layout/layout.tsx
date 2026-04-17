import type { CSSProperties } from "react";
import type { GameFrameProps } from "./types";
import {
  GAME_FRAME_CAMERA_HEIGHT_PX,
  GAME_FRAME_CANVAS_MIN_HEIGHT_PX,
  GAME_FRAME_GAP_PX,
  GAME_FRAME_HUD_RAIL_WIDTH_PX,
  GAME_FRAME_TELEMETRY_HEIGHT_PX,
} from "./uiConstants";
import "../styles/gameFrame.css";

export function GameFrame({
  center,
  hud,
  camera,
  telemetry,
  className,
}: GameFrameProps) {
  const rootClassName = className ? `game-frame ${className}` : "game-frame";

  return (
    <section
      className={rootClassName}
      style={
        {
          "--game-frame-gap": `${GAME_FRAME_GAP_PX}px`,
          "--game-frame-rail-width": `${GAME_FRAME_HUD_RAIL_WIDTH_PX}px`,
          "--game-frame-camera-height": `${GAME_FRAME_CAMERA_HEIGHT_PX}px`,
          "--game-frame-canvas-min-height": `${GAME_FRAME_CANVAS_MIN_HEIGHT_PX}px`,
          "--game-frame-telemetry-height": `${GAME_FRAME_TELEMETRY_HEIGHT_PX}px`,
        } as CSSProperties
      }
    >
      <div className="game-frame__main">
        <div className="game-frame__center">{center}</div>

        <aside className="game-frame__rail">
          <div className="game-frame__camera">{camera}</div>
          <div className="game-frame__hud">{hud}</div>
        </aside>
      </div>

      <div className="game-frame__telemetry">{telemetry}</div>
    </section>
  );
}
