import { describe, expect, it } from 'vitest';
import { searchPlaces, type KeywordSearch } from './searchPlaces';

describe('searchPlaces', () => {
  it('normalizes successful Kakao place results', async () => {
    const keywordSearch: KeywordSearch = (_query, callback) => callback([
      {
        id: '101',
        place_name: '서울시청',
        address_name: '서울 중구 태평로1가 31',
        road_address_name: '서울 중구 세종대로 110',
        x: '126.978652',
        y: '37.566826',
      },
    ], 'OK');

    await expect(searchPlaces('서울시청', keywordSearch)).resolves.toEqual([
      {
        id: '101',
        name: '서울시청',
        address: '서울 중구 세종대로 110',
        lat: 37.566826,
        lng: 126.978652,
      },
    ]);
  });

  it('returns an empty list when Kakao finds no places', async () => {
    const keywordSearch: KeywordSearch = (_query, callback) => callback([], 'ZERO_RESULT');
    await expect(searchPlaces('없는 장소', keywordSearch)).resolves.toEqual([]);
  });

  it('rejects a Kakao search error with a safe message', async () => {
    const keywordSearch: KeywordSearch = (_query, callback) => callback([], 'ERROR');
    await expect(searchPlaces('서울', keywordSearch)).rejects.toThrow('장소 검색에 실패했습니다.');
  });
});
