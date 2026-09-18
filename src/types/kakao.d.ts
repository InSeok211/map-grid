export {};

declare global {
  interface Window { kakao: typeof kakao; }
  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }
    class Point { constructor(x: number, y: number); x: number; y: number; }
    type MapMouseEvent = { latLng: LatLng; point: Point };
    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number });
      getProjection(): {
        coordsFromContainerPoint(point: Point): LatLng;
        containerPointFromCoords(coords: LatLng): Point;
      };
      panTo(position: LatLng): void;
      getLevel(): number;
      setLevel(level: number, options?: { animate?: boolean }): void;
      addOverlayMapTypeId(mapTypeId: string): void;
    }
    class Tileset {
      constructor(options: { width: number; height: number; getTile(x: number, y: number, z: number): HTMLElement });
      static add(id: string, tileset: Tileset): void;
    }
    namespace MapTypeId { const CAPTURE_GRID: string; }
    function load(callback: () => void): void;
    namespace event {
      function addListener(target: Map, event: string, callback: (event: MapMouseEvent) => void): void;
      function removeListener(target: Map, event: string, callback: () => void): void;
    }
    namespace services {
      type PlacesSearchResultItem = {
        id: string;
        place_name: string;
        address_name: string;
        road_address_name: string;
        x: string;
        y: string;
      };
      class Places {
        keywordSearch(query: string, callback: (results: PlacesSearchResultItem[], status: string) => void): void;
      }
    }
  }
}
