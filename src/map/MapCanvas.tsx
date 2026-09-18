import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { getCaptureTileAtPoint, registerCaptureTileset, type TileSelectHandler } from './captureTileset';
import { loadKakaoSdk } from './loadKakaoSdk';

type Props = {
  appKey: string;
  captureRef: RefObject<HTMLDivElement | null>;
  onReady(map: kakao.maps.Map): void;
  onError(message: string): void;
  onViewportChange(): void;
  onTileSelect: TileSelectHandler;
  children: ReactNode;
};

export function MapCanvas({ appKey, captureRef, onReady, onError, onViewportChange, onTileSelect, children }: Props) {
  const mapNode = useRef<HTMLDivElement>(null);
  // Latest callbacks are read through refs so the map-creation effect below only depends on
  // appKey. App.tsx's onTileSelect changes identity whenever `map` state updates (it reads the
  // live map to compute geographic bounds); depending on it directly would re-run this effect,
  // which creates a brand new kakao.maps.Map and calls onReady again - an infinite re-creation loop.
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onViewportChangeRef = useRef(onViewportChange);
  const onTileSelectRef = useRef(onTileSelect);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onViewportChangeRef.current = onViewportChange;
  onTileSelectRef.current = onTileSelect;

  useEffect(() => {
    if (!mapNode.current) return;
    let active = true;
    loadKakaoSdk(appKey)
      .then(() => {
        if (!active || !mapNode.current) return;
        const map = new kakao.maps.Map(mapNode.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 4,
        });
        const captureGridType = registerCaptureTileset();
        map.addOverlayMapTypeId(captureGridType);
        kakao.maps.event.addListener(map, 'click', (mouseEvent: kakao.maps.MapMouseEvent) => {
          if (!mapNode.current) return;
          const selected = getCaptureTileAtPoint(mapNode.current, mouseEvent.point);
          if (selected) onTileSelectRef.current(selected.coordinates, selected.element);
        });
        kakao.maps.event.addListener(map, 'dragstart', () => onViewportChangeRef.current());
        kakao.maps.event.addListener(map, 'zoom_start', () => onViewportChangeRef.current());
        onReadyRef.current(map);
      })
      .catch((error: unknown) => onErrorRef.current(error instanceof Error ? error.message : '지도를 불러오지 못했습니다.'));
    return () => { active = false; };
  }, [appKey]);

  return (
    <div className="map-frame" ref={captureRef}>
      <div className="map-canvas" ref={mapNode} />
      {children}
    </div>
  );
}
