export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}
