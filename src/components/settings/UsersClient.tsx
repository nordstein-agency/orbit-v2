'use client';

import { useState } from 'react';
import { Profile, UserRole } from '@/types';
import { Shield, User, Eye, Plus, Trash2, X } from 'lucide-react';

interface Props {
  users: Profile[];
  currentProfile: Profile;
}

const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', sales: 'Sales', viewer: 'Viewer' };
const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: '#2d0f27', text: '#e6ded3' },
  sales: { bg: '#0f2d1a', text: '#6ee7b7' },
  viewer: { bg: '#1a1f28', text: '#9ca3af' },
};

export default function UsersClient({ users: initialUsers, currentProfile }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'sales' as UserRole });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleCreate() {
    if (!newUser.email || !newUser.password) { setError('E-Mail und Passwort sind Pflichtfelder.'); return; }
    setCreating(true); setError(''); setSuccess('');

    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Fehler beim Anlegen.'); }
    else {
      setSuccess(`Benutzer ${newUser.email} wurde erstellt.`);
      setUsers(prev => [...prev, data.profile]);
      setShowCreate(false);
      setNewUser({ email: '', full_name: '', password: '', role: 'sales' });
    }
    setCreating(false);
  }

  async function updateRole(userId: string, role: UserRole) {
    const res = await fetch('/api/users/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  }

  async function toggleActive(u: Profile) {
    const res = await fetch('/api/users/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, is_active: !u.is_active }),
    });
    if (res.ok) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Benutzerverwaltung</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>{users.length} Benutzer</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Neuer Benutzer
          </button>
        </div>
      </div>

      <div className="page-body">
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f2d1a', border: '1px solid #16a34a', borderRadius: 6, color: '#4ade80', fontSize: '0.83rem', marginBottom: '1rem' }}>
            ✓ {success}
          </div>
        )}

        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Benutzer</th>
                <th>Rolle</th>
                <th>Status</th>
                <th>Erstellt</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--nordstein-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.875rem', color: 'white', flexShrink: 0 }}>
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{u.full_name || '—'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.id === currentProfile.id ? (
                      <span style={{ ...ROLE_COLORS[u.role], padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, display: 'inline-block' }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    ) : (
                      <select
                        className="select"
                        style={{ width: 'auto', height: 32, fontSize: '0.78rem' }}
                        value={u.role}
                        onChange={e => updateRole(u.id, e.target.value as UserRole)}
                      >
                        <option value="admin">Admin</option>
                        <option value="sales">Sales</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: u.is_active ? '#0f2d1a' : '#2d0f0f', color: u.is_active ? '#4ade80' : '#fca5a5' }}>
                      {u.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('de-AT')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {u.id !== currentProfile.id && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Neuen Benutzer anlegen</h2>
              <button className="btn-icon btn" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && (
                <div style={{ padding: '10px 14px', background: '#2d0f0f', border: '1px solid #991b1b', borderRadius: 6, color: '#fca5a5', fontSize: '0.83rem' }}>{error}</div>
              )}
              <div className="form-group">
                <label className="label">E-Mail *</label>
                <input className="input" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Vollständiger Name</label>
                <input className="input" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Passwort *</label>
                <input className="input" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Rolle</label>
                <select className="select" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))}>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer (nur lesen)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Anlegen…' : 'Benutzer erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
