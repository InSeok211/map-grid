import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { createCaptureTileElement, getCaptureTileAtPoint } from './captureTileset';

describe('createCaptureTileElement', () => {
  it('stores Kakao coordinates on the rendered tile', () => {
    const tile = createCaptureTileElement({ x: 12, y: 34, z: 5 });

    expect(tile).toHaveTextContent('12, 34, 5');
    expect(tile).toHaveAttribute('aria-label', '카카오 타일 5-12-34');
  });
});

describe('getCaptureTileAtPoint', () => {
  it('finds the Kakao tile under a map click even when the tile layer itself is non-interactive', () => {
    const container = document.createElement('div');
    const tile = createCaptureTileElement({ x: 12, y: 34, z: 5 });
    container.append(tile);
    container.getBoundingClientRect = () => ({ left: 100, top: 50, width: 900, height: 680, right: 1000, bottom: 730, x: 100, y: 50, toJSON: () => undefined });
    tile.getBoundingClientRect = () => ({ left: 356, top: 306, width: 256, height: 256, right: 612, bottom: 562, x: 356, y: 306, toJSON: () => undefined });

    expect(getCaptureTileAtPoint(container, { x: 300, y: 300 })).toEqual({
      coordinates: { x: 12, y: 34, z: 5 },
      element: tile,
    });
  });
});
