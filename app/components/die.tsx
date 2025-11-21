import { useEffect, useState } from "react";
import { randomRotation } from "../utils";

type Props = {
  value: number;
};

const Eye = ({ className }: { className?: string }) => {
  return (
    <div className={`absolute h-7 w-7 rounded-full bg-black ${className}`} />
  );
};

export const Die = ({ value }: Props) => {
  // force re-render to get new random rotation on value change
  const [className, setClassName] = useState("rotate-0");

  useEffect(() => {
    setClassName(randomRotation());
  }, [value]);

  return (
    <div
      className={`flex h-32 w-32 rounded-xl bg-white shadow-xl relative ${className}`}
    >
      <div className="relative w-full h-full">
        {value === 1 && (
          <Eye className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
        {value === 2 && (
          <>
            <Eye className="top-2 left-2" />
            <Eye className="bottom-2 right-2" />
          </>
        )}
        {value === 3 && (
          <>
            <Eye className="top-2 left-2" />
            <Eye className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Eye className="bottom-2 right-2" />
          </>
        )}
        {value === 4 && (
          <>
            <Eye className="top-2 left-2" />
            <Eye className="top-2 right-2" />
            <Eye className="bottom-2 right-2" />
            <Eye className="bottom-2 left-2" />
          </>
        )}
        {value === 5 && (
          <>
            <Eye className="top-2 left-2" />
            <Eye className="top-2 right-2" />
            <Eye className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Eye className="bottom-2 right-2" />
            <Eye className="bottom-2 left-2" />
          </>
        )}
        {value === 6 && (
          <>
            <Eye className="top-2 left-2" />
            <Eye className="top-2 left-1/2 -translate-x-1/2" />
            <Eye className="top-2 right-2" />
            <Eye className="bottom-2 left-2" />
            <Eye className="bottom-2 left-1/2 -translate-x-1/2" />
            <Eye className="bottom-2 right-2" />
          </>
        )}
      </div>
    </div>
  );
};
