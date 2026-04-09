// ============================================================
// NORDSTEIN CRM — TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'sales' | 'viewer';

export type LeadStatus =
  | 'NEU'
  | 'VK'
  | 'CC'
  | 'ABSCHLUSS'
  | 'FOLLOW_UP'
  | 'KEIN_INTERESSE'
  | 'NICHT_ERREICHT';

export type ActivityType =
  | 'status_change'
  | 'note_added'
  | 'note_edited'
  | 'lead_created'
  | 'lead_deleted'
  | 'appointment_set'
  | 'appointment_cancelled'
  | 'lead_imported'
  | 'lead_generated'
  | 'email_sent'
  | 'call_logged';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  industry: string | null;
  region: string | null;
  website: string | null;
  phone: string | null;
  email_general: string | null;
  email_ceo: string | null;
  emails: string | null;
  ceos: string | null;
  description: string | null;
  rating: number | null;
  reviews: number;
  status: LeadStatus;
  status_changed_at: string;
  status_changed_by: string | null;
  assigned_to: string | null;
  source: string;
  source_query: string | null;
  dedup_key: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  // Joined
  assigned_profile?: Profile;
  created_by_profile?: Profile;
  notes?: Note[];
  appointments?: Appointment[];
  tags?: Tag[];
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by_profile?: Profile;
}

export interface Appointment {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  date: string;
  time_from: string;
  time_to: string;
  location: string | null;
  type: 'call' | 'meeting' | 'followup' | 'demo';
  status: 'scheduled' | 'completed' | 'cancelled';
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  created_by_profile?: Profile;
  assigned_profile?: Profile;
}

export interface ActivityLog {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  type: ActivityType;
  old_status: LeadStatus | null;
  new_status: LeadStatus | null;
  metadata: Record<string, unknown>;
  note: string | null;
  created_at: string;
  profile?: Profile;
  lead?: Pick<Lead, 'id' | 'name'>;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface GeneratorSession {
  id: string;
  query: string;
  location: string | null;
  branches: string[];
  leads_found: number;
  leads_new: number;
  leads_dupes: number;
  created_by: string | null;
  created_at: string;
}

export interface PipelineGoal {
  id: string;
  user_id: string;
  month: string;
  target_new: number;
  target_vk: number;
  target_cc: number;
  target_close: number;
}

// UI Types
export type PipelineTab =
  | 'NEU'
  | 'VK'
  | 'CC'
  | 'ABSCHLUSS'
  | 'FOLLOW_UP'
  | 'KEIN_INTERESSE'
  | 'NICHT_ERREICHT';

export interface PipelineTabDef {
  key: PipelineTab;
  label: string;
  color: string;
  bgColor: string;
  divider?: boolean; // show separator before this tab
}

export const PIPELINE_TABS: PipelineTabDef[] = [
  { key: 'NEU', label: 'Neu', color: '#ffffff', bgColor: '#2a2a2a' },
  { key: 'VK', label: 'Verkaufsgespräch', color: '#ffffff', bgColor: '#451a3d' },
  { key: 'CC', label: 'Closing Call', color: '#ffffff', bgColor: '#6b2a5e' },
  { key: 'ABSCHLUSS', label: 'Abschluss', color: '#ffffff', bgColor: '#16a34a' },
  { key: 'FOLLOW_UP', label: 'Follow Up', color: '#ffffff', bgColor: '#854d0e', divider: true },
  { key: 'KEIN_INTERESSE', label: 'Kein Interesse', color: '#ffffff', bgColor: '#991b1b' },
  { key: 'NICHT_ERREICHT', label: 'Nicht erreicht', color: '#ffffff', bgColor: '#374151' },
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEU: 'Neu',
  VK: 'Verkaufsgespräch',
  CC: 'Closing Call',
  ABSCHLUSS: 'Abschluss',
  FOLLOW_UP: 'Follow Up',
  KEIN_INTERESSE: 'Kein Interesse',
  NICHT_ERREICHT: 'Nicht erreicht',
};

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  NEU: { bg: '#1a1a2e', text: '#d2d2d2', border: '#333' },
  VK: { bg: '#2d0f27', text: '#e6ded3', border: '#451a3d' },
  CC: { bg: '#3d1535', text: '#f0e6eb', border: '#6b2a5e' },
  ABSCHLUSS: { bg: '#0f2d1a', text: '#86efac', border: '#16a34a' },
  FOLLOW_UP: { bg: '#2d1f0a', text: '#fbbf24', border: '#854d0e' },
  KEIN_INTERESSE: { bg: '#2d0f0f', text: '#fca5a5', border: '#991b1b' },
  NICHT_ERREICHT: { bg: '#1a1f2e', text: '#9ca3af', border: '#374151' },
};

export const BRANCHES = [
  'Gastronomie',
  'Hotellerie',
  'Gesundheit/Pflege',
  'Handel',
  'Industrie',
  'Wellness/Spa',
  'Handwerk',
  'Tourismus',
  'Logistik',
  'IT/Software',
  'Finanzen/Versicherung',
  'Immobilien',
  'Metalltechnik',
];

export const BRANCH_SEARCH_MAP: Record<string, string> = {
  Gastronomie: 'restaurants cafes gastronomy',
  Hotellerie: 'hotels pension accommodation',
  'Gesundheit/Pflege': 'healthcare medical clinic',
  Handel: 'retail shops stores',
  Industrie: 'industrial manufacturing',
  'Wellness/Spa': 'wellness spa beauty salon',
  Handwerk: 'crafts handwerk construction',
  Tourismus: 'tourism travel agency',
  Logistik: 'logistics transport spedition',
  'IT/Software': 'software IT technology',
  'Finanzen/Versicherung': 'finance insurance banking',
  Immobilien: 'real estate immobilien makler',
  Metalltechnik: 'metal technology Metalltechnik',
};
