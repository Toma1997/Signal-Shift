export const GAME_FRAME_GAP_PX = 18;
export const GAME_FRAME_HUD_RAIL_WIDTH_PX = 288;
export const GAME_FRAME_CAMERA_HEIGHT_PX = 248;
export const GAME_FRAME_CANVAS_MIN_HEIGHT_PX = 520;
export const GAME_FRAME_TELEMETRY_HEIGHT_PX = 88;
export const GAME_FRAME_STACK_BREAKPOINT_PX = 1100;

export const GAME_FRAME_REGION_NAMES = {
  center: "center-canvas",
  hud: "right-hud-rail",
  camera: "top-right-camera-box",
  telemetry: "bottom-telemetry-strip",
} as const;
