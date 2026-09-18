import { describe, expect, it } from 'vitest';
import { tileKey, toggleTileSelection, type TileSelection } from './tileSelection';

const selection = (x: number): TileSelection => ({
  coordinates: { x, y: 20, z: 4 },
  element: document.createElement('div'),
  bounds: { northWest: {} as kakao.maps.LatLng, southEast: {} as kakao.maps.LatLng },
});

describe('toggleTileSelection', () => {
  it('adds distinct tiles without replacing the existing selection', () => {
    const first = selection(10);
    const second = selection(11);
    expect(toggleTileSelection([first], second)).toEqual([first, second]);
  });

  it('removes a tile when the same tile is selected again', () => {
    const first = selection(10);
    expect(toggleTileSelection([first], selection(10))).toEqual([]);
  });
});

describe('tileKey', () => {
  it('separates tiles by level, column, and row', () => {
    expect(tileKey({ x: 10, y: 20, z: 4 })).toBe('4-10-20');
  });
});
