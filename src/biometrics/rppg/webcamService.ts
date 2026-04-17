const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

function getUserMediaSupport(): MediaDevices {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not available in this browser.");
  }

  return navigator.mediaDevices;
}

export async function requestWebcamPermission(): Promise<MediaStream> {
  const mediaDevices = getUserMediaSupport();
  return mediaDevices.getUserMedia(DEFAULT_CONSTRAINTS);
}

export async function startWebcamStream(): Promise<MediaStream> {
  return requestWebcamPermission();
}

export function stopWebcamStream(stream: MediaStream | null | undefined): void {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
}
