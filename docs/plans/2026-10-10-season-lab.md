# Season Lab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Forecast season standings by throne time and evaluate suggested placements against completed outcomes.

**Architecture:** A pure TypeScript forecasting engine consumes dated seasons, players, wins, AFK periods and reigns. A read-only server loader supplies serialized history to an interactive `/lab` report. Train ridge regression on 25/50/75% snapshots of strictly earlier completed seasons; forecast remaining throne share, then add already accrued time. Compare current-table and smoothed recent-form baselines. Seeded simulations show scenario ranges, not calibrated confidence intervals.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest; no new dependency or migration.

## Design choices
- Target the existing throne-time ranking; historical cutoffs are calendar progress, not fraction of results.
- Replay only data known at cutoff, clamp every reign and filter future players. AFK eligibility uses historical periods.
- Active seasons have no scheduled end in the schema: expose a 7–90 day assumed horizon. Closed seasons use their actual end.
- Model training uses only seasons that ended before the forecast cutoff and started before the selected season. No current-season outcomes enter training.
- Use current standings and form projection as transparent baselines. Ridge is unavailable until at least two prior completed seasons provide training data.
- Rank errors, exact placement accuracy, winner hits and pair ordering compare predictions to actual eligible final standings. New arrivals and AFK departures are reported separately.
- Provide an interactive rank comparison, model leaderboard, explainable inputs, simulation title/podium shares, CSV export, and clear empty states.
- Work in the existing checkout using new feature files and one navigation addition; preserve in-progress missions changes.

## Task 1: Forecast engine
1. Add failing `tests/season-lab.test.ts` for clamping, unknown future data, prior-only training, deterministic simulation, rank metrics, sparse inputs and AFK.
2. Run `npx vitest run tests/season-lab.test.ts` to verify missing feature failure.
3. Implement `lib/domain/season-lab.ts` with snapshot features, ridge fitting, model forecasts, seedable simulations and backtests.
4. Run focused tests to verify behavior.

## Task 2: Read-only route and report
1. Add `lib/lab/server.ts` selecting only necessary history fields.
2. Add `app/lab/page.tsx` and `components/lab/SeasonLab.tsx` with season/model/cutoff/horizon controls, rank plot, model evaluation, diagnostics and export.
3. Add scoped responsive `components/lab/lab.css` and a Lab link in `app/layout.tsx`.
4. Verify server render and route interactions, including sparse data.

## Task 3: Verification
1. Run full `npm test` and `npx tsc --noEmit`.
2. Review historical leakage, model denominators, empty states, ranking eligibility and accessibility.
3. Verify browser rendering if the local runtime/database is available.
4. Document results and limitations. Leave changes reviewable in the workspace.

## Verification results
- Root repository suite: 29 files, 350 tests passed (`DATABASE_URL=postgresql://test:test@localhost:5432/test npx vitest run --exclude '.claude/**'`). The placeholder initializes Prisma; tests use mocks, not a live database. MCP tests need local socket access.
- `npx tsc --noEmit` and `git diff --check` passed.
- Independent code review found and fixed an inflated winner-accuracy denominator: unforeseen final winners count as misses. Added regression coverage.
- Browser fixture QA passed for mobile/desktop rendering, live and historical seasons, model switching, replay cutoff updates, the common-season scorecard, and insufficient-history feedback.
- CSV contents and spreadsheet formula escaping tested. In-app browser download event did not confirm the actual file download.
- Real database integration and a production build remain unverified because this checkout has no `DATABASE_URL`. `npm run build` was not run because it deploys Prisma migrations before building.
- Browser fixtures are temporary under `/tmp/kingping-lab-preview`; none are included in the shipped route. Screenshot: `/tmp/kingping-lab-preview/preview.jpg`.
