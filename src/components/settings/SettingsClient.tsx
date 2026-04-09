'use client';

import { useState } from 'react';
import { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Save, Key } from 'lucide-react';

interface Props { profile: Profile | null; }

export default function SettingsClient({ profile }: Props) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const supabase = createClient();

  async function saveProfile() {
    setSaving(true); setMsg('');
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', profile!.id);
    setMsg(error ? '❌ ' + error.message : '✓ Profil gespeichert');
    setSaving(false);
  }

  async function changePassword() {
    if (pwForm.new !== pwForm.confirm) { setPwMsg('❌ Passwörter stimmen nicht überein'); return; }
    if (pwForm.new.length < 8) { setPwMsg('❌ Mindestens 8 Zeichen'); return; }
    setPwSaving(true); setPwMsg('');
    const { error } = await supabase.auth.updateUser({ password: pwForm.new });
    setPwMsg(error ? '❌ ' + error.message : '✓ Passwort geändert');
    if (!error) setPwForm({ current: '', new: '', confirm: '' });
    setPwSaving(false);
  }

  return (
    <>
      <div className="page-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Einstellungen</h1>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>Dein Profil & Konto</p>
      </div>

      <div className="page-body" style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Profile */}
        <div className="card">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Profil</h2>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--nordstein-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>
                {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{profile?.full_name || 'Kein Name'}</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{profile?.email}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '3px', padding: '2px 8px', borderRadius: 99, display: 'inline-block', background: 'var(--nordstein-purple-dark)', color: 'var(--nordstein-beige)' }}>
                  {profile?.role === 'admin' ? 'Admin' : profile?.role === 'sales' ? 'Sales' : 'Viewer'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Vollständiger Name</label>
              <input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Telefon</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+43 660 123 4567" />
            </div>

            {msg && <div style={{ fontSize: '0.83rem', color: msg.startsWith('✓') ? '#4ade80' : '#fca5a5', fontWeight: 700 }}>{msg}</div>}

            <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={saveProfile} disabled={saving}>
              <Save size={14} />{saving ? 'Speichern…' : 'Profil speichern'}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="card">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} color="var(--text-muted)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Passwort ändern</h2>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Neues Passwort</label>
              <input className="input" type="password" value={pwForm.new} onChange={e => setPwForm(p => ({ ...p, new: e.target.value }))} placeholder="Mindestens 8 Zeichen" />
            </div>
            <div className="form-group">
              <label className="label">Passwort bestätigen</label>
              <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
            </div>

            {pwMsg && <div style={{ fontSize: '0.83rem', color: pwMsg.startsWith('✓') ? '#4ade80' : '#fca5a5', fontWeight: 700 }}>{pwMsg}</div>}

            <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? 'Ändern…' : 'Passwort ändern'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
