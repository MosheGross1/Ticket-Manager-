import { useState } from 'react';
import { Plane, Lock, Eye, EyeOff } from 'lucide-react';

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const isFirstTime = !localStorage.getItem('app_password_hash');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isFirstTime) {
      if (password.length < 4) { setError('Password must be at least 4 characters'); return; }
      if (password !== confirm) { setError('Passwords do not match'); return; }
      const hash = await hashPassword(password);
      localStorage.setItem('app_password_hash', hash);
      sessionStorage.setItem('app_unlocked', '1');
      onUnlock();
    } else {
      const hash = await hashPassword(password);
      if (hash === localStorage.getItem('app_password_hash')) {
        sessionStorage.setItem('app_unlocked', '1');
        onUnlock();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-blue-600 rounded-2xl p-4">
            <Plane size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Ticket Manager</h1>
          <p className="text-sm text-gray-500 text-center">
            {isFirstTime ? 'Set a password to protect your app' : 'Enter your password to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {isFirstTime && (
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="Confirm password"
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            className="bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            {isFirstTime ? 'Set Password & Enter' : 'Unlock'}
          </button>
        </form>

        {!isFirstTime && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Forgot password? Clear browser data to reset.
          </p>
        )}
      </div>
    </div>
  );
}

export async function verifyPassword(password) {
  const hash = await hashPassword(password);
  return hash === localStorage.getItem('app_password_hash');
}

export async function changePassword(newPassword) {
  const hash = await hashPassword(newPassword);
  localStorage.setItem('app_password_hash', hash);
}

export function lockApp() {
  sessionStorage.removeItem('app_unlocked');
  window.location.reload();
}
