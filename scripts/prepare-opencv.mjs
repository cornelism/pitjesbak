import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const directory = new URL("../public/vendor/", import.meta.url);
await mkdir(directory, { recursive: true });
await copyFile(require.resolve("@techstark/opencv-js"), new URL("opencv.js", directory));
