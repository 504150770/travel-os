# Personal Navigation Entry

## Goal

Replace the persistent global `D1 / Saved` block with the supplied Jacob personal mark while preserving all existing application capabilities and navigation.

## Implementation

- Use the supplied J mark as a 36px circular avatar.
- Add a light, transparent `Jacob` menu trigger with a small chevron.
- Reuse existing destinations only:
  - Local status: read-only current online/local state.
  - Backup / Export: More → Backup.
  - Settings: More → Essentials.
- Remove current-day information from global navigation; Trip keeps its own day header.
- Emit a transient `Saving… → Saved` acknowledgement when existing local-storage writes occur, then fade it out.
- Keep all trip data and business behavior unchanged.

## Acceptance

- No persistent D1 or Saved label remains in global desktop/mobile Home navigation.
- Avatar is the supplied image, cropped circularly at 36px.
- Menu closes on outside click and Escape.
- Existing Backup and Essentials panels open from the menu.
- Desktop Home matches the supplied spacing reference and has no horizontal overflow.
- No deployment occurs before visual approval.

## Home Hero Follow-up

- Restore the user-supplied winter Eiffel Tower panorama as the Home Hero.
- Keep the Jacob entry, six city-card images, English copy, and all existing behavior unchanged.
- Use the user-supplied square Eiffel Tower image only below 768px while retaining the wide winter panorama on desktop.
