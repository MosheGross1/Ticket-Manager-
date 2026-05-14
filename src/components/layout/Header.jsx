import { useState } from 'react';
import { Menu, X, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { isAuthenticated } from '../../services/driveService';
import { getSyncStatus } from '../../services/syncService';

export function Header({ onMenuToggle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sync = getSyncStatus();
  const authed = isAuthenticated();

  const syncIcon = () => {
    if (sync.status === 'syncing') return <RefreshCw size={15} className="animate-spin text-blue-500" />;
    if (sync.status === 'error') return <CloudOff size={15} className="text-red-500" />;
    if (authed) return <Cloud size={15} className="text-green-500" />;
    return <CloudOff size={15} className="text-gray-400" />;
  };

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 hover:bg-gray-700 rounded-lg">
            <Menu size={22} />
          </button>
          <span className="font-bold text-sm">Ticket Manager</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {syncIcon()}
          {sync.status === 'synced' && authed && <span>Synced</span>}
          {!authed && <span>Offline</span>}
          {sync.status === 'error' && <span className="text-red-400">Sync error</span>}
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
          <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white p-1.5 rounded-lg bg-gray-700">
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}

export function SyncIndicator() {
  const sync = getSyncStatus();
  const authed = isAuthenticated();

  if (!authed) return null;

  return (
    <div className="hidden lg:flex items-center gap-1.5 px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
      {sync.status === 'syncing' && <><RefreshCw size={12} className="animate-spin text-blue-400" /> Syncing…</>}
      {sync.status === 'synced' && <><Cloud size={12} className="text-green-400" /> Synced</>}
      {sync.status === 'error' && <><CloudOff size={12} className="text-red-400" /> Sync failed</>}
    </div>
  );
}
