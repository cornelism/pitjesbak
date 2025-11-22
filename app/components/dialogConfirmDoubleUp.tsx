import { useState } from "react";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

type Props = {
  open: boolean;
};

export const DialogConfirmDoubleUp = ({ open }: Props) => {
  return (
    <Dialog open={open}>
      {/* <DialogTrigger>Open</DialogTrigger> */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-3">DOUBLE UP OR NOT ?</DialogTitle>
          <div>
            <RadioGroup defaultValue="option-one">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-one" id="option-one" />
                <Label tabIndex={1} htmlFor="option-one">
                  DOUBLE UP !
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-two" id="option-two" />
                <Label tabIndex={2} htmlFor="option-two">
                  DON'T DOUBLE UP
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-three" id="option-three" />
                <Label tabIndex={3} htmlFor="option-three">
                  STOP HERE
                </Label>
              </div>
            </RadioGroup>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
