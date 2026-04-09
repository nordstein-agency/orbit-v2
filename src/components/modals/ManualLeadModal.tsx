'use client';

import { useState } from 'react';
import { Lead, Profile, BRANCHES } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

interface Props {
  currentProfile: Profile | null;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

export default function ManualLeadModal({ currentProfile, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', ceos: '', phone: '', email_general: '', email_ceo: '',
    website: '', region: '', industry: '', description: '', source: 'manual',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    if (!form.name.trim() || !currentProfile) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...form,
        status: 'NEU',
        created_by: currentProfile.id,
        status_changed_by: currentProfile.id,
      })
      .select()
      .single();

    if (!error && data) {
      await supabase.from('activity_log').insert({
        lead_id: data.id,
        user_id: currentProfile.id,
        type: 'lead_created',
        metadata: { lead_name: data.name, source: 'manual' },
      });
      onCreated(data as Lead);
      onClose();
    } else {
      alert('Fehler: ' + (error?.message || 'Unbekannt'));
    }
    setSaving(false);
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Lead manuell anlegen</h2>
          <button className="btn-icon btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="label">Firmenname *</label>
              <input className="input" value={form.name} onChange={f('name')} placeholder="Musterfirma GmbH" autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Ansprechperson / GF</label>
              <input className="input" value={form.ceos} onChange={f('ceos')} placeholder="Max Mustermann" />
            </div>
            <div className="form-group">
              <label className="label">Branche</label>
              <select className="select" value={form.industry} onChange={f('industry')}>
                <option value="">Bitte wählen...</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Telefon</label>
              <input className="input" value={form.phone} onChange={f('phone')} placeholder="+43 1 234 5678" />
            </div>
            <div className="form-group">
              <label className="label">Region / Adresse</label>
              <input className="input" value={form.region} onChange={f('region')} placeholder="1010 Wien" />
            </div>
            <div className="form-group">
              <label className="label">E-Mail (Allgemein)</label>
              <input className="input" type="email" value={form.email_general} onChange={f('email_general')} placeholder="office@firma.at" />
            </div>
            <div className="form-group">
              <label className="label">E-Mail (CEO/GF)</label>
              <input className="input" type="email" value={form.email_ceo} onChange={f('email_ceo')} placeholder="max@firma.at" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="label">Website</label>
              <input className="input" value={form.website} onChange={f('website')} placeholder="https://firma.at" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="label">Beschreibung / Notiz</label>
              <textarea className="textarea" rows={3} value={form.description} onChange={f('description')} placeholder="Zusätzliche Informationen..." />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Anlegen…' : 'Lead anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
