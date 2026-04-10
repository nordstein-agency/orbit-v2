'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Lead, Profile, PIPELINE_TABS, STATUS_LABELS, LeadStatus, BRANCHES } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  Phone, Globe, FileText, Calendar, Trash2,
  Search, Plus, ChevronDown, Check, PhoneCall, Users, Handshake,
  TrendingUp, CircleX, Clock, PhoneOff, Filter, X,
} from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import LeadDetailModal from '@/components/modals/LeadDetailModal';
import NoteModal from '@/components/modals/NoteModal';
import AppointmentModal from '@/components/modals/AppointmentModal';
import ManualLeadModal from '@/components/modals/ManualLeadModal';

// ── Toast ────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: '#16a34a', color: 'white', padding: '12px 20px',
      borderRadius: 10, fontWeight: 700, fontSize: '0.875rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'slideUp 0.2s ease',
    }}>
      <Check size={15} /> {msg}
    </div>
  );
}

// ── Status config ────────────────────────────────────────────
const STATUS_ICONS: Record<LeadStatus, React.ReactNode> = {
  NEU:            <Users size={13} />,
  VK:             <PhoneCall size={13} />,
  CC:             <Handshake size={13} />,
  ABSCHLUSS:      <TrendingUp size={13} />,
  FOLLOW_UP:      <Clock size={13} />,
  KEIN_INTERESSE: <CircleX size={13} />,
  NICHT_ERREICHT: <PhoneOff size={13} />,
};

const STATUS_PILL_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  NEU:            { bg: '#1a1520', text: '#d2d2d2', border: '#333' },
  VK:             { bg: '#2d0f27', text: '#e6ded3', border: '#451a3d' },
  CC:             { bg: '#3d1535', text: '#f5e8f2', border: '#6b2a5e' },
  ABSCHLUSS:      { bg: '#0f2d1a', text: '#6ee7b7', border: '#16a34a' },
  FOLLOW_UP:      { bg: '#2d1f0a', text: '#fbbf24', border: '#854d0e' },
  KEIN_INTERESSE: { bg: '#2d0f0f', text: '#fca5a5', border: '#991b1b' },
  NICHT_ERREICHT: { bg: '#1a1f28', text: '#9ca3af', border: '#374151' },
};

// ── Status Dropdown ──────────────────────────────────────────
function StatusDropdown({ value, onChange }: { value: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const colors = STATUS_PILL_COLORS[value];
  return (
    <Dropdown minWidth={210} trigger={
      <button style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px 4px 8px', borderRadius: 99,
        background: colors.bg, color: colors.text,
        border: `1px solid ${colors.border}`,
        fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
        letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {STATUS_ICONS[value]}
        {STATUS_LABELS[value]}
        <ChevronDown size={11} style={{ marginLeft: 2, opacity: 0.7 }} />
      </button>
    }>
      {(close: () => void) => (
        <>
          {PIPELINE_TABS.map(tab => (
            <div key={tab.key}>
              {tab.divider && <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />}
              <button
                onClick={() => { onChange(tab.key); close(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 7, border: 'none',
                  background: value === tab.key ? 'var(--nordstein-purple-dark)' : 'transparent',
                  color: value === tab.key ? 'var(--nordstein-beige)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left',
                }}
                onMouseEnter={e => { if (value !== tab.key) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
                onMouseLeave={e => { if (value !== tab.key) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {STATUS_ICONS[tab.key]}
                {tab.label}
                {value === tab.key && <Check size={12} style={{ marginLeft: 'auto' }} />}
              </button>
            </div>
          ))}
        </>
      )}
    </Dropdown>
  );
}

// ── Assign Dropdown ──────────────────────────────────────────
function AssignDropdown({ value, profiles, onChange }: {
  value: string | null;
  profiles: Pick<Profile, 'id' | 'full_name' | 'email'>[];
  onChange: (id: string) => void;
}) {
  const current = profiles.find(p => p.id === value);
  return (
    <Dropdown minWidth={180} align="right" trigger={
      <button style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 8,
        background: 'var(--surface-3)', color: 'var(--text-muted)',
        border: '1px solid var(--border)', fontWeight: 600,
        fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <Users size={12} />
        {current ? (current.full_name || current.email) : 'Nicht zugewiesen'}
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>
    }>
      {(close: () => void) => (
        <>
          <button onClick={() => { onChange(''); close(); }}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-subtle)', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left' }}>
            Nicht zugewiesen
          </button>
          {profiles.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); close(); }}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none',
                background: value === p.id ? 'var(--nordstein-purple-dark)' : 'transparent',
                color: value === p.id ? 'var(--nordstein-beige)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left', fontWeight: 600,
              }}>
              {p.full_name || p.email}
            </button>
          ))}
        </>
      )}
    </Dropdown>
  );
}

// ── Main ─────────────────────────────────────────────────────
interface Props {
  initialLeads: Lead[];
  currentProfile: Profile | null;
  allProfiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[];
}

export default function PipelineClient({ initialLeads, currentProfile, allProfiles }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeTab, setActiveTab] = useState<LeadStatus>('NEU');
  const [search, setSearch] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [noteTarget, setNoteTarget] = useState<Lead | null>(null);
  const [apptTarget, setApptTarget] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const supabase = createClient();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach(l => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  // Alle Branchen die aktuell in den Leads vorkommen
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.industry) set.add(l.industry); });
    return Array.from(set).sort();
  }, [leads]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.source) set.add(l.source); });
    return Array.from(set).sort();
  }, [leads]);

  const activeFilterCount = [filterAssigned, filterIndustry, filterSource].filter(Boolean).length;

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (l.status !== activeTab) return false;
      if (filterIndustry && l.industry !== filterIndustry) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (filterAssigned && l.assigned_to !== filterAssigned) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.name.toLowerCase().includes(q) &&
          !(l.region || '').toLowerCase().includes(q) &&
          !(l.industry || '').toLowerCase().includes(q) &&
          !(l.ceos || '').toLowerCase().includes(q) &&
          !(l.phone || '').includes(q) &&
          !(l.email_general || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [leads, activeTab, search, filterAssigned, filterIndustry, filterSource]);

  const handleStatusChange = useCallback(async (lead: Lead, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === lead.id
      ? { ...l, status: newStatus, status_changed_at: new Date().toISOString() } : l));
    const { error } = await supabase.from('leads').update({
      status: newStatus,
      status_changed_at: new Date().toISOString(),
      status_changed_by: currentProfile?.id,
    }).eq('id', lead.id);
    if (error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
    } else {
      setToast(`${lead.name} → ${STATUS_LABELS[newStatus]}`);
      await supabase.from('activity_log').insert({
        lead_id: lead.id, user_id: currentProfile?.id,
        type: 'status_change', old_status: lead.status, new_status: newStatus,
        metadata: { lead_name: lead.name },
      });
    }
  }, [currentProfile, supabase]);

  async function handleDelete(lead: Lead) {
    if (!confirm(`"${lead.name}" wirklich löschen?`)) return;
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', lead.id);
  }

  async function handleAssign(lead: Lead, userId: string) {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: userId || null } : l));
    await supabase.from('leads').update({ assigned_to: userId || null }).eq('id', lead.id);
  }

  function refreshLead(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    if (selectedLead?.id === updated.id) setSelectedLead(updated);
  }

  const SOURCE_LABELS: Record<string, string> = {
    manual: 'Manuell', import: 'Import', generated: 'Generator', meta: 'Meta Ads',
  };

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Pipeline</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>{leads.length} Leads gesamt</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Lead hinzufügen
          </button>
        </div>

        {/* Pipeline Tabs */}
        <div className="pipeline-tabbar">
          {PIPELINE_TABS.map(tab => (
            <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {tab.divider && <div className="divider" />}
              <button
                className={`pipeline-tab ${activeTab === tab.key ? `active ${tab.key.toLowerCase().replace('_', '')}` : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {STATUS_ICONS[tab.key]}
                {tab.label}
                {counts[tab.key] > 0 && <span className="tab-count">{counts[tab.key]}</span>}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="page-body">
        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Name, Region, E-Mail, Telefon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFilters(s => !s)}
            style={{ position: 'relative', borderColor: activeFilterCount > 0 ? 'var(--nordstein-purple)' : undefined, color: activeFilterCount > 0 ? 'var(--nordstein-beige)' : undefined }}
          >
            <Filter size={14} />
            Filter
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--nordstein-purple)', color: 'white',
                fontSize: '0.65rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Active filter chips */}
          {filterIndustry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'var(--nordstein-purple-dark)', border: '1px solid var(--nordstein-purple)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--nordstein-beige)' }}>
              {filterIndustry}
              <button onClick={() => setFilterIndustry('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={12} /></button>
            </div>
          )}
          {filterAssigned && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'var(--nordstein-purple-dark)', border: '1px solid var(--nordstein-purple)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--nordstein-beige)' }}>
              {allProfiles.find(p => p.id === filterAssigned)?.full_name || 'Mitarbeiter'}
              <button onClick={() => setFilterAssigned('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={12} /></button>
            </div>
          )}
          {filterSource && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'var(--nordstein-purple-dark)', border: '1px solid var(--nordstein-purple)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--nordstein-beige)' }}>
              {SOURCE_LABELS[filterSource] || filterSource}
              <button onClick={() => setFilterSource('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={12} /></button>
            </div>
          )}

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} Einträge
          </span>
        </div>

        {/* Expanded Filter Panel */}
        {showFilters && (
          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap',
            padding: '1rem 1.25rem', marginBottom: '1rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', alignItems: 'flex-end',
          }}>
            {/* Branche */}
            <div className="form-group" style={{ minWidth: 180, flex: 1 }}>
              <label className="label">Branche</label>
              <Dropdown minWidth={200} trigger={
                <button style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '0 14px', height: 42, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)', border: `1px solid ${filterIndustry ? 'var(--nordstein-purple)' : 'var(--border)'}`,
                  color: filterIndustry ? 'var(--nordstein-beige)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}>
                  <span>{filterIndustry || 'Alle Branchen'}</span>
                  <ChevronDown size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                </button>
              }>
                {(close: () => void) => (
                  <>
                    <button onClick={() => { setFilterIndustry(''); close(); }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: !filterIndustry ? 'var(--nordstein-purple-dark)' : 'transparent', color: !filterIndustry ? 'var(--nordstein-beige)' : 'var(--text-subtle)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600 }}>
                      Alle Branchen
                    </button>
                    {availableIndustries.map(ind => (
                      <button key={ind} onClick={() => { setFilterIndustry(ind); close(); }}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: filterIndustry === ind ? 'var(--nordstein-purple-dark)' : 'transparent', color: filterIndustry === ind ? 'var(--nordstein-beige)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600 }}
                        onMouseEnter={e => { if (filterIndustry !== ind) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
                        onMouseLeave={e => { if (filterIndustry !== ind) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {ind}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            </div>

            {/* Mitarbeiter */}
            <div className="form-group" style={{ minWidth: 180, flex: 1 }}>
              <label className="label">Mitarbeiter</label>
              <Dropdown minWidth={200} trigger={
                <button style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '0 14px', height: 42, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)', border: `1px solid ${filterAssigned ? 'var(--nordstein-purple)' : 'var(--border)'}`,
                  color: filterAssigned ? 'var(--nordstein-beige)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}>
                  <span>{filterAssigned ? (allProfiles.find(p => p.id === filterAssigned)?.full_name || 'Mitarbeiter') : 'Alle Mitarbeiter'}</span>
                  <ChevronDown size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                </button>
              }>
                {(close: () => void) => (
                  <>
                    <button onClick={() => { setFilterAssigned(''); close(); }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: !filterAssigned ? 'var(--nordstein-purple-dark)' : 'transparent', color: !filterAssigned ? 'var(--nordstein-beige)' : 'var(--text-subtle)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600 }}>
                      Alle Mitarbeiter
                    </button>
                    {allProfiles.map(p => (
                      <button key={p.id} onClick={() => { setFilterAssigned(p.id); close(); }}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: filterAssigned === p.id ? 'var(--nordstein-purple-dark)' : 'transparent', color: filterAssigned === p.id ? 'var(--nordstein-beige)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600 }}
                        onMouseEnter={e => { if (filterAssigned !== p.id) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
                        onMouseLeave={e => { if (filterAssigned !== p.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {p.full_name || p.email}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            </div>

            {/* Quelle */}
            <div className="form-group" style={{ minWidth: 160, flex: 1 }}>
              <label className="label">Quelle</label>
              <Dropdown minWidth={180} trigger={
                <button style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '0 14px', height: 42, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)', border: `1px solid ${filterSource ? 'var(--nordstein-purple)' : 'var(--border)'}`,
                  color: filterSource ? 'var(--nordstein-beige)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}>
                  <span>{filterSource ? (SOURCE_LABELS[filterSource] || filterSource) : 'Alle Quellen'}</span>
                  <ChevronDown size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                </button>
              }>
                {(close: () => void) => (
                  <>
                    <button onClick={() => { setFilterSource(''); close(); }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: !filterSource ? 'var(--nordstein-purple-dark)' : 'transparent', color: !filterSource ? 'var(--nordstein-beige)' : 'var(--text-subtle)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600 }}>
                      Alle Quellen
                    </button>
                    {availableSources.map(src => (
                      <button key={src} onClick={() => { setFilterSource(src); close(); }}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: filterSource === src ? 'var(--nordstein-purple-dark)' : 'transparent', color: filterSource === src ? 'var(--nordstein-beige)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600 }}
                        onMouseEnter={e => { if (filterSource !== src) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
                        onMouseLeave={e => { if (filterSource !== src) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {SOURCE_LABELS[src] || src}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            </div>

            {/* Reset */}
            {activeFilterCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterIndustry(''); setFilterAssigned(''); setFilterSource(''); }}
                style={{ alignSelf: 'flex-end', marginBottom: 1 }}>
                <X size={13} /> Zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Table — kein overflow:hidden auf Card, nur auf innerem scroll-container */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflow: 'visible',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>○</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {search || activeFilterCount > 0 ? 'Keine Ergebnisse für diese Filter' : `Keine Leads in "${STATUS_LABELS[activeTab]}"`}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)' }}>
              <table className="data-table" style={{ minWidth: 700, tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '19%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Unternehmen</th>
                    <th>Kontakt</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th>Zugewiesen</th>
                    <th style={{ textAlign: 'right' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <div
                          className="lead-row-name"
                          style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedLead(lead)}
                        >
                          {lead.name}
                        </div>
                        {lead.industry && (
                          <div className="lead-row-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.industry}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {lead.ceos && (
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.ceos}
                            </div>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                              <Phone size={10} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {lead.region || '—'}
                        </span>
                      </td>
                      <td>
                        <StatusDropdown value={lead.status} onChange={s => handleStatusChange(lead, s)} />
                      </td>
                      <td>
                        <AssignDropdown value={lead.assigned_to} profiles={allProfiles} onChange={uid => handleAssign(lead, uid)} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          {lead.website && (
                            
                              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank" rel="noreferrer"
                              className="btn-icon btn" title="Website"
                            >
                              <Globe size={13} />
                            </a>
                          )}
                          <button
                            className="btn-icon btn"
                            onClick={() => setNoteTarget(lead)}
                            title="Notizen"
                            style={(lead.notes?.length || 0) > 0 ? { color: 'var(--nordstein-purple-light)', borderColor: 'var(--nordstein-purple)' } : {}}
                          >
                            <FileText size={13} />
                          </button>
                          <button className="btn-icon btn" onClick={() => setApptTarget(lead)} title="Termin">
                            <Calendar size={13} />
                          </button>
                          {(currentProfile?.role === 'admin' || lead.created_by === currentProfile?.id) && (
                            <button className="btn-icon btn" onClick={() => handleDelete(lead)} title="Löschen" style={{ color: '#dc2626' }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead} currentProfile={currentProfile} allProfiles={allProfiles}
          onClose={() => setSelectedLead(null)} onUpdate={refreshLead} onStatusChange={handleStatusChange}
        />
      )}
      {noteTarget && (
        <NoteModal lead={noteTarget} currentProfile={currentProfile} onClose={() => setNoteTarget(null)} onSaved={refreshLead} />
      )}
      {apptTarget && (
        <AppointmentModal lead={apptTarget} currentProfile={currentProfile} onClose={() => setApptTarget(null)} onSaved={() => setApptTarget(null)} />
      )}
      {showCreateModal && (
        <ManualLeadModal currentProfile={currentProfile} onClose={() => setShowCreateModal(false)} onCreated={l => setLeads(prev => [l, ...prev])} />
      )}
    </>
  );
}