export interface EventToastProps {
  label: string | null;
}

export function EventToast({ label }: EventToastProps) {
  if (!label) {
    return null;
  }

  return (
    <div className="event-toast" role="status" aria-live="polite">
      <span className="event-toast__eyebrow">Active Event</span>
      <strong className="event-toast__label">{label}</strong>
    </div>
  );
}
