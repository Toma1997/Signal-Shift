import type { ReactNode } from "react";
import { StatusChip, type StatusChipProps } from "./StatusChip";

export interface CameraPanelProps {
  title?: string;
  isLive?: boolean;
  emptyLabel?: string;
  footerText?: string;
  statusChips?: StatusChipProps[];
  previewContent?: ReactNode;
}

export function CameraPanel({
  title = "Camera",
  isLive = false,
  emptyLabel = "Camera preview",
  footerText,
  statusChips = [],
  previewContent,
}: CameraPanelProps) {
  return (
    <section className="panel camera-panel">
      <div className="camera-panel__header">
        <p className="placeholder-title">{title}</p>
        {statusChips.length > 0 ? (
          <div className="camera-panel__chips">
            {statusChips.map((chip) => (
              <StatusChip key={`${chip.label}-${chip.tone ?? "neutral"}`} {...chip} />
            ))}
          </div>
        ) : null}
      </div>

      <div className={`camera-panel__viewport${isLive ? " is-live" : ""}`}>
        {previewContent ? (
          previewContent
        ) : (
          <div className="camera-panel__empty">
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>

      {footerText ? <p className="camera-panel__footer">{footerText}</p> : null}
      {/* TODO(day4): replace previewContent placeholder with live webcam/video composition. */}
    </section>
  );
}
