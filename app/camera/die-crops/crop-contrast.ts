/** Stretch local luminance only for recognition; keep the saved native pixels. */
export function cropContrast(image: ImageData): ImageData {
  const histogram = new Uint32Array(256);
  const gray = new Uint8Array(image.width * image.height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(image.data[i * 4] * 0.299 + image.data[i * 4 + 1] * 0.587 + image.data[i * 4 + 2] * 0.114);
    histogram[gray[i]]++;
  }
  function percentile(fraction: number) {
    let count = 0;
    for (let i = 0; i < histogram.length; i++) {
      count += histogram[i];
      if (count >= gray.length * fraction) return i;
    }
    return 255;
  }
  const black = percentile(0.2), white = percentile(0.98);
  if (white - black < 20) return image;
  const data = new Uint8ClampedArray(image.data.length);
  for (let i = 0; i < gray.length; i++) {
    const value = Math.round((gray[i] - black) * 255 / (white - black));
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  return { width: image.width, height: image.height, data, colorSpace: "srgb" };
}
