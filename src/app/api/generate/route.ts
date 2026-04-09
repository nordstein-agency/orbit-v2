import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BRANCH_SEARCH_MAP } from '@/types';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const GENERIC_PREFIX = /^(info|office|kontakt|contact|hello|support|service|mail|team|post|anfrage|booking|sales|hr|buchhaltung|noreply)@/i;
const CEO_TITLE_REGEX = /\b(ceo|chief executive|geschäftsführer|gf\b|inhaber|founder|gründer|owner|direktor|vorstand|managing director|president)\b/i;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'viewer') return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });

  const outscraperKey = process.env.OUTSCRAPER_API_KEY;
  if (!outscraperKey) return NextResponse.json({ error: 'OUTSCRAPER_API_KEY fehlt.' }, { status: 500 });

  const { branches, location, limit = 20 } = await req.json();
  if (!branches) return NextResponse.json({ error: 'Branches Parameter fehlt.' }, { status: 400 });

  const branchList = branches.split(',').map((b: string) => b.trim());
  const searchTerms = branchList.map((b: string) => BRANCH_SEARCH_MAP[b] || b).join(', ');
  const loc = location || 'Österreich';
  const query = `${searchTerms}, ${loc}`;

  const params = new URLSearchParams({
    query, limit: String(Math.min(limit, 100)),
    language: 'de', region: 'AT', async: 'false',
  });
  params.append('enrichment', 'domains_service');

  let places: Record<string, unknown>[] = [];
  try {
    const apiRes = await fetch(`https://api.outscraper.com/google-maps-search?${params}`, {
      headers: { 'X-API-KEY': outscraperKey, Accept: 'application/json' },
    });
    const apiData = await apiRes.json();
    if (!apiRes.ok) {
      if (apiRes.status === 402) return NextResponse.json({ error: 'Outscraper Credits aufgebraucht.' }, { status: 402 });
      return NextResponse.json({ error: `Outscraper Fehler: ${apiData?.error || ''}` }, { status: apiRes.status });
    }
    places = Array.isArray(apiData.data?.[0]) ? apiData.data[0] : (apiData.data || []);
  } catch (e: unknown) {
    return NextResponse.json({ error: `Netzwerk-Fehler: ${(e as Error).message}` }, { status: 500 });
  }

  if (!places.length) return NextResponse.json({ leads: [], imported: 0, dupes: 0, query });

  // Build lead objects
  const rawLeads = places
    .filter(p => p.name && p.business_status !== 'CLOSED_PERMANENTLY')
    .map(place => {
      let website = (place.website as string) || '';
      if (website) {
        try {
          const u = new URL(decodeURIComponent(website));
          ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => u.searchParams.delete(k));
          website = u.toString();
        } catch { /* keep as-is */ }
      }
      const addressParts = [place.street, place.postal_code, place.city].filter(Boolean);
      const region = addressParts.join(', ') || (place.full_address as string) || loc;
      let email_general = ''; let email_ceo = '';
      for (let i = 1; i <= 10; i++) {
        const email = place[`email_${i}`] as string;
        if (!email || !EMAIL_REGEX.test(email)) break;
        const title = (place[`email_${i}_title`] as string) || '';
        if (!email_ceo && CEO_TITLE_REGEX.test(title)) email_ceo = email;
        if (!email_general && GENERIC_PREFIX.test(email)) email_general = email;
      }
      const dedupKey = ((place.name as string) + '|' + region).toLowerCase().replace(/\s+/g, '');

      return {
        name: place.name as string,
        industry: branchList[0] || '',
        region,
        website,
        phone: (place.phone as string) || '',
        emails: [email_ceo, email_general].filter(Boolean).join(', '),
        email_general,
        email_ceo,
        ceos: '',
        description: (place.description as string) || '',
        rating: (place.rating as number) || null,
        reviews: (place.reviews as number) || 0,
        source: 'generated',
        source_query: query,
        created_by: user.id,
        status_changed_by: user.id,
        _dedupKey: dedupKey,
      };
    });

  // Get existing dedup keys from DB
  const dedupKeys = rawLeads.map(l => l._dedupKey);
  const { data: existingKeys } = await supabase
    .from('leads')
    .select('dedup_key')
    .is('deleted_at', null)
    .in('dedup_key', dedupKeys);

  const existingSet = new Set((existingKeys || []).map(r => r.dedup_key));

  const newLeads = rawLeads.filter(l => !existingSet.has(l._dedupKey));
  const dupeCount = rawLeads.length - newLeads.length;

  let importedCount = 0;
  if (newLeads.length > 0) {
    const toInsert = newLeads.map(({ _dedupKey, ...rest }) => rest);
    const { data: inserted, error: insertErr } = await supabase
      .from('leads')
      .insert(toInsert)
      .select('id, name');

    if (!insertErr && inserted) {
      importedCount = inserted.length;
      // Log session
      await supabase.from('generator_sessions').insert({
        query,
        location: loc,
        branches: branchList,
        leads_found: rawLeads.length,
        leads_new: importedCount,
        leads_dupes: dupeCount,
        created_by: user.id,
      });
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        type: 'lead_generated',
        metadata: { query, leads_new: importedCount, leads_dupes: dupeCount },
      });
    }
  }

  const leadsWithFlag = rawLeads.map(l => ({
    ...l,
    is_new: !existingSet.has(l._dedupKey),
  }));

  return NextResponse.json({ leads: leadsWithFlag, imported: importedCount, dupes: dupeCount, query });
}
