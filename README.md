# TotalEdge

TotalEdge is a browser-based NFL totals analysis app built with Vite and TypeScript.

## Features

- Drag-and-drop CSV upload for historical NFL game data
- Positional CSV mapping for duplicate source headers
- Class-based models/services (`NFLGame`, `CsvImporter`, `Prediction`, `PredictionEngine`)
- Imported week and game-count summary
- Game table with actual total, sportsbook line availability, difference, and result (OVER/UNDER/PUSH)
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

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```
