import { describe, expect, it, vi } from 'vitest';
import { downloadCapturedTile } from './downloadCapturedTile';

describe('downloadCapturedTile', () => {
  it('downloads a PNG named with Kakao tile coordinates and releases its object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:captured-tile');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = click;

    downloadCapturedTile(new Blob(['png'], { type: 'image/png' }), { x: 123, y: 456, z: 4 }, {
      createObjectURL,
      revokeObjectURL,
      createAnchor: () => anchor,
    });

    expect(anchor.download).toBe('kakao-tile-4-123-456.png');
    expect(anchor.href).toBe('blob:captured-tile');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:captured-tile');
  });
});
