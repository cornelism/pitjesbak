# Real camera fixtures

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
