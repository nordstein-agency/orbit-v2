import { createClient } from '@/lib/supabase/server';
import PipelineClient from '@/components/pipeline/PipelineClient';

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, email),
      created_by_profile:profiles!leads_created_by_fkey(id, full_name, email),
      notes(id, content, created_at, created_by),
      appointments(id, title, date, time_from, time_to, status)
    `)
    .is('deleted_at', null)
    .order('status_changed_at', { ascending: false });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('is_active', true);

  return (
    <PipelineClient
      initialLeads={leads || []}
      currentProfile={profile}
      allProfiles={profiles || []}
    />
  );
}
