'use client';

import { useState } from 'react';
import { Lead, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { X, PhoneCall, Handshake, Clock, Users } from 'lucide-react';

interface Props {
  lead: Lead;
  currentProfile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

const APPT_TYPES = [
  { value: 'vk',       label: 'Verkaufsgespräch', icon: PhoneCall,  color: '#451a3d' },
  { value: 'cc',       label: 'Closing Call',      icon: Handshake,  color: '#6b2a5e' },
  { value: 'followup', label: 'Follow-Up',         icon: Clock,      color: '#854d0e' },
  { value: 'meeting',  label: 'Meeting',           icon: Users,      color: '#374151' },
];

export default function AppointmentModal({ lead, currentProfile, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: `VK: ${lead.name}`,
    description: '',
    date: new Date().toISOString().split('T')[0],
    time_from: '09:00',
    time_to: '10:00',
    location: lead.region || '',
    type: 'vk',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  function setType(value: string) {
    const typeLabel = APPT_TYPES.find(t => t.value === value)?.label || '';
    setForm(p => ({ ...p, type: value, title: `${typeLabel}: ${lead.name}` }));
  }

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
        lead_id: lead.id, user_id: currentProfile.id, type: 'appointment_set',
        metadata: { lead_name: lead.name, date: form.date, time: form.time_from, appt_type: form.type },
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

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Terminart */}
          <div className="form-group">
            <label className="label">Terminart</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '4px' }}>
              {APPT_TYPES.map(t => {
                const Icon = t.icon;
                const active = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    style={{
                      padding: '10px 8px', borderRadius: 8, border: `1px solid ${active ? t.color : 'var(--border)'}`,
                      background: active ? `${t.color}33` : 'var(--surface-3)',
                      color: active ? 'var(--text)' : 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={16} color={active ? t.color : undefined} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Titel</label>
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

          <div className="form-group">
            <label className="label">Ort / Link</label>
            <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Wien / Zoom-Link..." />
          </div>

          <div className="form-group">
            <label className="label">Beschreibung</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Agenda, Vorbereitung..." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.date}>
            {saving ? 'Speichern…' : 'Termin anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}