# Real camera fixtures

## bright-dice-1-1-1.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels; no screen capture or preprocessing.
- Camera angle control: **50° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **1, 1, 1** (total **3**).
- Stronger illumination makes the table dominate even after contrast correction:
  about 64% of the frame enters the foreground mask, and no dice are read.
- Splitting the brighter intensity population isolates the dice. The right die's
  large single pip occupies about 18% of its thresholded face.
- Tests cover the raw frame, exposure changes, nearby angles, and rejection of
  uniform frames and invalid large pip marks.

## angled-dice-2-2-6.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels; no screen capture or preprocessing.
- Camera angle control: **45° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **2, 2, 6** (total **10**).
- The back two and six share a wide connection in the thresholded image. The
  original separation step leaves them joined, so only the front two is read.
- Tests cover the raw frame, moderate exposure changes, and nearby angle settings.
  Mask tests also cover wider contacts at multiple scales and preserve pip holes.

## angled-dice-3-3-4.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels; no screen capture or preprocessing.
- Camera angle control: **45° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **3, 3, 4** (total **10**).
- The two nearby threes merge into one outline during thresholding. The original
  detector rejects their combined six pips and reports only the four.
- Tests exercise separation before pip counting, including moderate exposure
  changes and camera angle settings of 40°, 45°, and 50°.

## angled-dice-1-2-4.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels; no screen capture or preprocessing.
- Camera angle control: **45° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **1, 2, 4** (total **7**).
- Reproduces a missing middle die: both top pips are found, but their normalized
  separation (about 0.37) falls below the old shared minimum of 0.4.
- Tests replay the original frame, moderate exposure changes, and nearby angle
  settings. Pattern tests retain rejection of tiny pairs and off-center marks.

## angled-dice-4-6-1.png

- Captured on 2026-09-15 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels; no screen capture or preprocessing.
- Camera angle control: **50° away from overhead**.
- Manually read top faces, ordered left to right: **4, 6, 1** (total **11**).
- Reproduces a false reading of **4, 4, 1**: the estimated top-face mask excludes
  the bottom two pips of the six, and the remaining four are accepted before
  the complete-face pattern matcher is evaluated.

## angled-dice-1-6-2.png

- Captured on 2026-09-15 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 pixels; no contrast correction or overlays.
- Camera angle control: **50° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **1, 6, 2** (total **9**).
- Approximate die centers: `(219, 277)`, `(333, 237)`, `(373, 321)`.
- The regression replays the full frame at the captured angle. The screenshot
  comparison in `docs/screenshots/dice-detection` records the current preprocessing.

## angled-dice-2-4-1.png

- Captured on 2026-09-15 with **Save camera frame** after starting the camera
  in the browser. This is the actual video element's unannotated 640 × 480
  frame, not a desktop screenshot or a crop of the app interface.
- Camera angle control: **45° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **2, 4, 1** (total **7**).
- Approximate die centers: `(345, 238)`, `(486, 185)`, `(509, 395)`.
- The test passes the exact PNG pixels into OpenCV without image correction.
  It covers dark side faces and a brighter table surface than the earlier rolls.

## angled-dice-6-1-5.png

- Captured on 2026-09-15 using **Save camera frame** in the live camera page.
- Unannotated 640 × 480 video frame, at the detector's input resolution. No
  retouching, perspective correction, or detection overlays.
- Camera angle control: **45° away from overhead**. This is the UI setting,
  not a measured physical camera angle.
- Manually read top faces, ordered left to right: **6, 1, 5** (total **12**).
- Approximate die centers: `(112, 209)`, `(335, 300)`, `(502, 113)`.
- Regression tests exercise the entire scene and unscaled 128 × 128 crops of
  each die. The crops include the visible side faces and surrounding background.

Expected values describe the visible top faces, independently of the detector.
The new regression cases remain ordinary assertions so missed dice fail loudly.

## angled-dice.png

Earlier camera screenshot fixture, resized to 640 × 480. Expected top faces,
ordered left to right: **3, 5, 3**, with the camera angle control set to 45°.
