import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });

  const { email, full_name, password, role } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'E-Mail und Passwort erforderlich.' }, { status: 400 });

  // Admin client with service role (bypasses RLS)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update profile role (trigger creates the profile, we update the role)
  if (data.user) {
    await adminSupabase.from('profiles').update({ full_name, role }).eq('id', data.user.id);
    const { data: newProfile } = await adminSupabase.from('profiles').select('*').eq('id', data.user.id).single();
    return NextResponse.json({ success: true, profile: newProfile });
  }

  return NextResponse.json({ success: true });
}
