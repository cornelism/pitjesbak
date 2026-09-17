import { PNG } from "pngjs";

export function upload() {
  const png = new PNG({ width: 4, height: 3 });
  png.data.fill(123);
  return {
    capturedAt: "2026-09-16T12:00:00.000Z", sourceSize: { width: 1920, height: 1080 },
    overviewSize: { width: 640, height: 360 }, zoom: 1, cameraTilt: 70,
    crops: [{ source: { x: 20, y: 30, width: 4, height: 3 }, candidate: { x: 10, y: 10, width: 4, height: 3 },
      overviewValue: 4, cropValue: 6, used: true, png: `data:image/png;base64,${PNG.sync.write(png).toString("base64")}` }],
  };
}
