type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

export type KeywordSearch = (
  query: string,
  callback: (results: KakaoPlace[], status: string) => void,
) => void;

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export function searchPlaces(query: string, keywordSearch: KeywordSearch): Promise<PlaceResult[]> {
  return new Promise((resolve, reject) => {
    keywordSearch(query, (results, status) => {
      if (status === 'ZERO_RESULT') {
        resolve([]);
        return;
      }
      if (status !== 'OK') {
        reject(new Error('장소 검색에 실패했습니다.'));
        return;
      }
      resolve(results.slice(0, 5).map((place) => ({
        id: place.id,
        name: place.place_name,
        address: place.road_address_name || place.address_name,
        lat: Number(place.y),
        lng: Number(place.x),
      })));
    });
  });
}
