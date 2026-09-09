# Baruc-App
FPL mini-league competition tracker for money, fun, or both.

Open the homepage to find a classic FPL league, choose cash entrants and optional forfeits, then review a suggested or custom prize plan. Creation locks the rules; share the viewer link and keep the organiser code private.

Entry presets: £5, £10, £25, £50, £75, custom. Prizes support overall places, recurring periods, both, or winner takes all. “Monthly” means four-gameweek periods plus the final two-gameweek sprint.

Static HTML/CSS/JavaScript; no build step. Serve this directory with a local web server for browser testing. config.js identifies the Apps Script deployment. Tracker URLs use ?league=<tracker-key>.

The guided setup requires backend setupRulesVersion 1 (source version 0.9.0). This backend batch is awaiting the planned Apps Script sync. Existing tracker links remain readable against the older deployment; new setup explains when the update is needed.
