import { catchZoneHeight, laneCount } from "./constants";
import type { FallingObject, Lane, SignalKind } from "./types";

export const GAME_CANVAS_WIDTH = 720;
export const GAME_CANVAS_HEIGHT = 520;

const PLAYER_Y = GAME_CANVAS_HEIGHT - 34;
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
  ctx.fillStyle = "rgba(34, 197, 94, 0.08)";
  ctx.fillRect(0, height - catchZoneHeight, width, catchZoneHeight);
  ctx.strokeStyle = "rgba(74, 222, 128, 0.22)";
  ctx.strokeRect(0, height - catchZoneHeight, width, catchZoneHeight);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  playerLane: Lane,
  width: number,
): void {
  const centerX = laneCenterX(playerLane, width);
  const left = centerX - PLAYER_WIDTH / 2;

  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.roundRect(left, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
  ctx.beginPath();
  ctx.roundRect(left + 12, PLAYER_Y - 8, PLAYER_WIDTH - 24, 6, 6);
  ctx.fill();
}

function colorForKind(kind: SignalKind): string {
  switch (kind) {
    case "calm":
      return "#4ade80";
    case "focus":
      return "#60a5fa";
    case "noise":
      return "#fb923c";
    case "glitch":
      return "#e879f9";
  }
}

function drawCalm(
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

function drawFocus(
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

function drawNoise(
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

function drawGlitch(
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
    case "calm":
      drawCalm(ctx, x, object.y, color);
      break;
    case "focus":
      drawFocus(ctx, x, object.y, color);
      break;
    case "noise":
      drawNoise(ctx, x, object.y, color);
      break;
    case "glitch":
      drawGlitch(ctx, x, object.y, color);
      break;
  }

  ctx.restore();

  if (object.labelVisible) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(object.kind, x, object.y - 26);
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
  const width = canvas.width;
  const height = canvas.height;
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

  drawPlayer(ctx, snapshot.playerLane, width);

  if (showMetrics) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
    ctx.font = "15px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score ${snapshot.score}`, 16, 28);
    ctx.fillText(`Stability ${snapshot.stability}`, 16, 50);
  }
}
