import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leads, userId } = await req.json();
  if (!Array.isArray(leads) || !leads.length) return NextResponse.json({ error: 'Keine Leads.' }, { status: 400 });

  const normalize = (l: Record<string, string>) => ({
    name: (l.name || '').trim(),
    region: (l.region || '').trim(),
    phone: (l.phone || '').replace(/[^\d\s+\-()/]/g, '').trim(),
    email_general: (l.email_general || '').toLowerCase().trim(),
    email_ceo: (l.email_ceo || '').toLowerCase().trim(),
    ceos: (l.ceos || '').trim(),
    website: (l.website || '').trim(),
    industry: (l.industry || '').trim(),
    source: 'import',
    created_by: userId || user.id,
    status_changed_by: userId || user.id,
  });

  const normalized = leads.map(normalize).filter(l => l.name);

  // Get all existing dedup keys
  const dedupKeys = normalized.map(l =>
    (l.name + '|' + (l.region || '')).toLowerCase().replace(/\s+/g, '')
  );

  const { data: existingKeys } = await supabase
    .from('leads')
    .select('dedup_key')
    .is('deleted_at', null)
    .in('dedup_key', dedupKeys);

  const existingSet = new Set((existingKeys || []).map(r => r.dedup_key));

  const toInsert: typeof normalized = [];
  const duplicates: string[] = [];

  normalized.forEach(l => {
    const key = (l.name + '|' + (l.region || '')).toLowerCase().replace(/\s+/g, '');
    if (existingSet.has(key)) { duplicates.push(l.name); }
    else { toInsert.push(l); existingSet.add(key); }
  });

  let imported = 0;
  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase.from('leads').insert(toInsert).select('id');
    if (!error) {
      imported = inserted?.length || 0;
      await supabase.from('activity_log').insert({
        user_id: user.id,
        type: 'lead_imported',
        metadata: { count: imported, skipped: duplicates.length },
      });
    }
  }

  return NextResponse.json({ success: true, imported, skipped: duplicates.length, duplicates: duplicates.slice(0, 50), total: normalized.length });
}
