type Props = {
  value: number;
};

const Eye = ({ className }: { className?: string }) => {
  return (
    <div className={`absolute h-8 w-8 rounded-full bg-black ${className}`} />
  );
};

export const Die = ({ value }: Props) => {
  return (
    <div
      className="flex h-32 w-32 rounded-xl bg-white shadow-xl relative rotate-0"
    >
      <div className="relative w-full h-full">
        {value === 1 && (
          <Eye className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
        {value === 2 && (
          <>
            <Eye className="top-3 left-3" />
            <Eye className="bottom-3 right-3" />
          </>
        )}
        {value === 3 && (
          <>
            <Eye className="top-3 left-3" />
            <Eye className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Eye className="bottom-3 right-3" />
          </>
        )}
        {value === 4 && (
          <>
            <Eye className="top-3 left-3" />
            <Eye className="top-3 right-3" />
            <Eye className="bottom-3 right-3" />
            <Eye className="bottom-3 left-3" />
          </>
        )}
        {value === 5 && (
          <>
            <Eye className="top-3 left-3" />
            <Eye className="top-3 right-3" />
            <Eye className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Eye className="bottom-3 right-3" />
            <Eye className="bottom-3 left-3" />
          </>
        )}
        {value === 6 && (
          <>
            <Eye className="top-3 left-3" />
            <Eye className="top-3 left-1/2 -translate-x-1/2" />
            <Eye className="top-3 right-3" />
            <Eye className="bottom-3 left-3" />
            <Eye className="bottom-3 left-1/2 -translate-x-1/2" />
            <Eye className="bottom-3 right-3" />
          </>
        )}
      </div>
    </div>
  );
};
