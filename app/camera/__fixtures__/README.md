# Real camera fixtures

## distant-dice-4-3-2.png

- User-provided raw camera frame `dice-camera-frame (41).png`, saved unchanged
  at 640 × 360 pixels on 2026-09-16.
- Manually read top faces from left to right: **4, 3, 2** (total **9**).
- The distant four and three fall below the original fixed contour-area cutoff.
  Standard smoothing also loses rim pips and merges adjacent holes, producing
  plausible partial counts. The area floor now accounts for the camera tilt;
  small candidates receive gentler smoothing and a lower threshold to preserve
  their light rims. A complete top and a valid full pattern must support any
  recovered count, and replacing an accepted value requires additional pips.
- The small-face retry includes boundary pixels' half-cell extent and allows
  pixel-scale uncertainty in centering and separation. It never relaxes the
  single-pip center check or uses side-face fallbacks.
- Tests cover 45°/50°, exposure multipliers 0.8/1.15, and removal of the
  three's middle pip: the remaining pair must read two, never an inferred three.
- Angles are test settings, not a measured physical camera angle.

## wide-table-dice-3-6-4.png

- User-provided raw camera frame `dice-camera-frame (40).png`, saved unchanged
  at 640 × 360 pixels on 2026-09-16.
- Manually read top faces from left to right: **3, 6, 4** (total **13**).
- The wide view makes the dice small. Gentler smoothing recovers all three
  pips on the left die, but their center previously missed the normalized
  position limit by less than one image pixel.
- Multi-pip pattern validation accounts for a pixel of uncertainty in both the
  outline and pip centers under the calibrated projection (two pixels combined),
  while retaining spacing and shape checks. Exposure can move the outline by
  an extra pixel in this frame.
  The standard pass keeps the original single-pip and two-pip position limits.
- Tests cover 45° and 50° and exposure multipliers 0.8/1.15. Pattern tests cover
  resolution scaling and rejection of off-center or invalid arrangements.
- Angles are test settings, not a measured physical camera angle.

## dim-dice-3-4-4.png

- User-provided raw camera frame `dice-camera-frame (38).png`, saved unchanged
  at 640 × 360 pixels on 2026-09-16.
- Manually read top faces from left to right: **3, 4, 4** (total **11**).
- The upper pip of the distant three is close to its top edge. Standard
  smoothing opens its thin light rim into the background, leaving only two
  enclosed pips. Gentler smoothing recovers the third hole and a valid three.
- The retry must recover additional pips on the same face. Tests at 45° and
  50° and exposure multipliers 0.8/1.15 cover the original frame. Negative
  cases cover the upper pip and require the incomplete face to stay unread.
- Angles are test settings, not a measured physical camera angle.

## distant-six-dice-2-6-2.png

- User-provided raw camera frame `dice-camera-frame (37).png`, saved unchanged
  at 640 × 360 pixels on 2026-09-16.
- Manually read top faces, ordered left to right by die bounds: **2, 6, 2**
  (total **10**). The distant six is near the top edge, around `(316, 15)`.
- Standard smoothing merges its six small pips into two elongated columns.
  A gentle-smoothing retry recovers the six individual holes, requiring the
  same face bounds, more separate pips, and a valid pip layout. Previously
  accepted readings retain priority.
- Tests cover 45° and 50° and exposure multipliers 0.8 and 1.15. Negative
  cases join the columns in the source pixels and ensure no six is inferred.
- Angles are test settings, not a measured physical camera angle.

## side-face-dice-4-6-2.png

- User-provided raw camera frame `dice-camera-frame (30).png`, saved unchanged
  at 640 × 360 pixels on 2026-09-16.
- Manually read top faces from left to right: **4, 6, 2** (total **12**).
- The front four's top and right side share an outline. Two narrow vertical
  side pips enter the whole-face count, making the otherwise valid four fail.
- The fallback requires multiple flattened vertical pips at the same edge,
  separated from rounder top pips. It validates every remaining top pip with
  the existing whole-face matcher and multi-pip area limit.
- Tests cover 45° and 50° plus exposure changes. Helper tests reject coplanar
  marks, extra top marks, oversized pips, and ambiguous side separation.

## shadow-dice-2-4-1.png

- Captured on 2026-09-16 directly from the browser video at 640 × 360 pixels,
  digital zoom **1×**, angle control **50°**.
- Manually read top faces: **2, 4, 1** (total **7**).
- Local thresholding creates a narrow shadow fragment with a small enclosed
  hole, previously reported as an extra one. Its height is about 1.77 times
  its width, beyond an upright cube's projection even with edge tolerance.
- Tests reject the extra detection at both 45° and 50°.

## wide-dice-6-5-1.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Unannotated 640 × 360 pixels, digital zoom **1×**, angle control **45°**.
- Manually read top faces from left to right: **6, 5, 1** (total **12**).
- The local mask contains all six top pips and a large merged side mark, but the
  six's cube is wider than it is tall. The old whole-face shortcut rejected it.
- Extra silhouette height beyond the projected top now permits separated-top
  validation. Large side marks still participate in the separation check; only
  the selected top pips must satisfy the multi-pip area limit.
- Tests cover 45° and 50° and exposure changes. The darker case prevents reading
  four from an incomplete six in a mask that contains only the top face.

## wide-dice-1-2-1.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Unannotated 640 × 360 pixels, digital zoom **1×**, angle control **45°**.
- Manually read top faces from left to right: **1, 2, 1** (total **4**).
- The outer cubes are wider than they are tall, so the whole-face heuristic
  includes their side pips and rejects both ones. Their isolated top pips have
  flattened horizontal ellipses distinct from the lower side marks.
- Tests cover 45° and 50° and exposure changes. The brighter variant also
  catches table pixels remaining in the global mask after two Otsu splits.
- Separate helper tests reject coplanar marks, overlapping upper pips, and
  off-center or invalid marks instead of selecting a convenient one-pip subset.

## shaded-distance-dice-3-3-3*.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Unannotated 640 × 360 pixels, digital zoom **1×**, angle control **50°**.
- Manually read top faces from left to right: **3, 3, 3** (total **9**).
- The back dice are dimmer than the front die. Global thresholding fragments
  the left face and loses a pip on the right, leaving only the front three.
- Local Gaussian thresholding recovers the dim dice. Both masks use the same
  face and pip validation; overlapping detections retain the global reading.
- Tests cover 45°, 50°, and 55°, exposure changes, and a later `-live` frame.

## rim-pip-dice-3-3-3.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 360 pixels, digital zoom **1×**, angle control **50°**.
- Manually read top faces, ordered left to right: **3, 3, 3** (total **9**).
- The strict bright-population threshold erases the narrow rim around the left
  die's upper pip. That pip joins the background, leaving two enclosed pips and
  causing the detector to reject the die.
- A 5% reduction of this final threshold preserves the rim. Tests cover the
  captured frame at 45°, 50°, and 55°, plus moderate exposure changes.

## touching-dice-3-1-3.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 pixels at the **45°** control setting.
- Manually read top faces, ordered left to right: **3, 1, 3** (total **7**).
- Straight contact cuts graze the nearest pip's protective rim, so the old
  splitter rejects the entire chain. A narrow four-connected route around the
  protected pixels separates the faces without changing pip validation.
- Tests cover 45° and 50° settings and moderate exposure changes. Separate
  routing tests reject cuts requiring wide detours or crossing protected pixels.

## touching-dice-1-1-3*.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels at the **45°** control setting.
- Manually read top faces, ordered left to right: **1, 1, 3** (total **5**).
- The tight diagonal chain fills about 93.3% of its convex hull. The previous
  92% cutoff skipped separation, leaving one merged contour with five pips of
  inconsistent sizes and no recognized dice.
- Allowing candidates up to 96% lets the existing opposing-notch cuts separate
  the three faces while preserving about 96.7% of the silhouette and all pips.
- Tests cover the original frame at 40°, 45° and 50°, moderate exposure changes,
  and the later `-live` capture at 45°.

## touching-dice-1-4-2*.png

- Captured on 2026-09-16 directly from the browser video with **Save camera frame**.
- Original unannotated 640 × 480 camera pixels; no screen capture or preprocessing.
- Camera angle control: **50° away from overhead**, not a physical measurement.
- Manually read top faces, ordered left to right: **1, 4, 2** (total **7**).
- All three dice join into one contour. Gentle opening leaves it connected;
  stronger opening erases the faces before separating the contacts.
- Opposing contour indentations identify the two contact boundaries. The cuts
  must preserve pip holes and leave substantial connected face regions.
- The `-live` and `-jitter` raw frames cover a slight framing shift and changing
  contour corners. Stronger indentations must take precedence over closer,
  weaker dents along rounded edges.
- Tests replay the captured 50° setting with exposure changes. At 45°,
  the two can still fail the existing minimum pip-spacing check; this fixture
  does not establish angle tolerance for that separate validation limit.

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
