import { useEffect, useRef } from "react";
import {
  drawGameFrame,
  GAME_CANVAS_HEIGHT,
  GAME_CANVAS_WIDTH,
} from "../../game/engine";
import { useGameStore } from "../../store/gameStore";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const store = useGameStore.getState();

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        store.moveLeft();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        store.moveRight();
      }

      if (event.key === " " || event.key === "Space") {
        event.preventDefault();
        store.resolveCatchAtPlayerLane();
      }

      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        store.activateClarityPulse();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!canvas || !panel) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let frameId = 0;
    const resizeCanvas = () => {
      const rect = panel.getBoundingClientRect();
      const maxWidth = Math.max(260, Math.floor(rect.width - 16));
      const maxHeight = Math.max(180, Math.floor(rect.height - 16));
      const aspectRatio = GAME_CANVAS_WIDTH / GAME_CANVAS_HEIGHT;
      const devicePixelRatio = window.devicePixelRatio || 1;

      let nextWidth = maxWidth;
      let nextHeight = Math.floor(nextWidth / aspectRatio);

      if (nextHeight > maxHeight) {
        nextHeight = maxHeight;
        nextWidth = Math.floor(nextHeight * aspectRatio);
      }

      const physicalWidth = Math.floor(nextWidth * devicePixelRatio);
      const physicalHeight = Math.floor(nextHeight * devicePixelRatio);

      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }

      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const render = (timestamp: number) => {
      const store = useGameStore.getState();
      store.tick(timestamp);

      const snapshot = useGameStore.getState();
      drawGameFrame(ctx, {
        playerLane: snapshot.playerLane,
        objects: snapshot.objects,
        score: snapshot.score.score,
        stability: snapshot.stability,
        clarityMeter: snapshot.clarityMeter,
        clarityPulseActive:
          snapshot.clarityPulseEndsAtMs != null && snapshot.nowMs < snapshot.clarityPulseEndsAtMs,
      });

      frameId = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    frameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={panelRef} className="panel canvas-panel">
      <canvas
        ref={canvasRef}
        width={GAME_CANVAS_WIDTH}
        height={GAME_CANVAS_HEIGHT}
        tabIndex={0}
        aria-label="Signal Shift game canvas"
        className="game-canvas"
      />
    </div>
  );
}
