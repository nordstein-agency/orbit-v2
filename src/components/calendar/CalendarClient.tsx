'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Appointment, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft, ChevronRight, Plus, Download, X,
  Clock, MapPin, PhoneCall, Handshake, Users, RotateCcw,
  Check, Pencil, Trash2, CalendarDays, CalendarRange, Calendar,
} from 'lucide-react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

// ── Config ──────────────────────────────────────────────────

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAYS_DE_LONG = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const DAYS_DE_SHORT = ['Mo','Di','Mi','Do','Fr','Sa','So'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  vk:       { label: 'Verkaufsgespräch', icon: PhoneCall,  color: '#e6ded3', bg: '#451a3d', border: '#6b2a5e' },
  cc:       { label: 'Closing Call',     icon: Handshake,  color: '#f5e8f2', bg: '#6b2a5e', border: '#8b3a7e' },
  followup: { label: 'Follow-Up',        icon: RotateCcw,  color: '#fef3c7', bg: '#854d0e', border: '#a16207' },
  meeting:  { label: 'Meeting',          icon: Users,      color: '#e0f2fe', bg: '#0369a1', border: '#0284c7' },
  call:     { label: 'Anruf',            icon: PhoneCall,  color: '#e6ded3', bg: '#451a3d', border: '#6b2a5e' },
  demo:     { label: 'Demo',             icon: Handshake,  color: '#f0fdf4', bg: '#16a34a', border: '#22c55e' },
};

function getCfg(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG['meeting'];
}

type ViewMode = 'month' | 'week' | 'day';

// ── Helpers ─────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(t: string) { return t.slice(0, 5); }

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ── Draggable Appointment Pill ───────────────────────────────

function DraggableAppt({
  appt, compact = false, onClick,
}: { appt: Appointment; compact?: boolean; onClick: (a: Appointment) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: appt.id });
  const cfg = getCfg(appt.type);
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        transition: isDragging ? 'none' : 'opacity 0.15s',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        onClick={e => { e.stopPropagation(); onClick(appt); }}
        style={{
          background: appt.status === 'completed' ? 'var(--surface-3)' : cfg.bg,
          color: appt.status === 'completed' ? 'var(--text-subtle)' : cfg.color,
          border: `1px solid ${appt.status === 'completed' ? 'var(--border)' : cfg.border}`,
          borderRadius: 5, padding: compact ? '2px 5px' : '4px 8px',
          fontSize: compact ? '0.62rem' : '0.72rem', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: appt.status === 'completed' ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 4,
          userSelect: 'none',
        }}
        {...listeners}
      >
        <Icon size={compact ? 9 : 11} style={{ flexShrink: 0 }} />
        {!compact && <span>{formatTime(appt.time_from)} </span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.title}</span>
      </div>
    </div>
  );
}

// ── Droppable Day Cell ───────────────────────────────────────

function DroppableDay({ id, children, style }: { id: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{
      ...style,
      background: isOver ? 'var(--nordstein-purple-dark)' : style?.background,
      transition: 'background 0.15s',
      outline: isOver ? '2px solid var(--nordstein-purple)' : 'none',
      outlineOffset: -2,
    }}>
      {children}
    </div>
  );
}

// ── Droppable Hour Slot ──────────────────────────────────────

function DroppableHour({ id, children, style }: { id: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{
      ...style,
      background: isOver ? 'rgba(69,26,61,0.2)' : 'transparent',
      transition: 'background 0.1s',
    }}>
      {children}
    </div>
  );
}

// ── Appointment Form Modal ───────────────────────────────────

interface ApptFormProps {
  initial?: Partial<Appointment> & { date?: string };
  lead?: { id: string; name: string } | null;
  onSave: (data: Partial<Appointment>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function ApptFormModal({ initial, onSave, onDelete, onClose, saving }: ApptFormProps) {
  const [form, setForm] = useState<{
  title: string;
  date: string;
  time_from: string;
  time_to: string;
  location: string;
  type: 'vk' | 'cc' | 'followup' | 'meeting' | 'call' | 'demo';
  description: string;
}>({
  title: initial?.title || '',
  date: initial?.date || toDateStr(new Date()),
  time_from: initial?.time_from || '09:00',
  time_to: initial?.time_to || '10:00',
  location: initial?.location || '',
  type: (initial?.type as 'vk' | 'cc' | 'followup' | 'meeting' | 'call' | 'demo') || 'vk',
  description: initial?.description || '',
});
  const isEdit = !!initial?.id;

  function setType(value: string) {
  const cfg = getCfg(value);
  setForm(p => ({ ...p, type: value as 'vk' | 'cc' | 'followup' | 'meeting' | 'call' | 'demo', title: p.title || cfg.label }));
}

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>{isEdit ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {isEdit && onDelete && (
              <button className="btn-icon btn" onClick={onDelete} style={{ color: '#dc2626' }} title="Löschen">
                <Trash2 size={15} />
              </button>
            )}
            <button className="btn-icon btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Type selector */}
          <div className="form-group">
            <label className="label">Terminart</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: 4 }}>
              {Object.entries(TYPE_CONFIG).filter(([k]) => !['call', 'demo'].includes(k)).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = form.type === key;
                return (
                  <button key={key} onClick={() => setType(key)} style={{
                    padding: '9px 4px', borderRadius: 8,
                    border: `1px solid ${active ? cfg.border : 'var(--border)'}`,
                    background: active ? `${cfg.bg}55` : 'var(--surface-3)',
                    color: active ? cfg.color : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 700, transition: 'all 0.15s',
                  }}>
                    <Icon size={14} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Titel</label>
            <input className="input" value={form.title} placeholder={getCfg(form.type).label}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="label">Datum</label>
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
            <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="label">Beschreibung</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
<button className="btn btn-primary" onClick={() => onSave(form as Partial<Appointment>)} disabled={saving || !form.date}>            {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

interface Props {
  initialAppointments: Appointment[];
  currentProfile: Profile | null;
  allProfiles: Pick<Profile, 'id' | 'full_name' | 'email'>[];
}

export default function CalendarClient({ initialAppointments, currentProfile }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(today));
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ date?: string; time_from?: string }>({});
  const [saving, setSaving] = useState(false);
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);
  const supabase = createClient();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const apptByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach(a => {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    });
    return map;
  }, [appointments]);

  const todayStr = toDateStr(today);

  // ── CRUD ──────────────────────────────────────────────────

  async function handleCreate(data: Partial<Appointment>) {
    if (!currentProfile) return;
    setSaving(true);
    const cfg = getCfg(data.type || 'vk');
    const title = (data.title as string)?.trim() || cfg.label;
    const { data: inserted, error } = await supabase.from('appointments')
      .insert({ ...data, title, created_by: currentProfile.id, assigned_to: currentProfile.id })
      .select('*, lead:leads(id, name)').single();
    if (!error && inserted) {
      setAppointments(prev => [...prev, inserted as Appointment].sort((a, b) => a.date.localeCompare(b.date) || a.time_from.localeCompare(b.time_from)));
      setShowCreate(false);
    }
    setSaving(false);
  }

  async function handleUpdate(data: Partial<Appointment>) {
    if (!editAppt) return;
    setSaving(true);
    const { data: updated, error } = await supabase.from('appointments')
      .update(data).eq('id', editAppt.id).select('*, lead:leads(id, name)').single();
    if (!error && updated) {
      setAppointments(prev => prev.map(a => a.id === editAppt.id ? updated as Appointment : a));
      setEditAppt(null);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editAppt) return;
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', editAppt.id);
    setAppointments(prev => prev.filter(a => a.id !== editAppt.id));
    setEditAppt(null);
  }

  async function markDone(id: string) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' as const } : a));
  }

  // ── Drag & Drop ───────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const appt = appointments.find(a => a.id === event.active.id);
    if (appt) setActiveAppt(appt);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveAppt(null);
    const { active, over } = event;
    if (!over || !active) return;

    const appt = appointments.find(a => a.id === active.id);
    if (!appt) return;

    const overId = over.id as string;
    // Format: "day-YYYY-MM-DD" or "hour-YYYY-MM-DD-HH"
    let newDate = appt.date;
    let newTimeFrom = appt.time_from;
    let newTimeTo = appt.time_to;

    if (overId.startsWith('day-')) {
      newDate = overId.replace('day-', '');
    } else if (overId.startsWith('hour-')) {
      const parts = overId.split('-');
      newDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
      const newHour = parseInt(parts[4]);
      const durationMin = timeToMin(appt.time_to) - timeToMin(appt.time_from);
      newTimeFrom = minToTime(newHour * 60);
      newTimeTo = minToTime(newHour * 60 + durationMin);
    }

    if (newDate === appt.date && newTimeFrom === appt.time_from) return;

    // Optimistic
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, date: newDate, time_from: newTimeFrom, time_to: newTimeTo } : a));
    await supabase.from('appointments').update({ date: newDate, time_from: newTimeFrom, time_to: newTimeTo }).eq('id', appt.id);
  }

  // ── Navigation ────────────────────────────────────────────

  function navPrev() {
    if (view === 'month') setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (view === 'week') setSelectedDate(d => { const x = new Date(d); x.setDate(x.getDate() - 7); return toDateStr(x); });
    else setSelectedDate(d => { const x = new Date(d); x.setDate(x.getDate() - 1); return toDateStr(x); });
  }

  function navNext() {
    if (view === 'month') setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (view === 'week') setSelectedDate(d => { const x = new Date(d); x.setDate(x.getDate() + 7); return toDateStr(x); });
    else setSelectedDate(d => { const x = new Date(d); x.setDate(x.getDate() + 1); return toDateStr(x); });
  }

  function navTitle() {
    if (view === 'month') return `${MONTHS_DE[current.getMonth()]} ${current.getFullYear()}`;
    if (view === 'week') {
      const days = getWeekDays(new Date(selectedDate));
      return `${days[0].getDate()}. – ${days[6].getDate()}. ${MONTHS_DE[days[6].getMonth()]} ${days[6].getFullYear()}`;
    }
    const d = new Date(selectedDate);
    return `${DAYS_DE_LONG[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ── Month View ────────────────────────────────────────────

  function MonthView() {
    const days: (string | null)[] = [];
    const year = current.getFullYear(); const month = current.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    while (days.length % 7 !== 0) days.push(null);

    return (
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {DAYS_DE_SHORT.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
          {days.map((dateStr, idx) => {
            if (!dateStr) return <div key={idx} style={{ border: '1px solid var(--border)', background: 'var(--surface)', minHeight: 90 }} />;
            const dayAppts = apptByDate.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayNum = parseInt(dateStr.split('-')[2]);

            return (
              <DroppableDay
                key={dateStr}
                id={`day-${dateStr}`}
                style={{
                  minHeight: 90, padding: '6px',
                  border: '1px solid var(--border)',
                  borderColor: isSelected ? 'var(--nordstein-purple)' : 'var(--border)',
                  background: isSelected ? 'rgba(69,26,61,0.15)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div onClick={() => { setSelectedDate(dateStr); setCurrent(new Date(dateStr.slice(0, 7) + '-01')); }}
                  style={{ height: '100%' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? 'var(--nordstein-purple)' : 'transparent',
                    color: isToday ? 'white' : isSelected ? 'var(--nordstein-beige)' : 'var(--text-muted)',
                    fontSize: '0.78rem', fontWeight: isToday ? 800 : 500, marginBottom: 4,
                  }}>
                    {dayNum}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayAppts.slice(0, 3).map(a => (
                      <DraggableAppt key={a.id} appt={a} compact onClick={setEditAppt} />
                    ))}
                    {dayAppts.length > 3 && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-subtle)', paddingLeft: 4 }}>+{dayAppts.length - 3} weitere</div>
                    )}
                  </div>
                </div>
              </DroppableDay>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Week View ─────────────────────────────────────────────

  function WeekView() {
    const weekDays = getWeekDays(new Date(selectedDate));
    const CELL_H = 52;

    return (
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
          <div />
          {weekDays.map(d => {
            const ds = toDateStr(d);
            const isToday = ds === todayStr;
            return (
              <div key={ds} onClick={() => { setSelectedDate(ds); setView('day'); }}
                style={{ padding: '10px 4px', textAlign: 'center', cursor: 'pointer', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                  {DAYS_DE_SHORT[(d.getDay() + 6) % 7]}
                </div>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', margin: '4px auto 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'var(--nordstein-purple)' : 'transparent',
                  color: isToday ? 'white' : 'var(--text)', fontWeight: isToday ? 800 : 600, fontSize: '0.9rem',
                }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          {HOURS.map(h => (
  <React.Fragment key={h}>
    <div style={{ height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 4, fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-subtle)', borderTop: '1px solid var(--border)' }}>
      {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
    </div>
    {weekDays.map(d => {
      const ds = toDateStr(d);
      const slotAppts = (apptByDate.get(ds) || []).filter(a => {
        const aH = parseInt(a.time_from.split(':')[0]);
        return aH === h;
      });
      return (
        <DroppableHour key={`${ds}-${h}`} id={`hour-${ds}-${h}`}
          style={{
            height: CELL_H, borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)',
            padding: '2px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative',
          }}
        >
          <div onClick={() => { setSelectedDate(ds); setCreateDefaults({ date: ds, time_from: `${String(h).padStart(2,'0')}:00` }); setShowCreate(true); }}
            style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {slotAppts.map(a => <DraggableAppt key={a.id} appt={a} onClick={setEditAppt} />)}
          </div>
        </DroppableHour>
      );
    })}
  </React.Fragment>
))}
        </div>
      </div>
    );
  }

  // ── Day View ──────────────────────────────────────────────

  function DayView() {
    const CELL_H = 60;
    const dayAppts = apptByDate.get(selectedDate) || [];

    return (
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr' }}>
          {HOURS.map(h => {
  const slotAppts = dayAppts.filter(a => parseInt(a.time_from.split(':')[0]) === h);
  return (
    <React.Fragment key={h}>
      <div style={{ height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 12, paddingTop: 6, fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)', borderTop: '1px solid var(--border)' }}>
        {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
      </div>
      <DroppableHour key={`slot-${h}`} id={`hour-${selectedDate}-${h}`}
        style={{ height: CELL_H, borderTop: '1px solid var(--border)', borderLeft: '2px solid var(--border)', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
        <div onClick={() => { setCreateDefaults({ date: selectedDate, time_from: `${String(h).padStart(2,'0')}:00` }); setShowCreate(true); }}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {slotAppts.map(a => (
            <DraggableAppt key={a.id} appt={a} onClick={setEditAppt} />
          ))}
        </div>
      </DroppableHour>
    </React.Fragment>
  );
})}
        </div>
      </div>
    );
  }

  // ── Upcoming sidebar list ─────────────────────────────────

  const upcomingAppts = useMemo(() =>
    appointments.filter(a => a.date >= todayStr && a.status === 'scheduled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_from.localeCompare(b.time_from))
      .slice(0, 10),
    [appointments, todayStr]
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} modifiers={[restrictToWindowEdges]} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Kalender</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {upcomingAppts.length} bevorstehende Termine
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View switcher */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {([['month', Calendar, 'Monat'], ['week', CalendarRange, 'Woche'], ['day', CalendarDays, 'Tag']] as const).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v as ViewMode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    background: view === v ? 'var(--nordstein-purple)' : 'transparent',
                    color: view === v ? 'white' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s',
                  }}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
            <a href="/api/calendar/ics" className="btn btn-secondary btn-sm" download>
              <Download size={14} /> .ics
            </a>
            <button className="btn btn-primary btn-sm" onClick={() => { setCreateDefaults({}); setShowCreate(true); }}>
              <Plus size={14} /> Termin
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start', height: 'calc(100vh - 140px)' }}>

        {/* Main Calendar Panel */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Nav bar */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button className="btn-icon btn" onClick={navPrev}><ChevronLeft size={16} /></button>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, flex: 1, textAlign: 'center' }}>{navTitle()}</h2>
            <button className="btn-icon btn" onClick={navNext}><ChevronRight size={16} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedDate(todayStr); setCurrent(new Date(today.getFullYear(), today.getMonth(), 1)); }}>
              Heute
            </button>
          </div>

          {view === 'month' && <MonthView />}
          {view === 'week' && <WeekView />}
          {view === 'day' && <DayView />}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Legend */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 8 }}>Terminarten</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(TYPE_CONFIG).filter(([k]) => !['call','demo'].includes(k)).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={12} color={cfg.color} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 800 }}>Nächste Termine</h3>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 400 }}>
              {upcomingAppts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Keine Termine</div>
              ) : upcomingAppts.map(a => {
                const cfg = getCfg(a.type);
                const Icon = cfg.icon;
                return (
                  <div key={a.id}
                    onClick={() => { setSelectedDate(a.date); setCurrent(new Date(a.date.slice(0, 7) + '-01')); }}
                    style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{a.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {new Date(a.date + 'T12:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: 'short' })} · {formatTime(a.time_from)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); setEditAppt(a); }}
                        style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)' }}>
                        <Pencil size={11} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); markDone(a.id); }}
                        style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)' }}>
                        <Check size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeAppt && (
          <div style={{
            background: getCfg(activeAppt.type).bg, color: getCfg(activeAppt.type).color,
            border: `1px solid ${getCfg(activeAppt.type).border}`,
            borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)', cursor: 'grabbing', opacity: 0.95,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            {formatTime(activeAppt.time_from)} {activeAppt.title}
          </div>
        )}
      </DragOverlay>

      {/* Create Modal */}
      {showCreate && (
        <ApptFormModal
          initial={createDefaults}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          saving={saving}
        />
      )}

      {/* Edit Modal */}
      {editAppt && (
        <ApptFormModal
          initial={editAppt}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditAppt(null)}
          saving={saving}
        />
      )}
    </DndContext>
  );
}