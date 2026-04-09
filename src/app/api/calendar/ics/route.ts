import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, lead:leads(name)')
    .eq('status', 'scheduled')
    .order('date', { ascending: true });

  const formatDt = (date: string, time: string) => {
    const d = new Date(`${date}T${time}:00+02:00`);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ics = 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//Nordstein CRM//Sales OS//DE\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'X-WR-CALNAME:Nordstein CRM Termine\r\n';
  ics += 'X-WR-TIMEZONE:Europe/Vienna\r\n';
  ics += 'METHOD:PUBLISH\r\n';
  ics += 'REFRESH-INTERVAL;VALUE=DURATION:PT15M\r\n';

  (appointments || []).forEach(a => {
    const dtStart = formatDt(a.date, a.time_from);
    const dtEnd = formatDt(a.date, a.time_to);
    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `${a.id}@nordstein-crm`;
    const leadName = (a as typeof a & { lead?: { name?: string } }).lead?.name;
    let desc = '';
    if (leadName) desc += `Lead: ${leadName}\\n`;
    if (a.description) desc += a.description.replace(/\n/g, '\\n');

    ics += `BEGIN:VEVENT\r\n`;
    ics += `UID:${uid}\r\n`;
    ics += `DTSTAMP:${nowStr}\r\n`;
    ics += `DTSTART:${dtStart}\r\n`;
    ics += `DTEND:${dtEnd}\r\n`;
    ics += `SUMMARY:${a.title.replace(/,/g, '\\,')}\r\n`;
    if (desc) ics += `DESCRIPTION:${desc.replace(/,/g, '\\,')}\r\n`;
    if (a.location) ics += `LOCATION:${a.location.replace(/,/g, '\\,')}\r\n`;
    ics += `STATUS:CONFIRMED\r\n`;
    ics += `END:VEVENT\r\n`;
  });

  ics += 'END:VCALENDAR\r\n';

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="nordstein-crm.ics"',
      'Cache-Control': 'no-cache',
    },
  });
}
