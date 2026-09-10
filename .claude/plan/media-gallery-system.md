# Media Gallery System

## Goal

Upgrade the existing Visual Asset Complete release from single-image coverage to decision-useful, source-traceable galleries without changing the established UI system or travel execution logic.

## Scope

- Normalize Place, Food, Gym, and Hotel media to one gallery-ready image shape.
- Add one fullscreen gallery with keyboard, touch swipe, captions, counters, adjacent-only preloading, and scroll restoration.
- Keep cards cover-only and select covers by `isCover`, then role and priority.
- Add `WHAT TO ORDER` to food details and associate recommended dishes with dish images.
- Expand galleries for Top Food, Current Plan places, confirmed Hotels, and Top Gyms using traceable real-world sources.
- Replace the old binary image-coverage audit with quality thresholds and GalleryReadyCoverage.
- Validate desktop/mobile interaction, existing linkage, build, lint, typecheck, and audit; then update the ZIP and existing deployment.

## Implementation order

1. Audit current entities, image roles, source metadata, and baseline asset bytes.
2. Introduce the normalized media model and cover-selection helpers.
3. Implement the shared gallery and migrate cards, details, visual library, and hotel media to it.
4. Import and verify priority media, preserving source pages and avoiding unverified Google user-photo reuse.
5. Add quality-coverage auditing and report unmet core entities honestly.
6. Run automated and browser validation at desktop and 390px mobile.
7. Package, commit, publish to the existing private Site, and create the final ZIP.

## Acceptance criteria

- Card surfaces load one selected cover only.
- Gallery keeps entity and index, supports arrows/ESC/swipe/close/counter/caption, and returns to the prior scroll position.
- Only current and adjacent gallery images are eagerly prepared.
- Food target: 4+ images, 2+ dish roles, environment/entrance, dish cover.
- Hotel target: 5+ images with room, bathroom, entrance.
- Current Plan place target: 3+ images with distinct roles.
- Top Gym target: 3+ images including strength/equipment context.
- Audit exposes imageCount, roleCoverage, useful cover, role flags, galleryReady, and aggregate GalleryReadyCoverage.
- Existing travel-system linkage tests remain green.

## Completion

- Implemented the shared cover-first gallery across Place, Food, Gym, Hotel, and the visual library.
- Added keyboard navigation, ESC, counters, captions, mobile swipe handling, 44px controls, adjacent-only preloading, and scroll restoration.
- Added restaurant `WHAT TO ORDER` image associations.
- Current Plan places: 34/34 gallery-ready; Hotels: 6/6; priority Food: 24/34; priority Gyms: 4/6.
- Aggregate GalleryReadyCoverage: 68/80 (85%). Remaining core entities are listed in `audit/gallery-quality.json` and were not padded with weak or mismatched media.
- Desktop and 390px browser checks passed; `pnpm check` passed with the pre-existing budget warning only.
