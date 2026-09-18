# AI Map Grid Prototype Design

## Goal

Build a small web prototype that displays Kakao Maps, divides the visible map into a 3×3 grid, lets the user select one grid cell, captures only that cell in the browser, transforms the captured map image into a 2.5D illustration with OpenAI Images, and places the result back over the same geographic bounds.

## Scope

The first version supports one selected grid cell per generation request. Users can pan and zoom the map, select a cell, generate an illustration, and retain multiple generated overlays during the current browser session. Persistence, authentication, billing, and multi-user collaboration are outside this prototype.

## Architecture

The project consists of a Vite React client and a small Express server.

- The client owns Kakao Maps, grid selection, browser capture, and geographic overlays.
- The server validates uploads and calls the OpenAI Image Edit API.
- The OpenAI API key is available only to the server.
- The Kakao JavaScript key is provided through a Vite environment variable. Because it is used by a browser SDK, it must also be protected with allowed-domain restrictions in the Kakao developer console.

## User Flow

1. The application opens with Kakao Maps centered on Seoul City Hall.
2. A 3×3 grid is drawn over the visible map.
3. The user pans or zooms the map and clicks one grid cell.
4. The selected cell is highlighted and its geographic southwest and northeast coordinates are recorded.
5. The user clicks **Transform selected area**.
6. Grid lines and controls are temporarily excluded from capture.
7. `html2canvas` captures the map container. The client crops the result to the selected cell.
8. The cropped PNG is sent to the server as multipart form data.
9. The server submits the image to `gpt-image-2.5-flare` with a fixed 2.5D map-style edit prompt.
10. The returned image is placed over the recorded geographic bounds.
11. The overlay remains anchored while the map is panned or zoomed.

## Capture Boundary

Map capture is isolated behind a `captureSelectedCell` interface. The initial implementation uses `html2canvas` with CORS enabled. The client checks that capture produced a non-empty image and reports a clear error if browser security prevents access to Kakao tile pixels.

This approach is intentionally experimental because Kakao map tiles are cross-origin resources and Kakao does not document DOM-to-canvas export as a supported Web API feature. If validation fails, the capture implementation can be replaced with the browser Screen Capture API without changing grid selection, server image generation, or overlay placement.

## Overlay Placement

At selection time, the client converts the cell's container pixel corners to Kakao map coordinates through the map projection. The generated image is rendered as an absolutely positioned custom overlay whose pixel rectangle is recalculated from those stored coordinates whenever the map becomes idle after panning or zooming.

The generated image uses `object-fit: fill` so its exact geographic rectangle is preserved. It does not intercept pointer events, allowing normal map interaction.

## Image Generation

The server uses the OpenAI Image Edit endpoint with model `gpt-image-2.5-flare`. A single captured image is sent per request. The prompt requests a top-down 2.5D illustrated map while preserving road geometry, block boundaries, building footprints, intersections, and image-edge continuity. The result is returned as an image response or data URL suitable for the client overlay.

Development defaults favor moderate quality and latency. The model ID and quality are environment-configurable.

## Security and Configuration

The repository includes `.env.example` with empty values:

```env
VITE_KAKAO_MAP_KEY=
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2.5-flare
OPENAI_IMAGE_QUALITY=medium
```

`.env`, `.env.local`, and other local environment variants are ignored. The server never returns or logs `OPENAI_API_KEY`. Upload size and MIME type are validated, temporary files are removed after each request, and API errors are reduced to safe client messages.

## Error Handling

- Missing Kakao key: show a setup panel instead of attempting map initialization.
- Capture failure or blank capture: explain that cross-origin tile restrictions blocked DOM capture and identify Screen Capture API as the next fallback.
- No selected cell: keep the transform button disabled.
- OpenAI key missing: return a configuration error without exposing environment details.
- OpenAI request failure: retain the original map and selected cell so the user can retry.
- Map moved while processing: place the result using the geographic bounds captured when generation began.

## Testing

Unit tests cover cell geometry, pixel-to-crop calculations, coordinate-bound storage, empty-capture detection, and server input validation. API calls are mocked. A production build verifies bundling and confirms that the OpenAI key does not appear in client assets.

Manual verification covers Kakao map loading with a user-supplied key, grid selection, capture output, generation loading state, overlay anchoring during pan and zoom, multiple overlays, and the expected failure message if Kakao tiles cannot be captured.

## Success Criteria

- A real Kakao map loads from an environment-provided key.
- The user selects exactly one visible grid cell in the web UI.
- Only that cell is cropped and uploaded after explicit user action.
- A real Flare image-edit request is made through the server.
- The generated image appears over the same geographic area and stays aligned during map navigation.
- Secrets are absent from source control and client bundles.
- If DOM capture is blocked, the application fails clearly and the capture module can be replaced without redesigning the rest of the system.
