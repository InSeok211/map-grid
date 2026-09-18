import { describe, expect, it, vi } from 'vitest';
import { captureSelectedCell, captureSelectedCells, CURRENT_TAB_REQUIRED, getScreenCropRect } from './captureSelectedCell';

describe('getScreenCropRect', () => {
  it('maps a selected element cell from viewport pixels to shared-video pixels', () => {
    expect(getScreenCropRect(
      { left: 50, top: 100, width: 900, height: 600 },
      { x: 300, y: 200, width: 300, height: 200 },
      { width: 1000, height: 800 },
      { width: 2000, height: 1600 },
    )).toEqual({ x: 700, y: 600, width: 600, height: 400 });
  });
});

describe('captureSelectedCell', () => {
  it('rejects a shared screen or window because only the current tab aligns with viewport coordinates', async () => {
    const stop = vi.fn();
    const stream = {
      getVideoTracks: () => [{ getSettings: () => ({ displaySurface: 'monitor' }), stop }],
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;

    await expect(captureSelectedCell(
      { getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }) } as HTMLElement,
      { x: 0, y: 0, width: 300, height: 200 },
      { getDisplayMedia: async () => stream },
    )).rejects.toThrow(CURRENT_TAB_REQUIRED);
    expect(stop).toHaveBeenCalled();
  });

  it('captures multiple cells from one shared-tab stream', async () => {
    const stop = vi.fn();
    const getDisplayMedia = vi.fn(async () => ({
      getVideoTracks: () => [{ getSettings: () => ({ displaySurface: 'browser' }) }],
      getTracks: () => [{ stop }],
    } as unknown as MediaStream));
    const variedPixels = (pixelCount: number) => {
      // A prime period (97) keeps this varied under any sampling stride canvasHasMeaningfulPixels picks,
      // unlike a small power-of-two period which can alias to a constant value at some strides.
      const pixels = new Uint8ClampedArray(pixelCount * 4);
      for (let pixel = 0; pixel < pixelCount; pixel += 1) {
        const offset = pixel * 4;
        pixels[offset] = pixel % 97 < 48 ? 20 : 180;
        pixels[offset + 1] = 80;
        pixels[offset + 2] = 120;
        pixels[offset + 3] = 255;
      }
      return pixels;
    };
    const createCanvas = vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: variedPixels(width * height) }),
        putImageData: vi.fn(),
      }),
      toBlob: (callback: BlobCallback) => callback(new Blob(['tile'], { type: 'image/png' })),
    } as unknown as HTMLCanvasElement));

    const blobs = await captureSelectedCells(
      { getBoundingClientRect: () => ({ left: 0, top: 0, width: 512, height: 256 }) } as HTMLElement,
      [
        { x: 0, y: 0, width: 256, height: 256 },
        { x: 256, y: 0, width: 256, height: 256 },
      ],
      {
        getDisplayMedia,
        createVideo: () => ({ videoWidth: 1024, videoHeight: 512, play: async () => undefined } as HTMLVideoElement),
        createCanvas,
        viewportSize: { width: 512, height: 256 },
        waitForPaint: async () => undefined,
      },
    );

    expect(blobs).toHaveLength(2);
    expect(getDisplayMedia).toHaveBeenCalledOnce();
    expect(createCanvas).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledOnce();
  });
});
