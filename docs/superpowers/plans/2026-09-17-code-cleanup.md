# Code Cleanup Implementation Plan

**Goal:** Simplify feature boundaries and remove duplication while preserving camera recognition, confirmation, removal, and uploads.

**Architecture:** Keep camera capture, recognition, tracking, and presentation separate. Use named reader options, isolate native crop recognition and server upload validation, and reuse ordered mask traversal without changing detection thresholds.

**Tech Stack:** Next.js, React, TypeScript, OpenCV.js, Vitest.

Work runs inline in four slices. Stage each completed slice; do not commit automatically.

## 1. Camera presentation and options

- [x] Replace the six positional arguments of `app/camera/use-dice-reader.ts` with a typed options object and update `components/dice-reader.tsx`.
- [x] Extract the zoom slider/error presentation from `components/camera-preview.tsx` into `capture/camera-zoom-control.tsx`; keep state and async actions in the existing capture hook.
- [x] Verify camera lifecycle, stabilization toggling, zoom and removal with `npx vitest run app/camera/components app/camera/tracking/stabilization-toggle.test.tsx app/camera/removal/camera-removal.test.tsx`.
- [x] Stage and report: `refactor: simplify camera controls and reader configuration`.

## 2. Crop recognition and server persistence

- [x] Move unknown-upload/PNG validation from `die-crops/store-crops.ts` into `die-crops/parse-crop-upload.ts`; let storage import only its parsed type.
- [x] Split parsing tests from disk-storage tests, sharing a small fixture builder under `die-crops/__test-helpers__`; update API mocks/imports and the real-pixel storage test.
- [x] Extract matching and optional contrast recognition into `die-crops/read-native-crop.ts`. Keep candidate selection, batch metadata and overview reconciliation in `read-die-crops.ts`.
- [x] Centralize crop count/size/resolution limits in `die-crops/limits.ts` so upload validation and recognition agree.
- [x] Verify with `npx vitest run app/camera/die-crops app/api/dev/die-crops`.
- [x] Stage and report: `refactor: separate crop recognition validation and storage`.

## 3. Detection orchestration

- [x] Introduce `detection/read-dice-masks.ts` for ordered binary/local mask traversal and forward each pass's callbacks, profile and intensity input.
- [x] Replace duplicated traversal in `detection/opencv-dice.ts` without changing candidate acceptance or retry ordering. Retain lazy reads so accepted binary readings influence subsequent local-pass filtering.
- [x] Verify recognition and resource handling with `npx vitest run app/camera/detection app/camera/die-crops/native-recognition.test.ts` and replay ignored frames 52/53 when available.
- [x] Stage and report: `refactor: centralize ordered dice mask traversal`.

## 4. Maintenance docs

- [x] Update README's feature map, stabilization option and development-capture behavior.
- [x] Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- [x] Verify capture files remain ignored and stage source/docs only.

## Historical verification results (before legacy feature removal)

- Camera controls/lifecycle: 28 tests passed.
- Crop recognition, validation, persistence and API: 37 tests passed.
- Detection and native recognition: 464 tests passed.
- Full suite: 663 tests passed across 51 files.
- ESLint, TypeScript, production build and Git whitespace checks passed.
- Local frames 52 and 53 retain readings 4, 5, 6 at 45°, 65° and 70°.
- Development captures remain ignored; only their README is tracked.
- All four slices staged together; no commit or push performed.
