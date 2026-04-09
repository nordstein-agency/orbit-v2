'use client';

import { useState } from 'react';
import { Lead, Profile, LeadStatus, PIPELINE_TABS, STATUS_LABELS } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { X, Phone, Globe, Mail, Star, MapPin, Building, User, Clock, ExternalLink } from 'lucide-react';

interface Props {
  lead: Lead;
  currentProfile: Profile | null;
  allProfiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[];
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
}

export default function LeadDetailModal({ lead, currentProfile, allProfiles, onClose, onUpdate, onStatusChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: lead.name,
    ceos: lead.ceos || '',
    phone: lead.phone || '',
    email_general: lead.email_general || '',
    email_ceo: lead.email_ceo || '',
    website: lead.website || '',
    region: lead.region || '',
    industry: lead.industry || '',
    description: lead.description || '',
    assigned_to: lead.assigned_to || '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from('leads')
      .update({ ...form, assigned_to: form.assigned_to || null, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      onUpdate({ ...lead, ...data });
      setEditing(false);
    }
  }

  const notes = lead.notes || [];
  const appointments = (lead.appointments || []).filter(a => a.status === 'scheduled');

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{lead.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className={`status-badge status-${lead.status}`}>{STATUS_LABELS[lead.status]}</span>
              {lead.rating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#fbbf24' }}>
                  <Star size={12} fill="currentColor" />{lead.rating}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Bearbeiten</button>
            )}
            <button className="btn-icon btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '2rem' }}>
          {/* Left: Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {editing ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="label">Firmenname *</label>
                    <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Ansprechperson (CEO/GF)</label>
                    <input className="input" value={form.ceos} onChange={e => setForm(p => ({ ...p, ceos: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Telefon</label>
                    <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">E-Mail (Allgemein)</label>
                    <input className="input" value={form.email_general} onChange={e => setForm(p => ({ ...p, email_general: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">E-Mail (CEO)</label>
                    <input className="input" value={form.email_ceo} onChange={e => setForm(p => ({ ...p, email_ceo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Website</label>
                    <input className="input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Region / Adresse</label>
                    <input className="input" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Branche</label>
                    <input className="input" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Beschreibung</label>
                  <textarea className="textarea" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Zugewiesen an</label>
                  <select className="select" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                    <option value="">Nicht zugewiesen</option>
                    {allProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <InfoRow icon={User} label="Ansprechperson" value={lead.ceos} />
                  <InfoRow icon={Phone} label="Telefon" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                  <InfoRow icon={Mail} label="E-Mail" value={lead.email_general} href={lead.email_general ? `mailto:${lead.email_general}` : undefined} />
                  <InfoRow icon={Mail} label="CEO E-Mail" value={lead.email_ceo} href={lead.email_ceo ? `mailto:${lead.email_ceo}` : undefined} />
                  <InfoRow icon={Globe} label="Website" value={lead.website} href={lead.website ? (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`) : undefined} />
                  <InfoRow icon={MapPin} label="Region" value={lead.region} />
                  <InfoRow icon={Building} label="Branche" value={lead.industry} />
                  <InfoRow icon={Clock} label="Erstellt" value={new Date(lead.created_at).toLocaleDateString('de-AT')} />
                </div>
                {lead.description && (
                  <div style={{ background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {lead.description}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Status + Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Status change */}
            <div>
              <label className="label">Status ändern</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {PIPELINE_TABS.map((tab, i) => (
                  <div key={tab.key}>
                    {tab.divider && <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />}
                    <button
                      onClick={() => onStatusChange(lead, tab.key)}
                      style={{
                        width: '100%',
                        height: 34,
                        borderRadius: 6,
                        background: lead.status === tab.key ? 'var(--nordstein-purple)' : 'var(--surface-3)',
                        color: lead.status === tab.key ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${lead.status === tab.key ? 'var(--nordstein-purple-light)' : 'transparent'}`,
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: '0 12px',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes preview */}
            {notes.length > 0 && (
              <div>
                <label className="label">Notizen ({notes.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {notes.slice(0, 3).map(note => (
                    <div key={note.id} style={{ background: 'var(--surface-3)', borderRadius: 6, padding: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {note.content.slice(0, 120)}{note.content.length > 120 ? '…' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming appointments */}
            {appointments.length > 0 && (
              <div>
                <label className="label">Nächste Termine</label>
                {appointments.slice(0, 2).map(a => (
                  <div key={a.id} style={{ background: 'var(--nordstein-purple-dark)', border: '1px solid var(--nordstein-purple)', borderRadius: 6, padding: '10px', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--nordstein-beige)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{a.date} · {a.time_from}–{a.time_to}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Abbrechen</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.83rem', color: 'var(--nordstein-purple-light)', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Icon size={13} />{value}<ExternalLink size={11} style={{ flexShrink: 0 }} />
        </a>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.83rem', color: 'var(--text)', fontWeight: 500 }}>
          <Icon size={13} color="var(--text-subtle)" />{value}
        </span>
      )}
    </div>
  );
}
