import './style.css';
import { NFLGame } from './models/NFLGame';
import { Prediction } from './models/Prediction';
import { TEAM_NAMES } from './models/TeamRegistry';
import { CsvImporter } from './services/CsvImporter';
import { LineService } from './services/LineService';
import { PredictionEngine } from './services/PredictionEngine';

class TotalEdgeApp {
  private readonly importer = new CsvImporter();
  private readonly lineService = new LineService();
  private readonly predictionEngine = new PredictionEngine();
  private importedGames: NFLGame[] = [];
  private games: NFLGame[] = [];

  private readonly appRoot: HTMLDivElement;
  private readonly fileInput: HTMLInputElement;
  private readonly dropZone: HTMLLabelElement;
  private readonly weekFilter: HTMLSelectElement;
  private readonly lineWeekSelect: HTMLSelectElement;
  private readonly lineTextArea: HTMLTextAreaElement;
  private readonly parseLineButton: HTMLButtonElement;
  private readonly lineStatus: HTMLParagraphElement;
  private readonly weekValue: HTMLSpanElement;
  private readonly gameCountValue: HTMLSpanElement;
  private readonly tableBody: HTMLTableSectionElement;
  private readonly generateButton: HTMLButtonElement;
  private readonly predictionList: HTMLUListElement;
  private readonly teamList: HTMLUListElement;

  constructor() {
    this.appRoot = document.querySelector<HTMLDivElement>('#app')!;
    this.appRoot.innerHTML = this.getLayout();

    this.fileInput = document.querySelector<HTMLInputElement>('#csv-file-input')!;
    this.dropZone = document.querySelector<HTMLLabelElement>('#drop-zone')!;
    this.weekFilter = document.querySelector<HTMLSelectElement>('#week-filter')!;
    this.lineWeekSelect = document.querySelector<HTMLSelectElement>('#line-week-select')!;
    this.lineTextArea = document.querySelector<HTMLTextAreaElement>('#line-text-input')!;
    this.parseLineButton = document.querySelector<HTMLButtonElement>('#parse-line-button')!;
    this.lineStatus = document.querySelector<HTMLParagraphElement>('#line-status')!;
    this.weekValue = document.querySelector<HTMLSpanElement>('#week-value')!;
    this.gameCountValue = document.querySelector<HTMLSpanElement>('#game-count-value')!;
    this.tableBody = document.querySelector<HTMLTableSectionElement>('#games-table-body')!;
    this.generateButton = document.querySelector<HTMLButtonElement>('#generate-button')!;
    this.predictionList = document.querySelector<HTMLUListElement>('#prediction-list')!;
    this.teamList = document.querySelector<HTMLUListElement>('#team-list')!;

    this.renderTeams();
    this.bindEvents();
    this.renderGames();
  }

  private bindEvents(): void {
    this.fileInput.addEventListener('change', async (event) => {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      await this.importFile(file);
      this.fileInput.value = '';
    });

    this.dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dropZone.classList.add('active');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('active');
    });

    this.dropZone.addEventListener('drop', async (event) => {
      event.preventDefault();
      this.dropZone.classList.remove('active');

      const file = event.dataTransfer?.files?.[0];

      if (!file) {
        return;
      }

      await this.importFile(file);
    });

    this.weekFilter.addEventListener('change', () => {
      this.applyWeekFilter();
    });

    this.parseLineButton.addEventListener('click', () => {
      const rawValue = this.lineTextArea.value.trim();

      if (!rawValue) {
        this.lineStatus.textContent = 'Paste sportsbook line data before parsing.';
        this.lineStatus.classList.add('error');
        this.predictionList.innerHTML = '';
        return;
      }

      const week = this.lineWeekSelect.value;
      const lines = this.lineService.importFromText(rawValue);

      if (!lines.length) {
        this.lineStatus.textContent = 'No valid line data found. Check the raw sportsbook text or paste a full block from the site.';
        this.lineStatus.classList.add('error');
        this.predictionList.innerHTML = '';
        return;
      }

      this.lineStatus.textContent = `Parsed ${lines.length} matchup rows for Week ${week}.`;
      this.lineStatus.classList.remove('error');
      this.renderLinePreview(lines, week);
    });

    this.generateButton.addEventListener('click', () => {
      this.renderPredictions(this.predictionEngine.generatePredictions(this.games));
    });
  }

  private async importFile(file: File): Promise<void> {
    const contents = await file.text();
    const selectedWeek = this.weekFilter.value === 'all' ? undefined : this.weekFilter.value;
    this.importedGames = this.importer.importFromText(contents, selectedWeek);
    this.populateWeekOptions(contents);
    this.applyWeekFilter();
    this.predictionList.innerHTML = '';
  }

  private populateWeekOptions(csvText: string): void {
    const availableWeeks = this.importer.getAvailableWeeks(csvText);

    this.weekFilter.innerHTML = '<option value="all">All weeks</option>' + availableWeeks.map((week) => `<option value="${week}">${week}</option>`).join('');

    if (availableWeeks.length === 1) {
      this.weekFilter.value = availableWeeks[0];
    } else {
      this.weekFilter.value = 'all';
    }
  }

  private applyWeekFilter(): void {
    const selectedWeek = this.weekFilter.value;

    if (!this.importedGames.length) {
      this.games = [];
      this.renderGames();
      return;
    }

    this.games = selectedWeek === 'all'
      ? [...this.importedGames]
      : this.importedGames.filter((game) => game.week === selectedWeek);

    this.renderGames();
  }

  private renderGames(): void {
    this.tableBody.innerHTML = '';

    this.gameCountValue.textContent = String(this.games.length);
    this.weekValue.textContent = this.getWeekLabel();
    this.generateButton.disabled = this.games.length === 0;

    for (const game of this.games) {
      const row = document.createElement('tr');
      this.appendCell(row, game.week);
      this.appendCell(row, game.date);
      this.appendCell(row, game.getMatchup());
      this.appendCell(row, String(game.getTotalScore()));
      this.appendCell(row, game.totalLine === null ? 'Unavailable' : String(game.totalLine));

      const difference = game.getDifference();
      this.appendCell(row, difference === null ? 'N/A' : difference.toFixed(1));

      const result = game.getResult();
      this.appendCell(row, result === 'NO_LINE' ? 'N/A' : result);

      this.tableBody.appendChild(row);
    }
  }

  private renderPredictions(predictions: Prediction[]): void {
    this.predictionList.innerHTML = '';

    for (const prediction of predictions) {
      const listItem = document.createElement('li');

      const title = document.createElement('h3');
      title.textContent = prediction.game.getMatchup();

      const recommendation = document.createElement('p');
      recommendation.textContent = prediction.recommendation;

      const rationale = document.createElement('p');
      rationale.className = 'muted';
      rationale.textContent = prediction.rationale;

      listItem.append(title, recommendation, rationale);
      this.predictionList.appendChild(listItem);
    }
  }

  private renderLinePreview(lines: ReturnType<LineService['importFromText']>, week: string): void {
    this.predictionList.innerHTML = '';

    const previewText = `Week ${week} totals picks`;
    const heading = document.createElement('li');
    heading.innerHTML = `<h3>${previewText}</h3>`;
    this.predictionList.appendChild(heading);

    const sortedLines = [...lines].sort((a, b) => {
      const detailsA = PredictionEngine.getTotalPickDetails(a.total ?? null);
      const detailsB = PredictionEngine.getTotalPickDetails(b.total ?? null);

      const strengthRank = { Strong: 3, Moderate: 2, Weak: 1 } as const;
      const strengthDelta = (strengthRank[detailsB.strength] ?? 0) - (strengthRank[detailsA.strength] ?? 0);

      if (strengthDelta !== 0) {
        return strengthDelta;
      }

      return detailsB.rating - detailsA.rating;
    });

    for (const line of sortedLines) {
      const total = line.total ?? null;
      const pickInfo = PredictionEngine.getTotalPickDetails(total);
      const pickLabel = `${pickInfo.strength} ${pickInfo.pick}`;

      const listItem = document.createElement('li');
      listItem.className = `pick-pill ${pickInfo.pick.toLowerCase()} ${pickInfo.strength.toLowerCase()}`;

      const text = document.createElement('p');
      text.textContent = `${line.date} • ${line.teamName} • ${pickLabel} • Total ${line.total ?? 'N/A'} • ${pickInfo.rating}/10`;
      text.title = pickInfo.reason;
      listItem.appendChild(text);
      this.predictionList.appendChild(listItem);
    }
  }

  private renderTeams(): void {
    this.teamList.innerHTML = '';

    for (const team of TEAM_NAMES) {
      const listItem = document.createElement('li');
      listItem.textContent = team;
      this.teamList.appendChild(listItem);
    }
  }

  private appendCell(row: HTMLTableRowElement, value: string): void {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }

  private getWeekLabel(): string {
    if (this.games.length === 0) {
      return 'None';
    }

    const weeks = Array.from(new Set(this.games.map((game) => game.week)));
    return weeks.join(', ');
  }

  private getLayout(): string {
    return `
      <main class="dashboard">
        <header>
          <h1>TotalEdge</h1>
          <p>NFL Totals Analysis</p>
        </header>

        <section class="panel">
          <h2>CSV Upload / Line Paste</h2>

          <div class="upload-controls">
            <label class="field-label" for="line-week-select">Week</label>
            <select id="line-week-select">
              ${Array.from({ length: 18 }, (_, index) => `<option value="${index + 1}">Week ${index + 1}</option>`).join('')}
            </select>
          </div>

          <label class="field-label" for="line-text-input">Paste sportsbook line data</label>
          <textarea id="line-text-input" rows="7" placeholder="Paste raw sportsbook text here..."></textarea>
          <p id="line-status" class="line-status">Waiting for line data.</p>

          <div class="paste-actions">
            <button id="parse-line-button" type="button">Parse Lines</button>
          </div>

          <div class="upload-controls" style="display: none;">
            <label class="field-label" for="week-filter">Imported week filter</label>
            <select id="week-filter">
              <option value="all">All weeks</option>
            </select>
          </div>

          <label id="drop-zone" for="csv-file-input" class="drop-zone">
            <span>Drag and drop CSV here or click to upload</span>
            <input id="csv-file-input" type="file" accept=".csv,text/csv" />
          </label>
        </section>

        <section class="panel summary-grid" style="display: none;">
          <div>
            <h2>Imported Week(s)</h2>
            <p id="week-value">None</p>
          </div>
          <div>
            <h2>Games Imported</h2>
            <p id="game-count-value">0</p>
          </div>
          <div>
            <h2>Predictions</h2>
            <button id="generate-button" type="button" disabled>Generate Predictions</button>
          </div>
        </section>

        <section class="panel" style="display: none;">
          <h2>Teams</h2>
          <ul id="team-list" class="team-list"></ul>
        </section>

        <section class="panel" style="display: none;">
          <h2>Imported Games</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Date</th>
                  <th>Matchup</th>
                  <th>Actual Total</th>
                  <th>Total Line</th>
                  <th>Difference</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody id="games-table-body"></tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h2>Prediction Results</h2>
          <ul id="prediction-list" class="prediction-list"></ul>
        </section>
      </main>
    `;
  }
}

new TotalEdgeApp();
