import type { SensorSnapshot } from "../../game/types";

export interface ModeBadgeProps {
  mode: SensorSnapshot["mode"];
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  return <span className={`mode-badge mode-badge--${mode}`}>{mode}</span>;
}
