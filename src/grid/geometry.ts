export type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

type ViewportRect = { left: number; top: number; width: number; height: number };

export function getRelativeRect(rect: ViewportRect, container: ViewportRect): PixelRect {
  return {
    x: Math.round(rect.left - container.left),
    y: Math.round(rect.top - container.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function cropRectForCanvas(
  rect: PixelRect,
  displaySize: Size,
  canvasSize: Size,
): PixelRect {
  const scaleX = canvasSize.width / displaySize.width;
  const scaleY = canvasSize.height / displaySize.height;

  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY),
  };
}
