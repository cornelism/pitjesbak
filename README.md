# Pitjesbak

A simple web-based version of the dice game 'Draadust'.

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
- **4-3-2:** 200 points.
- **4-2-1:** Opponent skips a turn.
- **6-3-1:** You skip your next turn.
- **6-4-2:** Roll again.

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
