import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Settings as SettingsIcon, Trash2, Download, Upload } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { isAuthenticated, isConfigured, initGoogleAuth, requestToken, signOut } from '../services/driveService';
import { syncToCloud, syncFromCloud, getSyncStatus, onSyncStatus } from '../services/syncService';
import db from '../db/db';

export default function Settings() {
  const [clientId, setClientId] = useState(localStorage.getItem('google_client_id') || '');
  const [authed, setAuthed] = useState(isAuthenticated());
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const unsub = onSyncStatus(s => { setSyncStatus(s); setAuthed(isAuthenticated()); });
    return unsub;
  }, []);

  const saveClientId = () => {
    localStorage.setItem('google_client_id', clientId.trim());
    initGoogleAuth().then(() => alert('Client ID saved. Click "Connect Google Drive" to authenticate.'));
  };

  const handleConnect = () => {
    initGoogleAuth().then(() => requestToken(false));
    setTimeout(() => { setAuthed(isAuthenticated()); }, 2000);
  };

  const handleDisconnect = () => {
    signOut();
    setAuthed(false);
  };

  const handleExport = async () => {
    setExportLoading(true);
    const data = {};
    for (const table of ['customers', 'tickets', 'payments', 'invoices']) {
      data[table] = await db[table].toArray();
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    for (const table of ['customers', 'tickets', 'payments', 'invoices']) {
      if (Array.isArray(data[table])) {
        await db[table].clear();
        await db[table].bulkPut(data[table]);
      }
    }
    alert('Data imported successfully!');
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL data? This cannot be undone!')) return;
    for (const table of ['customers', 'tickets', 'payments', 'invoices']) {
      await db[table].clear();
    }
    alert('All data cleared.');
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure sync and manage your data</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Google Drive Sync</h2>
        </div>

        {!authed ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Connect Google Drive to automatically back up and sync your data across devices.
              You'll need a Google Cloud project with the Drive API enabled.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-800">Setup steps:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Go to <strong>console.cloud.google.com</strong></li>
                <li>Create a project → Enable <strong>Google Drive API</strong></li>
                <li>Create OAuth 2.0 credentials (Web application type)</li>
                <li>Add <code className="bg-gray-200 px-1 rounded">http://localhost:5173</code> to authorized origins</li>
                <li>Copy your <strong>Client ID</strong> and paste it below</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Input
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Paste your Google Client ID here…"
                className="flex-1"
              />
              <Button onClick={saveClientId} variant="secondary">Save</Button>
            </div>

            {clientId && (
              <Button onClick={handleConnect} className="self-start">
                <Cloud size={16} /> Connect Google Drive
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <Cloud size={18} className="text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800">Connected to Google Drive</p>
                {syncStatus.lastSync && (
                  <p className="text-xs text-green-600">Last synced: {new Date(syncStatus.lastSync).toLocaleString()}</p>
                )}
                {syncStatus.status === 'error' && <p className="text-xs text-red-600">{syncStatus.error}</p>}
              </div>
              {syncStatus.status === 'syncing' && <RefreshCw size={16} className="text-blue-500 animate-spin" />}
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={syncToCloud} variant="secondary" size="sm">
                <Upload size={14} /> Sync to Drive
              </Button>
              <Button onClick={syncFromCloud} variant="secondary" size="sm">
                <Download size={14} /> Pull from Drive
              </Button>
              <Button onClick={handleDisconnect} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                <CloudOff size={14} /> Disconnect
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-900">Data Management</h2>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-800 text-sm">Export backup</p>
              <p className="text-xs text-gray-400">Download all data as a JSON file</p>
            </div>
            <Button onClick={handleExport} variant="secondary" size="sm" disabled={exportLoading}>
              <Download size={14} /> Export
            </Button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-800 text-sm">Import backup</p>
              <p className="text-xs text-gray-400">Restore from a JSON backup file</p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-300 text-sm rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload size={14} /> Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-red-700 text-sm">Clear all data</p>
              <p className="text-xs text-gray-400">Permanently delete everything from this device</p>
            </div>
            <Button onClick={handleClearAll} variant="danger" size="sm">
              <Trash2 size={14} /> Clear
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
