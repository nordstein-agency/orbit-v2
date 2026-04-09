'use client';

import { useState, useRef } from 'react';
import { Profile } from '@/types';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface Props {
  currentProfile: Profile | null;
}

interface ParsedLead {
  name: string; region?: string; phone?: string; email_general?: string;
  email_ceo?: string; ceos?: string; website?: string; industry?: string; notes?: string;
}

interface ImportResult {
  imported: number; skipped: number; duplicates: string[]; total: number;
}

export default function ImportClient({ currentProfile }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedLead[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const TARGET_FIELDS = [
    { key: 'name', label: 'Firmenname *', required: true },
    { key: 'ceos', label: 'Ansprechperson / GF' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email_general', label: 'E-Mail (Allgemein)' },
    { key: 'email_ceo', label: 'E-Mail (CEO)' },
    { key: 'website', label: 'Website' },
    { key: 'region', label: 'Region / Adresse' },
    { key: 'industry', label: 'Branche' },
    { key: 'notes', label: 'Notiz' },
  ];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');

    try {
      const XLSX = await import('xlsx');
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
      if (!json.length) { setError('Datei ist leer.'); return; }

      const headers = json[0].map(h => String(h || '').trim());
      setRawHeaders(headers);

      const rows = json.slice(1).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { if (h) obj[h] = String(row[i] ?? '').trim(); });
        return obj;
      }).filter(r => Object.values(r).some(v => v));
      setRawRows(rows);

      // Auto-map common field names
      const autoMap: Record<string, string> = {};
      const commonMaps: Record<string, string[]> = {
        name: ['name', 'firma', 'firmenname', 'company', 'unternehmen', 'unternehmensname'],
        ceos: ['ceos', 'ceo', 'gf', 'owner', 'ansprechperson', 'kontakt', 'ansprechpartner', 'geschäftsführer'],
        phone: ['phone', 'telefon', 'tel', 'fon', 'mobil', 'mobile'],
        email_general: ['email_general', 'email', 'e-mail', 'mail', 'e_mail'],
        website: ['website', 'web', 'url', 'homepage'],
        region: ['region', 'adresse', 'address', 'ort', 'city', 'stadt', 'plz'],
        industry: ['industry', 'branche', 'kategorie'],
      };
      headers.forEach(h => {
        const hl = h.toLowerCase().replace(/[-\s]/g, '_');
        for (const [target, aliases] of Object.entries(commonMaps)) {
          if (aliases.some(a => hl.includes(a)) && !autoMap[target]) {
            autoMap[target] = h;
          }
        }
      });
      setFieldMap(autoMap);
    } catch (e: unknown) {
      setError('Fehler beim Lesen der Datei: ' + (e as Error).message);
    }
  }

  async function handleImport() {
    if (!rawRows.length || !currentProfile) return;
    if (!fieldMap.name) { setError('Bitte das Pflichtfeld "Firmenname" zuweisen.'); return; }
    setLoading(true); setError('');

    const leads = rawRows.map(row => {
      const lead: Record<string, string> = {};
      for (const [target, source] of Object.entries(fieldMap)) {
        if (source) lead[target] = row[source] || '';
      }
      return lead;
    }).filter(l => l.name?.trim());

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, userId: currentProfile.id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Import-Fehler');
      else setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  function reset() {
    setFile(null); setParsed([]); setFieldMap({}); setRawHeaders([]); setRawRows([]); setResult(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      <div className="page-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Import</h1>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          CSV oder XLSX importieren — Duplikate werden automatisch erkannt
        </p>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>
        {/* Upload area */}
        {!file ? (
          <div
            className="card"
            onClick={() => inputRef.current?.click()}
            style={{ padding: '4rem', textAlign: 'center', cursor: 'pointer', border: '2px dashed var(--border)', background: 'transparent', transition: 'border-color 0.2s' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && inputRef.current) { const dt = new DataTransfer(); dt.items.add(f); inputRef.current.files = dt.files; handleFileChange({ target: inputRef.current } as React.ChangeEvent<HTMLInputElement>); } }}
          >
            <Upload size={40} style={{ color: 'var(--nordstein-purple)', marginBottom: '1rem' }} />
            <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>CSV oder XLSX hier ablegen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>oder klicken zum Auswählen</p>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* File info */}
            <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={20} color="var(--nordstein-purple)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{file.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rawRows.length} Zeilen erkannt</div>
              </div>
              <button className="btn-icon btn" onClick={reset}><X size={16} /></button>
            </div>

            {/* Field mapping */}
            {rawHeaders.length > 0 && !result && (
              <div className="card">
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Felder zuweisen</h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Welche Spalte entspricht welchem Feld?</p>
                </div>
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {TARGET_FIELDS.map(tf => (
                    <div key={tf.key} className="form-group">
                      <label className="label">{tf.label}</label>
                      <select
                        className="select"
                        value={fieldMap[tf.key] || ''}
                        onChange={e => setFieldMap(prev => ({ ...prev, [tf.key]: e.target.value }))}
                      >
                        <option value="">— nicht importieren —</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                {rawRows.length > 0 && fieldMap.name && (
                  <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '8px' }}>
                      Vorschau (erste 3 Zeilen)
                    </div>
                    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <table className="data-table" style={{ minWidth: 600 }}>
                        <thead>
                          <tr>
                            {TARGET_FIELDS.filter(tf => fieldMap[tf.key]).map(tf => (
                              <th key={tf.key}>{tf.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawRows.slice(0, 3).map((row, i) => (
                            <tr key={i}>
                              {TARGET_FIELDS.filter(tf => fieldMap[tf.key]).map(tf => (
                                <td key={tf.key} style={{ fontSize: '0.78rem' }}>{row[fieldMap[tf.key]] || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ margin: '0 1.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#2d0f0f', border: '1px solid #991b1b', borderRadius: 6, color: '#fca5a5', fontSize: '0.83rem' }}>
                    <AlertCircle size={14} />{error}
                  </div>
                )}

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-ghost" onClick={reset}>Abbrechen</button>
                  <button className="btn btn-primary" onClick={handleImport} disabled={loading || !fieldMap.name}>
                    {loading ? 'Importieren…' : `${rawRows.length} Leads importieren`}
                  </button>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <CheckCircle size={40} color="#16a34a" style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>Import abgeschlossen!</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.5rem 0' }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4ade80' }}>{result.imported}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Importiert</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-muted)' }}>{result.skipped}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duplikate</div>
                  </div>
                </div>
                {result.duplicates.length > 0 && (
                  <div style={{ textAlign: 'left', background: 'var(--surface-2)', borderRadius: 8, padding: '12px', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Übersprungene Duplikate:</div>
                    {result.duplicates.slice(0, 10).map((d, i) => <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{d}</div>)}
                    {result.duplicates.length > 10 && <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>+{result.duplicates.length - 10} weitere</div>}
                  </div>
                )}
                <button className="btn btn-primary" onClick={reset}>Weiteren Import starten</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
