# Phase 2A — Mobile Execution Shell

## Objective

Create a purpose-built mobile presentation for the fixed Europe trip while retaining the existing shared controllers, local-first persistence, URL state, data sources, and desktop presentation. The mobile default must answer the traveller's immediate next action within ten seconds.

## Guardrails

- Preserve desktop markup and behavior except where shared URL/state wiring requires a change.
- Do not duplicate domain state or JSON facts.
- Do not change Current Plan, route, budget, booking, hotel, check-in, gallery, offline, favorites, backup, or migration semantics.
- Use TREK only as an information-architecture reference; copy no source, JSX, CSS, or components.
- Keep external turn-by-turn navigation in Google Maps.
- Keep the map optional, client-only, and dynamically loaded.

## Work breakdown

1. Record the b08285e regression and bundle baseline; inspect coordinates, route and media coverage.
2. Define a mobile view adapter (`today`, `map`, `explore`, `plan`, `more`) over the existing `ViewId` and selected day state, including legacy URL aliases.
3. Turn `MobileShell` into a responsive presentation boundary that renders mobile screens below 768px while desktop continues to render the existing views.
4. Build Mobile Today from the existing day, plan, route, food, gym, hotel and action data.
5. Add a shared accessible mobile sheet for day selection, entity details, item actions and map marker previews.
6. Build Map V1 from existing coordinates and day route facts. Load the renderer only when the Map tab is entered and provide a resilient fallback.
7. Add lightweight Mobile Explore/Plan/More presentations over the existing shared handlers and data without changing their business logic.
8. Add safe-area, touch-target, reduced-motion and media-loading rules.
9. Add focused URL/mobile-map tests; run all existing regression commands.
10. Execute the required 375/390/430 flows, compare bundle output, commit, push, deploy and archive the ZIP.

## Acceptance criteria

- Mobile bottom dock is Today / Map / Explore / Plan / More and preserves day/state across switches.
- `?view=today&day=3` and `?view=map&day=3` restore correctly; legacy `?view=trip&day=3` remains valid on desktop and maps to Today on mobile.
- Today renders next stop, compact glance, route, current plan, food, gym, hotel return and one important action using existing facts only.
- Map shows only current-day hotel/stops/top food/top gym with existing coordinates; no route recalculation.
- Map code is absent from the Today initial chunk.
- Sheets are accessible and safe-area aware; mobile controls are at least 44px.
- Desktop presentation remains visually and behaviorally stable.
- Typecheck, lint, build, audit, linkage, gallery-offline, architecture and new focused tests pass.

## Completion

- Completed on 2026-09-11 from baseline `b08285e`.
- Mobile flows A–F verified at 375px, 390px and 430px.
- Final architecture audit: 124 modules, 64-line entry component, zero cycles.
- Leaflet and its stylesheet remain behind the Map-only dynamic import boundary.
- All required automated checks passed; audit retains the existing budget warning only.
