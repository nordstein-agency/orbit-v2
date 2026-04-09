import { createClient } from '@/lib/supabase/server';
import ImportClient from '@/components/import/ImportClient';

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  return <ImportClient currentProfile={profile} />;
}
