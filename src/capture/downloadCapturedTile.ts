import type { TileCoordinates } from '../map/captureTileset';

type DownloadDependencies = {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  createAnchor(): HTMLAnchorElement;
};

const browserDependencies: DownloadDependencies = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createAnchor: () => document.createElement('a'),
};

export function downloadCapturedTile(
  blob: Blob,
  tile: TileCoordinates,
  dependencies: DownloadDependencies = browserDependencies,
): void {
  const url = dependencies.createObjectURL(blob);
  const anchor = dependencies.createAnchor();
  anchor.href = url;
  anchor.download = `kakao-tile-${tile.z}-${tile.x}-${tile.y}.png`;
  anchor.click();
  dependencies.revokeObjectURL(url);
}
