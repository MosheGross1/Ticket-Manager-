// Google Drive REST API service using Google Identity Services (GIS)
// Requires a Google Cloud project with Drive API enabled.

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'TicketManagerApp';

let tokenClient = null;
let accessToken = null;
let appFolderId = null;

function getClientId() {
  return localStorage.getItem('google_client_id') || '';
}

export function isConfigured() {
  return !!getClientId();
}

export function isAuthenticated() {
  return !!accessToken;
}

export async function initGoogleAuth() {
  if (!getClientId()) return;

  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      _setupTokenClient(resolve);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => _setupTokenClient(resolve);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function _setupTokenClient(resolve) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) return;
      accessToken = resp.access_token;
      // Refresh 5 min before expiry
      const expiresIn = (resp.expires_in - 300) * 1000;
      setTimeout(() => requestToken(true), expiresIn);
    },
  });

  const stored = sessionStorage.getItem('gapi_token');
  if (stored) {
    accessToken = stored;
  }
  resolve(true);
}

export function requestToken(silent = false) {
  if (!tokenClient) return;
  if (silent) {
    tokenClient.requestAccessToken({ prompt: '' });
  } else {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

export function signOut() {
  if (accessToken) {
    window.google?.accounts?.oauth2?.revoke(accessToken);
  }
  accessToken = null;
  appFolderId = null;
  sessionStorage.removeItem('gapi_token');
}

async function apiFetch(url, options = {}) {
  if (!accessToken) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  });
  if (res.status === 401) {
    accessToken = null;
    throw new Error('Token expired');
  }
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  return res;
}

async function getOrCreateAppFolder() {
  if (appFolderId) return appFolderId;

  const q = encodeURIComponent(`name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await apiFetch(`${DRIVE_API}/files?q=${q}&fields=files(id)`);
  const data = await res.json();

  if (data.files?.length) {
    appFolderId = data.files[0].id;
    return appFolderId;
  }

  const createRes = await apiFetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await createRes.json();
  appFolderId = folder.id;
  return appFolderId;
}

async function findFile(name, folderId) {
  const q = encodeURIComponent(`name='${name}' and '${folderId}' in parents and trashed=false`);
  const res = await apiFetch(`${DRIVE_API}/files?q=${q}&fields=files(id,modifiedTime)`);
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function uploadJSON(name, data) {
  const folderId = await getOrCreateAppFolder();
  const existing = await findFile(name, folderId);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const metadata = { name, mimeType: 'application/json' };
  if (!existing) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const url = existing
    ? `${UPLOAD_API}/files/${existing.id}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`;

  const method = existing ? 'PATCH' : 'POST';
  await apiFetch(url, { method, body: form });
}

export async function downloadJSON(name) {
  const folderId = await getOrCreateAppFolder();
  const file = await findFile(name, folderId);
  if (!file) return null;

  const res = await apiFetch(`${DRIVE_API}/files/${file.id}?alt=media`);
  return res.json();
}

export async function uploadFile(file, ticketId) {
  const folderId = await getOrCreateAppFolder();
  const name = `ticket_${ticketId}_${file.name}`;
  const metadata = { name, parents: [folderId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await apiFetch(`${UPLOAD_API}/files?uploadType=multipart`, { method: 'POST', body: form });
  const data = await res.json();
  return data.id;
}

export async function getFileViewUrl(driveFileId) {
  return `https://drive.google.com/file/d/${driveFileId}/view`;
}
