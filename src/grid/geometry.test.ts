import { describe, expect, it } from 'vitest';
import { cropRectForCanvas, getRelativeRect } from './geometry';

describe('getRelativeRect', () => {
  it('converts a Kakao tile viewport rectangle to map-frame coordinates', () => {
    expect(getRelativeRect(
      { left: 340, top: 180, width: 256, height: 256 },
      { left: 100, top: 60, width: 900, height: 680 },
    )).toEqual({ x: 240, y: 120, width: 256, height: 256 });
  });
});

describe('cropRectForCanvas', () => {
  it('scales CSS pixels to canvas pixels', () => {
    expect(
      cropRectForCanvas(
        { x: 300, y: 200, width: 300, height: 200 },
        { width: 900, height: 600 },
        { width: 1800, height: 1200 },
      ),
    ).toEqual({ x: 600, y: 400, width: 600, height: 400 });
  });
});
