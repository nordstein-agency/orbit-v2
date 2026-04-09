'use client';

import { useState, useMemo, useTransition } from 'react';
import { Lead, Profile, PIPELINE_TABS, STATUS_LABELS, LeadStatus } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  Phone, Globe, Mail, FileText, Calendar, Pencil, Trash2,
  ChevronDown, Search, SlidersHorizontal, UserCircle, Plus
} from 'lucide-react';
import LeadDetailModal from '@/components/modals/LeadDetailModal';
import NoteModal from '@/components/modals/NoteModal';
import AppointmentModal from '@/components/modals/AppointmentModal';
import ManualLeadModal from '@/components/modals/ManualLeadModal';

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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [noteTarget, setNoteTarget] = useState<Lead | null>(null);
  const [apptTarget, setApptTarget] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach(l => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (l.status !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.name.toLowerCase().includes(q) &&
          !(l.region || '').toLowerCase().includes(q) &&
          !(l.industry || '').toLowerCase().includes(q) &&
          !(l.ceos || '').toLowerCase().includes(q)
        ) return false;
      }
      if (filterAssigned && l.assigned_to !== filterAssigned) return false;
      return true;
    });
  }, [leads, activeTab, search, filterAssigned]);

  async function handleStatusChange(lead: Lead, newStatus: LeadStatus) {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus, status_changed_at: new Date().toISOString() } : l));

    const { error } = await supabase
      .from('leads')
      .update({
        status: newStatus,
        status_changed_at: new Date().toISOString(),
        status_changed_by: currentProfile?.id,
      })
      .eq('id', lead.id);

    if (error) {
      // Revert
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
      alert('Fehler beim Status-Update: ' + error.message);
      return;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      user_id: currentProfile?.id,
      type: 'status_change',
      old_status: lead.status,
      new_status: newStatus,
      metadata: { lead_name: lead.name },
    });
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`"${lead.name}" wirklich löschen?`)) return;
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', lead.id);
    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      user_id: currentProfile?.id,
      type: 'lead_deleted',
      metadata: { lead_name: lead.name },
    });
  }

  async function handleAssign(lead: Lead, userId: string) {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: userId || null } : l));
    await supabase.from('leads').update({ assigned_to: userId || null }).eq('id', lead.id);
  }

  function refreshLead(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    if (selectedLead?.id === updated.id) setSelectedLead(updated);
  }

  function addLead(lead: Lead) {
    setLeads(prev => [lead, ...prev]);
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Pipeline</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {leads.length} Leads gesamt
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} />
            Lead hinzufügen
          </button>
        </div>

        {/* Pipeline Tabs */}
        <div className="pipeline-tabbar">
          {PIPELINE_TABS.map((tab, idx) => {
            const isActive = activeTab === tab.key;
            const tabClass = tab.key.toLowerCase().replace('_', '');
            return (
              <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {tab.divider && <div className="divider" />}
                <button
                  className={`pipeline-tab ${isActive ? `active ${tabClass}` : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span className="tab-count">{counts[tab.key]}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Suche nach Name, Region, Branche..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={filterAssigned}
            onChange={e => setFilterAssigned(e.target.value)}
          >
            <option value="">Alle Mitarbeiter</option>
            {allProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
            {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
          </span>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>○</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {search ? 'Keine Ergebnisse gefunden' : `Keine Leads in "${STATUS_LABELS[activeTab]}"`}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
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
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      allProfiles={allProfiles}
                      currentProfile={currentProfile}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onAssign={handleAssign}
                      onOpenDetail={() => setSelectedLead(lead)}
                      onOpenNote={() => setNoteTarget(lead)}
                      onOpenAppt={() => setApptTarget(lead)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          currentProfile={currentProfile}
          allProfiles={allProfiles}
          onClose={() => setSelectedLead(null)}
          onUpdate={refreshLead}
          onStatusChange={handleStatusChange}
        />
      )}
      {noteTarget && (
        <NoteModal
          lead={noteTarget}
          currentProfile={currentProfile}
          onClose={() => setNoteTarget(null)}
          onSaved={refreshLead}
        />
      )}
      {apptTarget && (
        <AppointmentModal
          lead={apptTarget}
          currentProfile={currentProfile}
          onClose={() => setApptTarget(null)}
          onSaved={() => setApptTarget(null)}
        />
      )}
      {showCreateModal && (
        <ManualLeadModal
          currentProfile={currentProfile}
          onClose={() => setShowCreateModal(false)}
          onCreated={addLead}
        />
      )}
    </>
  );
}

// ── Lead Row ──────────────────────────────────────────────────

interface RowProps {
  lead: Lead;
  allProfiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[];
  currentProfile: Profile | null;
  onStatusChange: (l: Lead, s: LeadStatus) => void;
  onDelete: (l: Lead) => void;
  onAssign: (l: Lead, uid: string) => void;
  onOpenDetail: () => void;
  onOpenNote: () => void;
  onOpenAppt: () => void;
}

function LeadRow({ lead, allProfiles, currentProfile, onStatusChange, onDelete, onAssign, onOpenDetail, onOpenNote, onOpenAppt }: RowProps) {
  const noteCount = lead.notes?.length || 0;
  const hasUpcomingAppt = lead.appointments?.some(a => a.status === 'scheduled');

  return (
    <tr>
      {/* Company */}
      <td>
        <div className="lead-row-name" style={{ cursor: 'pointer' }} onClick={onOpenDetail}>{lead.name}</div>
        {lead.industry && <div className="lead-row-sub">{lead.industry}</div>}
      </td>

      {/* Contact */}
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {lead.ceos && <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{lead.ceos}</div>}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <Phone size={11} />{lead.phone}
            </a>
          )}
          {lead.email_general && (
            <a href={`mailto:${lead.email_general}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <Mail size={11} />{lead.email_general}
            </a>
          )}
        </div>
      </td>

      {/* Region */}
      <td>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.region || '—'}</span>
      </td>

      {/* Status select */}
      <td>
        <select
          className="select"
          style={{ width: 'auto', minWidth: '150px', height: '34px', fontSize: '0.78rem', fontWeight: 700 }}
          value={lead.status}
          onChange={e => onStatusChange(lead, e.target.value as LeadStatus)}
        >
          {PIPELINE_TABS.map(t => (
            <option key={t.key} value={t.key}>{STATUS_LABELS[t.key]}</option>
          ))}
        </select>
      </td>

      {/* Assigned */}
      <td>
        <select
          className="select"
          style={{ width: 'auto', minWidth: '130px', height: '34px', fontSize: '0.78rem' }}
          value={lead.assigned_to || ''}
          onChange={e => onAssign(lead, e.target.value)}
        >
          <option value="">Nicht zugewiesen</option>
          {allProfiles.map(p => (
            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
          ))}
        </select>
      </td>

      {/* Actions */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
          {lead.website && (
            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="btn-icon btn" title="Website">
              <Globe size={14} />
            </a>
          )}
          <button className="btn-icon btn" onClick={onOpenNote} title="Notizen" style={noteCount > 0 ? { color: 'var(--nordstein-purple-light)', borderColor: 'var(--nordstein-purple)' } : {}}>
            <FileText size={14} />
            {noteCount > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 800, position: 'absolute', top: -4, right: -4, background: 'var(--nordstein-purple)', color: 'white', borderRadius: '99px', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>{noteCount}</span>}
          </button>
          <button className="btn-icon btn" onClick={onOpenAppt} title="Termin" style={hasUpcomingAppt ? { color: '#f97316', borderColor: '#854d0e' } : {}}>
            <Calendar size={14} />
          </button>
          <button className="btn-icon btn" onClick={onOpenDetail} title="Details">
            <Pencil size={14} />
          </button>
          {(currentProfile?.role === 'admin' || lead.created_by === currentProfile?.id) && (
            <button className="btn-icon btn" onClick={() => onDelete(lead)} title="Löschen" style={{ color: '#dc2626' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
