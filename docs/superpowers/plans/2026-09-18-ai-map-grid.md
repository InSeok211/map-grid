# AI Map Grid Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Kakao Maps prototype that captures one user-selected grid cell, edits it into a 2.5D illustration with GPT-Image-2.5 Flare, and anchors the result to the same geographic bounds.

**Architecture:** A Vite React client owns map interaction, grid geometry, DOM capture, and generated overlays. An Express server accepts one PNG upload, validates it, calls OpenAI's image edit endpoint, and returns image bytes without exposing the API key.

**Tech Stack:** React, TypeScript, Vite, Kakao Maps JavaScript SDK, html2canvas, Express, Multer, OpenAI Node SDK, Vitest, Testing Library, Supertest

**Spec:** `docs/superpowers/specs/2026-09-18-ai-map-grid-design.md`

## Global Constraints

- The visible map is divided into a 3×3 grid and exactly one cell is selected per generation request.
- DOM capture uses `html2canvas` first and is isolated behind a replaceable capture interface.
- The default image model is `gpt-image-2.5-flare` and the default quality is `medium`.
- `OPENAI_API_KEY` is server-only and must not appear in client assets.
- `.env.local` and all secret-bearing environment files remain untracked; only empty examples are committed.
- A failed capture or generation leaves the original map and selection intact.

---

### Task 1: Project shell and grid geometry

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/main.tsx`
- Create: `src/grid/geometry.ts`
- Test: `src/grid/geometry.test.ts`

**Interfaces:**
- Produces: `GridCell`, `PixelRect`, `getCellRect(index, width, height, columns?, rows?)`, and `cropRectForCanvas(rect, displaySize, canvasSize)`.

- [ ] **Step 1: Add the package shell and test scripts**

Create scripts for `dev`, `dev:client`, `dev:server`, `build`, `test`, and `start`. Install React, Vite, TypeScript, html2canvas, Express, Multer, OpenAI, concurrently, Vitest, jsdom, Testing Library, and Supertest. Configure Vite to proxy `/api` to `http://localhost:8787`.

- [ ] **Step 2: Write failing geometry tests**

```ts
expect(getCellRect(4, 900, 600)).toEqual({ x: 300, y: 200, width: 300, height: 200 });
expect(cropRectForCanvas(
  { x: 300, y: 200, width: 300, height: 200 },
  { width: 900, height: 600 },
  { width: 1800, height: 1200 },
)).toEqual({ x: 600, y: 400, width: 600, height: 400 });
expect(() => getCellRect(9, 900, 600)).toThrow('Grid cell index must be between 0 and 8');
```

- [ ] **Step 3: Run the geometry test and confirm failure**

Run: `npm test -- src/grid/geometry.test.ts`

Expected: FAIL because `geometry.ts` does not exist.

- [ ] **Step 4: Implement geometry helpers**

Use zero-based row/column arithmetic. Validate finite positive dimensions and an in-range integer cell index. Scale crop coordinates independently on the x and y axes and round to integer canvas pixels.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/grid/geometry.test.ts`

Expected: all geometry tests PASS.

Commit: `feat: scaffold app and add grid geometry`

---

### Task 2: Secure image-edit server

**Files:**
- Create: `server/app.ts`
- Create: `server/index.ts`
- Create: `server/imageService.ts`
- Test: `server/app.test.ts`

**Interfaces:**
- Consumes: multipart field `image` containing one PNG, JPEG, or WebP file up to 8 MB.
- Produces: `POST /api/transform` returning image bytes with `Content-Type` set from the OpenAI result.
- Produces: `transformMapImage(input: Buffer, mimeType: string): Promise<{ bytes: Buffer; mimeType: string }>`.

- [ ] **Step 1: Write failing endpoint tests**

Use an injected fake `transformMapImage` implementation. Cover: 400 when no image is supplied, 415 for unsupported MIME type, 413 for an oversized upload, 503 when `OPENAI_API_KEY` is absent, 200 with returned image bytes, and 502 with a safe message when OpenAI fails.

```ts
const response = await request(app)
  .post('/api/transform')
  .attach('image', Buffer.from('png'), { filename: 'cell.png', contentType: 'image/png' });
expect(response.status).toBe(200);
expect(response.headers['content-type']).toMatch('image/png');
```

- [ ] **Step 2: Run endpoint tests and confirm failure**

Run: `npm test -- server/app.test.ts`

Expected: FAIL because the server modules do not exist.

- [ ] **Step 3: Implement validation and dependency injection**

Create `createApp({ transformMapImage, hasApiKey })`. Use in-memory Multer storage, one-file limits, exact MIME allowlisting, JSON error responses, and no key or upstream response logging.

- [ ] **Step 4: Implement the OpenAI edit call**

Instantiate the OpenAI client only on the server. Call `client.images.edit` with the uploaded image, `model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare'`, `quality: process.env.OPENAI_IMAGE_QUALITY ?? 'medium'`, PNG output, and a fixed prompt that preserves roads, intersections, block boundaries, building footprints, and edge continuity while applying a coherent top-down 2.5D illustrated style. Decode `data[0].b64_json` into a `Buffer`.

- [ ] **Step 5: Run server tests and commit**

Run: `npm test -- server/app.test.ts`

Expected: all endpoint tests PASS without making a network call.

Commit: `feat: add secure image transformation API`

---

### Task 3: Kakao map, selectable grid, and DOM capture

**Files:**
- Create: `src/types/kakao.d.ts`
- Create: `src/map/loadKakaoSdk.ts`
- Create: `src/map/MapCanvas.tsx`
- Create: `src/grid/GridOverlay.tsx`
- Create: `src/capture/captureSelectedCell.ts`
- Create: `src/capture/captureValidation.ts`
- Test: `src/capture/captureSelectedCell.test.ts`
- Create: `src/App.tsx`
- Create: `src/styles.css`

**Interfaces:**
- Consumes: `VITE_KAKAO_MAP_KEY`.
- Produces: `captureSelectedCell(element, rect): Promise<Blob>`.
- Produces: `SelectedBounds = { south: number; west: number; north: number; east: number }` captured at click time.

- [ ] **Step 1: Write failing capture tests**

Mock `html2canvas` and canvas `toBlob`. Verify that only the selected crop rectangle is drawn, a PNG blob is returned, capture-only UI is marked ignored, and a blank/transparent output rejects with `DOM_CAPTURE_BLOCKED`.

- [ ] **Step 2: Run capture tests and confirm failure**

Run: `npm test -- src/capture/captureSelectedCell.test.ts`

Expected: FAIL because capture modules do not exist.

- [ ] **Step 3: Implement Kakao SDK loading and map initialization**

Load `https://dapi.kakao.com/v2/maps/sdk.js?appkey=<encoded-key>&autoload=false` once, call `kakao.maps.load`, and initialize Seoul City Hall at latitude `37.5665`, longitude `126.9780`, level `4`. Show a setup message when the key is empty or loading fails.

- [ ] **Step 4: Implement grid selection and geographic bounds**

Render nine accessible buttons over the map. When a cell is clicked, use `map.getProjection().coordsFromContainerPoint` on the cell's top-left and bottom-right pixels, normalize the resulting latitude/longitude values, and save the bounds together with the selected index.

- [ ] **Step 5: Implement html2canvas capture**

Call `html2canvas(mapElement, { useCORS: true, allowTaint: false, backgroundColor: null, ignoreElements })`, then copy the scaled selected rectangle into a new canvas. Inspect sampled alpha and color variation before returning a PNG blob. Convert tainted-canvas, missing-tile, and empty-output failures into `DOM_CAPTURE_BLOCKED`.

- [ ] **Step 6: Run capture tests and commit**

Run: `npm test -- src/capture/captureSelectedCell.test.ts`

Expected: all capture tests PASS.

Commit: `feat: add selectable Kakao map capture`

---

### Task 4: Transformation workflow and geographic overlays

**Files:**
- Create: `src/api/transformMapImage.ts`
- Create: `src/map/GeneratedOverlay.tsx`
- Create: `src/map/overlayGeometry.ts`
- Test: `src/map/overlayGeometry.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/map/MapCanvas.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `transformMapImage(image: Blob, signal?: AbortSignal): Promise<Blob>`.
- Consumes: stored `SelectedBounds` and Kakao map projection.
- Produces: generated overlay records `{ id, bounds, imageUrl }` retained for the browser session.

- [ ] **Step 1: Write failing overlay geometry tests**

Create a fake projection and verify `boundsToPixelRect(bounds, projection)` normalizes corners and returns a non-negative rectangle for both the initial view and a changed projection.

- [ ] **Step 2: Run overlay tests and confirm failure**

Run: `npm test -- src/map/overlayGeometry.test.ts`

Expected: FAIL because `overlayGeometry.ts` does not exist.

- [ ] **Step 3: Implement the API client and generation state**

Upload the captured blob as `image` in `FormData`. Convert successful responses to object URLs. Surface safe server messages, disable the action while busy, and keep selection and existing overlays on failure.

- [ ] **Step 4: Implement anchored overlay rendering**

Convert southwest and northeast coordinates to container points whenever Kakao emits `idle`. Position an image in the map's overlay layer with absolute `left`, `top`, `width`, and `height`; set `pointer-events: none` and `object-fit: fill`. Revoke every object URL during application cleanup.

- [ ] **Step 5: Implement user-facing states**

Add selection details, a **Transform selected area** button, progress text, capture-specific guidance mentioning cross-origin restrictions, retry behavior, and a count of completed overlays.

- [ ] **Step 6: Run tests and commit**

Run: `npm test`

Expected: all client and server tests PASS.

Commit: `feat: transform and overlay selected map cells`

---

### Task 5: Configuration docs and end-to-end verification

**Files:**
- Create: `README.md`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Documents: local setup, Kakao allowed-domain configuration, OpenAI server key placement, browser compatibility, and the html2canvas CORS limitation.

- [ ] **Step 1: Add configuration files and instructions**

Document copying `.env.example` to `.env.local`, filling `VITE_KAKAO_MAP_KEY` and `OPENAI_API_KEY`, starting both services with `npm run dev`, and allowing `http://localhost:5173` in Kakao Developers. Explain that Vite-prefixed values are public browser configuration while `OPENAI_API_KEY` is server-only.

- [ ] **Step 2: Run the complete automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: client and server TypeScript builds complete without errors.

- [ ] **Step 3: Verify secrets cannot enter client output**

Run: `rg "OPENAI_API_KEY|sk-[A-Za-z0-9]" dist`

Expected: no matches.

- [ ] **Step 4: Perform manual smoke testing**

With user-provided keys, verify map loading, pan/zoom, one-cell selection, cropped preview data, a real Flare edit, overlay anchoring after map movement, multiple session overlays, and the explicit fallback message if Kakao tiles are blank.

- [ ] **Step 5: Commit documentation and verification changes**

Commit: `docs: add setup and verification guide`
