'use client';

import { useState, useMemo } from 'react';
import { Lead, Profile, LeadStatus, PIPELINE_TABS, STATUS_LABELS, BRANCHES } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Search, Download, Trash2, Plus, Filter } from 'lucide-react';
import ManualLeadModal from '@/components/modals/ManualLeadModal';
import LeadDetailModal from '@/components/modals/LeadDetailModal';
import NoteModal from '@/components/modals/NoteModal';

interface Props {
  initialLeads: Lead[];
  currentProfile: Profile | null;
  allProfiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[];
}

export default function LeadsClient({ initialLeads, currentProfile, allProfiles }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [noteLead, setNoteLead] = useState<Lead | null>(null);
  const supabase = createClient();

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterIndustry && l.industry !== filterIndustry) return false;
      if (filterAssigned && l.assigned_to !== filterAssigned) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.region || '').toLowerCase().includes(q) ||
          (l.ceos || '').toLowerCase().includes(q) ||
          (l.email_general || '').toLowerCase().includes(q) ||
          (l.phone || '').includes(q)
        );
      }
      return true;
    });
  }, [leads, search, filterStatus, filterIndustry, filterAssigned]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (!confirm(`${selected.size} Leads löschen?`)) return;
    const ids = Array.from(selected);
    await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
  }

  async function bulkStatusChange(status: LeadStatus) {
    if (!selected.size) return;
    const ids = Array.from(selected);
    await supabase.from('leads').update({
      status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: currentProfile?.id,
    }).in('id', ids);
    setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, status } : l));
    setSelected(new Set());
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Branche', 'Region', 'Status', 'Telefon', 'E-Mail', 'CEO', 'Website', 'Erstellt'],
      ...filtered.map(l => [
        l.name, l.industry || '', l.region || '', STATUS_LABELS[l.status],
        l.phone || '', l.email_general || '', l.ceos || '', l.website || '',
        new Date(l.created_at).toLocaleDateString('de-AT'),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `nordstein-leads-${Date.now()}.csv`; a.click();
  }

  function refreshLead(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    if (detailLead?.id === updated.id) setDetailLead(updated);
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Leads</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>{leads.length} Leads gesamt</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Neu
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input className="input" style={{ paddingLeft: '36px' }} placeholder="Name, Region, E-Mail, Telefon..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Alle Status</option>
            {PIPELINE_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
            <option value="">Alle Branchen</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
            <option value="">Alle Mitarbeiter</option>
            {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filtered.length} Einträge</span>
        </div>
      </div>

      <div className="page-body">
        {/* Bulk actions */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', padding: '10px 16px', background: 'var(--nordstein-purple-dark)', border: '1px solid var(--nordstein-purple)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--nordstein-beige)' }}>{selected.size} ausgewählt</span>
            <select className="select" style={{ width: 'auto', height: 32, fontSize: '0.78rem' }} defaultValue="" onChange={e => { if (e.target.value) bulkStatusChange(e.target.value as LeadStatus); e.target.value = ''; }}>
              <option value="">Status setzen...</option>
              {PIPELINE_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {currentProfile?.role === 'admin' && (
              <button className="btn btn-danger btn-sm" onClick={bulkDelete}>
                <Trash2 size={13} /> Löschen
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Aufheben</button>
          </div>
        )}

        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
              Keine Leads gefunden
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                    </th>
                    <th>Unternehmen</th>
                    <th>Kontakt</th>
                    <th>Branche</th>
                    <th>Status</th>
                    <th>Zugewiesen</th>
                    <th>Erstellt</th>
                    <th>Notizen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr key={lead.id} style={{ opacity: selected.has(lead.id) ? 0.8 : 1 }}>
                      <td>
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td>
                        <div className="lead-row-name" style={{ cursor: 'pointer' }} onClick={() => setDetailLead(lead)}>{lead.name}</div>
                        {lead.region && <div className="lead-row-sub">{lead.region}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          {lead.ceos && <div style={{ fontWeight: 600, color: 'var(--text)' }}>{lead.ceos}</div>}
                          {lead.phone && <div style={{ color: 'var(--text-muted)' }}>{lead.phone}</div>}
                          {lead.email_general && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{lead.email_general}</div>}
                        </div>
                      </td>
                      <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.industry || '—'}</span></td>
                      <td><span className={`status-badge status-${lead.status}`}>{STATUS_LABELS[lead.status]}</span></td>
                      <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{(lead as Lead & { assigned_profile?: { full_name?: string } }).assigned_profile?.full_name || '—'}</span></td>
                      <td><span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{new Date(lead.created_at).toLocaleDateString('de-AT')}</span></td>
                      <td>
                        {((lead as Lead & { notes?: { id: string }[] }).notes?.length || 0) > 0 ? (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--nordstein-purple-light)' }} onClick={() => setNoteLead(lead)}>
                            📝 {(lead as Lead & { notes?: { id: string }[] }).notes?.length}
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => setNoteLead(lead)}>+ Notiz</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && <ManualLeadModal currentProfile={currentProfile} onClose={() => setShowCreate(false)} onCreated={l => setLeads(prev => [l, ...prev])} />}
      {detailLead && <LeadDetailModal lead={detailLead} currentProfile={currentProfile} allProfiles={allProfiles} onClose={() => setDetailLead(null)} onUpdate={refreshLead} onStatusChange={(l, s) => { setLeads(prev => prev.map(x => x.id === l.id ? { ...x, status: s } : x)); }} />}
      {noteLead && <NoteModal lead={noteLead} currentProfile={currentProfile} onClose={() => setNoteLead(null)} onSaved={refreshLead} />}
    </>
  );
}
