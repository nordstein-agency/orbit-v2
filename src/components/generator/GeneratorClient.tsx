'use client';

import { useState } from 'react';
import { Profile, GeneratorSession, BRANCHES, Lead } from '@/types';
import { Zap, CheckCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface Props {
  currentProfile: Profile | null;
  recentSessions: (GeneratorSession & { profile?: { full_name?: string } })[];
}

const AUSTRIAN_REGIONS = [
  'Wien', 'Linz', 'Graz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Wels', 'St. Pölten',
  'Dornbirn', 'Wiener Neustadt', 'Steyr', 'Feldkirch', 'Bregenz', 'Leoben',
  'Oberösterreich', 'Niederösterreich', 'Steiermark', 'Tirol', 'Vorarlberg', 'Kärnten', 'Burgenland',
  'Österreich',
];

export default function GeneratorClient({ currentProfile, recentSessions }: Props) {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [location, setLocation] = useState('Österreich');
  const [customLocation, setCustomLocation] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ leads: Lead[]; imported: number; dupes: number; query: string } | null>(null);
  const [error, setError] = useState('');

  function toggleBranch(b: string) {
    setSelectedBranches(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }

  async function handleGenerate() {
    if (!selectedBranches.length) { setError('Bitte mindestens eine Branche auswählen.'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    const loc = customLocation.trim() || location;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branches: selectedBranches.join(','), location: loc, limit }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Fehler beim Generieren'); }
      else { setResult(data); }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="page-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Lead-Generator</h1>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Neue Leads via Google Maps (Outscraper) — Duplikate werden automatisch gefiltert
        </p>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Generator konfigurieren</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Branches */}
              <div className="form-group">
                <label className="label">Branchen * ({selectedBranches.length} gewählt)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {BRANCHES.map(b => (
                    <button
                      key={b}
                      onClick={() => toggleBranch(b)}
                      style={{
                        padding: '6px 14px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                        background: selectedBranches.includes(b) ? 'var(--nordstein-purple)' : 'var(--surface-3)',
                        color: selectedBranches.includes(b) ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${selectedBranches.includes(b) ? 'var(--nordstein-purple-light)' : 'transparent'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Region */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Region</label>
                  <select className="select" value={location} onChange={e => setLocation(e.target.value)}>
                    {AUSTRIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Eigene Region (überschreibt)</label>
                  <input className="input" value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="z.B. Steyr, OÖ" />
                </div>
              </div>

              {/* Limit */}
              <div className="form-group">
                <label className="label">Max. Ergebnisse: {limit}</label>
                <input type="range" min={5} max={100} step={5} value={limit} onChange={e => setLimit(+e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--nordstein-purple)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                  <span>5</span><span>100</span>
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#2d0f0f', border: '1px solid #991b1b', borderRadius: 6, color: '#fca5a5', fontSize: '0.83rem' }}>
                  <AlertCircle size={14} />{error}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading || !selectedBranches.length}
                style={{ width: '100%', height: 48 }}
              >
                {loading ? (
                  <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> Suche läuft...</>
                ) : (
                  <><Zap size={16} /> Leads generieren</>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="card">
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} color="#16a34a" />
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Ergebnis</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Query: {result.query}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4ade80' }}>{result.imported}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Neu importiert</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>{result.dupes}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Duplikate übersprungen</div>
                  </div>
                </div>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {result.leads.map((lead, i) => (
                  <div key={i} style={{ padding: '10px 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lead.region}</div>
                    </div>
                    {lead.phone && <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>{lead.phone}</span>}
                    {(lead as Lead & { is_new?: boolean }).is_new ? (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#0f2d1a', color: '#4ade80', border: '1px solid #16a34a' }}>NEU</span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-3)', color: 'var(--text-subtle)' }}>Duplikat</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Letzte Suchen</h2>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {recentSessions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Noch keine Suchen</div>
            ) : (
              recentSessions.map(s => (
                <div key={s.id} style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.query}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>+{s.leads_new} neu</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{s.leads_dupes} Dupes</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} />{new Date(s.created_at).toLocaleDateString('de-AT')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
