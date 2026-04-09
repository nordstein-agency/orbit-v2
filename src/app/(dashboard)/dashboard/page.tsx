import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, LeadStatus } from '@/types';
import { TrendingUp, Users, Target, CheckCircle, Clock, PhoneOff, XCircle } from 'lucide-react';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PipelineFunnel from '@/components/dashboard/PipelineFunnel';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch KPIs
  const { data: statusCounts } = await supabase
    .from('leads')
    .select('status')
    .is('deleted_at', null);

  const counts: Record<string, number> = {};
  (statusCounts || []).forEach(l => {
    counts[l.status] = (counts[l.status] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // New leads this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: newThisWeek } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', weekAgo.toISOString());

  // Recent activity
  const { data: activity } = await supabase
    .from('activity_log')
    .select(`
      *,
      profile:profiles(full_name, email),
      lead:leads(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  // Upcoming appointments
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, lead:leads(name)')
    .gte('date', today)
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .limit(5);

  const conversionRate = total > 0 ? Math.round((counts['ABSCHLUSS'] || 0) / total * 100) : 0;

  const kpis = [
    {
      label: 'Gesamt Leads',
      value: total,
      icon: Users,
      trend: `+${newThisWeek || 0} diese Woche`,
      trendDir: 'up',
    },
    {
      label: 'In Pipeline',
      value: (counts['VK'] || 0) + (counts['CC'] || 0),
      icon: TrendingUp,
      trend: `${counts['VK'] || 0} VK · ${counts['CC'] || 0} CC`,
      trendDir: 'up',
    },
    {
      label: 'Abschlüsse',
      value: counts['ABSCHLUSS'] || 0,
      icon: CheckCircle,
      trend: `${conversionRate}% Conversion`,
      trendDir: conversionRate > 10 ? 'up' : 'down',
    },
    {
      label: 'Follow Up',
      value: counts['FOLLOW_UP'] || 0,
      icon: Clock,
      trend: 'Ausstehend',
      trendDir: 'neutral',
    },
    {
      label: 'Nicht erreicht',
      value: counts['NICHT_ERREICHT'] || 0,
      icon: PhoneOff,
      trend: 'Callback nötig',
      trendDir: 'down',
    },
    {
      label: 'Kein Interesse',
      value: counts['KEIN_INTERESSE'] || 0,
      icon: XCircle,
      trend: 'Verloren',
      trendDir: 'down',
    },
  ];

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Dashboard</h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Übersicht deiner Sales-Performance
            </p>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
            {new Date().toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* KPI Grid */}
        <div className="kpi-grid">
          {kpis.map(kpi => (
            <div key={kpi.label} className="kpi-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="label-mono">{kpi.label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nordstein-purple)' }}>
                  <kpi.icon size={15} />
                </div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className={`kpi-trend ${kpi.trendDir}`} style={{ color: kpi.trendDir === 'up' ? '#4ade80' : kpi.trendDir === 'down' ? '#f87171' : 'var(--text-muted)' }}>
                {kpi.trend}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Pipeline Funnel */}
          <div className="card">
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Pipeline Übersicht</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Status-Verteilung aller Leads</p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <PipelineFunnel counts={counts} total={total} />
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Nächste Termine</h2>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {(appointments || []).length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.83rem' }}>
                  Keine Termine geplant
                </div>
              ) : (
                (appointments || []).map(appt => (
                  <div key={appt.id} style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                    <div style={{ width: 44, height: 44, background: 'var(--nordstein-purple-dark)', border: '1px solid var(--nordstein-purple)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--nordstein-beige)', lineHeight: 1 }}>
                        {new Date(appt.date).getDate()}
                      </span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {new Date(appt.date).toLocaleDateString('de-AT', { month: 'short' })}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appt.title}
                      </div>
                      {appt.lead && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{appt.lead.name}</div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--nordstein-purple-light)', marginTop: '3px', fontWeight: 600 }}>
                        {appt.time_from} – {appt.time_to}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Aktivitäts-Feed</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Alle Aktionen deines Teams</p>
          </div>
          <ActivityFeed activities={activity || []} />
        </div>
      </div>
    </>
  );
}
