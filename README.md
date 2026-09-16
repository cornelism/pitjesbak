# Pitjesbak

A simple web-based version of the dice game 'Draadust'.  
More pitjesbak games will be added later.  
Note that this fun project is a work in progress.

## How to Play

The goal of the game is to be the first player to score 3000 points.

### Gameplay

1.  Click 'Roll the Dice' to start your turn.
2.  You accumulate points in your 'Current Score'.
3.  If you have a valid score, you can choose to 'Take Points' to add your 'Current Score' to your total 'Score'.
4.  To bank your points for the first time, you need a 'Current Score' of at least 500.
5.  If you roll a non-scoring combination, your turn is over, and you lose your 'Current Score'.

### Scoring

- `1` = 100 points
- `5` = 50 points

### Special Rolls

- **Three of a kind (Sand):** 1000 points (must be confirmed with a subsequent valid roll).
- **6-4-2:** Roll again.
- **6-3-1:** You skip your next turn.
- **4-3-2:** 200 points.
- **4-2-1:** Opponent skips a turn.

## Getting Started

To run this project locally:

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Run the development server:

    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Camera preview

The home page shows a camera preview. Click **Start camera** and allow camera
access in your browser. **Stop camera** turns it off; leaving the page also
releases the camera. Video stays on your device, and no audio is captured.
Camera access requires HTTPS or localhost. Use **Go to game** to open the dice game.

### Read physical dice

Use **Zoom** below the preview to enlarge the dice. The slider uses camera zoom
when the browser exposes it, otherwise centered digital zoom from 1× to 3×.
If the camera rejects zoom control, the slider falls back to digital zoom.
Recognition and saved frames use the same crop as the preview. Changing zoom
resets roll confirmation while preserving the angle and dice-count settings.
The app requests up to 1920 × 1080 camera input and crops before resizing for
detection. Digital zoom enlarges the available pixels; it cannot add detail.

The camera uses **OpenCV.js**, loaded locally when recognition starts. It finds
whole dice and their enclosed dark pips, estimates the top-face region from the
camera angle, and checks the top pip pattern. Side-face pips are excluded before
logging. The captured real-camera fixtures read **3, 5, 3**, **6, 1, 5**, and
**2, 4, 1** at 45°, plus **1, 6, 2** and **4, 6, 1** at 50°.

- Use light dice with dark pips on a darker, plain surface and keep dice apart.
- Keep the camera upright (the visible sides should extend toward the bottom of
  the image).
- Set **Camera angle** to the angle away from overhead: **0°** when looking straight
  down, or approximately **45°** for the slanted setup. Adjust up to **70°** in 5° steps to match
  the actual view. This setting resets to 45° when the camera restarts.
- Focusing or adjusting **Camera angle** shows a transparent grid over the preview.
  It fills the camera view and clips at the preview edges. Its cells are square
  at 0°; at a slanted angle, columns converge and rows get closer toward the back
  of the table. This perspective illustration assumes a roughly 37° field of view,
  rather than a calibrated camera lens. The guide stays
  visible while dragging, then fades after two seconds; keyboard changes bring it
  back. It illustrates the selected setting, rather than measuring the table, and
  is excluded from detection and saved camera frames.
- Green boxes label recognized dice; **Last roll** shows the last settled reading.

Steady readings settle after 900 ms. If stationary values change or detections
drop out, confirmation uses the last six attempts (about 0.8 seconds from the first
to the sixth reading). Five must agree on every die, and the current reading must match
that majority. One misread or incomplete detection is tolerated; an even
split remains uncertain. Small box shifts and size changes are tolerated, while
movement to a new position discards old votes. Once confirmed, the values, marker
positions and confirmation status stay frozen despite subsequent misreads.
Movement or removal visible in the camera pixels for at least 400 ms unlocks
detection for a new throw with normal settling again. Recognition dropouts and
changing detection boxes alone cannot unlock a confirmed roll. Motion checks
compare the image around each confirmed die and compensate for overall exposure
changes. Confirmed markers are drawn once and held until the next throw.

The angle calculation estimates the projected top depth as `width × cos(angle)`.
The remaining vertical extent is the visible side of the cube. The detector removes
that side extent column by column before validating pips. If that estimate fails,
it can recognize a separated upper cluster of four to six pips by correcting
the layout's scale and shear. It requires a gap from side pips and a standard
layout; overlapping clusters remain uncertain. Angled mode also preserves thin
light rims around small pips with a lower threshold. Overhead mode uses
four-corner perspective correction for isolated faces. OpenCV provides the
[contour extraction](https://docs.opencv.org/4.13.0/d5/daa/tutorial_js_contours_begin.html)
and ellipse measurements; this is a geometric detector, not a trained dice model.
It still depends on contrast, visible pips, an upright camera, and approximately
cubic dice. Touching/occluded dice and severe perspective can prevent readings.

When angled-mode thresholding includes more than 30% of the image, the detector
applies a gamma contrast curve (exponent 1.5) and recalculates the threshold.
This suppresses table midtones that otherwise merge with the dice. If the table
still dominates, another Otsu split uses only pixels above the previous threshold
to separate bright dice from the lit table, with a 5% allowance for narrow pip
rims. In this case a second mask uses local Gaussian thresholding over an
81-pixel neighborhood to recover dim dice under uneven lighting. Its brightness
offset scales with the scene's bright threshold. Both masks use the same face
and pip validation; local readings only fill regions without a global reading,
so each die is counted once. These changes affect
recognition only; the live preview and saved frames retain the original pixels.
If multiple table brightness bands still dominate the global mask, up to three
further Otsu splits isolate its brighter pixels, stopping if the threshold cannot
increase. A rejected wide cube can also yield a top one when its upper pip is
clearly separated and its ellipse differs from at least two lower side marks.
This fallback rejects coplanar pips and requires a centered, foreshortened top pip.
Separated top clusters also work on wide cubes when their height exceeds the
expected top-face projection. Large side marks remain part of the gap check.
If a larger matching pattern overlaps another mark, the detector rejects the
ambiguous cluster instead of trying a smaller subset.
Outlines taller than 1.6 times their width are rejected as implausible upright
cubes, preventing long shadow fragments with small holes from becoming dice.
For a nearly overhead top joined to a narrow side, multiple flattened vertical
pips at one edge can identify that side. The remaining, rounder top pips must
all form a valid four-, five-, or six-pip face, with a clear gap from the side.
A single centered pip can occupy up to 20% of the thresholded face, accounting
for large one-face dots and tighter outlines under bright light. Individual pips
on multi-pip faces retain the stricter 8.5% limit.

When a face has multiple enclosed pips but no valid reading, the detector retries
with gentler smoothing. This can separate joined pips or preserve a thin light rim
around a pip near the face edge. The retry must match the same face,
resolve additional separate pips, and pass the existing layout checks. It cannot
replace an accepted reading or add detections outside those unresolved faces.

Faces up to 40 × 40 pixels also receive a small-face retry, since smoothing can
turn a four into a plausible pair or merge a three into a single mark. This pass
uses gentler smoothing and a lower threshold to retain thin light rims. It must
match a previously located face and validate every selected pip. Pixel-scale
tolerances apply only to complete tops without visible sides. When sides are
visible, the retry uses the usual strict projection or separated-top checks.
It may replace an accepted count only when it
recovers additional pips. Angled candidate filtering allows the projected area
at the maximum supported 70° tilt; contours below the original 225-pixel floor
are deferred to a validated detail pass.

If a small face is still unread, a final rim pass preserves unsmoothed pixels.
It measures separate dark components inside the die's convex outline, including
pips open to the rear edge. Four-connected components keep diagonally adjacent
pips separate. At least three enclosed pips must already exist, and the recovered
marks must form a four-, five-, or six-pip top separated from side marks. Raster
area comparisons allow one pixel of uncertainty. This pass only fills previously
located, unread faces; it cannot replace an accepted value.

Duplicate suppression requires overlap covering at least a quarter of the smaller
die box. Small shared corners between adjacent rounded dice do not discard a die.
Detail matching remains stricter: at least 70% of the larger box must overlap.

Before selecting faces, the detector checks indented outlines for narrow
connections between nearby dice. It opens a filled copy of the outline (shrinks
then expands it) and applies the cut only if multiple substantial pieces remain
and at least 85% of the silhouette is preserved. If a gentle opening leaves the
faces joined, it retries with a larger opening, retaining the same area and
minimum piece-size checks. Pip holes retain their original pixels. This handles
contacts with a distinct neck. If opening fails, a fallback pairs opposing
indentations in the outline and cuts across the contacts. It rejects cuts near
pip holes or cuts that leave small fragments. If a straight cut grazes a pip,
it tries a narrow continuous detour around the pip and its protective rim,
then repeats the area and fragment checks. Broad overlaps without clear
indentations can still require moving dice apart.

Face selection happens before pip counting. With an upright camera, an isolated
square top projects no taller than its width; a whole cube has additional vertical
side depth. The detector preserves the entire mask for a complete face and applies
the angle-based side mask only to taller cube contours. It counts the selected
pips, then validates their arrangement. Complete faces never retry a smaller subset
to force a match: this prevents cutting a six down to a four.

For calibrated views, layouts with three or more pips allow a pixel of uncertainty
in both the outline and pip centers (two pixels combined). This allowance scales
with the face size; spacing, shape, and pip-count checks remain unchanged. One-
and two-pip faces retain the original center limits in the standard pass.
The small-face retry extends the center allowance to pairs and accounts for a
pixel at each endpoint when checking spread. It includes boundary pixels' half-cell
extent in the projection; single-pip centering and pattern shapes stay strict.

For a complete four-, five-, or six-pip face, pattern validation normalizes scale
and shear rather than relying on sharp corners in the rounded die outline. The
cluster must be centered and fill the face. Face selection remains a geometric
heuristic for upright cameras and separated, roughly cubic dice.

When a reading fails, use **Save camera frame** to download `dice-camera-frame.png`.
It captures the current video at the detector's input resolution without green
boxes or text, so the failing image can be replayed as a regression fixture. The
button saves locally; it does not upload the frame. Include the expected die values
and camera-angle setting when sharing a frame for debugging.

Set **Dice to read** to the number you are throwing (default: 3). When that many
faces stay consistent for about one second, the browser's developer console logs:

```js
"[Dice roll]", { dice: [2, 4, 6], total: 12, timestamp: "..." }
```

The values follow the dice from left to right. A stationary roll logs once;
moving or removing the dice for at least 0.4 seconds allows the next roll to log,
including a repeat of the same values. Partial or unstable readings do not log.
The last logged roll also appears on the preview. Processing stays in the browser;
no images are uploaded. Recognition is heuristic and may need tuning against
your camera and dice. Tests cover the captured camera image, exposure variations,
ray-cast 3D cubes with side pips, and synthetic isolated faces.

## Code structure

The camera and game are independent features. Shared UI primitives live in
`app/components/ui`; game-specific components and rules live in `app/game`.

- `app/camera/capture`: `camera-session` owns permission requests, playback, and
  track cleanup; `use-camera` owns React state and user actions. `camera-zoom`
  reads capabilities and verifies hardware changes. Frame sizing/cropping is
  shared by detection and downloads.
- `app/camera/detection`: the OpenCV runtime and pixel-to-die pipeline.
  `opencv-dice` coordinates `dice-masks` → `read-dice-mask` → `top-face` /
  `pip-contours` → `read-die-value`. Pattern validators and touching-dice
  separation stay within this feature. OpenCV memory is released explicitly.
- `app/camera/tracking`: roll confirmation and motion detection, independent of
  React and OpenCV. This layer decides when to freeze or release a reading.
- `app/camera/angle-guide`: angle control interactions, projected grid rendering,
  scoped animation styles, and tests. Its only inputs are the angle and a change
  callback; it has no dependency on camera capture, detection, or roll tracking.
- `app/camera/components`: preview, reader controls, frame download, and marker
  rendering. `use-dice-reader` owns React settings and display state;
  `dice-reader-session` owns the sampling loop, detection, and tracking.
- `app/game`: scoring and rule definitions, the `use-game` turn-state hook, and
  game presentation. Camera recognition does not depend on game rules.

Tests live beside the code they exercise. Raw camera regression images and their
expected readings remain in `app/camera/__fixtures__`. Node-only OpenCV test setup
is isolated under `detection/__test-helpers__`.

## Tests

Run `npm test` for camera lifecycle, pixel recognition, and roll stability tests, or
`npm run test:watch` during development.

### OpenCV runtime

`npm install`, `npm run dev`, and `npm run build` prepare the locally served
`public/vendor/opencv.js` from the pinned `@techstark/opencv-js` package. The generated
runtime is ignored by Git. No CDN or external inference service receives camera
frames. The first camera start displays a loading message while OpenCV initializes;
subsequent starts reuse it. All per-frame OpenCV matrices and contours are released
explicitly to avoid growing WASM memory during capture.
