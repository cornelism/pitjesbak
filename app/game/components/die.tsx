const PIP_POSITION = {
  topLeft: "top-3 left-3",
  topCenter: "top-3 left-1/2 -translate-x-1/2",
  topRight: "top-3 right-3",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  bottomLeft: "bottom-3 left-3",
  bottomCenter: "bottom-3 left-1/2 -translate-x-1/2",
  bottomRight: "bottom-3 right-3",
} as const;

type PipPosition = keyof typeof PIP_POSITION;
const PIP_LAYOUTS: Readonly<Partial<Record<number, readonly PipPosition[]>>> = {
  1: ["center"],
  2: ["topLeft", "bottomRight"],
  3: ["topLeft", "center", "bottomRight"],
  4: ["topLeft", "topRight", "bottomRight", "bottomLeft"],
  5: ["topLeft", "topRight", "center", "bottomRight", "bottomLeft"],
  6: ["topLeft", "topCenter", "topRight", "bottomLeft", "bottomCenter", "bottomRight"],
};

export function Die({ value }: { value: number }) {
  return (
    <div className="flex h-32 w-32 rounded-xl bg-white shadow-xl relative rotate-0">
      <div className="relative w-full h-full">
        {PIP_LAYOUTS[value]?.map((position) => (
          <div key={position} className={`absolute h-8 w-8 rounded-full bg-black ${PIP_POSITION[position]}`} />
        ))}
      </div>
    </div>
  );
}
