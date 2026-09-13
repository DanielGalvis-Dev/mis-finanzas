import { state, monthsWithData, currentMonth, savingsSeries } from "../state.js";
import { cx } from "../ui.js";

const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const INK_SECONDARY = "#c3c2b7";
const GRID = "#2c2c2a";

let selectedMonth = null;
let chartCategoria = null;
let chartAhorro = null;

export function renderGraficas(container) {
  const months = monthsWithData();
  if (!selectedMonth) selectedMonth = months.length ? months[months.length - 1] : currentMonth();

  container.innerHTML = `
    <div class="flex gap-2.5 items-center flex-wrap mb-3.5">
      <input type="month" id="chartMonthPicker" class="${cx.input} w-auto" value="${selectedMonth}" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="${cx.card} chart-card">
        <div class="${cx.sectionTitle} mt-0">Gasto por categoría — ${selectedMonth}</div>
        <canvas id="chartCategoria" height="260"></canvas>
      </div>
      <div class="${cx.card} chart-card">
        <div class="${cx.sectionTitle} mt-0">Evolución del ahorro</div>
        <canvas id="chartAhorro" height="260"></canvas>
      </div>
    </div>
  `;

  container.querySelector("#chartMonthPicker").addEventListener("change", (e) => {
    selectedMonth = e.target.value;
    renderGraficas(container);
  });

  drawCategoriaChart(selectedMonth);
  drawAhorroChart();
}

function drawCategoriaChart(month) {
  const categories = state.data.categories.filter((c) => c.kind !== "Entrada");
  const values = categories.map((cat) =>
    Math.abs(
      state.data.transactions
        .filter((t) => t.categoryId === cat.id && t.date.slice(0, 7) === month && t.amount < 0 && !t.excludeFromCategoryTotals)
        .reduce((s, t) => s + t.amount, 0)
    )
  );

  if (chartCategoria) chartCategoria.destroy();
  const ctx = document.getElementById("chartCategoria");
  chartCategoria = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories.map((c) => c.name),
      datasets: [
        {
          data: values,
          backgroundColor: categories.map((_, i) => PALETTE[i % PALETTE.length]),
          borderRadius: 4,
          maxBarThickness: 36,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: INK_SECONDARY } },
        y: { grid: { color: GRID }, ticks: { color: INK_SECONDARY, callback: (v) => formatCompact(v) } },
      },
    },
  });
}

function drawAhorroChart() {
  const series = savingsSeries();

  if (chartAhorro) chartAhorro.destroy();
  const ctx = document.getElementById("chartAhorro");
  chartAhorro = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map((p) => p.month),
      datasets: [
        {
          data: series.map((p) => p.cumulative),
          borderColor: PALETTE[2],
          backgroundColor: PALETTE[2] + "33",
          fill: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: PALETTE[2],
          borderWidth: 2,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: INK_SECONDARY } },
        y: { grid: { color: GRID }, ticks: { color: INK_SECONDARY, callback: (v) => formatCompact(v) } },
      },
    },
  });
}

function formatCompact(v) {
  return new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
