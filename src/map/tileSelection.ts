import type { TileCoordinates } from './captureTileset';

export type TileSelection = {
  coordinates: TileCoordinates;
  element: HTMLElement;
  bounds: { northWest: kakao.maps.LatLng; southEast: kakao.maps.LatLng };
};

export function tileKey(tile: TileCoordinates): string {
  return `${tile.z}-${tile.x}-${tile.y}`;
}

export function toggleTileSelection(current: TileSelection[], next: TileSelection): TileSelection[] {
  const key = tileKey(next.coordinates);
  const exists = current.some((selection) => tileKey(selection.coordinates) === key);
  return exists
    ? current.filter((selection) => tileKey(selection.coordinates) !== key)
    : [...current, next];
}
