# Travel Budget Navigation — Cloud Browser Evidence

Tested code: `a44eb943a4f37f3d1bd14b21e20563a86ce90267` (four-line fix commit `5d399521b6a1bb392a307c359fa03054fcb80550`). Baseline: `395cb61c36be1ddb77b8693981d8b8dd3b95fd81`.

User explicitly authorized cloud browser for this round; parent says dot review replaces the prior ChatGPT conversation. New evidence awaits parent review. No production deployment or merge performed.

## Actual results

- Real Chromium 151.0.7922.173, fresh isolated contexts, local dev apps only.
- Baseline Desktop: Budget initially visible while URL retained `tab=bookings`; real reload returned to Orders. Two unmodified screenshots captured and viewed.
- Fixed: 18 successful paths = six non-budget tabs × Desktop 1440×1000, Mobile 375×812, Mobile 390×844. Each checks non-budget tab → Home → 查看明细 → Budget, real refresh, URL reopen in a new page, Back to Home, Forward to Budget, and three repeated click rounds.
- Desktop uses visible Home navigation. Mobile Plan has no Home nav: test uses actual `history.go(-2)` to return to its existing Home history entry (Home query retains the selected tab). The test does not invent a mobile Home control.
- Seven rapid-double-click checks passed: Desktop once; each mobile width three stabilized probes. Exactly one new history entry, Back directly Home, Forward directly Budget.
- 17 native PNGs individually inspected; pixel sizes match actual viewport. No overflow or broken images in the captured visible viewport; no browser page errors. URL and history results are separate operation evidence, not inferred from screenshots.

## Evidence corrections retained

1. Initial screenshot guard checked only y visibility and mistook offscreen lazy carousel images for visible broken images. It stopped before saving a mobile image. Corrected guard checks both axes and waits for visible image loads; completed cases were retained and incomplete cases rerun.
2. Initial rapid mobile dblclick probe timed out without a final-state capture. Diagnostic re-run saw correct Budget URL/panel; six explicit font/layout-stabilized mobile probes passed. The initial timeout is not omitted or called a confirmed product defect.
3. Initial server access used IPv4 while vinext bound localhost IPv6; corrected URL. Initial preparation clicked server markup before hydration; final checks wait for real Home mount. Preparation captures are excluded from this accepted evidence set.

## Scope and merge relation

No new application source edits. No real account/profile, private documents, user business-state writes, itinerary/booking/budget edits, storage injection, hotel re-review, Meta requests, deployment, or merge.

Latest QA was fetched and rechecked: `fedbd10387abe313cc3ee2b894259a359f9d2ead`; main: `e96fc8561b09b89fef08324bb45828d84c2bebfc`. Dry merge with QA succeeds and preserves HANDOFF/qa-progress blob IDs exactly. Main dry merge also succeeds, but merge into latest QA first so its recent production/hotel/cleanup records are retained. Runtime source difference against latest QA is only the four navigation lines.

Prior typecheck/lint/build/project audit/ten regressions/gallery-copy and independent parent code review remain separate evidence; no needless full-suite rerun is claimed for screenshot/doc-only changes. Existing budget warning unchanged.

Parent can now review these screenshots and operation records, then choose merge/release. Production deployment and smoke testing of the final merged candidate remain pending. This is budget-navigation acceptance only, not whole-system completion.

Detailed cases, exact URLs, dimensions and SHA256: `browser-results.json`. Screenshots show only existing default app content; no private credentials or document exports.
