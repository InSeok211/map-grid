import { describe, expect, it } from 'vitest';
import { boundsToContainerRect } from './projectedRect';

describe('boundsToContainerRect', () => {
  it('converts geographic bounds into a container-relative rect using the given projection', () => {
    const projection = {
      containerPointFromCoords: (coords: 'nw' | 'se') => (coords === 'nw' ? { x: 100, y: 50 } : { x: 356, y: 306 }),
    };

    expect(boundsToContainerRect({ northWest: 'nw', southEast: 'se' }, projection)).toEqual({
      x: 100,
      y: 50,
      width: 256,
      height: 256,
    });
  });

  it('reflects a deeper zoom producing a larger pixel footprint for the same bounds', () => {
    // Same geographic bounds, but the projection now reports points twice as far apart - as if the
    // map had zoomed in one level (roughly doubling on-screen pixels per unit of real distance).
    const zoomedProjection = {
      containerPointFromCoords: (coords: 'nw' | 'se') => (coords === 'nw' ? { x: 200, y: 100 } : { x: 712, y: 612 }),
    };

    expect(boundsToContainerRect({ northWest: 'nw', southEast: 'se' }, zoomedProjection)).toEqual({
      x: 200,
      y: 100,
      width: 512,
      height: 512,
    });
  });
});
