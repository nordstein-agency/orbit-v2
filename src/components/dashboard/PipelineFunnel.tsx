'use client';

import { PIPELINE_TABS, LeadStatus, STATUS_LABELS } from '@/types';

interface Props {
  counts: Record<string, number>;
  total: number;
}

export default function PipelineFunnel({ counts, total }: Props) {
  const stages = [
    { key: 'NEU', label: 'Neu', color: '#3a3a4a' },
    { key: 'VK', label: 'Verkaufsgespräch', color: '#451a3d' },
    { key: 'CC', label: 'Closing Call', color: '#6b2a5e' },
    { key: 'ABSCHLUSS', label: 'Abschluss', color: '#16a34a' },
  ];

  const secondary = [
    { key: 'FOLLOW_UP', label: 'Follow Up', color: '#854d0e' },
    { key: 'KEIN_INTERESSE', label: 'Kein Interesse', color: '#991b1b' },
    { key: 'NICHT_ERREICHT', label: 'Nicht erreicht', color: '#374151' },
  ];

  const maxCount = Math.max(...stages.map(s => counts[s.key] || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Funnel bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stages.map((stage, i) => {
          const count = counts[stage.key] || 0;
          const pct = total > 0 ? (count / total * 100) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount * 100) : 0;
          const funneledWidth = Math.max(100 - i * 12, 40);

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 120, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                {stage.label}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: `${funneledWidth}%`, margin: '0 auto', height: '100%', position: 'relative' }}>
                  <div style={{ width: `${barWidth}%`, minWidth: count > 0 ? 8 : 0, height: '100%', background: stage.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <div style={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)' }}>{count}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '8px' }}>
          Weitere Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {secondary.map(s => (
            <div key={s.key} style={{ background: 'var(--surface-2)', border: `1px solid ${s.color}33`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>{counts[s.key] || 0}</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.2 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
