# Phase 2B — Desktop Trip Workspace

## Objective

Turn the desktop Trip view into a planning-first split workspace: a compact day timeline on the left, an interactive map on the right, and optional contextual drawers. Preserve the Phase 2A mobile execution shell and all existing domain state, route facts, media, persistence and linkage behavior.

## Guardrails

- Keep Mobile Today, Mobile Map and Mobile navigation behavior unchanged.
- Reuse `useAppController`, `useTripController`, the editable plan and current JSON facts; create no workspace-specific itinerary state.
- Use Leaflet and the existing tile-provider abstraction; do not add routing, backend, keys or a second map engine.
- Route lines visualize only existing verified point order. A fallback connector must be labelled as schematic, never as a real walking geometry.
- TREK is an information-architecture reference only; copy no source, JSX, CSS or components.

## Work breakdown

1. Capture the `b403c5a` regression and bundle baseline; inspect existing Trip, map and editable-plan boundaries.
2. Extract shared map point/route/selection helpers into `features/map` and a reusable lazy Leaflet canvas into `components/map` without changing Mobile behavior.
3. Add an arbitrary `reorderWithin` editable-plan mutation and cover it with focused tests; retain Move earlier/later fallbacks.
4. Build a desktop-only Trip workspace with compact toolbar/day popover, resizable/collapsible plan pane, timeline connectors, selected entity/leg state and map preview.
5. Add optional Day Details and Explore drawers over existing day/entity data and Current Plan mutation handlers.
6. Add photo markers, hotel marker, compact Route/Food/Gym filters, candidate markers and Fit Day behavior while avoiding marker explosion.
7. Add responsive workspace behavior for 768–899, 900–1179 and >=1180 without modifying the <768 MobileShell.
8. Add `test:desktop-workspace`, run all required regression commands, perform desktop and mobile browser flows, compare bundles, commit, deploy and archive.

## Acceptance criteria

- Desktop Trip opens directly into a near-viewport-height Timeline + Map workspace.
- Timeline and markers share one selected-place state and synchronize highlight, pan, preview and scroll.
- Reorder and Explore Add mutate the existing Current Plan so route, summary, budget and marker numbering update through current linkage.
- The timeline pane persists width under `travel.desktop.tripPanelWidth`, clamps to 340–560px, resets on double click and can collapse without losing selection.
- Day changes synchronize timeline, map, hotel and route and trigger a single restrained fit-to-day.
- Desktop map and Leaflet load only when Trip is entered; Home does not include the map chunk.
- All required automated checks, desktop sizes, mobile sizes and flows A–G pass with no overflow, pane collision, broken marker image or map resize glitch.

## Status

- Implementation and regression verification complete from baseline `b403c5a`.
- Automated suites pass with 132 modules, 65 entry lines and zero cycles.
- Browser flows A–G pass at the required desktop and mobile viewport matrix.
- Release steps: commit, push, production deployment and ZIP archive.
