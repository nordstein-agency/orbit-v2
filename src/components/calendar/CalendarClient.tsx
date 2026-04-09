'use client';

import { useState, useMemo } from 'react';
import { Appointment, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight, Plus, Download, X, Clock, MapPin, Link } from 'lucide-react';

interface Props {
  initialAppointments: Appointment[];
  currentProfile: Profile | null;
  allProfiles: Pick<Profile, 'id' | 'full_name' | 'email'>[];
}

const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarClient({ initialAppointments, currentProfile, allProfiles }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', date: '', time_from: '09:00', time_to: '10:00', location: '', type: 'call', description: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const apptByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach(a => {
      const key = a.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [appointments]);

  function getDaysInMonth(d: Date) {
    const year = d.getFullYear(); const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    const days: (Date | null)[] = Array(startDow).fill(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  async function handleCreate() {
    if (!newForm.title || !newForm.date || !currentProfile) return;
    setSaving(true);
    const { data, error } = await supabase.from('appointments').insert({
      ...newForm,
      created_by: currentProfile.id,
      assigned_to: currentProfile.id,
    }).select('*, lead:leads(id, name)').single();
    if (!error && data) {
      setAppointments(prev => [...prev, data as Appointment].sort((a, b) => a.date.localeCompare(b.date)));
      setShowCreate(false);
      setNewForm({ title: '', date: '', time_from: '09:00', time_to: '10:00', location: '', type: 'call', description: '' });
    }
    setSaving(false);
  }

  async function markDone(id: string) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
  }

  const days = getDaysInMonth(current);
  const todayStr = today.toISOString().split('T')[0];

  const upcomingAppointments = appointments
    .filter(a => a.date >= todayStr && a.status === 'scheduled')
    .slice(0, 10);

  const TYPE_LABELS: Record<string, string> = { call: '📞', meeting: '🤝', followup: '🔄', demo: '🎯' };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Kalender</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {upcomingAppointments.length} bevorstehende Termine
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/api/calendar/ics" className="btn btn-secondary btn-sm" download>
              <Download size={14} /> .ics Export
            </a>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Termin
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Calendar */}
        <div className="card">
          {/* Calendar header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn-icon btn" onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                <ChevronLeft size={16} />
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {MONTHS_DE[current.getMonth()]} {current.getFullYear()}
              </h2>
              <button className="btn-icon btn" onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                <ChevronRight size={16} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))}>
                Heute
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAYS_DE.map(d => (
              <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((day, idx) => {
              const dateStr = day ? day.toISOString().split('T')[0] : '';
              const dayAppts = day ? (apptByDate.get(dateStr) || []) : [];
              const isToday = dateStr === todayStr;
              const isSelected = selectedDate?.toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDate(day)}
                  style={{
                    minHeight: 88,
                    padding: '6px',
                    border: '1px solid var(--border)',
                    cursor: day ? 'pointer' : 'default',
                    background: isSelected ? 'var(--surface-hover)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isToday ? 'var(--nordstein-purple)' : 'transparent',
                        color: isToday ? 'white' : 'var(--text-muted)',
                        fontSize: '0.78rem', fontWeight: isToday ? 800 : 500, marginBottom: '4px',
                      }}>
                        {day.getDate()}
                      </div>
                      {dayAppts.slice(0, 3).map(a => (
                        <div key={a.id} style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '2px 5px', borderRadius: 3,
                          background: a.status === 'completed' ? 'var(--surface-3)' : 'var(--nordstein-purple-dark)',
                          color: a.status === 'completed' ? 'var(--text-subtle)' : 'var(--nordstein-beige)',
                          marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textDecoration: a.status === 'completed' ? 'line-through' : 'none',
                        }}>
                          {TYPE_LABELS[a.type]} {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', paddingLeft: '4px' }}>+{dayAppts.length - 3} mehr</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Upcoming / Selected day */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Selected day details */}
          {selectedDate && (
            <div className="card">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                  {selectedDate.toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                {(apptByDate.get(selectedDate.toISOString().split('T')[0]) || []).length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Keine Termine</div>
                ) : (
                  (apptByDate.get(selectedDate.toISOString().split('T')[0]) || []).map(a => (
                    <div key={a.id} style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>{TYPE_LABELS[a.type]} {a.title}</span>
                        {a.status !== 'completed' && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto' }} onClick={() => markDone(a.id)}>✓</button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--nordstein-purple-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />{a.time_from} – {a.time_to}
                      </span>
                      {a.location && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={10} />{a.location}</span>}
                      {(a as Appointment & { lead?: { name?: string } }).lead?.name && <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>@ {(a as Appointment & { lead?: { name?: string } }).lead?.name}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Nächste Termine</h3>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {upcomingAppointments.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Keine bevorstehenden Termine</div>
              ) : (
                upcomingAppointments.map(a => (
                  <div key={a.id} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedDate(new Date(a.date + 'T12:00:00'))}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(a.date + 'T12:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: 'short' })} · {a.time_from}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Neuer Termin</h2>
              <button className="btn-icon btn" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Titel *</label>
                <input className="input" value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Datum *</label>
                  <input className="input" type="date" value={newForm.date} onChange={e => setNewForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Von</label>
                  <input className="input" type="time" value={newForm.time_from} onChange={e => setNewForm(p => ({ ...p, time_from: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Bis</label>
                  <input className="input" type="time" value={newForm.time_to} onChange={e => setNewForm(p => ({ ...p, time_to: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Typ</label>
                  <select className="select" value={newForm.type} onChange={e => setNewForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="call">📞 Anruf</option>
                    <option value="meeting">🤝 Meeting</option>
                    <option value="followup">🔄 Follow-Up</option>
                    <option value="demo">🎯 Demo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Ort / Link</label>
                  <input className="input" value={newForm.location} onChange={e => setNewForm(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Beschreibung</label>
                <textarea className="textarea" rows={2} value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !newForm.title || !newForm.date}>
                {saving ? 'Speichern…' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
