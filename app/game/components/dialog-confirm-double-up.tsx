import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

type Props = {
  open: boolean;
  setMultiplier: (multiplier: number) => void;
  setOpen: (open: boolean) => void;
};

export const DialogConfirmDoubleUp = ({
  open,
  setMultiplier,
  setOpen,
}: Props) => {
  const onDoubleUp = () => {
    setMultiplier(2);
    setOpen(false);
  };

  const onDoNotDoubleUp = () => {
    setMultiplier(1);
    setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="invisible">What now ?</DialogTitle>
          <div className="flex flex-row justify-between">
            <button
              onClick={onDoubleUp}
              className="bg-green-500 px-4 py-2 rounded-md mr-2"
            >
              Double up
            </button>
            <button
              onClick={onDoNotDoubleUp}
              className="bg-yellow-500 px-4 py-2 rounded-md mr-2"
            >
              Do not double up
            </button>
            <button
              onClick={onDoNotDoubleUp}
              className="bg-red-500 px-4 py-2 rounded-md"
            >
              Stop here
            </button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
