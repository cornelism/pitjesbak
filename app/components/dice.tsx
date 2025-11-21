import { randomRotation } from "../utils";
import { DiceRoll } from "../utils/types";
import { Die } from "./die";

export const Dice = ({ dice }: { dice: DiceRoll }) => {
  return (
    <div className="grid grid-cols-3 gap-12 my-24">
      <Die value={dice[0]} />
      <Die value={dice[1]} />
      <Die value={dice[2]} />
    </div>
  );
};
