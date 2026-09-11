# Phase 3 — Travel Intelligence + Map Reliability

## Objective

Upgrade the existing shared desktop/mobile map from itinerary visualization to reliable on-trip context: provider-backed road geometry where truthful, opt-in in-memory location, a policy-compliant offline-map strategy, and weather that never labels seasonal context as a forecast. Preserve the current plan, route facts, UI system and all existing execution linkage.

## Non-negotiable boundaries

- Keep `day-routes.json`, Current Plan order, leg mode, duration and distance as business facts.
- Treat routing responses as display-only geometry; never write them to trip JSON or overwrite duration/distance/mode.
- Request geolocation only from an explicit user action and keep coordinates in React memory only.
- Do not bulk-download `tile.openstreetmap.org`; implement offline tiles only if the selected provider explicitly permits this use without a backend or private key.
- Do not invent coordinates, forecasts, live ETA, transit routing, route optimization or a general place-search system.
- Keep Home and Mobile Today free of Leaflet/offline-manager eager dependencies; fetch only the selected day.

## Work plan

1. Capture the `c1db9c1` test and bundle baseline; audit shared map, route modes, Service Worker, offline pack and day headers.
2. Verify current primary-source policies and API contracts for OpenStreetMap tiles, OSRM-compatible routing and Open-Meteo forecast/climate data.
3. Add provider-neutral routing types, cache policy and an OSRM-compatible implementation; resolve only routable intra-city legs for the active day.
4. Render solid real geometry and visibly dashed schematic fallbacks without changing route facts; expose one compact cached/fallback status.
5. Add an opt-in geolocation controller and shared location layer with accuracy circle, recenter action, permission/error states and approximate straight-line proximity.
6. Implement the compliant offline strategy selected by the provider audit, integrate it into More → Offline, and add GPX/external offline-navigation fallback when bulk tiles are not lawful or dependable.
7. Add provider-neutral weather fetching/caching with an explicit forecast horizon and a static, sourced seasonal-reference fallback; integrate compact chips into Desktop Trip and Mobile Today.
8. Add `test:travel-intelligence` for cache reuse, routing fallback, geolocation state, offline manifest/policy, forecast horizon and cached weather.
9. Run all existing suites, browser flows A–G and responsive regression; measure bundles; publish commit, GitHub, Vercel and ZIP.

## Acceptance criteria

- Walking/driving/cycling legs use real provider geometry when available; unsupported/transit/offline failures remain clearly schematic.
- Geometry cache keys include profile and normalized endpoints, reuse equivalent pairs and do not fetch all 18 days.
- My Location never runs automatically, never persists coordinates and never changes Current Plan.
- Offline UI truthfully distinguishes the existing offline trip pack from offline basemap availability and offers a usable fallback.
- Dates outside the provider forecast horizon never display fake forecast data; cached forecast is labelled with update age.
- Desktop Workspace, Mobile Shell, Current Plan linkage, URL state, Gallery, check-in and offline media regressions remain green.

## Status

- Implementation and regression validation complete from baseline `c1db9c1`; ready to publish.
