'use client';

import { useState } from 'react';
import { Lead, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

interface Props {
  lead: Lead;
  currentProfile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AppointmentModal({ lead, currentProfile, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: `Termin: ${lead.name}`,
    description: '',
    date: new Date().toISOString().split('T')[0],
    time_from: '09:00',
    time_to: '10:00',
    location: lead.region || '',
    type: 'call' as 'call' | 'meeting' | 'followup' | 'demo',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    if (!currentProfile) return;
    setSaving(true);
    const { error } = await supabase.from('appointments').insert({
      ...form,
      lead_id: lead.id,
      created_by: currentProfile.id,
      assigned_to: currentProfile.id,
    });
    if (!error) {
      await supabase.from('activity_log').insert({
        lead_id: lead.id,
        user_id: currentProfile.id,
        type: 'appointment_set',
        metadata: { lead_name: lead.name, date: form.date, time: form.time_from },
      });
      onSaved();
    } else {
      alert('Fehler: ' + error.message);
    }
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Termin anlegen</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{lead.name}</p>
          </div>
          <button className="btn-icon btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="label">Titel *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Datum *</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Von</label>
              <input className="input" type="time" value={form.time_from} onChange={e => setForm(p => ({ ...p, time_from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Bis</label>
              <input className="input" type="time" value={form.time_to} onChange={e => setForm(p => ({ ...p, time_to: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Typ</label>
              <select className="select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as typeof form.type }))}>
                <option value="call">📞 Anruf</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="followup">🔄 Follow-Up</option>
                <option value="demo">🎯 Demo</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Ort / Link</label>
              <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Wien / Zoom-Link..." />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Beschreibung</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Agenda, Vorbereitung..." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title || !form.date}>
            {saving ? 'Speichern…' : 'Termin anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
