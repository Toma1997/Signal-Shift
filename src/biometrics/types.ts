export type WebcamStatus = "idle" | "initializing" | "ready" | "error";

export interface WebcamState {
  permissionGranted: boolean;
  status: WebcamStatus;
  isStreaming: boolean;
  streamError?: string;
}
