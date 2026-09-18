import type { PixelRect, Size } from '../grid/geometry';
import { sharpenPixels } from './sharpen';

export const CURRENT_TAB_REQUIRED = 'CURRENT_TAB_REQUIRED';
export const SCREEN_CAPTURE_UNAVAILABLE = 'SCREEN_CAPTURE_UNAVAILABLE';
export const SCREEN_CAPTURE_CANCELLED = 'SCREEN_CAPTURE_CANCELLED';
export const SCREEN_CAPTURE_FAILED = 'SCREEN_CAPTURE_FAILED';

type ElementRect = { left: number; top: number; width: number; height: number };
type CaptureDependencies = {
  getDisplayMedia?: (constraints: DisplayMediaStreamOptions) => Promise<MediaStream>;
  createVideo?: () => HTMLVideoElement;
  createCanvas?: () => HTMLCanvasElement;
  viewportSize?: Size;
  waitForPaint?: () => Promise<void>;
};

export function getScreenCropRect(
  elementRect: ElementRect,
  cellRect: PixelRect,
  viewportSize: Size,
  videoSize: Size,
): PixelRect {
  const scaleX = videoSize.width / viewportSize.width;
  const scaleY = videoSize.height / viewportSize.height;
  return {
    x: Math.round((elementRect.left + cellRect.x) * scaleX),
    y: Math.round((elementRect.top + cellRect.y) * scaleY),
    width: Math.round(cellRect.width * scaleX),
    height: Math.round(cellRect.height * scaleY),
  };
}

function canvasHasMeaningfulPixels(canvas: HTMLCanvasElement): boolean {
  try {
    const context = canvas.getContext('2d');
    if (!context) return false;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let opaque = 0;
    let varied = false;
    const first = [data[0], data[1], data[2]];
    const step = Math.max(4, Math.floor(data.length / 4000 / 4) * 4);
    for (let offset = 0; offset < data.length; offset += step) {
      if (data[offset + 3] > 16) opaque += 1;
      if (Math.abs(data[offset] - first[0]) + Math.abs(data[offset + 1] - first[1]) + Math.abs(data[offset + 2] - first[2]) > 24) varied = true;
    }
    return opaque > 10 && varied;
  } catch {
    return false;
  }
}

async function waitForVideo(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth && video.videoHeight) return;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error(SCREEN_CAPTURE_FAILED));
  });
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export async function captureSelectedCell(
  element: HTMLElement,
  cellRect: PixelRect,
  dependencies: CaptureDependencies = {},
): Promise<Blob> {
  const [blob] = await captureSelectedCells(element, [cellRect], dependencies);
  if (!blob) throw new Error(SCREEN_CAPTURE_FAILED);
  return blob;
}

export async function captureSelectedCells(
  element: HTMLElement,
  cellRects: PixelRect[],
  dependencies: CaptureDependencies = {},
): Promise<Blob[]> {
  if (cellRects.length === 0) return [];
  const getDisplayMedia = dependencies.getDisplayMedia ?? navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);
  if (!getDisplayMedia) throw new Error(SCREEN_CAPTURE_UNAVAILABLE);

  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  try {
    stream = await getDisplayMedia({
      // Without explicit width/height, Chrome can hand back a stream downscaled well below the
      // tab's real rendered resolution. These are only upper bounds ("ideal") - the browser still
      // caps at the tab's actual pixel size, so this can't invent detail that isn't on screen, it
      // just stops the capture itself from throwing away detail that is.
      video: {
        displaySurface: 'browser',
        width: { ideal: 3840 },
        height: { ideal: 2160 },
        frameRate: { ideal: 5, max: 10 },
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
    } as DisplayMediaStreamOptions);
    const displaySurface = stream.getVideoTracks()[0]?.getSettings().displaySurface;
    if (displaySurface && displaySurface !== 'browser') throw new Error(CURRENT_TAB_REQUIRED);

    document.documentElement.classList.add('capturing-map');
    await (dependencies.waitForPaint ?? nextPaint)();
    video = dependencies.createVideo?.() ?? document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await waitForVideo(video);
    await video.play();

    const viewport = dependencies.viewportSize ?? { width: window.innerWidth, height: window.innerHeight };
    const elementRect = element.getBoundingClientRect();
    return await Promise.all(cellRects.map(async (cellRect) => {
      const crop = getScreenCropRect(
        elementRect,
        cellRect,
        viewport,
        { width: video!.videoWidth, height: video!.videoHeight },
      );
      const output = dependencies.createCanvas?.() ?? document.createElement('canvas');
      output.width = crop.width;
      output.height = crop.height;
      const context = output.getContext('2d');
      if (!context) throw new Error(SCREEN_CAPTURE_FAILED);
      context.drawImage(video!, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const imageData = context.getImageData(0, 0, crop.width, crop.height);
      imageData.data.set(sharpenPixels(imageData.data, crop.width, crop.height));
      context.putImageData(imageData, 0, 0);
      if (!canvasHasMeaningfulPixels(output)) throw new Error(SCREEN_CAPTURE_FAILED);

      return await new Promise<Blob>((resolve, reject) => {
        output.toBlob((blob) => blob ? resolve(blob) : reject(new Error(SCREEN_CAPTURE_FAILED)), 'image/png');
      });
    }));
  } catch (error) {
    if (error instanceof Error && [CURRENT_TAB_REQUIRED, SCREEN_CAPTURE_FAILED].includes(error.message)) throw error;
    if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError')) throw new Error(SCREEN_CAPTURE_CANCELLED);
    throw new Error(SCREEN_CAPTURE_FAILED);
  } finally {
    document.documentElement.classList.remove('capturing-map');
    if (video) video.srcObject = null;
    stream?.getTracks().forEach((track) => track.stop());
  }
}
