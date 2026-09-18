# Kakao Map Tile Capture

카카오맵의 256×256px 타일 격자를 표시하고, 여러 타일을 선택해 각각 PNG 파일로 저장하는 시범 프로젝트입니다.

## 준비

Node.js 22 이상이 필요합니다.

```powershell
Copy-Item .env.example .env.local
npm install
```

`.env.local`에 키를 입력합니다.

```env
VITE_KAKAO_MAP_KEY=카카오_JavaScript_키
```

`VITE_`로 시작하는 카카오 키는 브라우저 SDK 구성이라 사용자에게 보일 수 있으므로, [카카오 개발자 콘솔](https://developers.kakao.com/)에서 Web 플랫폼 사이트 도메인을 `http://localhost:5173`과 실제 배포 도메인으로 제한하세요.

## 실행

```powershell
npm run dev
```

- 웹: `http://localhost:5173`

지도를 이동·확대한 뒤 점선으로 표시된 타일들을 선택하고 **선택 타일 모두 캡처**를 누릅니다. 브라우저의 공유 창에서는 반드시 현재 실행 중인 탭을 선택하세요. 캡처 직전에 지도가 잠깐 한 단계 더 확대되면서 카카오 SDK가 선택한 영역의 더 선명한 원본 타일을 새로 불러오고(캡처가 끝나면 원래 확대 수준으로 자동 복귀), 그 화면에서 선택한 영역을 잘라 OpenCV의 `filter2D` 샤프닝 커널(`[[0,-1,0],[-1,5,-1],[0,-1,0]]`)과 동일한 연산을 적용한 뒤 `kakao-tile-{level}-{x}-{y}.png` 형식의 개별 파일로 내려받습니다. 브라우저가 여러 파일 다운로드 권한을 요청하면 허용해야 합니다.

## 확인

```powershell
npm test
npm run build
```

## 현재 제약

카카오 지도 타일의 교차 출처 정책 때문에 DOM 캡처 대신 브라우저 Screen Capture API를 사용합니다. 최초 캡처 시 브라우저의 화면 공유 권한이 필요하며, 좌표 정렬을 위해 전체 화면이나 다른 창이 아닌 현재 탭을 선택해야 합니다. 최신 Chrome 또는 Edge 사용을 권장합니다.
