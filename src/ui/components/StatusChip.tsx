export interface StatusChipProps {
  label: string;
  tone?: "neutral" | "good" | "info" | "warn";
}

export function StatusChip({
  label,
  tone = "neutral",
}: StatusChipProps) {
  return <span className={`status-chip status-chip--${tone}`}>{label}</span>;
}
