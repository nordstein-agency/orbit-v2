import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UsersClient from '@/components/settings/UsersClient';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  return <UsersClient users={users || []} currentProfile={profile} />;
}
