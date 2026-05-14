import db from '../db/db';
import { uploadJSON, downloadJSON, isAuthenticated } from './driveService';

const TABLES = ['customers', 'tickets', 'payments', 'invoices'];
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
let syncTimer = null;
let syncStatus = { status: 'idle', lastSync: null, error: null };
const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn({ ...syncStatus }));
}

export function onSyncStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSyncStatus() {
  return { ...syncStatus };
}

export async function syncToCloud() {
  if (!isAuthenticated() || !navigator.onLine) return;

  syncStatus = { status: 'syncing', lastSync: syncStatus.lastSync, error: null };
  notify();

  try {
    for (const table of TABLES) {
      const records = await db[table].toArray();
      await uploadJSON(`${table}.json`, records);
    }
    syncStatus = { status: 'synced', lastSync: new Date().toISOString(), error: null };
    localStorage.setItem('last_sync', syncStatus.lastSync);
  } catch (err) {
    syncStatus = { status: 'error', lastSync: syncStatus.lastSync, error: err.message };
  }
  notify();
}

export async function syncFromCloud() {
  if (!isAuthenticated() || !navigator.onLine) return;

  syncStatus = { status: 'syncing', lastSync: syncStatus.lastSync, error: null };
  notify();

  try {
    for (const table of TABLES) {
      const cloudData = await downloadJSON(`${table}.json`);
      if (!cloudData) continue;

      // Merge: cloud wins for records newer than local, local wins otherwise
      const localMap = new Map((await db[table].toArray()).map(r => [r.id, r]));
      const merged = [];

      for (const cloudRecord of cloudData) {
        const local = localMap.get(cloudRecord.id);
        if (!local || (cloudRecord.updatedAt || 0) > (local.updatedAt || 0)) {
          merged.push(cloudRecord);
        } else {
          merged.push(local);
        }
        localMap.delete(cloudRecord.id);
      }
      // Keep local-only records
      for (const local of localMap.values()) merged.push(local);

      await db[table].clear();
      await db[table].bulkPut(merged);
    }

    syncStatus = { status: 'synced', lastSync: new Date().toISOString(), error: null };
    localStorage.setItem('last_sync', syncStatus.lastSync);
  } catch (err) {
    syncStatus = { status: 'error', lastSync: syncStatus.lastSync, error: err.message };
  }
  notify();
}

export function startAutoSync() {
  syncStatus.lastSync = localStorage.getItem('last_sync');
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(syncToCloud, SYNC_INTERVAL);

  window.addEventListener('online', syncToCloud);
  syncToCloud();
}

export function stopAutoSync() {
  if (syncTimer) clearInterval(syncTimer);
  window.removeEventListener('online', syncToCloud);
}
