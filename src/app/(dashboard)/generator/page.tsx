import { createClient } from '@/lib/supabase/server';
import GeneratorClient from '@/components/generator/GeneratorClient';

export default async function GeneratorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Recent sessions
  const { data: sessions } = await supabase
    .from('generator_sessions')
    .select('*, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(10);

  return <GeneratorClient currentProfile={profile} recentSessions={sessions || []} />;
}
