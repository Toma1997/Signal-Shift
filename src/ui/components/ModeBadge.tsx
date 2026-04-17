import type { SensorSnapshot } from "../../game/types";

export interface ModeBadgeProps {
  mode: SensorSnapshot["mode"];
  isPlaceholder?: boolean;
}

export function ModeBadge({ mode, isPlaceholder = false }: ModeBadgeProps) {
  return (
    <span className={`mode-badge mode-badge--${mode}${isPlaceholder ? " is-placeholder" : ""}`}>
      {mode}
      {isPlaceholder ? " sim" : ""}
    </span>
  );
}
