import { createClient } from '@/lib/supabase/server';
import LeadsClient from '@/components/leads/LeadsClient';

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, email),
      notes(id),
      appointments(id, status)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true);

  return <LeadsClient initialLeads={leads || []} currentProfile={profile} allProfiles={profiles || []} />;
}
