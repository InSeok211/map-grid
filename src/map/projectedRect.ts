import type { PixelRect } from '../grid/geometry';

export type Bounds<TCoords> = { northWest: TCoords; southEast: TCoords };
export type Projection<TCoords> = { containerPointFromCoords(coords: TCoords): { x: number; y: number } };

// Converts a tile's fixed geographic bounds back into a container-relative pixel rect at whatever
// zoom level `projection` currently reflects. Re-running this after zooming in lets a capture reuse
// the same real-world footprint the user selected, but at the sharper tiles a deeper zoom fetches.
export function boundsToContainerRect<TCoords>(bounds: Bounds<TCoords>, projection: Projection<TCoords>): PixelRect {
  const northWest = projection.containerPointFromCoords(bounds.northWest);
  const southEast = projection.containerPointFromCoords(bounds.southEast);
  return {
    x: Math.round(northWest.x),
    y: Math.round(northWest.y),
    width: Math.round(southEast.x - northWest.x),
    height: Math.round(southEast.y - northWest.y),
  };
}
