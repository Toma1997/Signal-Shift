export type WebcamStatus =
  | "idle"
  | "requesting_permission"
  | "initializing"
  | "ready"
  | "permission_denied"
  | "unavailable"
  | "error";

export interface WebcamState {
  permissionGranted: boolean;
  status: WebcamStatus;
  isStreaming: boolean;
  streamError?: string;
}
