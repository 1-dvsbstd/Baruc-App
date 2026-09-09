# Baruc-App

Paid FPL mini-league tracker. Find a league, choose an entry fee from £5 in £5 increments, then choose one overall winner or Manager of the Month plus overall. Completed setup steps collapse into editable summaries.

All entrants start at zero in GW1 before the season, or the next gameweek for a later creation. Manager of the Month uses four-gameweek periods plus a two-gameweek Final Sprint. Awards use £5 increments; tied winners share prizes equally.

Static HTML/CSS/JavaScript; no build. Serve this directory locally for testing. config.js identifies the Apps Script deployment; viewer links use ?league=<tracker-key>. Keep the private organiser code separate from viewer links.

New setup requires backend source 0.10.0 / setupRulesVersion 2. Apps Script sync is still pending. Existing tracker reads remain supported; new creation explains when the backend update is required.
