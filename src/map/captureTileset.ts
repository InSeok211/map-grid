export type TileCoordinates = { x: number; y: number; z: number };
export type TileSelectHandler = (coordinates: TileCoordinates, element: HTMLElement) => void;

let registered = false;

export function createCaptureTileElement(coordinates: TileCoordinates): HTMLDivElement {
  const tile = document.createElement('div');
  tile.className = 'capture-tile';
  tile.dataset.captureIgnore = 'true';
  tile.dataset.tileX = String(coordinates.x);
  tile.dataset.tileY = String(coordinates.y);
  tile.dataset.tileZ = String(coordinates.z);
  tile.setAttribute('aria-label', `카카오 타일 ${coordinates.z}-${coordinates.x}-${coordinates.y}`);
  tile.textContent = `${coordinates.x}, ${coordinates.y}, ${coordinates.z}`;
  return tile;
}

export function getCaptureTileAtPoint(container: HTMLElement, point: { x: number; y: number }) {
  const containerRect = container.getBoundingClientRect();
  const viewportX = containerRect.left + point.x;
  const viewportY = containerRect.top + point.y;
  const tiles = container.querySelectorAll<HTMLElement>('.capture-tile');
  for (const element of tiles) {
    const rect = element.getBoundingClientRect();
    if (viewportX < rect.left || viewportX >= rect.right || viewportY < rect.top || viewportY >= rect.bottom) continue;
    const x = Number(element.dataset.tileX);
    const y = Number(element.dataset.tileY);
    const z = Number(element.dataset.tileZ);
    if ([x, y, z].every(Number.isFinite)) return { coordinates: { x, y, z }, element };
  }
  return null;
}

export function registerCaptureTileset(): string {
  if (!registered) {
    kakao.maps.Tileset.add('CAPTURE_GRID', new kakao.maps.Tileset({
      width: 256,
      height: 256,
      getTile: (x, y, z) => createCaptureTileElement({ x, y, z }),
    }));
    registered = true;
  }
  return kakao.maps.MapTypeId.CAPTURE_GRID;
}
