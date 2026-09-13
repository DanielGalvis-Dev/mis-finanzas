import { GOOGLE_CLIENT_ID, DRIVE_SCOPE, DATA_FILE_NAME } from "./config.js";

let accessToken = null;
let tokenClient = null;
let fileId = null;

// Cache the token in this browser so a page reload/reopen doesn't need a fresh
// Google popup as long as the token is still valid (Google issues them for ~1h).
// This is the only "persistence" possible without a backend - Google only hands out
// a long-lived refresh token to server-side (authorization code) flows.
const TOKEN_STORAGE_KEY = "misFinanzasToken";
const EXPIRY_SAFETY_MARGIN_MS = 2 * 60 * 1000; // treat as expired 2 min early

function saveTokenToStorage(token, expiresInSeconds) {
  try {
    const expiresAt = Date.now() + Number(expiresInSeconds) * 1000;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) - not fatal, just no caching.
  }
}

function loadTokenFromStorage() {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (!token || Date.now() > expiresAt - EXPIRY_SAFETY_MARGIN_MS) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function clearTokenStorage() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Reuses a still-valid cached token, if any, without touching Google at all - no
// popup, no network call. Returns the token or null.
export function restoreSession() {
  const cached = loadTokenFromStorage();
  if (cached) accessToken = cached;
  return cached;
}

function waitForGis() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
      if (Date.now() - start > 10000) return reject(new Error("No se pudo cargar Google Identity Services."));
      setTimeout(check, 100);
    })();
  });
}

export async function initTokenClient() {
  await waitForGis();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: () => {},
  });
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Token client no inicializado."));
    tokenClient.callback = (resp) => {
      if (resp.error) return reject(resp);
      accessToken = resp.access_token;
      saveTokenToStorage(resp.access_token, resp.expires_in);
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// Tries to get a token without showing any UI - works when the browser still has an
// active Google session and the user already granted this app access before (e.g. on
// page reload). Resolves to null (never rejects) if it can't, so callers can fall back
// to the normal sign-in button without treating it as an error.
export function signInSilent() {
  return new Promise((resolve) => {
    if (!tokenClient) return resolve(null);
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 6000);
    tokenClient.callback = (resp) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (resp.error) {
        console.warn("[MisFinanzas] silent sign-in failed:", resp.error, resp);
        return resolve(null);
      }
      accessToken = resp.access_token;
      saveTokenToStorage(resp.access_token, resp.expires_in);
      resolve(accessToken);
    };
    try {
      tokenClient.requestAccessToken({ prompt: "" });
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  fileId = null;
  clearTokenStorage();
}

export function isSignedIn() {
  return !!accessToken;
}

async function driveFetch(url, options = {}, retried = false) {
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (resp.status === 401 && !retried) {
    // Access token expired mid-session - refresh it silently once and retry.
    const refreshed = await signInSilent();
    if (refreshed) return driveFetch(url, options, true);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Drive API ${resp.status}: ${text}`);
  }
  return resp;
}

async function findDataFile() {
  const q = encodeURIComponent(`name='${DATA_FILE_NAME}' and trashed=false`);
  const resp = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`
  );
  const json = await resp.json();
  return json.files && json.files.length ? json.files[0] : null;
}

async function createDataFile(initialData) {
  const boundary = "finanzas_boundary_" + Math.random().toString(36).slice(2);
  const metadata = { name: DATA_FILE_NAME, mimeType: "application/json" };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(initialData)}\r\n` +
    `--${boundary}--`;

  const resp = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return resp.json();
}

async function readDataFile(id) {
  const resp = await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  return resp.json();
}

export async function updateDataFile(id, data) {
  await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Loads the existing Drive data file, or creates it seeded with `seedData` if none exists yet.
export async function loadOrCreateData(seedData) {
  const existing = await findDataFile();
  if (existing) {
    fileId = existing.id;
    return { data: await readDataFile(fileId), created: false };
  }
  const created = await createDataFile(seedData);
  fileId = created.id;
  return { data: seedData, created: true };
}

export function getFileId() {
  return fileId;
}

export async function saveData(data) {
  if (!fileId) throw new Error("No hay archivo de datos cargado todavía.");
  await updateDataFile(fileId, data);
}
