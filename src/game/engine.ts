import {
  LANE_LABELS,
  SIGNAL_KIND_LABELS,
  catchZoneHeight,
  laneCount,
} from "./constants";
import type { FallingObject, Lane, SignalKind } from "./types";

export const GAME_CANVAS_WIDTH = 720;
export const GAME_CANVAS_HEIGHT = 520;

const PLAYER_WIDTH = 120;
const PLAYER_HEIGHT = 16;
const OBJECT_RADIUS = 18;

function laneWidth(width: number): number {
  return width / laneCount;
}

export function laneCenterX(lane: Lane, width = GAME_CANVAS_WIDTH): number {
  return laneWidth(width) * lane + laneWidth(width) / 2;
}

export function advanceObjects(
  objects: FallingObject[],
  dtSeconds: number,
): FallingObject[] {
  return objects.map((object) => ({
    ...object,
    y: object.y + object.speed * dtSeconds,
  }));
}

export function isObjectCatchable(
  object: FallingObject,
  playerLane: Lane,
  canvasHeight = GAME_CANVAS_HEIGHT,
): boolean {
  return (
    object.lane === playerLane &&
    object.y >= canvasHeight - catchZoneHeight &&
    object.y <= canvasHeight
  );
}

export function isObjectMissed(
  object: FallingObject,
  canvasHeight = GAME_CANVAS_HEIGHT,
): boolean {
  return object.y - OBJECT_RADIUS > canvasHeight;
}

function drawLaneGuides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const laneSize = laneWidth(width);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
  ctx.lineWidth = 1;

  for (let lane = 1; lane < laneCount; lane += 1) {
    const x = laneSize * lane;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawCatchZone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const laneSize = laneWidth(width);
  const top = height - catchZoneHeight;
  const boxHeight = Math.min(44, catchZoneHeight - 18);
  const boxTop = top + catchZoneHeight - boxHeight - 10;
  const laneColors = [
    {
      fill: "rgba(77, 208, 167, 0.14)",
      stroke: "rgba(77, 208, 167, 0.28)",
      text: "#b9f4df",
    },
    {
      fill: "rgba(56, 189, 248, 0.14)",
      stroke: "rgba(56, 189, 248, 0.28)",
      text: "#bfddff",
    },
    {
      fill: "rgba(251, 146, 60, 0.14)",
      stroke: "rgba(251, 146, 60, 0.28)",
      text: "#ffd1af",
    },
  ] as const;

  ctx.fillStyle = "rgba(15, 32, 43, 0.72)";
  ctx.fillRect(0, top, width, catchZoneHeight);

  for (let lane = 0; lane < laneCount; lane += 1) {
    const x = laneSize * lane + 8;
    const boxWidth = laneSize - 16;
    const palette = laneColors[lane];

    ctx.fillStyle = palette.fill;
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, boxTop, boxWidth, boxHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.font = "700 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(LANE_LABELS[lane], x + boxWidth / 2, boxTop + 19);

    ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
    ctx.font = "12px Inter, system-ui, sans-serif";
    const helperText =
      lane === 0 ? "Stable Signal" : lane === 1 ? "Charge Signal" : "Interference / Anomaly";
    ctx.fillText(helperText, x + boxWidth / 2, boxTop + 35);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  playerLane: Lane,
  width: number,
  height: number,
): void {
  const centerX = laneCenterX(playerLane, width);
  const left = centerX - PLAYER_WIDTH / 2;
  const playerY = height - catchZoneHeight - PLAYER_HEIGHT - 10;

  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.roundRect(left, playerY, PLAYER_WIDTH, PLAYER_HEIGHT, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
  ctx.beginPath();
  ctx.roundRect(left + 12, playerY - 8, PLAYER_WIDTH - 24, 6, 6);
  ctx.fill();
}

function colorForKind(kind: SignalKind): string {
  switch (kind) {
    case "stable_signal":
      return "#4ade80";
    case "charge_signal":
      return "#60a5fa";
    case "interference":
      return "#fb923c";
    case "anomaly":
      return "#e879f9";
  }
}

function drawStableSignal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, OBJECT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawChargeSignal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - OBJECT_RADIUS);
  ctx.lineTo(x + OBJECT_RADIUS, y);
  ctx.lineTo(x, y + OBJECT_RADIUS);
  ctx.lineTo(x - OBJECT_RADIUS, y);
  ctx.closePath();
  ctx.fill();
}

function drawInterference(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.bezierCurveTo(x - 24, y - 18, x - 4, y - 24, x + 2, y - 10);
  ctx.bezierCurveTo(x + 24, y - 18, x + 24, y + 18, x + 6, y + 16);
  ctx.bezierCurveTo(x, y + 26, x - 24, y + 18, x - 16, y);
  ctx.fill();
}

function drawAnomaly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let point = 0; point < 8; point += 1) {
    const angle = (Math.PI * 2 * point) / 8;
    const radius = point % 2 === 0 ? 20 : 10;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (point === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  object: FallingObject,
  width: number,
): void {
  const x = laneCenterX(object.lane, width);
  const color = colorForKind(object.kind);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;

  switch (object.kind) {
    case "stable_signal":
      drawStableSignal(ctx, x, object.y, color);
      break;
    case "charge_signal":
      drawChargeSignal(ctx, x, object.y, color);
      break;
    case "interference":
      drawInterference(ctx, x, object.y, color);
      break;
    case "anomaly":
      drawAnomaly(ctx, x, object.y, color);
      break;
  }

  ctx.restore();

  if (object.labelVisible) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(SIGNAL_KIND_LABELS[object.kind], x, object.y - 26);
  }
}

export interface GameCanvasSnapshot {
  playerLane: Lane;
  objects: FallingObject[];
  score: number;
  stability: number;
}

export function drawGameFrame(
  ctx: CanvasRenderingContext2D,
  snapshot: GameCanvasSnapshot,
  options?: { showMetrics?: boolean },
): void {
  const { canvas } = ctx;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  const showMetrics = options?.showMetrics ?? false;

  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#07101a");
  background.addColorStop(1, "#0f1b2a");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawLaneGuides(ctx, width, height);
  drawCatchZone(ctx, width, height);

  for (const object of snapshot.objects) {
    drawObject(ctx, object, width);
  }

  drawPlayer(ctx, snapshot.playerLane, width, height);

  if (showMetrics) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
    ctx.font = "15px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score ${snapshot.score}`, 16, 28);
    ctx.fillText(`Stability ${snapshot.stability}`, 16, 50);
  }
}
