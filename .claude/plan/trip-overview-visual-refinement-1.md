# Trip Overview Visual Refinement — Activity Illustration Correction

## User Feedback

Timeline activities without a real place image must not borrow hotel, restaurant, or attraction photography because that makes them look like actual destinations.

## Revision

- Keep real photography only for entities that already have real media.
- Render image-less activities with a clearly illustrated semantic tile:
  - rest / arrival / hotel handling → bed
  - walk → footsteps
  - meal → utensils
  - coffee → cup
  - transfer / transport → train or plane
  - queue / buffer → clock
  - free time → compass
  - generic activity → calendar
- Do not add or change any Current Plan entity, trip fact, or media metadata.
- Recheck Day 2, Day 8, and Day 15 Timeline rendering and update the actual screenshots.
- Use the newly supplied winter Eiffel Tower panorama as the Home Hero unchanged, and translate the Hero title and city line to English.

## Acceptance

- No Timeline stop shows an empty or numbered placeholder.
- Generic activities cannot be mistaken for a photographed attraction, restaurant, or hotel.
- Real places continue to use their existing photos.

## Home Route Image Revision

- Replace the Home Hero with the user-supplied sunset Eiffel Tower panorama.
- Rename the route section to `A Winter Journey Through Six Cities`.
- Replace all six route-card covers with the supplied city-specific images in this order: Rome, Florence, Venice, Vienna, Prague, Paris.
- Preserve the existing city order, nights, navigation behavior, and all trip data.
- Convert the six 3MB source images to card-sized WebP assets without altering their content.
