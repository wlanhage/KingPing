# Season Lab Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve regression training and expose whether scenario uncertainty survives historical evaluation.

**Architecture:** Extend the pure engine with recent throne share, observed participation win rate, and horizon context. Standardize ridge features from training data only. Select the ridge penalty from 0.1/1/10/100 using chronological, whole-season validation on earlier completed seasons; fall back to 1 with fewer than three usable earlier seasons. Evaluate scenario rank coverage and multiclass title Brier scores against final outcomes without describing them as calibrated probabilities.

**Tech Stack:** Existing TypeScript, React, Next.js, Vitest; no dependencies or schema changes.

## Scope and design
- Keep the same three models and deterministic baseline.
- Observed participation comes exclusively from recorded standings; unrecorded losers are unknown, never assumed.
- Horizon context uses elapsed/(elapsed+remaining), log remaining days, and a current-crown/remaining-days interaction. Historical training uses each known completed season end; live forecasts use the explicit scenario horizon.
- Feature scaling is fitted independently on each fold's training samples.
- All observations from one season remain together in temporal validation. The held-out season never enters its own fit or scaler. Penalty is selected by mean future-share squared error, averaged per validation season.
- Diagnostics: P10–P90 rank interval empirical coverage among common ranked players and multiclass title Brier score across all predicted identities plus an unforeseen actual winner (score 0 is ideal, 2 is worst).
- Report penalty, validation-season count and insufficient-tuning-history state. No claim that predictive accuracy improved without real-data evidence.

## Tasks
1. Write failing tests for scenario scoring, horizon-aware regression metadata, participation handling, chronological tuning and future-data invariance.
2. Implement feature extraction, standardized ridge fitting and chronological regularization selection; run focused tests.
3. Add scenario diagnostics to selected replay and model scorecards; update method copy and CSV diagnostics.
4. Run full root tests and TypeScript checking; request independent review.
5. Verify updated report with temporary browser fixtures (database unavailable in this checkout).

## References
- https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html
- https://scikit-learn.org/stable/modules/preprocessing.html

## Results
- 18 focused Season Lab tests pass, including temporal tuning, future-data invariance, observed-only participation, horizon effects, title Brier calculations, and complete-roster-turnover scoring.
- Scoped TypeScript validation for the lab engine, route, loader, report and tests passes (`npx tsc --noEmit -p /tmp/season-lab-tsconfig.json`). `git diff --check` passes.
- Full current checkout run: 31 suites / 374 tests passed; one concurrent, unrelated `prediction-museum.test.tsx` suite cannot import its in-progress `components/predictions/PredictionMuseum` component. The same unresolved import blocks whole-checkout TypeScript validation. No unrelated work was changed.
- Independent review identified and fixed omission of title probability scores when all forecast players depart. Rank and title diagnostics now have separate common-season cohorts; valid title scores remain visible without rank overlap.
- Temporary browser fixture QA verified tuned-penalty metadata, fallback metadata, probability-error and range-coverage scorecard fields, and replay diagnostics. Screenshot: `/tmp/kingping-lab-preview/improved-preview.jpg`.
- No real-history accuracy claim: database integration remains unavailable without DATABASE_URL. Scenario probabilities remain explicitly uncalibrated.
