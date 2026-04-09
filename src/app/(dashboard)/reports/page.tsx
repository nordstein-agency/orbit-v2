import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, LeadStatus } from '@/types';

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase.from('leads').select('status, created_at, industry, source').is('deleted_at', null);
  const { data: activity } = await supabase.from('activity_log').select('type, created_at, user_id, new_status').order('created_at', { ascending: false }).limit(500);
  const { data: users } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true);

  const leadsArr = leads || [];
  const total = leadsArr.length;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  leadsArr.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

  // Industry distribution
  const industryCounts: Record<string, number> = {};
  leadsArr.forEach(l => { if (l.industry) industryCounts[l.industry] = (industryCounts[l.industry] || 0) + 1; });
  const topIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Leads per month (last 6 months)
  const monthMap: Record<string, number> = {};
  leadsArr.forEach(l => {
    const d = new Date(l.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // User activity
  const userActivity: Record<string, number> = {};
  (activity || []).forEach(a => { if (a.user_id) userActivity[a.user_id] = (userActivity[a.user_id] || 0) + 1; });

  // Source distribution
  const sourceCounts: Record<string, number> = {};
  leadsArr.forEach(l => { const s = l.source || 'manual'; sourceCounts[s] = (sourceCounts[s] || 0) + 1; });

  const convRate = total > 0 ? ((statusCounts['ABSCHLUSS'] || 0) / total * 100).toFixed(1) : '0';

  const STATUS_ORDER: LeadStatus[] = ['NEU', 'VK', 'CC', 'ABSCHLUSS', 'FOLLOW_UP', 'KEIN_INTERESSE', 'NICHT_ERREICHT'];
  const STATUS_COLORS_CHART: Record<string, string> = {
    NEU: '#3a3a4a', VK: '#451a3d', CC: '#6b2a5e', ABSCHLUSS: '#16a34a',
    FOLLOW_UP: '#854d0e', KEIN_INTERESSE: '#991b1b', NICHT_ERREICHT: '#374151',
  };

  const maxMonth = Math.max(...months.map(m => monthMap[m] || 0), 1);

  return (
    <>
      <div className="page-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Reports</h1>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>Analyse & Performance-Übersicht</p>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Gesamt Leads', value: total, color: 'var(--nordstein-purple)' },
            { label: 'In VK / CC', value: (statusCounts['VK'] || 0) + (statusCounts['CC'] || 0), color: '#6b2a5e' },
            { label: 'Abschlüsse', value: statusCounts['ABSCHLUSS'] || 0, color: '#16a34a' },
            { label: 'Conversion Rate', value: `${convRate}%`, color: '#f97316' },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-card" style={{ borderTopColor: kpi.color }}>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Status Donut */}
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Status-Verteilung</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {STATUS_ORDER.map(status => {
                const count = statusCounts[status] || 0;
                const pct = total > 0 ? (count / total * 100) : 0;
                return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS_CHART[status], flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 150, flexShrink: 0 }}>{STATUS_LABELS[status]}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: STATUS_COLORS_CHART[status], borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', width: 30, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly bar chart */}
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Leads pro Monat</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: 160 }}>
                {months.map(m => {
                  const count = monthMap[m] || 0;
                  const pct = count / maxMonth * 100;
                  const label = m.split('-')[1] + '/' + m.split('-')[0].slice(2);
                  return (
                    <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text)' }}>{count}</span>
                      <div style={{ width: '100%', height: `${pct}%`, minHeight: count > 0 ? 4 : 0, background: 'var(--nordstein-purple)', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease' }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', fontWeight: 600 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Industries */}
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Top Branchen</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topIndustries.length === 0 ? (
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.83rem' }}>Keine Daten</p>
              ) : topIndustries.map(([ind, cnt]) => {
                const pct = total > 0 ? (cnt / total * 100) : 0;
                return (
                  <div key={ind} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--nordstein-purple-light)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', width: 30, textAlign: 'right' }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team activity */}
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Team Aktivität</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Aktionen (letzte 500)</p>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {(users || []).map(u => {
                const acts = userActivity[u.id] || 0;
                const maxActs = Math.max(...Object.values(userActivity), 1);
                return (
                  <div key={u.id} style={{ padding: '10px 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--nordstein-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>{u.full_name || u.email}</div>
                      <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, marginTop: '6px' }}>
                        <div style={{ width: `${(acts / maxActs) * 100}%`, height: '100%', background: 'var(--nordstein-purple)', borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.83rem', fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>{acts}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
