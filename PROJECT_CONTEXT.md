# Baruc project context

Last reviewed: 8 September 2026.

## Purpose and scope

Baruc lets FPL classic mini-league managers create a shared tracker for recurring competitions and a season prize pool. The user wants to develop it for sharing with other managers. The authoritative project is https://github.com/1-dvsbstd/Baruc-App plus the scripts and workbook supplied in this project's Excel folder. The neighbouring Baruc-s-League project is separate.

This context was reconstructed from the supplied files and a local browser check. The previous development conversation was unavailable. Recommendations below are proposed next steps, not decisions recovered from that conversation.

## Architecture

- `index.html`, `styles.css`, `app.js`: static website, no framework or build step.
- `config.js`: deployed Google Apps Script API URL.
- `Excel/api.txt`: Apps Script request routing; health reports version 0.5.0 in source.
- `Excel/app_config.txt`: league limit, periods and shared settings.
- `Excel/competition_config.txt`: prize-pool calculation, mostly using integer pence.
- `Excel/competition_engine.txt`: pure period scoring and tie allocation.
- `Excel/fpl_provider.txt`: league lookup, FPL response mapping and preview caching.
- `Excel/storage.txt`: Google Sheets persistence, initialisation, duplicate detection and creation lock.
- `Excel/league_reader.txt`: saved configuration and manager reads.
- `Excel/tracker_data.txt`: season state, batched manager history/picks requests, current standings and cached responses.
- `Excel/tests.txt`: five existing pure-logic tests split across two runners.
- `Excel/Baruc App.xlsx`: exported data snapshot. Runtime storage is the Google spreadsheet referenced in storage.txt; the app does not read the local Excel file.

API actions: health, previewLeague, calculatePrizes, createLeague, getLeague, getTrackerData. All currently use GET, including creation. Tracker links use `?league=` followed by eight alphanumeric characters; generated keys use eight hex characters from a UUID.

Caches: league preview 600 seconds, season state 60 seconds, tracker payload 120 seconds. Each uncached tracker can request history and picks for every manager, up to 40 requests at the current limit, plus season/league data when their caches miss.

## Existing rules evidenced by code

- 2–20 managers for prize creation; default entry fee £75; zero entry fees are accepted.
- Nine four-gameweek periods from GW1–36, then a GW37–38 Final Sprint.
- Default first/second prize ratio 3:1, for both overall and recurring prizes.
- Protect an overall first-place payout of at least one entry fee, then maximise recurring pots. Allocation remainders go into the overall pot.
- Period scores use FPL points less transfer costs.
- Ties pool the occupied prize positions and split equally. Fractional-penny settlement is not yet defined.
- Managers are captured when a tracker is created. Later membership changes do not update that saved list.
- Active trackers with matching league ID and entry fee are reused. Season is not part of this identity.

## Completed and verified

- League lookup, prize preview, create/reuse tracker, share URL, manual refresh, overall and gameweek standings, current competition standings, period/prize schedule and chip display are implemented.
- Five existing tests passed locally: default periods, net period scoring, two-way first-place tie, two-way second-place tie, default prize template. Both runBarucTests() and runBarucPrizeTests() must be called.
- Workbook has one populated league configuration, four populated manager rows, and no Gameweek Results data rows. Extra empty rows and an empty Sheet1 are present.
- Saved example allocates four £75 entries to a £300 pool: £100 overall (£75/£25), and ten £20 period pots (£15/£5).
- Local static page successfully loaded the saved tracker from the configured deployed Apps Script service. No warning/error console entries were observed in that check. This does not establish full equivalence between deployed backend and supplied scripts.
- Desktop setup screenshot and 390-pixel phone tracker preview were inspected. Overall points are hidden on phone-sized screens by styles.css.
- No production creation, data mutation or deployment was performed during this assessment.

## Findings to address

### First: correctness and visible faults

1. `app.js` disables Create tracker after success but resetSetupForNewTracker() never restores its enabled state or label. A local DOM-stub check confirmed the button remains disabled and says Creating tracker after resetting.
2. Prize recalculation retains the prior active configuration while input changes or requests are in flight. Creation can submit the previous fee. Requests have no ordering guard, so late responses can overwrite newer selections. Invalidate the old preview immediately, block creation until current calculation completes, and ignore stale responses across lookup, recalculation and navigation.
3. Failed individual FPL responses are tolerated, but standings can silently omit managers or count incomplete history. dataAvailable is returned but not surfaced by the website. Never present incomplete data as an authoritative final table or payout. Preserve known data, show missing coverage, and gate finalisation on complete expected results.
4. allocatePrizeSplits_ returns fractional pennies. A three-way tie sharing £20 yields £6.666666... each; displaying £6.67 three times totals £20.01. Agree and implement a deterministic penny-remainder policy.
5. At widths below 580px, styles.css hides .manager-points, including overall standings totals. Keep these core scores visible.
6. In the browser check, GW3 scores were labelled Upcoming because status was derived from the next gameweek. Separate completed scores, current competition and next deadline labels.
7. Gameweek ranking uses row index, so equal points receive different places. Decide whether weekly display should follow the tied-place convention used for periods.

### Next: complete the competition lifecycle

- Gameweek Results has headers but no persistence writer in the supplied scripts. Add repeatable storage keyed by season, tracker, manager and gameweek, with controlled corrections.
- There is no previous-period result view, winners history or cumulative winnings ledger. Current period selection advances to the next period as the boundary passes, leaving no results view for the period just completed.
- Finalisation currently uses event finished/status logic and does not check result coverage. Verify the appropriate FPL finality signals before recording final awards.
- Add season identity, stored rule/configuration version and an explicit participant/start-gameweek policy. Existing trackers are reconstructed using current default periods, so later global rule changes could affect old trackers.
- Decide how to handle late starters and league members joining/leaving. Current code freezes the participant list and allocates all ten season periods even for trackers created later.

### Before broader public use

- Add proportionate creation controls and usage limits. A public GET currently writes a tracker and is callable without an owner identity. Design a protected creation operation, while keeping shared viewing simple.
- Handle partial storage writes: league row is appended before manager rows; a failure can leave an incomplete tracker that duplicate detection subsequently reuses.
- Add stale-data fallback, refresh timeout/retry handling, and protection against concurrent cache misses duplicating FPL work.
- Expand request validation for optional paid-place counts, ratios and invalid inputs.
- Keep all backend source in GitHub alongside the frontend; store operational identifiers in configuration where appropriate and exclude live workbook data from routine source publishing.
- Document and verify deployment settings, live site URL and rollback. These are not recorded in the current repository.

## Recommended next moves

1. Establish the complete source handover: bring backend scripts under a clear Apps Script source folder, add a combined local test runner and deployment notes, then sync this context and plan to GitHub.
2. Fix the creation/reset and stale-request issues, missing-data handling, penny reconciliation, mobile scores and gameweek labels. Add focused regression tests for those behaviours.
3. Complete saved gameweeks, finalisation, previous periods and total winnings. Resolve season/start/participant rules before implementing persistence.
4. Improve onboarding: explain where to find the league ID, accept a pasted league URL, add a demo, put useful scores nearer the top on phones, and make the prize rules easy to find.
5. Pilot with a few small leagues. Validate league creation and sharing, transfer hits, ties, a period boundary, FPL outages and repeated creation. Add protections and observe performance before widening access.

Retain the existing static-site and Apps Script structure for the next iteration. This is a proposed scope choice based on the existing small-league design, not a claim that production capacity has been measured. Reassess the backend only if pilot evidence shows it is needed.

## Local setup and deployment status

Serve this folder with a static HTTP server, for example `python -m http.server 8765 --bind 127.0.0.1`, then visit http://127.0.0.1:8765. There is no dependency installation or build step. The configured API points to the existing deployed service, so local creation would write to that service.

For isolated frontend testing, provide a test API or fixtures. Pure competition tests can run in Node by loading app_config, competition_engine, competition_config and tests into one shared VM context, then invoking both test runners. Apps Script services require mocks or an isolated Apps Script test deployment.

Expected backend setup, inferred from code: copy the supplied .txt script contents into corresponding .gs files in one Apps Script project, configure the spreadsheet, run initialiseBarucStorage() for a new test spreadsheet, and deploy a web app. Verify the existing project's actual permissions and deployment process before changing production. A local .xlsx edit does not update live Sheets, and changing a .txt script does not update the deployed API.

The local files were downloaded through the GitHub connector because bundled Git could not find its HTTPS helper. This folder is a source snapshot, not a verified Git clone; do not assume pull/push tracking exists. GitHub contained only README.md, index.html, app.js, config.js and styles.css when checked earlier in this conversation. This document is the initial GitHub handover. The backend scripts and workbook remain local and are not included in this documentation commit.

## Handover maintenance

Record important accepted decisions, completed changes, test evidence and outstanding work here. Distinguish local changes from deployed changes. Before working from another computer, sync the source and context and check for concurrent work.
