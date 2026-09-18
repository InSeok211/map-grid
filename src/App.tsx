import { useCallback, useRef, useState } from 'react';
import {
  captureSelectedCells,
  CURRENT_TAB_REQUIRED,
  SCREEN_CAPTURE_CANCELLED,
  SCREEN_CAPTURE_FAILED,
  SCREEN_CAPTURE_UNAVAILABLE,
} from './capture/captureSelectedCell';
import { downloadCapturedTile } from './capture/downloadCapturedTile';
import { MapCanvas } from './map/MapCanvas';
import type { TileCoordinates } from './map/captureTileset';
import { boundsToContainerRect } from './map/projectedRect';
import { tileKey, toggleTileSelection, type TileSelection } from './map/tileSelection';
import { searchPlaces, type PlaceResult } from './map/searchPlaces';

// Kakao's screen-share-captured tiles look soft because they only contain whatever detail was
// already painted at the current zoom. Zooming the live map in by one level before capturing makes
// Kakao fetch and render genuinely sharper source tiles for the same selected area; capturing that
// and then restoring the original zoom gives a real quality gain instead of a synthetic filter.
const CAPTURE_ZOOM_BOOST_LEVELS = 2;
const MIN_KAKAO_LEVEL = 1;
const TILES_LOADED_TIMEOUT_MS = 2000;

function waitForTilesLoaded(map: kakao.maps.Map): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    kakao.maps.event.addListener(map, 'tilesloaded', finish);
    setTimeout(finish, TILES_LOADED_TIMEOUT_MS);
  });
}

export default function App() {
  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY?.trim() ?? '';
  const captureRef = useRef<HTMLDivElement>(null);
  const capturingRef = useRef(false);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [selections, setSelections] = useState<TileSelection[]>([]);
  const [status, setStatus] = useState('지도를 움직인 뒤 캡처할 카카오 타일을 선택하세요.');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  const onMapReady = useCallback((readyMap: kakao.maps.Map) => setMap(readyMap), []);
  const onMapError = useCallback((message: string) => setStatus(message), []);
  const clearSelections = useCallback(() => {
    setSelections((current) => {
      current.forEach(({ element }) => element.classList.remove('capture-tile--selected'));
      return [];
    });
  }, []);
  const onViewportChange = useCallback(() => {
    if (capturingRef.current) return; // our own zoom-in/out around a capture, not a user-driven change
    setSelections((current) => {
      current.forEach(({ element }) => element.classList.remove('capture-tile--selected'));
      return [];
    });
    setStatus('지도를 조정했습니다. 캡처할 타일들을 다시 선택하세요.');
  }, []);
  const selectTile = useCallback((coordinates: TileCoordinates, element: HTMLElement) => {
    if (!captureRef.current || !map) return;
    const containerRect = captureRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const projection = map.getProjection();
    const northWest = projection.coordsFromContainerPoint(
      new kakao.maps.Point(elementRect.left - containerRect.left, elementRect.top - containerRect.top),
    );
    const southEast = projection.coordsFromContainerPoint(
      new kakao.maps.Point(elementRect.right - containerRect.left, elementRect.bottom - containerRect.top),
    );
    setSelections((current) => {
      const selected = current.some((selection) => tileKey(selection.coordinates) === tileKey(coordinates));
      element.classList.toggle('capture-tile--selected', !selected);
      return toggleTileSelection(current, { coordinates, element, bounds: { northWest, southEast } });
    });
    setStatus('타일을 추가로 선택하거나 다시 클릭해 선택을 해제할 수 있습니다.');
  }, [map]);

  const submitSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = query.trim();
    if (!keyword || !window.kakao?.maps?.services) return;
    setSearching(true);
    setStatus(`“${keyword}”을 검색하고 있습니다…`);
    try {
      const service = new kakao.maps.services.Places();
      const found = await searchPlaces(keyword, service.keywordSearch.bind(service));
      setPlaces(found);
      setStatus(found.length ? '검색 결과에서 이동할 장소를 선택하세요.' : '검색 결과가 없습니다.');
    } catch (error) {
      setPlaces([]);
      setStatus(error instanceof Error ? error.message : '장소 검색에 실패했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const moveToPlace = (place: PlaceResult) => {
    if (!map) return;
    clearSelections();
    map.setLevel(4, { animate: true });
    map.panTo(new kakao.maps.LatLng(place.lat, place.lng));
    setPlaces([]);
    setQuery(place.name);
    setStatus(`${place.name}(으)로 이동했습니다. 지도를 더 조정한 뒤 타일을 선택하세요.`);
  };

  const capture = async () => {
    if (selections.length === 0 || !captureRef.current || !map) return;
    setBusy(true);
    capturingRef.current = true;
    const originalLevel = map.getLevel();
    const boostedLevel = Math.max(MIN_KAKAO_LEVEL, originalLevel - CAPTURE_ZOOM_BOOST_LEVELS);
    let zoomedIn = false;
    try {
      if (boostedLevel !== originalLevel) {
        setStatus('더 선명한 원본을 불러오는 중…');
        map.setLevel(boostedLevel, { animate: false });
        zoomedIn = true;
        await waitForTilesLoaded(map);
      }

      const projection = map.getProjection();
      const boostedRects = selections.map(({ bounds }) => boundsToContainerRect(bounds, projection));

      setStatus(`공유 창에서 “현재 탭”을 선택해 주세요. ${selections.length}개 타일을 각각 PNG로 저장합니다.`);
      const captured = await captureSelectedCells(captureRef.current, boostedRects);
      captured.forEach((blob, index) => downloadCapturedTile(blob, selections[index].coordinates));
      setStatus(`${captured.length}개 타일을 개별 PNG로 저장했습니다. 브라우저가 요청하면 여러 파일 다운로드를 허용해 주세요.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      if (message === CURRENT_TAB_REQUIRED) setStatus('전체 화면이나 창이 아닌 현재 브라우저 탭을 공유해 주세요.');
      else if (message === SCREEN_CAPTURE_CANCELLED) setStatus('화면 공유가 취소되었습니다. 다시 시도할 수 있습니다.');
      else if (message === SCREEN_CAPTURE_UNAVAILABLE) setStatus('이 브라우저는 화면 캡처를 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해 주세요.');
      else if (message === SCREEN_CAPTURE_FAILED) setStatus('공유 화면에서 지도 구역을 캡처하지 못했습니다. 현재 탭을 선택했는지 확인해 주세요.');
      else setStatus(message);
    } finally {
      if (zoomedIn) map.setLevel(originalLevel, { animate: false });
      capturingRef.current = false;
      setBusy(false);
    }
  };

  if (!appKey) {
    return <main className="setup-card"><h1>Kakao Tile Capture</h1><p><code>.env.local</code>에 <code>VITE_KAKAO_MAP_KEY</code>를 입력해 주세요.</p></main>;
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div><span className="eyebrow">KAKAO MAP TILE CAPTURE</span><h1>장소를 찾고, 타일로 저장하세요.</h1></div>
        <div className="counter"><strong>{selections.length}</strong><span>선택된 타일</span></div>
      </header>
      <section className="workspace">
        <MapCanvas appKey={appKey} captureRef={captureRef} onReady={onMapReady} onError={onMapError} onViewportChange={onViewportChange} onTileSelect={selectTile}>{null}</MapCanvas>
        <aside className="control-panel" data-capture-ignore="true">
          <span className="step">00 — LOCATION</span>
          <h2>원하는 장소로 이동</h2>
          <form className="place-search" onSubmit={submitSearch}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주소 또는 장소명" aria-label="주소 또는 장소명" />
            <button type="submit" disabled={!map || searching}>{searching ? '검색 중' : '검색'}</button>
          </form>
          {places.length > 0 && <ul className="place-results">
            {places.map((place) => <li key={place.id}><button type="button" onClick={() => moveToPlace(place)}><strong>{place.name}</strong><span>{place.address}</span></button></li>)}
          </ul>}
          <div className="panel-divider" />
          <span className="step">01 — AREA</span>
          <h2>캡처할 타일 선택</h2>
          <p>점선 타일을 여러 개 클릭하세요. 다시 클릭하면 선택이 해제되며, 각 256×256px 구역이 별도 PNG로 저장됩니다.</p>
          <div className="selection-card"><span>현재 선택</span><strong>{selections.length ? `${selections.length}개` : '선택 안 됨'}</strong></div>
          {selections.length > 0 && <ul className="selected-tiles" aria-label="선택한 타일 목록">
            {selections.map(({ coordinates }) => <li key={tileKey(coordinates)}>{tileKey(coordinates)}</li>)}
          </ul>}
          <div className="capture-actions">
            <button className="clear-selection-button" type="button" disabled={!selections.length || busy} onClick={clearSelections}>전체 해제</button>
            <button className="capture-button" type="button" disabled={!selections.length || busy} onClick={capture}>{busy ? '캡처 중…' : '선택 타일 모두 캡처'}</button>
          </div>
          <p className="status" role="status">{status}</p>
        </aside>
      </section>
    </main>
  );
}
