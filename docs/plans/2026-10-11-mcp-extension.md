# KingPing MCP Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the existing local MCP server with an overview, player management, filtered history, and validated inputs.

**Architecture:** Keep the current stdio JSON-RPC transport and the six existing tools compatible. All tools use the application's existing HTTP API; no direct database access or new API routes are needed. Validate arguments against the published JSON schemas before calling the API, including cross-field standings checks before recording a win.

**Tech Stack:** TypeScript, Node.js fetch/readline, Vitest, existing Next.js API routes.

## Task 1: Extend tool coverage

**Files:** `scripts/mcp.ts`, `tests/mcp.test.ts`.

1. Extend the mock HTTP boundary with state, POST players, and PATCH player responses; track requests and clean up pending RPCs.
2. Write failing integration tests for `pingis_overview`, `pingis_add_player`, `pingis_set_afk`, and the optional `player` filter on `pingis_history`.
3. Run `npx vitest run tests/mcp.test.ts --exclude '.claude/**'`; confirm the new tests fail because the tools/filter are absent.
4. Implement the three tools using existing API routes. The overview returns state, players, a compact leaderboard, and named recent history. Filter history by winner, previous king, or participant before applying its limit.
5. Rerun the same tests; keep all original tool behavior covered.

## Task 2: Validate inputs before side effects

**Files:** `scripts/mcp.ts`, `tests/mcp.test.ts`.

1. Write failing table-driven tests for missing, empty, wrong-type, out-of-range, and unknown arguments. Confirm malformed writes never reach the API.
2. Test winner-first standings, duplicate resolved players, and whitespace/case-insensitive name lookup. Reject ambiguous name matches with candidate ids before writes.
3. Validate the JSON-schema subset used by the tools (objects, strings, integers, booleans, arrays, required keys, bounds, additional properties). Keep errors as MCP tool errors with actionable field names.
4. Resolve standings once; reject duplicates or a first-place player different from the winner before POST.
5. Rerun MCP tests and TypeScript checks.

## Task 3: Document and verify

**Files:** `README.md`, `package.json`.

1. Add `npm run mcp` and `npm run test:mcp` shortcuts, with the test command excluding nested Claude worktrees.
2. Document the new tools, example arguments, AFK behavior, local/prod launch, and a portable client configuration using an absolute script path.
3. Run MCP tests and TypeScript checks, review the diff, and report any unrelated existing type errors separately.

## Scope

Work in the current checkout and limit edits to MCP source/tests/documentation and npm scripts; the ongoing lab, mission, prediction, and domain changes stay outside this change. No live wins, player creation, AFK updates, or client configuration changes are performed during verification. New tools only use mock HTTP fixtures in tests.
