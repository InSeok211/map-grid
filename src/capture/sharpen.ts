// Matches cv2.filter2D(img, -1, np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])) with edge-replicated borders.
const SHARPEN_KERNEL = [0, -1, 0, -1, 5, -1, 0, -1, 0];

export function sharpenPixels(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          const sampleY = Math.min(height - 1, Math.max(0, y + ky));
          for (let kx = -1; kx <= 1; kx += 1) {
            const sampleX = Math.min(width - 1, Math.max(0, x + kx));
            sum += SHARPEN_KERNEL[(ky + 1) * 3 + (kx + 1)] * data[(sampleY * width + sampleX) * 4 + channel];
          }
        }
        output[pixelIndex + channel] = sum;
      }
      output[pixelIndex + 3] = data[pixelIndex + 3];
    }
  }
  return output;
}
