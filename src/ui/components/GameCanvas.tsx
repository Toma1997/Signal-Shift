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
  const setPlayfieldHeight = useGameStore((state) => state.setPlayfieldHeight);

  useEffect(() => {
    function handleGameplayKey(event: KeyboardEvent) {
      const store = useGameStore.getState();

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        store.moveLeft();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        store.moveRight();
      }

      if (event.key === " " || event.key === "Space" || event.code === "Space") {
        if (event.repeat) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        store.resolveCatchAtPlayerLane();
      }

      if (event.key === "e" || event.key === "E") {
        if (event.repeat) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        store.activateClarityPulse();
      }
    }

    document.addEventListener("keydown", handleGameplayKey, true);

    return () => {
      document.removeEventListener("keydown", handleGameplayKey, true);
    };
  }, []);

  useEffect(() => {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) {
      return;
    }

    let audioContext: AudioContext | null = null;
    let masterGain: GainNode | null = null;
    let ambienceGain: GainNode | null = null;
    let schedulerId: number | null = null;
    let nextNoteAt = 0;
    let noteIndex = 0;
    let unlocked = false;
    let lastSortedCount = useGameStore.getState().score.sorted;
    let lastWronglySortedCount = useGameStore.getState().score.wronglySorted;

    const pattern = [220, 246.94, 293.66, 329.63, 293.66, 369.99, 329.63, 246.94];
    const accentPattern = [110, 123.47, 146.83, 164.81];
    const beatSeconds = 0.34;
    const lookAheadSeconds = 0.9;

    function ensureAudioGraph() {
      if (audioContext) {
        return;
      }

      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.14;
      masterGain.connect(audioContext.destination);

      ambienceGain = audioContext.createGain();
      ambienceGain.gain.value = 0.03;
      ambienceGain.connect(masterGain);
      nextNoteAt = audioContext.currentTime + 0.08;
    }

    function scheduleNote(startAt: number, frequency: number, accentFrequency: number) {
      if (!audioContext || !masterGain || !ambienceGain) {
        return;
      }

      const store = useGameStore.getState();
      if (!store.isRunning || store.isGameOver) {
        return;
      }

      const lead = audioContext.createOscillator();
      const leadGain = audioContext.createGain();
      const bass = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      const shimmer = audioContext.createOscillator();
      const shimmerGain = audioContext.createGain();
      const pulseActive =
        store.clarityPulseEndsAtMs != null && store.nowMs < store.clarityPulseEndsAtMs;
      const pressure = useGameStore.getState().biometricMode === "pressure";
      const detune = pulseActive ? 7 : pressure ? 3 : 0;
      const beatGain = pulseActive ? 0.085 : pressure ? 0.105 : 0.094;

      lead.type = pulseActive ? "sine" : "triangle";
      lead.frequency.setValueAtTime(frequency, startAt);
      lead.detune.setValueAtTime(detune, startAt);

      bass.type = "sawtooth";
      bass.frequency.setValueAtTime(accentFrequency, startAt);
      bass.detune.setValueAtTime(-3, startAt);

      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(frequency * 2, startAt);
      shimmer.detune.setValueAtTime(12, startAt);

      leadGain.gain.setValueAtTime(0.0001, startAt);
      leadGain.gain.exponentialRampToValueAtTime(beatGain, startAt + 0.02);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, startAt + beatSeconds * 0.78);

      bassGain.gain.setValueAtTime(0.0001, startAt);
      bassGain.gain.exponentialRampToValueAtTime(0.045, startAt + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, startAt + beatSeconds * 0.95);

      shimmerGain.gain.setValueAtTime(0.0001, startAt);
      shimmerGain.gain.exponentialRampToValueAtTime(pulseActive ? 0.045 : 0.028, startAt + 0.03);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startAt + beatSeconds * 0.62);

      lead.connect(leadGain);
      leadGain.connect(masterGain);
      bass.connect(bassGain);
      bassGain.connect(ambienceGain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(masterGain);

      lead.start(startAt);
      bass.start(startAt);
      shimmer.start(startAt);
      lead.stop(startAt + beatSeconds * 0.9);
      bass.stop(startAt + beatSeconds);
      shimmer.stop(startAt + beatSeconds * 0.72);
    }

    function playSuccessChime() {
      if (!audioContext || !masterGain || !unlocked || audioContext.state !== "running") {
        return;
      }

      const startAt = audioContext.currentTime + 0.01;
      const frequencies = [523.25, 659.25, 783.99];

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext!.createOscillator();
        const gain = audioContext!.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.045);

        gain.gain.setValueAtTime(0.0001, startAt + index * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + index * 0.045 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + index * 0.045 + 0.2);

        oscillator.connect(gain);
        gain.connect(masterGain!);
        oscillator.start(startAt + index * 0.045);
        oscillator.stop(startAt + index * 0.045 + 0.22);
      });
    }

    function playWrongCatchTone() {
      if (!audioContext || !masterGain || !unlocked || audioContext.state !== "running") {
        return;
      }

      const startAt = audioContext.currentTime + 0.01;
      const frequencies = [196, 164.81];

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext!.createOscillator();
        const gain = audioContext!.createGain();
        const filter = audioContext!.createBiquadFilter();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.05);
        oscillator.detune.setValueAtTime(-8, startAt + index * 0.05);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(980, startAt);

        gain.gain.setValueAtTime(0.0001, startAt + index * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.09, startAt + index * 0.05 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + index * 0.05 + 0.16);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain!);
        oscillator.start(startAt + index * 0.05);
        oscillator.stop(startAt + index * 0.05 + 0.18);
      });
    }

    function scheduleLoop() {
      if (!audioContext || !masterGain) {
        return;
      }

      const store = useGameStore.getState();
      if (!store.isRunning || store.isGameOver) {
        schedulerId = window.setTimeout(scheduleLoop, 250);
        return;
      }

      while (nextNoteAt < audioContext.currentTime + lookAheadSeconds) {
        scheduleNote(
          nextNoteAt,
          pattern[noteIndex % pattern.length] ?? pattern[0],
          accentPattern[noteIndex % accentPattern.length] ?? accentPattern[0],
        );
        nextNoteAt += beatSeconds;
        noteIndex += 1;
      }

      schedulerId = window.setTimeout(scheduleLoop, 140);
    }

    async function unlockAudio() {
      if (unlocked) {
        return;
      }

      ensureAudioGraph();
      if (!audioContext) {
        return;
      }

      if (audioContext.state !== "running") {
        await audioContext.resume().catch(() => undefined);
      }

      if (audioContext.state === "running") {
        unlocked = true;
        if (schedulerId == null) {
          scheduleLoop();
        }
      }
    }

    function handleUnlockEvent() {
      void unlockAudio();
    }

    window.addEventListener("pointerdown", handleUnlockEvent, { passive: true });
    window.addEventListener("keydown", handleUnlockEvent, true);
    void unlockAudio();

    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.score.sorted > lastSortedCount) {
        playSuccessChime();
      }
      if (state.score.wronglySorted > lastWronglySortedCount) {
        playWrongCatchTone();
      }

      lastSortedCount = state.score.sorted;
      lastWronglySortedCount = state.score.wronglySorted;
    });

    return () => {
      window.removeEventListener("pointerdown", handleUnlockEvent);
      window.removeEventListener("keydown", handleUnlockEvent, true);
      unsubscribe();
      if (schedulerId != null) {
        window.clearTimeout(schedulerId);
      }
      if (audioContext) {
        void audioContext.close().catch(() => undefined);
      }
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
      const nextWidth = Math.max(320, Math.floor(rect.width));
      const nextHeight = Math.max(260, Math.floor(rect.height));
      const devicePixelRatio = window.devicePixelRatio || 1;

      const physicalWidth = Math.floor(nextWidth * devicePixelRatio);
      const physicalHeight = Math.floor(nextHeight * devicePixelRatio);

      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }

      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      setPlayfieldHeight(nextHeight);
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
  }, [setPlayfieldHeight]);

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
