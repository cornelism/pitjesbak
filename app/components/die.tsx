type Props = {
  value: number;
};

export const Die = ({ value }: Props) => {
  return (
    <div className="flex h-22 w-22 rounded-xl bg-white shadow-2xl relative">
      <div className="relative w-full h-full">
        {value === 1 && (
          <div className="absolute h-5 w-5 rounded-xl bg-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
        {value === 2 && (
          <>
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 left-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 right-2" />
          </>
        )}
        {value === 3 && (
          <>
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 left-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 right-2" />
          </>
        )}
        {value === 4 && (
          <>
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 left-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 right-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 right-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 left-2" />
          </>
        )}
        {value === 5 && (
          <>
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 left-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 right-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 right-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 left-2" />
          </>
        )}
        {value === 6 && (
          <>
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 left-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 left-1/2 -translate-x-1/2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black top-2 right-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 left-2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 left-1/2 -translate-x-1/2" />
            <div className="absolute h-5 w-5 rounded-xl bg-black bottom-2 right-2" />
          </>
        )}
      </div>
    </div>
  );
};
