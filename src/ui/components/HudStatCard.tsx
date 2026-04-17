export interface HudStatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "good" | "warn" | "danger";
  meterValue?: number;
  placeholder?: boolean;
}

export function HudStatCard({
  label,
  value,
  detail,
  tone = "neutral",
  meterValue,
  placeholder = false,
}: HudStatCardProps) {
  const meterWidth =
    typeof meterValue === "number"
      ? `${Math.max(0, Math.min(100, meterValue))}%`
      : undefined;

  return (
    <article className={`hud-stat-card hud-stat-card--${tone}${placeholder ? " is-placeholder" : ""}`}>
      <div className="hud-stat-card__head">
        <span className="hud-stat-card__label">{label}</span>
        <strong className="hud-stat-card__value">{value}</strong>
      </div>

      {typeof meterValue === "number" ? (
        <div className="hud-stat-card__meter" aria-hidden="true">
          <div className="hud-stat-card__meter-fill" style={{ width: meterWidth }} />
        </div>
      ) : null}

      {detail ? <p className="hud-stat-card__detail">{detail}</p> : null}
    </article>
  );
}
