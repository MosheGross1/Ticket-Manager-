import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { LogOut, Download, Upload, Trash2, Settings as SettingsIcon, Shield } from 'lucide-react';
import { auth, db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { lockApp } from '../components/LockScreen';

const TABLES = ['customers', 'tickets', 'payments', 'invoices'];

export default function Settings() {
  const [exportLoading, setExportLoading] = useState(false);
  const user = auth.currentUser;

  const handleExport = async () => {
    setExportLoading(true);
    const data = {};
    for (const table of TABLES) {
      const snap = await getDocs(collection(db, table));
      data[table] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    if (!confirm('This will overwrite all existing data. Continue?')) return;
    const text = await file.text();
    const data = JSON.parse(text);
    for (const table of TABLES) {
      if (!Array.isArray(data[table])) continue;
      const batch = writeBatch(db);
      // Delete existing
      const snap = await getDocs(collection(db, table));
      snap.docs.forEach(d => batch.delete(d.ref));
      // Add imported
      data[table].forEach(record => {
        const { id, ...rest } = record;
        batch.set(doc(db, table, id || crypto.randomUUID()), rest);
      });
      await batch.commit();
    }
    alert('Data imported successfully!');
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL data from Firebase? This cannot be undone!')) return;
    for (const table of TABLES) {
      const snap = await getDocs(collection(db, table));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    alert('All data cleared.');
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and data</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Account</h2>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-medium text-gray-800 text-sm">Signed in as</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          <Button onClick={handleSignOut} variant="secondary" size="sm">
            <LogOut size={14} /> Sign Out
          </Button>
        </div>
        <div className="pt-4 text-sm text-gray-500 space-y-1">
          <p>To change your password:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Go to <strong className="text-gray-600">console.firebase.google.com</strong></li>
            <li>Select your project → <strong className="text-gray-600">Authentication → Users</strong></li>
            <li>Click the menu next to your user → <strong className="text-gray-600">Reset password</strong></li>
          </ol>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-900">Data Management</h2>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-800 text-sm">Export backup</p>
              <p className="text-xs text-gray-400">Download all Firebase data as a JSON file</p>
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
              <p className="text-xs text-gray-400">Permanently delete everything from Firebase</p>
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
