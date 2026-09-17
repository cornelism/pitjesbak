# Pitjesbak — project context and agent handoff

Last updated: **2026-09-17**, after removing the legacy virtual game.
The application now focuses on physical dice recognition. Inspect the current
code and subsequent commits before relying on implementation details.

## 1. Start here

Pitjesbak is a Next.js application for physical dice recognition:

- `/`: a live camera reader for physical dice in a tray. It recognizes top faces,
  confirms rolls, freezes markers, detects removal, and provides camera controls.

The camera reader uses **local OpenCV.js and geometric pip recognition**, not a
trained model or remote inference service. Normal camera frames remain in the
browser. A development-only endpoint can save individual die crops locally when
the user presses the save button. There is no database or authentication flow.

### Working preferences established by the user

- Keep features well separated. Keep hooks focused on React state/lifecycle;
  place geometry, recognition, tracking, device operations, and storage in their
  respective modules.
- Add meaningful tests for separated logic and reported regressions. Reproduce
  failures before tuning thresholds; keep prior real-image regressions passing.
- **Stage each completed slice and give a copyable commit message in a fenced
  code block. Do not commit or push unless requested.** The user often commits
  between turns, so always inspect the working tree first.
- **Do not commit new camera captures or separate die images.** Keep them under
  the ignored `docs/dice-crops/` tree. Never force-add them or bypass the ignore.
  Existing tracked fixtures are intentional and should remain.
- For recognition debugging, use **raw video frames or native die crops**, not
  screenshots containing UI markers. Capture storage must preserve original pixels.
- The user previously authorized starting the camera and saving local development
  captures for debugging. Use the current request to determine scope and avoid
  unnecessary permission questions. Do not upload images to external services.
- The user requested the `react-best-practices`, `typescript-advanced-types`, and
  `vitest` skills. On the original machine their `SKILL.md` files are under
  `/Users/cornelism/.agents/skills/`. Follow available applicable skills; do not
  assume those personal paths exist on another machine.

### Fresh-session checks

```sh
git status --short
git log -5 --oneline
git branch -vv
git remote -v
```

At this snapshot the branch was `main`, the working tree was clean, and `origin`
was `https://github.com/cornelism/pitjesbak.git`. These are historical observations,
not instructions to switch branches or evidence that remote refs are current.
The original checkout is `/Users/cornelism/dev/pitjesbak`.

## 2. Run and verify

Stack: Next **16.0.3**, React **19.2.0**, strict TypeScript, Tailwind **4**,
Vitest **3**, Testing Library, and pinned OpenCV.js
**4.12.0-release.1**. Use `package.json` and `package-lock.json` for exact versions.

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access requires localhost or HTTPS and browser
permission. No audio is requested. Physical camera testing requires real hardware;
passing jsdom tests cannot prove a device supports a constraint.

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`postinstall`, `predev`, and `prebuild` run
[scripts/prepare-opencv.mjs](scripts/prepare-opencv.mjs), which prepares the local
`public/vendor/opencv.js` asset from the pinned package. The generated asset is
ignored by Git. Do not replace it with an unpinned CDN download.

Vitest defaults to jsdom, restores mocks, and unstubs globals. OpenCV tests opt
into Node with `// @vitest-environment node`. Use the shared
[OpenCV test loader](app/camera/detection/__test-helpers__/opencv.ts): the runtime
is a self-resolving thenable, so **await its wrapper, not `cv` itself**.

Useful focused checks:

```sh
# Recognition and refinement, including existing real-image regressions
npx vitest run app/camera/detection app/camera/die-crops

# Device controls and UI
npx vitest run app/camera/capture app/camera/components

# Confirmation, removal, and surface geometry
npx vitest run app/camera/tracking app/camera/removal app/camera/play-area

# Orchestration and local development API
npx vitest run app/camera/dice-reader-session.test.ts app/api/dev/die-crops
```

## 3. Feature map and data flow

```text
CameraPreview → useCamera → camera session / MediaStreamTrack
      │
      └─ DiceReader → useDiceReader → startDiceReader
                                      │
                              freeze native video frame
                                      │
                       overview + full-field image + native crops
                                      │
                       overview detection → crop refinement
                                      │
                     motion / removal / roll confirmation
                                      │
                   frozen markers, status, roll log, surface overlay

Latest crop batch → manual development save → validated local API → ignored files
```

| Area | Responsibility / entry points |
| --- | --- |
| [capture](app/camera/capture) | Stream ownership, device controls, zoom, FPS, frame sizing and coordinate mapping |
| [components](app/camera/components) | Preview, controls, marker/status presentation, raw-frame download |
| [use-dice-reader.ts](app/camera/use-dice-reader.ts) | Reader settings, lifecycle and React display state |
| [dice-reader-session.ts](app/camera/dice-reader-session.ts) | Frame scheduling and integration of recognition, refinement, tracking and removal |
| [detection](app/camera/detection) | OpenCV masks, dice contours, top-face selection, pip measurements and pattern validation |
| [die-crops](app/camera/die-crops) | Frozen native frames, per-die coordinates, refinement, diagnostics and development persistence |
| [tracking](app/camera/tracking) | Pure roll confirmation and pixel-based movement checks |
| [removal](app/camera/removal) | Clear-table checks, absence timing and removal indicator |
| [play-area](app/camera/play-area) | Playing-surface segmentation, boundary and optional overlay |
| [angle-guide](app/camera/angle-guide) | Angle interactions, perspective grid and scoped animation |

Keep image arrays and per-frame buffers out of React state. The preview keeps the
latest crop batch in a ref. `useDiceReader` uses named options and `useEffectEvent`
for notifications; callback identity changes should not restart the reader.

## 4. Camera and scheduling behavior

- `camera-session.ts` owns permission requests, video playback, ended events and
  track cleanup, including cancellation while startup is pending.
- `use-camera.ts` owns idle/requesting/live/error state, session identity checks,
  zoom controls and removal-triggered zoom reset. Stop/unmount releases tracks.
- Input requests ideally **1920 × 1080**. `zoom: true` in the initial permission
  request asks for optional zoom access; it is not a numeric zoom setting.
- Hardware zoom is used when available and verified through actual track settings.
  Rejected or ignored hardware changes fall back to centered digital zoom **1–3×**.
- The detector overview has maximum dimension **640**, preserves aspect ratio,
  and does not upscale. Preview, detection and downloads share crop coordinates.
- FPS options are capability-filtered **10, 15, 20, 25, 30, 60**, plus **Auto**.
  The control reports actual FPS, handles failure, and resets on a new stream.
  Changing FPS retains the camera stream and reader session.
- `camera-constraints.ts` serializes updates per track so FPS and zoom cannot
  overwrite one another. Chromium rejects mixed ImageCapture zoom and ordinary
  video constraints in a single call: apply their families separately. Drop the
  boolean zoom permission marker before applying numeric constraints.
- Reader attempts target **160 ms** intervals, subtracting processing time and
  always yielding at least **16 ms**. There is no catch-up queue. Native OpenCV
  work runs on the main thread and may make actual attempts slower.
- **Camera FPS, detection cadence and stabilization are independent.** Limiting
  FPS is not a guaranteed remedy for lighting flicker or unstable recognition.

Changing angle, dice count, zoom/revision or stabilization replaces the reader
session. Restarting the camera resets angle to **45°** and expected count to **3**.
Do not assume previous UI settings survive a restart or development hot reload.

## 5. Recognition pipeline and invariants

`opencv-dice.ts` coordinates mask passes, candidate selection, overlap suppression
and recovery. `read-dice-mask.ts` isolates faces and measures pips;
`read-die-value.ts` selects a validated top-face reading.

1. Build brightness masks. Angled views can use gamma correction, repeated Otsu
   splits, and local adaptive thresholding when the table dominates the mask.
2. Locate dice contours and split narrowly connected dice, preserving pip holes.
3. Select the likely top face using contour geometry and the configured angle.
4. Measure dark pips, then validate a standard arrangement for values **1–6**.
5. Apply constrained gentle/small-face/rim/ellipse recovery where needed.
6. Refine located faces from the same frame's native crops.

### Rules that must survive refactors

- Angle is **away from overhead**: 0° is straight down; supported range is
  **0–70° in 5° steps**. Projected top depth starts from `width × cos(angle)`.
  The camera should be upright with visible side faces extending downward.
- Count pips on the selected top, then validate their arrangement. Do not choose
  arbitrary subsets to obtain a convenient number or force the expected dice count.
- Preserve complete faces and their full pip patterns. Rounded outlines and
  pixel-scale height differences must not trim a six into a plausible four.
- Side-face pips must not count toward the top. Pattern/ellipse fallbacks require
  evidence of separation, shape, placement and appropriate pip sizes.
- Read retry masks **lazily in order** through `read-dice-masks.ts`; accept each
  batch before processing the next. Eager traversal or changing duplicate
  suppression order can change which reading wins.
- Recovery must match the same located face. General overlap suppression and
  stricter detail-pass face matching are intentionally different.
- Touching-die separation checks narrow connections or opposing indentations;
  cuts must preserve pip holes and at least 85% of the silhouette. Broad ambiguous
  overlaps should remain unresolved.
- OpenCV allocations require explicit cleanup. Keep ownership clear through
  `cv-resources.ts`. Rim processing uses `copyTo` where an independent pixel copy
  is needed; do not assume the previously problematic `.clone()` path is safe.
- Keep captured-frame, exposure, small-face, touching-dice, overhead and angled
  regressions. A fix for one roll is insufficient if earlier scenes regress.

## 6. Native crops and capture policy

`capture-frame.ts` freezes one native frame per attempt. Overview recognition,
full-field removal and per-die crops therefore refer to the **same instant**.

`read-die-crops.ts` prioritizes recognized dice, then unread candidates by pip count
and area. It creates at most the expected number of crops, capped at **6**. Crop
dimensions above **768** are skipped; native recognition requires at least **1.25**
native pixels per overview pixel. Enlarging an existing overview adds no detail.

`read-native-crop.ts` accepts a single matching face. A local contrast retry runs
only after zero matches, never to erase competing matches. Saved PNG pixels stay
unchanged. A crop can recover a missing value or additional pips, but a lower crop
count cannot overwrite a validated overview count. This also means **overview
overcounts cannot currently be corrected by lower crop readings**. A die missing
from overview candidates cannot be recovered by this crop stage.

### Saving and interpreting diagnostics

Use **Save camera frame** for a raw overview-resolution download. Use **Save die
crops to repo** for separate native images and metadata. Crop recognition happens
automatically where eligible; **disk persistence is manual and development-only**.

Saved batches live in `docs/dice-crops/captures/capture-*/` with `die-01.png`, etc.,
and `capture.json`. Inspect source/overview sizes, digital zoom, angle, timestamp,
candidate/source bounds, `overviewValue`, `cropValue`, `used`, and `preprocessing`.
A rejected crop value is diagnostic evidence, not necessarily the displayed roll.

The endpoint [app/api/dev/die-crops/route.ts](app/api/dev/die-crops/route.ts) separates
request handling from `parse-crop-upload.ts` validation and `store-crops.ts` disk
writes. It enforces development-only access, same origin, JSON, bounded payloads,
PNG validation and server-owned filenames. Incomplete writes are cleaned up.

The repository ignores everything under `docs/dice-crops/` except its README.
Normal staging therefore excludes captures; Git ignore is **not** protection
against deliberate `git add -f`. Never bypass it. Verify before handing off:

```sh
git check-ignore docs/dice-crops/captures/example/die-01.png
git diff --cached --name-only
```

Local capture folders will not exist in a fresh checkout. Tests must not require
them. Existing permanent raw fixtures are under `app/camera/__fixtures__/` with
[independent labels and setup notes](app/camera/__fixtures__/README.md). For new
captures, retain local images and add durable synthetic/geometry regressions
without committing the captures. The saved-examples test derives crops from an
existing tracked fixture and verifies pixel-identical writes in a temporary folder.

## 7. Confirmation, frozen markers and removal

### Confirmation

- Stabilization defaults **on**, with a checkbox to disable it.
- Consistent complete readings settle after **900 ms**.
- Stationary flicker/dropouts switch to a last-**6**-attempt window; **5** must
  agree and the current reading must match the majority. Incomplete attempts
  count against agreement. An even split remains uncertain.
- Small position/size changes are tolerated relative to an anchor, avoiding
  accumulated drift. Changing position discards earlier votes.
- With stabilization off, the first complete reading confirms immediately.
- **Once confirmed, values, marker positions and status freeze.** Misreads,
  missing detections and changing boxes alone do not unlock a roll.
- Sustained pixel movement for **400 ms** allows a new throw. Motion around the
  confirmed dice compensates for exposure changes. Do not let stationary detector
  errors silently replace a confirmed roll.
- A confirmed roll logs once as `[Dice roll]` with left-to-right values, total and
  timestamp. A new throw may have the same values and must still be recognized.

### Removal and playing surface

After a confirmed roll: detect movement → wait for the hand/changed foreground to
clear → require all dice absent continuously for about **2 seconds** → show the
top-right **Dice removed** indicator → reset zoom to **1.0×**.

Removal compares full camera pixels, including outside a digital crop. Former
dice positions must resemble surrounding table and other changed surface patches
must clear. Partial removal, unreadable pips or recognition dropout is not enough.
A camera pause interrupts the timer. Removal clears the last roll and logs
`[Dice removed]` once. The indicator survives zoom reset and clears when dice return.

The playing surface is calibrated from a confirmed scene. Segmentation separates
felt color from brightness, removes narrow bridges/islands, fills holes and
simplifies the outer boundary. The **Show play area** checkbox displays that same
surface; it does not run a separate UI estimator or change dice recognition.
Digital zoom transforms the overlay; hardware zoom invalidates the calibration.

This is conservative scene comparison, not trained hand segmentation. Camera
movement, obstructions, shadows and atypical surfaces can delay removal.

## 8. Angle overlay

The angle guide is a separate feature. It covers the full preview, clips at the
edges and fades two seconds after adjustment. It illustrates perspective using an
assumed roughly **37° field of view**; it does not measure the camera or table.
Grid, play-area shading, labels and status never enter recognition or saved frames.

## 9. Recent fixes and current handoff state

These notes capture prior investigation, not a new claim that every test or
physical setup was rerun while writing this document.

| Commit | What changed / why it matters |
| --- | --- |
| `6b24180` | Separated camera features, crop validation/storage/recognition, and lazy mask traversal |
| `ae21a13` | Preserved complete pip patterns across rounded faces; fixed a live six being read as four |
| `56ae4d3` | Added camera FPS control with actual-setting checks and serialized, separately applied zoom/video constraints |

### Most recent physical roll regression

The user supplied frame **55**, showing **6, 3, 2**, and corrected the angle from
40° to **35°**. A subsequent live reading still confirmed **4, 3, 2**. Native crop
inspection showed all six top pips, but a rounded bottom outline caused geometric
trimming to accept four. The fix validates the complete enclosed pip grid when
all pips lie in the expected top depth, before accepting a projected subset.
Tests cover the measured geometry at native and overview scales and rounded/V
outlines. The live roll was subsequently observed as **6, 3, 2**.

Local-only evidence, if still present on the original machine:

- `docs/dice-crops/examples/roll-6-3-2/frame-55.png`
- `docs/dice-crops/examples/roll-6-3-2/frame-56.png`
- `docs/dice-crops/captures/capture-AVVQ2z/` (native 1920 × 1080, overview 640 × 360,
  zoom 1×, angle 35°; `die-01.png` contains the six)

The latest feature was manually exercised at **15 FPS** and the camera reported
15 FPS while retaining the confirmed roll. Preview flicker itself was not proven
eliminated. A restart during testing reset the angle, so **35° is the regression
input, not a claim about the currently open browser**.

Previously reported validation: full suite/lint/typecheck/build passed during the
cleanup; detection/native regression tests passed after the six fix; 61 targeted
camera/UI/removal/stabilization tests plus lint/typecheck passed for FPS. The full
suite/build were not rerun for FPS. Run checks appropriate to the next change;
do not present these historical results as fresh execution.

The legacy virtual game, its route/navigation, unused UI primitives and packages,
and carpet background were removed at the user’s request. The camera is now the
sole application feature. After removal, all **665 tests across 51 files**, lint,
TypeScript, and the production build passed. The build lists `/`, the standard
not-found page, and `/api/dev/die-crops`. This handoff does not authorize additional
feature work.

## 10. Debugging workflow for the next agent

1. Read current Git changes and this feature map. Identify whether the symptom is
   raw video flicker, marker/status flicker, wrong recognition, slow confirmation,
   or failed removal; they involve different layers.
2. Record angle, expected count, stabilization, zoom mode/value, camera-reported
   FPS, native dimensions and overview dimensions. Verify after any restart.
3. Obtain a raw frame and, where relevant, same-attempt native crops. Independently
   label visible top values left-to-right; do not trust the green markers as truth.
4. Reproduce overview detection using the pattern in `opencv-dice.test.ts`
   (`pngjs` → RGBA pixels → `detectDiceOpenCv`). Inspect crop metadata separately;
   a native crop may improve or conflict with the overview.
5. Identify the failing stage: missing candidate, joined dice, erased pip, top/side
   selection, pattern validation, crop reconciliation, or temporal tracking.
6. Write a focused failing regression with durable inputs. Keep private/local
   captures ignored and avoid tests that depend on `/tmp` debugging scripts.
7. Change the smallest responsible module, then run relevant neighboring tests.
   Detection threshold changes warrant the broader detection and crop suites.
8. For live verification, remember confirmed rolls are deliberately frozen.
   Trigger a new throw or explicitly reset reader settings. Do not weaken freezing
   just to see a new implementation's output on stationary dice.
9. Check physical behavior when changing device constraints. Mocks cannot prove
   actual zoom/FPS application; inspect reported settings and asynchronous errors.
10. Inspect the diff and staged file list, stage the completed slice, and provide
    a short result, verification limits, and fenced copyable commit message.

### Remaining limitations / possible future investigations

- Recognition is heuristic and depends on contrast, visible pips, roughly cubic
  dice and an upright camera. Severe perspective and occlusion remain difficult.
- Native refinement cannot find dice absent from overview candidates or correct
  overview overcounts with a lower native count under current reconciliation.
- CPU-heavy OpenCV/crop passes run on the main thread. Profile before changing
  sampling or confirmation timing; worker offloading is not implemented.
- FPS limiting does not guarantee elimination of exposure/lighting flicker.
- Surface calibration and removal are scene heuristics, not semantic segmentation.
- Angle guidance is illustrative; automatic camera/table calibration is not implemented.

## Further reading

- [README](README.md): user controls and detailed recognition behavior.
- [Die crop guide](docs/dice-crops/README.md): local storage and diagnostics.
- [Fixture catalog](app/camera/__fixtures__/README.md): labelled regression scenes.
- [Historical image comparisons](docs/screenshots/dice-detection/README.md).
- [Completed cleanup plan](docs/superpowers/plans/2026-09-17-code-cleanup.md).

Update this handoff when responsibilities, invariants or workflows change. Keep
historical observations dated, and let current code/tests resolve stale details.
