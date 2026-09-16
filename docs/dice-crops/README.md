# Separate die images

The reader freezes the camera's native frame before creating its 640-pixel
overview. It locates dice in the overview, then crops those same positions from
the frozen native frame, including a margin for the sides and surrounding table.
The saved PNGs contain camera pixels only: no labels, resizing, or sharpening.

## Save a development capture

1. Run `npm run dev` and start the camera.
2. Set the angle and dice count and leave the dice visible.
3. Click **Save die crops to repo** below the camera.
4. Open the displayed `docs/dice-crops/captures/capture-…` directory.

Each capture contains `die-01.png`, `die-02.png`, etc., and `capture.json`.
Metadata records the native resolution, overview resolution, digital zoom,
camera angle, crop coordinates, original readings, crop readings, and whether
the crop result was used. `preprocessing` records a local contrast retry;
the PNG remains the unmodified source even when that retry was used.

Saving is manual and available only on the development server. Normal recognition
does not upload images or write files. The save endpoint is disabled in production
and accepts only same-origin, size-limited PNG batches. All contents of this
directory except this README are ignored by Git. Captures and local examples
stay on disk and are excluded from normal staging, including `git add .`.

## Recognition behavior

- Crop analysis is in `app/camera/die-crops/`, separate from roll confirmation,
  marker drawing, motion tracking, and removal detection.
- The overview detector also supplies unread face candidates. Native crop reads
  can recover those candidates or refine a recognized value.
- At most the requested number of dice are cropped (maximum six). A crop is
  skipped if either dimension exceeds 768 native pixels.
- Crops are analyzed only when the camera supplies at least 1.25 native pixels
  per overview pixel. Digital zoom can use up this advantage. Enlarging an old
  640-pixel frame does not restore missing detail.
- A result must correspond to the located face. No match or competing matches
  preserve the overview result. Local contrast is retried only after no match.
- A crop may confirm a reading or recover additional pips, but a lower count
  preserves the validated overview reading: thresholding can erase rim pips.
  The rejected count is saved as `cropValue` with `used: false`. This conservative
  rule also means crops cannot correct an overview overcount yet.
- Refined values enter the existing stabilization and confirmation logic.
- A die that cannot be located at all in the overview cannot yet be recovered
  through this feature.

## Local examples and validation

- Local examples are optional and are not included in a checkout.
- `examples/frame-51/`: three actual camera crops from the supplied
  `small-six-dice-3-5-6.png` fixture, independently labelled **3, 5, 6**. The
  source is only 640 × 360; these demonstrate pixel-preserving storage, not
  high-resolution improvement. The storage regression test generates crops from
  the committed source fixture in a temporary directory and checks saved pixels;
  it does not depend on local captures.
- `examples/native-browser/`: a **simulated** 1920 × 1080 camera showing **3, 4, 6**.
  Saved through the real UI and endpoint with digital zoom 2× and camera angle 0°.
  These are generated test images, not a physical camera capture.
- `native-recognition.test.ts`: renders a six at 1920 × 1080, verifies it is unread
  after reduction to 640 pixels, and recovers six from the native crop.
- Unit/integration tests cover coordinate mapping, clipped crops, ambiguous reads,
  unchanged source pixels, native results reaching roll confirmation, bounded
  uploads, production rejection, saving failures, and session cleanup.
- Playwright checked `http://localhost:3000/` at 1100 × 1000 and 360 × 780:
  camera start → confirmed roll → 2× zoom → save three PNGs → stop. No page or
  console errors or horizontal overflow. Browser plugin was unavailable, so
  local Playwright was used. No screen captures were used as detection input.

Actual high-resolution dice from the physical camera still need evaluation;
the development save button makes those future captures reproducible.
