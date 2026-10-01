# TotalEdge

TotalEdge is a browser-based NFL totals analysis app built with Vite and TypeScript.

## Features

- Drag-and-drop CSV upload for historical NFL game data
- Direct import from a public Google Sheets scores URL
- Shared historical-game persistence through the configured npoint bin, with local browser fallback
- Positional CSV mapping for duplicate source headers
- Class-based models/services (`NFLGame`, `CsvImporter`, `Prediction`, `PredictionEngine`)
- Imported week and game-count summary
- Game table with actual total, sportsbook line availability, difference, and result (OVER/UNDER/PUSH)
- Midpoint settings backtest ranked by historical accuracy when the CSV includes a `Total Line` column
- Baseline prediction output area for future totals model expansion

## Requirements

- Node.js 20.19.0 or newer
- npm 10+

This project uses Vite 8, which requires a modern Node.js runtime. If you run an older Node release, the app may fail before startup with a confusing Rolldown error.

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Then open the local URL shown by Vite (usually `http://localhost:5173`).

## Backtest historical settings

Upload a CSV containing the game scores and closing totals. The app evaluates midpoint settings from 38 through 52, ranks them by win percentage, and keeps pushes separate from accuracy. Games without a `Total Line` are still displayed but are excluded from the backtest.

The Google Sheets importer uses the sheet's public CSV export. Paste a sheet URL into the Google Sheets scores field and click `Import Google Sheet`. The sheet must be shared so anyone with the link can view it. The supplied scoreboard format is supported, including metadata rows before the `Date` header and `Away`/`Home` score columns.

Historical games are merged into the npoint bin configured by `VITE_NPOINT_API_URL`. The app keeps a local cache and synchronizes through the same-origin `/api/npoint` proxy, so the browser does not need direct CORS access to npoint. Existing bin fields are preserved when historical games are written.

Npoint updates use `POST` and may require an API token. If the bin is protected, add `VITE_NPOINT_API_AUTH_TOKEN` to the local environment and configure the same value as a deployment secret; never commit the token.

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```
