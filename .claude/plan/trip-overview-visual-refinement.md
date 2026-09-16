# Trip Overview Visual Refinement

## Goal

Refine the existing desktop Trip Overview presentation so the timeline and overview have distinct responsibilities, the official places become the visual focus, and practical Food/Gym/hotel content remains readable without changing trip data or business behavior.

## Scope

- Remove the desktop Trip secondary header and compact the day/view toolbar.
- Keep the left panel focused on timeline order, duration, transfer legs, and ticket status.
- Replace the right-side summary-card dashboard with the confirmed composition: day hero, responsive official-place gallery, and a compact three-column Food/Gym/hotel row.
- Improve Food, Gym, hotel return, exact-day action, and backup presentation.
- Preserve lazy Map loading, cached Map reuse, drawer layering, Gallery, timeline editing, and mobile information architecture.
- Verify real rendered pages for Day 2, Day 8, and Day 15 at the requested desktop sizes and Mobile 390px.

## Implementation

- [x] Update shell and workspace toolbar hierarchy without touching Home.
- [x] Remove repeated timeline heading and humanize timeline presentation labels.
- [x] Rebuild `DesktopTripOverview` to match the confirmed screenshot hierarchy and proportions.
- [x] Connect existing Gallery, hotel detail, and exact-date Action Queue data.
- [x] Make Overview scrolling deterministic and reset it on day changes.
- [x] Ensure every timeline item has either its real image or a city/category-aware existing illustration.
- [x] Update focused presentation/workspace tests.
- [x] Run typecheck, lint, build, and relevant regressions.
- [x] Capture actual browser screenshots for Day 2, Day 8, Day 15, plus the lower practical-content section.

## Acceptance Criteria

- Day 2 renders exactly two equal-width attraction cards without an empty column.
- Day 8 handles several official places without excessively small cards.
- Day 15 remains readable and returns to the top after day switching.
- The Overview panel can always scroll to its final content; no fixed-height or nested-overflow container clips the bottom.
- Food/Gym images are recognizable desktop thumbnails and hotel content leads with the real hotel.
- Global pre-trip actions do not appear as same-day December actions.
- Overview initial load does not initialize Leaflet, tiles, or route geometry.
- Map first open remains on demand; later toggles reuse the mounted map.
- Desktop drawers remain above the map and Mobile 390px has no regression.
- No code is committed or deployed before user approval.
