# King Ping player experience implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make recording rounds reliable, progress visible, and real results easy to find and share.

**Architecture:** Preserve round-the-table standings, time-on-throne ranking, existing crown-rating calculations and optional winner-only clients. Use the existing throne transaction for idempotent writes and consistent state reads; derive new performance insights only from trustworthy complete standings. Extend existing pages rather than replacing themes or introducing dependencies.

**Tech Stack:** Next.js 15, React 19, Prisma/PostgreSQL, TypeScript, Vitest.

## Decisions and alternatives

Prioritize recording + placement performance + searchable results over a visual-only redesign or a new league/rating system. Recording and accurate insights affect every session; new competition rules would introduce risk and require real product agreement. Keep the established royal/galactic identity, with legible athletic numeric presentation in new sections. No inferred losses from legacy winner-only records. Work in the existing checkout because it contains user changes needed by the running product; do not stage or commit unrelated work.

## Checklist

- [x] Establish baseline tests, safe database, and preserve pre-existing changes.
- [x] Task 1: test duplicate retries, key conflicts, cooldown errors and reads after lock; implement nullable unique request key and transactional recording; test failed-response retry state; improve confirmation focus, recovery and round progress.
- [x] Task 2: test win-rate denominator, missing/invalid standings, equal timestamps, streaks, absent-player gaps and pairwise placement comparisons; implement pure performance aggregation + season-scoped server reads + player profile presentation.
- [x] Task 3: test history participant/search filters and pagination; implement readable default history with retained cinematic view, complete placements, replay links and shareable result action.
- [x] Verify all tests, database integrations, generated client, typecheck, production compilation and browser/mobile journeys; review diff and fix discoveries.
- [x] Report implemented value, evidence, limitations and next three recommendations.

## Task 1: Trustworthy effortless recording

Files: `lib/domain/riket.ts`, `app/api/wins/route.ts`, `components/RecordWinForm.tsx`, `lib/domain/win-request.ts`, `prisma/schema.prisma`, additive migration; tests `tests/wins-api.test.ts`, `tests/record-win-afk.test.ts`, `tests/wins-integration.test.ts`, `tests/win-request.test.ts`.

Write failing tests first, run focused Vitest tests and confirm missing behavior. Acquire the existing transaction lock before reading crown/streak/cooldown state. Persist a nullable unique requestId on WinEvent, compare canonical result payload on retry, and replay the original WinEvent/Announcement without recording or auditing again. Preserve optional request keys and winner-only requests. Use typed 409/429 errors. Keep one browser request across uncertain retries; preserve draft and prevent edits while resolving an ambiguous response. Add bounded note validation and accessible confirmation focus management. Run focused tests and real concurrent PostgreSQL requests.

## Task 2: Real performance and rivalry insights

Files: `lib/domain/performance.ts`, `lib/performance/server.ts`, `components/player/PlayerPerformance.tsx`, profile page and CSS; `tests/performance.test.ts`, `tests/player-performance.test.tsx`.

Write failing pure-domain and render assertions, run and observe failures. Calculate rounds, wins/losses, win rate, last ten results, current/best participation win streak, average placement and most frequent pairwise rivals from valid standings only. Sort by timestamp then ID. Legacy winner-only events are explicitly excluded and never count as losses. Season server query selects only required fields and roster once. Display meaningful data + sample size + honest unknown-data explanation, profile links and recent result links. Preserve archived season links. Run focused tests.

## Task 3: Find and share results

Files: `lib/domain/history.ts`, `components/history/RoundHistory.tsx`, history page, `components/stage/ShareRound.tsx`, round page and CSS; `tests/history.test.ts`, `tests/round-history.test.tsx`.

Write failing filter/pagination/render tests, confirm failures, then implement participant and case-insensitive text filters, incremental visible history, complete ordered results, optional notes and dates. Keep existing cinematic crawl available by explicit view link. Share an existing round URL with native share or copy fallback and visible recovery. Run focused tests.

## Verification

`npm test -- --exclude '.claude/**'` with an explicit disposable localhost DATABASE_URL; `npx tsc --noEmit`; `npm run build` only against disposable PostgreSQL. Run opt-in concurrent write tests on a named localhost quality database. Use browser automation on the real app, verify mobile layout and invalid/network recovery without production data. No lint script exists: report that rather than inventing a pass.

## Results

- Isolated PR against GitHub main: 385 tests passed, five database tests opt-in. All five recording integration tests passed separately on the disposable local `kingping_quality` database.
- Production build, generated Prisma client and explicit typecheck passed. Existing lab CSS has Autoprefixer warnings; no standalone lint script exists. No new dependencies or ranking rules.
- The original workspace browser checks covered a completed round, deliberately lost successful response, reload and retry with exactly one persisted event; stale AFK validation with retained selection and keyboard focus; dialog keyboard containment; mobile profiles and filtered history with no page overflow at 390px; pagination retaining player filter; result-link copying confirmed against the clipboard.
- Native sharing remained pending in the embedded browser. A separate always-available copy action was added and verified. System share-sheet behavior remains platform dependent.
- Read-only review caught nested root-client reads under the throne lock; recording reads now retain the transaction client. Twelve simultaneous retries passed without exhausting the connection pool. Errors and saved-result links provide enabled focus fallbacks.
- The PR is isolated from unrelated local lab, mission, MCP and lobby work. It is based on current GitHub main and includes the winner query and legacy-result display required for sharing winner-only rounds. Local prediction work remains in the original checkout.
- Historical data and established ranking calculations are preserved. Migration deployment was tested only on disposable local databases. Authentication and audited result correction remain next work; winner-only events cannot support participation-based percentages.
