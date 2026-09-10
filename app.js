import { initTokenClient, signIn, loadOrCreateData, saveData, getFileId } from "./drive.js";
import { state, setData } from "./state.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderDiario } from "./views/diario.js";
import { renderPresupuesto } from "./views/presupuesto.js";
import { renderTotal } from "./views/total.js";
import { renderGraficas } from "./views/graficas.js";
import { renderConfig } from "./views/config.js";

const els = {
  signedOut: document.getElementById("signedOutView"),
  appView: document.getElementById("appView"),
  tabs: document.getElementById("tabs"),
  syncStatus: document.getElementById("syncStatus"),
  signInBtn: document.getElementById("signInBtn"),
  signInError: document.getElementById("signInError"),
};

let currentView = "dashboard";
let saveTimer = null;
let lastSavedLabel = null;

async function boot() {
  try {
    await initTokenClient();
  } catch (err) {
    showSignInError("No se pudo inicializar Google Identity Services. Revisa tu conexión e inténtalo de nuevo.");
    console.error(err);
  }
  els.signInBtn.addEventListener("click", handleSignIn);
}

async function handleSignIn() {
  els.signInBtn.disabled = true;
  els.signInBtn.textContent = "Conectando...";
  hideSignInError();
  try {
    await signIn();
    const seedResp = await fetch("./seed-data.json").then((r) => r.json());
    const { data, created } = await loadOrCreateData(seedResp);
    setData(data);
    showApp();
    if (created) {
      setSyncStatus("saved", "Archivo creado en Drive");
    } else {
      setSyncStatus("saved", "Sincronizado");
    }
    switchView("dashboard");
  } catch (err) {
    console.error(err);
    showSignInError("No se pudo conectar con Google. " + (err?.message || ""));
  } finally {
    els.signInBtn.disabled = false;
    els.signInBtn.textContent = "Conectar con Google Drive";
  }
}

function showSignInError(msg) {
  els.signInError.textContent = msg;
  els.signInError.hidden = false;
}
function hideSignInError() {
  els.signInError.hidden = true;
}

function showApp() {
  els.signedOut.hidden = true;
  els.appView.hidden = false;
  els.tabs.hidden = false;
  els.syncStatus.hidden = false;
  els.tabs.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  currentView = view;
  els.tabs.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  document.querySelectorAll("#appView .view").forEach((sec) => (sec.hidden = sec.id !== `view-${view}`));
  renderCurrentView();
}

async function reloadFromSeed() {
  const seed = await fetch("./seed-data.json?_=" + Date.now()).then((r) => r.json());
  seed.meta.lastUpdated = new Date().toISOString();
  setData(seed);
  await saveData(seed);
  lastSavedLabel = new Date().toLocaleTimeString("es-CO");
  setSyncStatus("saved", "Reiniciado " + lastSavedLabel);
  switchView("dashboard");
}

function renderCurrentView() {
  const container = document.getElementById(`view-${currentView}`);
  const ctx = { markDirty, onSignOut: handleSignOut, lastSaved: lastSavedLabel, onReloadFromSeed: reloadFromSeed };
  if (currentView === "dashboard") renderDashboard(container, ctx);
  else if (currentView === "diario") renderDiario(container, ctx);
  else if (currentView === "presupuesto") renderPresupuesto(container, ctx);
  else if (currentView === "total") renderTotal(container, ctx);
  else if (currentView === "graficas") renderGraficas(container, ctx);
  else if (currentView === "config") renderConfig(container, ctx);
}

function handleSignOut() {
  els.appView.hidden = true;
  els.tabs.hidden = true;
  els.syncStatus.hidden = true;
  els.signedOut.hidden = false;
}

function markDirty() {
  setSyncStatus("saving", "Guardando...");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 1200);
}

async function doSave() {
  try {
    state.data.meta.lastUpdated = new Date().toISOString();
    await saveData(state.data);
    lastSavedLabel = new Date().toLocaleTimeString("es-CO");
    setSyncStatus("saved", "Guardado " + lastSavedLabel);
  } catch (err) {
    console.error(err);
    setSyncStatus("error", "Error al guardar. Reintentando...");
    saveTimer = setTimeout(doSave, 4000);
  }
}

const SYNC_STATUS_BASE = "text-xs whitespace-nowrap";
const SYNC_STATUS_COLOR = {
  saving: "text-amber-400",
  saved: "text-emerald-400",
  error: "text-red-400",
};
function setSyncStatus(kind, text) {
  els.syncStatus.className = `${SYNC_STATUS_BASE} ${SYNC_STATUS_COLOR[kind] || "text-slate-400"}`;
  els.syncStatus.textContent = text;
}

boot();
