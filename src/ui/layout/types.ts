import type { ReactNode } from "react";

export interface HUDItem {
  id: string;
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "danger";
}

export interface TelemetryMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  emphasis?: boolean;
  isPlaceholder?: boolean;
}

export interface CameraPanelState {
  title: string;
  statusLabel: string;
  description?: string;
  isActive?: boolean;
}

export interface GameFrameProps {
  center: ReactNode;
  hud: ReactNode;
  camera: ReactNode;
  telemetry: ReactNode;
  className?: string;
}
