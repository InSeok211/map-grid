import { describe, expect, it } from 'vitest';
import { sharpenPixels } from './sharpen';

function toGrayscaleRgba(values: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, index) => {
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  });
  return data;
}

describe('sharpenPixels', () => {
  it('leaves a uniform region unchanged because the kernel weights sum to one', () => {
    const data = toGrayscaleRgba([40, 40, 40, 40, 40, 40, 40, 40, 40]);
    expect(sharpenPixels(data, 3, 3)).toEqual(data);
  });

  it('amplifies a center spike against its neighbors and clamps to the byte range', () => {
    // 3x3 grid: a bright center pixel (200) surrounded by dark (0) pixels.
    const data = toGrayscaleRgba([0, 0, 0, 0, 200, 0, 0, 0, 0]);
    const result = sharpenPixels(data, 3, 3);
    const centerIndex = (1 * 3 + 1) * 4;
    expect(result[centerIndex]).toBe(255); // 5 * 200 - 4 * 0 = 1000, clamped to 255
    expect(result[centerIndex + 3]).toBe(255); // alpha untouched
  });

  it('preserves the alpha channel without sharpening it', () => {
    const data = toGrayscaleRgba([10, 10, 10, 10, 90, 10, 10, 10, 10]);
    data[(1 * 3 + 1) * 4 + 3] = 128;
    const result = sharpenPixels(data, 3, 3);
    expect(result[(1 * 3 + 1) * 4 + 3]).toBe(128);
  });
});
