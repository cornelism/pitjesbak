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

While the camera runs, the app reads light dice with dark pips on a darker,
plain surface. Angled views are **experimental and currently unreliable with real
dice**. Synthetic tests cover isolated faces tilted 45°, die rotation, and rounded
corners; they do not establish support for a real cube viewed at 45°. Provide even
light and keep the dice apart and large enough to see clearly.
Green boxes show the recognized faces. Dark dice, overlapping dice, and top faces
that blend into visible side faces remain unsupported. Real-camera performance
depends on lighting and how clearly the top face can be separated.

When a reading fails, use **Save camera frame** to download `dice-camera-frame.png`.
It captures the current video at the detector's input resolution without green
boxes or text, so the failing image can be replayed as a regression fixture. The
button saves locally; it does not upload the frame. Include the expected die values
when sharing a frame for debugging.

At 45°, foreshortening alone reduces one dimension to `cos(45°) ≈ 0.707` of its
original size. The detector estimates four face corners and uses a homography to
map pip positions into a square before checking the pattern. This also corrects
perspective taper, which a fixed `1.414×` stretch would miss. No angle setting or
camera calibration is needed. See the
[OpenCV perspective-correction reference](https://docs.opencv.org/4.11.0/d9/dab/tutorial_homography.html).

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
your camera and dice. Tests use synthetic frames, not real camera footage.

## Tests

Run `npm test` for camera lifecycle, pixel recognition, and roll stability tests, or
`npm run test:watch` during development.
