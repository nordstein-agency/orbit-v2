import { createClient } from '@/lib/supabase/server';
import CalendarClient from '@/components/calendar/CalendarClient';

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const from = new Date(); from.setDate(1);
  const to = new Date(from); to.setMonth(to.getMonth() + 2);

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, lead:leads(id, name), assigned_profile:profiles!appointments_assigned_to_fkey(id, full_name)')
    .gte('date', from.toISOString().split('T')[0])
    .lte('date', to.toISOString().split('T')[0])
    .order('date', { ascending: true });

  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true);

  return <CalendarClient initialAppointments={appointments || []} currentProfile={profile} allProfiles={profiles || []} />;
}
