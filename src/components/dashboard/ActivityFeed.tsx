'use client';

import { ActivityLog, STATUS_LABELS } from '@/types';
import { GitBranch, FileText, UserPlus, Calendar, Trash2, Upload, Zap } from 'lucide-react';

interface Props {
  activities: ActivityLog[];
}

const typeConfig = {
  status_change: { icon: GitBranch, color: '#451a3d', bg: '#2d0f27' },
  note_added: { icon: FileText, color: '#3b82f6', bg: '#1e3a5f' },
  note_edited: { icon: FileText, color: '#6b7280', bg: '#1f2937' },
  lead_created: { icon: UserPlus, color: '#16a34a', bg: '#0f2d1a' },
  lead_deleted: { icon: Trash2, color: '#dc2626', bg: '#2d0f0f' },
  appointment_set: { icon: Calendar, color: '#f97316', bg: '#2d1a0a' },
  appointment_cancelled: { icon: Calendar, color: '#6b7280', bg: '#1f2937' },
  lead_imported: { icon: Upload, color: '#8b5cf6', bg: '#1e1b2e' },
  lead_generated: { icon: Zap, color: '#eab308', bg: '#2d2810' },
  email_sent: { icon: FileText, color: '#06b6d4', bg: '#0c2a2f' },
  call_logged: { icon: FileText, color: '#10b981', bg: '#0c2d1e' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  if (hrs > 0) return `vor ${hrs} Std`;
  if (mins > 0) return `vor ${mins} Min`;
  return 'Gerade eben';
}

function getLabel(activity: ActivityLog): string {
  switch (activity.type) {
    case 'status_change':
      return `Status geändert: ${STATUS_LABELS[activity.old_status!] || activity.old_status} → ${STATUS_LABELS[activity.new_status!] || activity.new_status}`;
    case 'note_added': return 'Notiz hinzugefügt';
    case 'note_edited': return 'Notiz bearbeitet';
    case 'lead_created': return 'Lead erstellt';
    case 'lead_deleted': return 'Lead gelöscht';
    case 'appointment_set': return 'Termin gesetzt';
    case 'appointment_cancelled': return 'Termin storniert';
    case 'lead_imported': return `${(activity.metadata as Record<string, unknown>)?.count || 'Leads'} Leads importiert`;
    case 'lead_generated': return 'Leads generiert';
    default: return activity.type;
  }
}

export default function ActivityFeed({ activities }: Props) {
  if (!activities.length) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.83rem' }}>
        Noch keine Aktivitäten
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {activities.map(act => {
        const cfg = typeConfig[act.type] || typeConfig.lead_created;
        const Icon = cfg.icon;
        return (
          <div key={act.id} className="activity-item">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: cfg.bg, border: `1px solid ${cfg.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={14} color={cfg.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>
                  {(act as unknown as { profile?: { full_name?: string; email?: string } }).profile?.full_name || (act as unknown as { profile?: { email?: string } }).profile?.email || 'System'}
                </span>
                {act.lead && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--nordstein-purple-light)', fontWeight: 600 }}>
                    @ {(act as unknown as { lead?: { name?: string } }).lead?.name}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {getLabel(act)}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', flexShrink: 0, marginTop: '2px' }}>
              {timeAgo(act.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
