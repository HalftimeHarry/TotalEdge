import './style.css';
import { NFLGame } from './models/NFLGame';
import { Prediction } from './models/Prediction';
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
  private readonly midpointSelect: HTMLSelectElement;
  private readonly lineTextArea: HTMLTextAreaElement;
  private readonly parseLineButton: HTMLButtonElement;
  private readonly lineStatus: HTMLParagraphElement;
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
    this.weekFilter = document.querySelector<HTMLSelectElement>('#week-filter')!;
    this.lineWeekSelect = document.querySelector<HTMLSelectElement>('#line-week-select')!;
    this.midpointSelect = document.querySelector<HTMLSelectElement>('#midpoint-select')!;
    this.lineTextArea = document.querySelector<HTMLTextAreaElement>('#line-text-input')!;
    this.parseLineButton = document.querySelector<HTMLButtonElement>('#parse-line-button')!;
    this.lineStatus = document.querySelector<HTMLParagraphElement>('#line-status')!;
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

    this.weekFilter.addEventListener('change', () => {
      this.applyWeekFilter();
    });

    this.midpointSelect.addEventListener('change', () => {
      const rawValue = this.lineTextArea.value.trim();
      if (!rawValue) {
        return;
      }

      const week = this.lineWeekSelect.value;
      const lines = this.lineService.importFromText(rawValue);
      if (lines.length) {
        this.renderLinePreview(lines, week);
      }
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

    const midpoint = Number(this.midpointSelect.value);
    const sortedLines = [...lines].sort((a, b) => {
      const detailsA = PredictionEngine.getTotalPickDetails(a.total ?? null, a.teamName, midpoint);
      const detailsB = PredictionEngine.getTotalPickDetails(b.total ?? null, b.teamName, midpoint);

      const strengthRank = { Strong: 3, Moderate: 2, Weak: 1 } as const;
      const strengthDelta = (strengthRank[detailsB.strength] ?? 0) - (strengthRank[detailsA.strength] ?? 0);

      if (strengthDelta !== 0) {
        return strengthDelta;
      }

      return detailsB.rating - detailsA.rating;
    });

    for (const line of sortedLines) {
      const total = line.total ?? null;
      const pickInfo = PredictionEngine.getTotalPickDetails(total, line.teamName, midpoint);
      const pickLabel = `${pickInfo.strength} ${pickInfo.pick}`;

      const listItem = document.createElement('li');
      listItem.className = `pick-pill ${pickInfo.pick.toLowerCase()} ${pickInfo.strength.toLowerCase()}`;

      const summary = document.createElement('p');
      summary.textContent = `${line.date} • ${line.teamName} • ${pickLabel} • Total ${line.total ?? 'N/A'} • ${pickInfo.rating}/10`;
      summary.title = pickInfo.reason;

      const details = document.createElement('p');
      details.className = 'muted';
      details.textContent = pickInfo.reason;

      const halftimeCard = document.createElement('div');
      halftimeCard.className = 'halftime-card';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'halftime-card__header';

      const cardLabel = document.createElement('span');
      cardLabel.className = 'halftime-card__label';
      cardLabel.textContent = 'Halftime Recommendation';

      const cardBadge = document.createElement('span');
      cardBadge.className = 'halftime-card__badge';
      cardBadge.textContent = 'WAITING';

      cardHeader.append(cardLabel, cardBadge);

      const fieldGrid = document.createElement('div');
      fieldGrid.className = 'halftime-card__field-grid';

      const totalField = document.createElement('label');
      totalField.className = 'halftime-card__field';
      totalField.innerHTML = '<span>Projected Total</span><input type="number" min="0" step="0.5" value="' + (total ?? 0) + '" aria-label="Projected total" />';

      const halftimeField = document.createElement('label');
      halftimeField.className = 'halftime-card__field';
      halftimeField.innerHTML = '<span>Halftime score</span><input type="number" min="0" step="0.5" value="' + (total === null ? 0 : Math.max(0, total / 2)) + '" aria-label="Halftime score" />';

      const secondHalfField = document.createElement('label');
      secondHalfField.className = 'halftime-card__field';
      const defaultSecondHalf = total === null ? 0 : Math.max(0, total / 2);
      secondHalfField.innerHTML = '<span>Projected 2H total</span><input type="number" min="0" step="0.5" value="' + defaultSecondHalf + '" aria-label="Second-half total projection" />';

      const secondHalfLineField = document.createElement('label');
      secondHalfLineField.className = 'halftime-card__field';
      secondHalfLineField.innerHTML = '<span>Sportsbook 2H line</span><input type="number" min="0" step="0.5" placeholder="18.5" aria-label="Sportsbook second-half total line" />';

      const juiceField = document.createElement('label');
      juiceField.className = 'halftime-card__field';
      juiceField.innerHTML = '<span>Juice</span><select aria-label="Juice odds"><option value="-105">-105</option><option value="-110" selected>-110</option><option value="-115">-115</option><option value="-120">-120</option><option value="-125">-125</option><option value="+100">+100</option><option value="+110">+110</option><option value="+120">+120</option><option value="+130">+130</option></select>';

      fieldGrid.append(totalField, halftimeField, secondHalfField, secondHalfLineField, juiceField);

      const cardMeta = document.createElement('p');
      cardMeta.className = 'halftime-card__meta';
      cardMeta.textContent = 'UNDER hedge • 0% of stake';

      const cardSummary = document.createElement('p');
      cardSummary.className = 'halftime-card__summary';
      cardSummary.textContent = 'Start with the projected total. At halftime, use the live score and juice to chase Seeking Butter Zone.';

      const refreshHalftimeCard = (): void => {
        const totalValue = Number((totalField.querySelector('input') as HTMLInputElement).value || total || 0);
        const halftimeScore = Number((halftimeField.querySelector('input') as HTMLInputElement).value || Math.max(0, totalValue / 2));
        const secondHalfProjection = Number((secondHalfField.querySelector('input') as HTMLInputElement).value || Math.max(0, totalValue / 2));
        const secondHalfLineValue = (secondHalfLineField.querySelector('input') as HTMLInputElement).value;
        const sportsbookSecondHalfLine = secondHalfLineValue === '' ? null : Number(secondHalfLineValue);
        const juiceValue = (juiceField.querySelector('select') as HTMLSelectElement).value || '-110';

        const plan = total === null
          ? null
          : PredictionEngine.getLiveHalftimeSummary({
            totalLine: totalValue,
            halftimeScore,
            secondHalfProjection,
            originalSide: pickInfo.pick,
            stake: 100,
            midpoint,
            juice: juiceValue,
            sportsbookSecondHalfLine,
          });

        if (!plan) {
          cardBadge.textContent = 'NO DATA';
          cardBadge.className = 'halftime-card__badge neutral';
          cardMeta.textContent = 'Need a total line to calculate a halftime hedge.';
          cardSummary.textContent = 'No halftime recommendation available for this pick.';
          return;
        }

        const juiceLabel = plan.juice > 0 ? `+${plan.juice}` : `${plan.juice}`;
        const displayResult = plan.result === 'BUTTER_ZONE'
          ? '🧈 BUTTER ZONE'
          : plan.result === 'WAITING_FOR_LINE'
            ? 'WAITING FOR 2H LINE'
            : 'Do Not Bet';
        cardBadge.textContent = displayResult;
        cardBadge.className = `halftime-card__badge ${plan.result.toLowerCase().replace(/_/g, '-')}`;
        const hedgeText = plan.result === 'WAITING_FOR_LINE'
          ? 'WAITING FOR 2H LINE'
          : plan.result === 'BROWN_ZONE'
            ? 'DO NOT BET — HOLD ORIGINAL POSITION'
            : `${plan.hedgeSide} hedge • ${Math.round(plan.hedgePercent * 100)}% of stake • juice ${juiceLabel}`;
        cardMeta.textContent = hedgeText;
        cardSummary.textContent = plan.summary;
      };

      totalField.querySelector('input')?.addEventListener('input', () => {
        const totalInput = totalField.querySelector('input') as HTMLInputElement;
        if (!totalInput.value) {
          return;
        }
        refreshHalftimeCard();
      });
      halftimeField.querySelector('input')?.addEventListener('input', refreshHalftimeCard);
      secondHalfField.querySelector('input')?.addEventListener('input', refreshHalftimeCard);
      secondHalfLineField.querySelector('input')?.addEventListener('input', refreshHalftimeCard);
      (juiceField.querySelector('select') as HTMLSelectElement)?.addEventListener('change', refreshHalftimeCard);
      refreshHalftimeCard();

      halftimeCard.append(cardHeader, fieldGrid, cardMeta, cardSummary);
      listItem.append(summary, details, halftimeCard);
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
        <header class="app-header">
          <img src="/logo.svg" alt="TotalEdge logo" class="app-logo" />
          <div>
            <h1>TotalEdge</h1>
            <p>NFL Totals Analysis</p>
          </div>
        </header>

        <section class="panel">
          <h2>CSV Upload / Line Paste</h2>

          <div class="upload-controls">
            <label class="field-label" for="midpoint-select">Totals midpoint</label>
            <select id="midpoint-select">
              ${Array.from({ length: 15 }, (_, index) => {
                const value = 38 + index;
                return `<option value="${value}" ${value === 45 ? 'selected' : ''}>${value}</option>`;
              }).join('')}
            </select>
            <small class="field-hint">Example: a dome or warm, calm game usually supports a lower midpoint like 42–44 because scoring is easier, while a cold, windy outdoor game usually supports a higher midpoint like 46–48 because the weather can suppress scoring. Lower values lean more Over; higher values lean more Under.</small>
          </div>

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
