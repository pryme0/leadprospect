import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { importedLeadEmailExists, insertImportedLead, listImportedLeads } from '@/lib/leads/imported-store';

export const dynamic = 'force-dynamic';

interface ImportedLead {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
}

function parseCSV(text: string): ImportedLead[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''));

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full_name' || h === 'fullname');
  const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email_address');
  const phoneIdx = headers.findIndex((h) => h === 'phone' || h === 'phone_number' || h === 'mobile');
  const companyIdx = headers.findIndex((h) => h === 'company' || h === 'organization' || h === 'org');
  const sourceIdx = headers.findIndex((h) => h === 'source' || h === 'lead_source');
  const notesIdx = headers.findIndex((h) => h === 'notes' || h === 'note' || h === 'comments');

  const leads: ImportedLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const lead: ImportedLead = {};
    if (nameIdx >= 0 && values[nameIdx]) lead.name = values[nameIdx];
    if (emailIdx >= 0 && values[emailIdx]) lead.email = values[emailIdx];
    if (phoneIdx >= 0 && values[phoneIdx]) lead.phone = values[phoneIdx];
    if (companyIdx >= 0 && values[companyIdx]) lead.company = values[companyIdx];
    if (sourceIdx >= 0 && values[sourceIdx]) lead.source = values[sourceIdx];
    if (notesIdx >= 0 && values[notesIdx]) lead.notes = values[notesIdx];

    if (lead.name || lead.email || lead.phone) {
      leads.push(lead);
    }
  }
  return leads;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
    }

    const text = await file.text();
    const leads = parseCSV(text);

    if (leads.length === 0) {
      return NextResponse.json({ message: 'No valid leads found in CSV.' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      // Skip if email already exists for this org
      if (lead.email && (await importedLeadEmailExists(user.org, lead.email))) {
        skipped++;
        continue;
      }

      await insertImportedLead(user.org, lead);
      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: leads.length,
      message: `Imported ${imported} leads${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}.`,
    });
  } catch (err) {
    console.error('[POST /api/leads/import]', err);
    return NextResponse.json({ message: 'Import failed.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const rows = await listImportedLeads(user.org);
    return NextResponse.json({ leads: rows });
  } catch (err) {
    console.error('[GET /api/leads/import]', err);
    return NextResponse.json({ leads: [] });
  }
}
