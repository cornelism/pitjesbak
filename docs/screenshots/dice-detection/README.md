# Dice detection screenshots

Saved on 2026-09-15 for visual reference. Each comparison shows the raw camera
frame, processed grayscale image, original detection mask, and final mask.

- [2, 4, 1 — contrast fallback applied](angled-dice-2-4-1-comparison.png)
- [6, 1, 5 — no contrast fallback needed](angled-dice-6-1-5-comparison.png)
- [3, 5, 3 — no contrast fallback needed](angled-dice-comparison.png)
- [1, 6, 2 — captured at 50°](angled-dice-1-6-2-comparison.png)
- [1, 6, 2 — verified live after the pattern recognition fix](angled-dice-1-6-2-live.png)

These are diagnostic screenshots. The original camera images used by automated
tests are in [app/camera/__fixtures__](../../../app/camera/__fixtures__/).
