import './style.css';
import { NFLGame } from './models/NFLGame';
import { Prediction } from './models/Prediction';
import { CsvImporter } from './services/CsvImporter';
import { PredictionEngine } from './services/PredictionEngine';

class TotalEdgeApp {
  private readonly importer = new CsvImporter();
  private readonly predictionEngine = new PredictionEngine();
  private games: NFLGame[] = [];

  private readonly appRoot: HTMLDivElement;
  private readonly fileInput: HTMLInputElement;
  private readonly dropZone: HTMLLabelElement;
  private readonly weekValue: HTMLSpanElement;
  private readonly gameCountValue: HTMLSpanElement;
  private readonly tableBody: HTMLTableSectionElement;
  private readonly generateButton: HTMLButtonElement;
  private readonly predictionList: HTMLUListElement;

  constructor() {
    this.appRoot = document.querySelector<HTMLDivElement>('#app')!;
    this.appRoot.innerHTML = this.getLayout();

    this.fileInput = document.querySelector<HTMLInputElement>('#csv-file-input')!;
    this.dropZone = document.querySelector<HTMLLabelElement>('#drop-zone')!;
    this.weekValue = document.querySelector<HTMLSpanElement>('#week-value')!;
    this.gameCountValue = document.querySelector<HTMLSpanElement>('#game-count-value')!;
    this.tableBody = document.querySelector<HTMLTableSectionElement>('#games-table-body')!;
    this.generateButton = document.querySelector<HTMLButtonElement>('#generate-button')!;
    this.predictionList = document.querySelector<HTMLUListElement>('#prediction-list')!;

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

    this.generateButton.addEventListener('click', () => {
      this.renderPredictions(this.predictionEngine.generatePredictions(this.games));
    });
  }

  private async importFile(file: File): Promise<void> {
    const contents = await file.text();
    this.games = this.importer.importFromText(contents);

    this.renderGames();
    this.predictionList.innerHTML = '';
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
          <h2>CSV Upload</h2>
          <label id="drop-zone" for="csv-file-input" class="drop-zone">
            <span>Drag and drop CSV here or click to upload</span>
            <input id="csv-file-input" type="file" accept=".csv,text/csv" />
          </label>
        </section>

        <section class="panel summary-grid">
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

        <section class="panel">
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
