# Phase 4 — Travel Readiness Center

## Objective

Finish the fixed Europe 18-day Travel OS with three focused, local-first capabilities: a device-only document vault, a concise trip-specific packing checklist, and a time-aware readiness view derived from existing booking, task, deadline, check-in, transport, hotel, ticket, packing and document state.

## Non-negotiable boundaries

- Preserve Current Plan, route geometry, budget, hotel/check-in, weather, Gallery, Offline and URL-state behavior.
- Do not add map work, exports, sharing, cloud sync, authentication or a new primary navigation item.
- Store document blobs and private document metadata only in IndexedDB; never serialize them into JSON backup, source data, audit output, build artifacts or logs.
- Keep packing state in the existing local backup/restore system because it is non-sensitive.
- Readiness is a derived view over existing facts; do not copy booking/task/deadline/check-in data.
- Only raise P0 for blockers to boarding, lodging access, transport, required attraction entry or critical documents.
- Defer travel-day checks and packing alerts to appropriate time windows instead of showing premature critical warnings.
- Lazy-load Documents and its viewer so Home startup and the map bundle are unaffected.

## Work plan

1. Capture the `678450e` regression and bundle baseline; inspect controllers, backup schema, Plan/More views, service worker and existing data semantics.
2. Add provider-neutral IndexedDB document storage for PDF/JPG/PNG/WEBP blobs and metadata, with CRUD, object-URL lifecycle and persistence tests.
3. Add lazy-loaded More → Documents mobile-first UI with category filtering, add/open/delete flows, local-only messaging and compact PDF/image viewer.
4. Add a fixed Europe 18-day packing model, defaults and controller state supporting check, add, edit, delete, critical flags and JSON backup/restore migration.
5. Add More → Packing using the current design system and compact critical/packed summaries.
6. Build a pure readiness model that classifies existing facts into Action Needed, Before Departure, Waiting and Ready using current date, deadlines and explicit document requirements.
7. Integrate Readiness into Plan, keep Ready collapsed, retain one Home next action and at most one day-relevant Mobile Today action.
8. Add contextual View Document actions only where an explicit binding exists; never infer that every booking needs an uploaded file.
9. Add privacy scans and `test:readiness` for IndexedDB/offline document persistence, packing persistence, critical items, time-aware classification, state updates and backup exclusions.
10. Run all regression suites, responsive browser flows at 375/390/430, offline refresh validation, bundle comparison and production smoke tests.
11. Commit, push GitHub, deploy the existing Vercel project/custom domain and create the Phase 4 source ZIP.

## Acceptance criteria

- A locally added PDF or supported image survives refresh/offline use and opens within 2–3 interactions from More.
- No document blob, filename content, private URL or location value enters Git, public assets, backups, generated audit data, build output or console logs.
- Packing CRUD persists and round-trips through existing backup/restore without including document data.
- Readiness counts update from existing state and distinguish actionable-now, scheduled-later, waiting-external and ready states.
- Critical packing only enters readiness near departure; travel-day verification is never treated as a September P0.
- Home, Today and existing desktop/mobile workspaces remain visually and behaviorally stable.

## Status

- Implementation and regression validation complete from baseline `678450e`.
- Privacy scan passes for the current source/build tree; historical Git commits were not rewritten.
- Ready to publish after final commit, push, deployment and ZIP packaging.
