import { state, monthsWithData, currentMonth, savingsSeries, txBase, currency } from "../state.js";
import { cx } from "../ui.js";

// Colors come from the CSS tokens so the charts follow the light/dark theme.
const token = (name) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).join(",")})`;
const tokenAlpha = (name, a) => token(name).replace("rgb(", "rgba(").replace(")", `,${a})`);

let selectedMonth = null;
let chartCategoria = null;
let chartAhorro = null;

export function renderGraficas(container) {
  const months = monthsWithData();
  if (!selectedMonth) selectedMonth = months.length ? months[months.length - 1] : currentMonth();

  container.innerHTML = `
    <div class="mb-6">
      <input type="month" id="chartMonthPicker" aria-label="Mes" class="${cx.input} w-full sm:w-auto" value="${selectedMonth}" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div class="chart-card">
        <div class="${cx.sectionTitle} ">Gasto por categoría, ${selectedMonth}</div>
        <canvas id="chartCategoria" height="260" role="img"></canvas>
      </div>
      <div class="chart-card">
        <div class="${cx.sectionTitle} mt-0">Evolución del ahorro</div>
        <canvas id="chartAhorro" height="260" role="img"></canvas>
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
        .reduce((s, t) => s + txBase(t), 0)
    )
  );

  if (chartCategoria) chartCategoria.destroy();
  const ctx = document.getElementById("chartCategoria");
  ctx.setAttribute("aria-label", `Gasto por categoría en ${month}: ` + (categories.map((c, i) => (values[i] ? `${c.name} ${currency(values[i])}` : null)).filter(Boolean).join(", ") || "sin gastos"));
  chartCategoria = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories.map((c) => c.name),
      datasets: [
        {
          data: values,
          backgroundColor: token("--accent"),
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: token("--mute") } },
        y: { grid: { color: token("--line") }, ticks: { color: token("--mute"), callback: (v) => formatCompact(v) } },
      },
    },
  });
}

function drawAhorroChart() {
  const series = savingsSeries();

  if (chartAhorro) chartAhorro.destroy();
  const ctx = document.getElementById("chartAhorro");
  ctx.setAttribute("aria-label", "Evolución del ahorro: " + (series.length ? `de ${currency(series[0].cumulative)} en ${series[0].month} a ${currency(series.at(-1).cumulative)} en ${series.at(-1).month}` : "sin datos"));
  chartAhorro = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map((p) => p.month),
      datasets: [
        {
          data: series.map((p) => p.cumulative),
          borderColor: token("--accent"),
          backgroundColor: tokenAlpha("--accent", 0.12),
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: token("--accent"),
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: token("--mute") } },
        y: { grid: { color: token("--line") }, ticks: { color: token("--mute"), callback: (v) => formatCompact(v) } },
      },
    },
  });
}

function formatCompact(v) {
  return new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
