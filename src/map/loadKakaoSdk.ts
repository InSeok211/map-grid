let loading: Promise<void> | null = null;

export function loadKakaoSdk(appKey: string): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = () => reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  return loading;
}
