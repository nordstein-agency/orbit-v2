import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });

  const { userId, role, is_active } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId erforderlich.' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (is_active !== undefined) update.is_active = is_active;

  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
