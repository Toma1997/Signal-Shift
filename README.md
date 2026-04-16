# Signal-Shift

This app started from the `rppg-demo` template in
`@elata-biosciences/create-elata-demo` and now also includes EEG integration
inside the same browser app.

## What This Demo Shows

- camera-based rPPG processing in the browser
- `createRppgSession()` as the recommended `@elata-biosciences/rppg-web` app entrypoint
- a large BPM readout, confidence and signal-quality meters, and session chips tuned for demos
- expandable technical diagnostics (`backendMode`, `issues`, `lastError`, and related fields)
- `initEegWasm()` integrated into the same Vite app for synthetic EEG processing
- `WasmCalmnessModel`, `WasmAlphaPeakModel`, and `band_powers()` rendered in the UI
- `BleTransport` plus `AthenaWasmDecoder` for Muse-compatible EEG over Web Bluetooth

## Requirements

- a modern browser with camera access
- permission to use the camera
- `pnpm` or `npm` to install dependencies

## Run It

```text
npm:
npm install
npm run dev
```

## Notes

- `Camera rPPG`, `Synthetic EEG`, and `EEG BLE` are exposed as separate modes in one app shell.
- The synthetic EEG path is useful for validating the EEG integration before pairing a headset.
- BLE mode requires Chrome or Edge with Web Bluetooth enabled on `https://` or `localhost`.
- The rPPG path intentionally still starts from `createRppgSession()` instead of lower-level `DemoRunner` or `RppgProcessor` wiring.
