# Home + Desktop Trip Presentation Refinement

## Goal

Refresh the existing Home presentation and make the desktop Trip map explicitly on-demand without changing travel facts, Current Plan, bookings, budget logic, or mobile information architecture.

## Implementation

1. Recompose Home around an existing Eiffel Tower asset, data-driven countdown, six photo-first city cards, and the existing action/budget/itinerary capabilities.
2. Remove the Home secondary top bar while preserving desktop navigation and saved/offline state.
3. Add a desktop Trip Overview surface sourced from the existing trip controller, with Timeline retained on the left.
4. Remove idle MapCanvas preloading, load Leaflet only after the Map mode is selected, and keep the mounted map alive for later toggles.
5. Establish named overlay layers, contain Leaflet stacking contexts, and disable map interaction while drawers are open.
6. Add focused static regression tests for Home composition, desktop view mode, lazy map loading, and overlay layering.

## Acceptance

- Home is photo-first and responsive at 1920, 1440, 1280, 1024, 430, 390, and 375 widths.
- `?view=trip&day=15` initially renders Timeline + Overview without Leaflet, tiles, or route-geometry requests.
- Map loads on click, remains mounted through Overview/Map toggles, and drawers cover and suspend map interaction.
- Existing regression, architecture, audit, mobile, desktop workspace, and travel intelligence checks pass.
