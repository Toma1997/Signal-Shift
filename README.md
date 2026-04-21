# Signal Shift

Signal Shift is a browser-based biofeedback game prototype built with React, TypeScript, Vite, Zustand, camera rPPG, and EEG hooks. The player routes falling system traffic into the correct lanes while the game adapts pacing, pressure, and clarity systems from live or synthetic biometric signals.

## What The Game Is

The game is built around three routing lanes:

- `Stabilize` for `Stable` signals
- `Convert` for `Charge` signals
- `Discard` for `Interference` and `Anomaly`

The player moves left and right, catches one object at a time, and tries to keep the reactor stable. BPM influences pressure and pace. EEG-derived focus supports clarity and recovery systems. Synthetic EEG is available for testing and demo flow when a live EEG device is not connected.

## Controls

- `ArrowLeft` / `ArrowRight`: move between lanes
- `Space`: catch / route one object
- `E`: trigger Clarity Pulse when available

## Sensors And Permissions

- Camera access is needed for browser rPPG / live BPM
- Synthetic EEG can run without a headset
- Bluetooth EEG is scaffolded as an optional path where browser and device support are available

Recommended browser:

- Chrome or Edge on `localhost` or HTTPS for camera access
- Web Bluetooth support is recommended for live BLE EEG workflows

## Install

```bash
npm install
```

## Dev

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Build Notes

- Production output is static-host friendly and builds to `dist/` with a root `index.html`
- Asset paths use relative Vite output, so the app can be served from a normal static host or embedded in an iframe without a custom backend
- Camera and BLE-backed features still require a supported browser context such as `localhost` or HTTPS

## Quick Manual Check

- Setup should move cleanly into calibration
- Calibration should guide camera, BPM, and EEG without long technical text
- Gameplay should fit in one fixed viewport with the camera panel and telemetry visible
- Results should show static BPM and EEG history without scrolling

## Dev Helper

In development only, the game exposes a small debug helper on `window.__SIGNAL_SHIFT_DEBUG__` for forcing modes or timed events during QA.
