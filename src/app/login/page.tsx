'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError('Ungültige Zugangsdaten. Bitte prüfe E-Mail und Passwort.');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="login-page">
      {/* Background geo mesh */}
      <div className="login-bg-mesh">
        <svg width="600" height="600" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.08 }}>
          <circle cx="120" cy="80" r="16" fill="#451a3d"/>
          <circle cx="300" cy="160" r="24" fill="#451a3d"/>
          <circle cx="480" cy="80" r="12" fill="#451a3d"/>
          <circle cx="200" cy="300" r="20" fill="#451a3d"/>
          <circle cx="400" cy="240" r="16" fill="#451a3d"/>
          <circle cx="520" cy="360" r="28" fill="#451a3d"/>
          <circle cx="80" cy="400" r="14" fill="#451a3d"/>
          <circle cx="340" cy="460" r="18" fill="#451a3d"/>
          <line x1="120" y1="80" x2="300" y2="160" stroke="#451a3d" strokeWidth="1"/>
          <line x1="300" y1="160" x2="480" y2="80" stroke="#451a3d" strokeWidth="1"/>
          <line x1="300" y1="160" x2="400" y2="240" stroke="#451a3d" strokeWidth="1"/>
          <line x1="200" y1="300" x2="400" y2="240" stroke="#451a3d" strokeWidth="1"/>
          <line x1="400" y1="240" x2="520" y2="360" stroke="#451a3d" strokeWidth="1"/>
          <line x1="80" y1="400" x2="200" y2="300" stroke="#451a3d" strokeWidth="1"/>
          <line x1="200" y1="300" x2="340" y2="460" stroke="#451a3d" strokeWidth="1"/>
          <line x1="340" y1="460" x2="520" y2="360" stroke="#451a3d" strokeWidth="1"/>
          <line x1="120" y1="80" x2="200" y2="300" stroke="#451a3d" strokeWidth="1"/>
          <line x1="480" y1="80" x2="520" y2="360" stroke="#451a3d" strokeWidth="1"/>
        </svg>
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-signet">
            <svg width="36" height="42" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 2L34 12V30L18 40L2 30V12L18 2Z" stroke="#451a3d" strokeWidth="2" fill="none"/>
              <path d="M18 8L28 14V26L18 32L8 26V14L18 8Z" fill="#451a3d" fillOpacity="0.4"/>
            </svg>
          </div>
          <div>
            <div className="login-brand-name">NORDSTEIN</div>
            <div className="login-brand-sub">Sales OS</div>
          </div>
        </div>

        <div className="login-form-header">
          <h1>Willkommen zurück</h1>
          <p>Melde dich an, um das CRM zu öffnen</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="label">E-Mail</label>
            <div className="input-icon-wrap">
              <Mail size={15} className="input-icon" />
              <input
                type="email"
                className="input input-with-icon"
                placeholder="dein@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Passwort</label>
            <div className="input-icon-wrap">
              <Lock size={15} className="input-icon" />
              <input
                type={showPw ? 'text' : 'password'}
                className="input input-with-icon"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', height: '46px' }} disabled={loading}>
            {loading ? (
              <span className="login-spinner" />
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>Bei Problemen wende dich an den Admin</span>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          position: relative;
          overflow: hidden;
        }
        .login-bg-mesh {
          position: absolute;
          top: -100px;
          right: -100px;
          pointer-events: none;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 2.5rem;
          box-shadow: var(--shadow-lg);
          position: relative;
          z-index: 1;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 2rem;
        }
        .login-signet {
          flex-shrink: 0;
        }
        .login-brand-name {
          font-size: 1.1rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          color: var(--text);
        }
        .login-brand-sub {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .login-form-header {
          margin-bottom: 1.75rem;
        }
        .login-form-header h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 4px;
        }
        .login-form-header p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .input-icon-wrap {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-subtle);
          pointer-events: none;
        }
        .input-with-icon {
          padding-left: 36px;
        }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #2d0f0f;
          border: 1px solid #991b1b;
          border-radius: var(--radius-sm);
          color: #fca5a5;
          font-size: 0.83rem;
          font-weight: 600;
        }
        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-subtle);
        }
      `}</style>
    </div>
  );
}
