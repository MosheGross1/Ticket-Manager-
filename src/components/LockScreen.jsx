import { useState } from 'react';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, updatePassword } from 'firebase/auth';
import { Plane, Lock, Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase';

export function LockScreen({ onUnlock }) {
  const storedEmail = localStorage.getItem('team_email') || '';
  const [email, setEmail] = useState(storedEmail);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const needsEmail = !storedEmail;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      localStorage.setItem('team_email', email.trim());
      onUnlock();
    } catch (err) {
      setError('Incorrect email or password');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-blue-600 rounded-2xl p-4">
            <Plane size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Ticket Manager</h1>
          <p className="text-sm text-gray-500 text-center">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {needsEmail && (
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="Team email"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {!needsEmail && (
            <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-xl py-2 px-4">
              {storedEmail}
            </div>
          )}

          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              required
              autoFocus={!needsEmail}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Lock size={16} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {!needsEmail && (
            <button
              type="button"
              onClick={() => { localStorage.removeItem('team_email'); window.location.reload(); }}
              className="text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              Use a different email
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export function lockApp() {
  firebaseSignOut(auth);
}
