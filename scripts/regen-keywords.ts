/**
 * Re-run website analysis for specific orgs to expand their keyword set to the
 * new (~50) generation caps. Reuses the exact app pipeline (fetchWebsiteText →
 * analyzeWebsite → provisionAndCrawl), so it produces the same result as an org
 * clicking "Analyse & generate" in Settings — just done for named orgs here.
 *
 * Usage:
 *   npx tsx scripts/regen-keywords.ts "luce" "brooks"        # dry run (report only)
 *   npx tsx scripts/regen-keywords.ts --apply "luce" "brooks"
 */
import fs from 'fs';
import path from 'path';

// Load .env.local into process.env BEFORE importing app modules (they read keys
// at import/first-call time).
for (const f of ['.env.local', '.env']) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const APPLY = process.argv.includes('--apply');
const patterns = process.argv.slice(2).filter((a) => a !== '--apply');

async function main() {
  const { appPool } = await import('../src/lib/app-pg');
  const { fetchWebsiteText } = await import('../src/lib/leads/website-fetch');
  const { analyzeWebsite, analysisConfigured } = await import('../src/lib/leads/analyze');
  const { provisionAndCrawl, sbuIdForUser } = await import('../src/lib/crawler/control-client');
  const { setOrgAnalysis } = await import('../src/lib/settings/org-store');

  if (!analysisConfigured()) { console.error('LLM not configured (OPENAI_API_KEY / GEMINI_API_KEY).'); process.exit(1); }

  for (const pat of patterns) {
    const { rows } = await appPool().query(
      `SELECT user_id, company_name, website, analysis_json FROM org_profiles WHERE company_name ILIKE $1`,
      [`%${pat}%`],
    );
    if (!rows.length) { console.log(`\n[${pat}] no org matched`); continue; }
    const o = rows[0];
    const sbu = sbuIdForUser(o.user_id);
    const beforeCount = (await appPool().query('SELECT COUNT(*)::int c FROM sbu_keywords WHERE sbu_id=$1 AND active', [sbu])).rows[0].c;
    console.log(`\n===== ${o.company_name} (${o.user_id}) =====`);
    console.log(`  website=${o.website || '(none)'}  active keywords now=${beforeCount}`);

    let websiteText = '';
    if (o.website) { try { websiteText = (await fetchWebsiteText(o.website))?.text ?? ''; } catch { /* proceed */ } }

    const analysis = await analyzeWebsite({
      companyName: o.company_name || '',
      website: o.website || '',
      about: '', services: '', industry: '',
      websiteText,
    });
    const total = analysis.keywords.length + (analysis.keywords_tiktok?.length ?? 0) + (analysis.keywords_instagram?.length ?? 0);
    console.log(`  generated: linkedin=${analysis.keywords.length} tiktok=${analysis.keywords_tiktok?.length ?? 0} instagram=${analysis.keywords_instagram?.length ?? 0}  (raw total ${total})`);

    if (!APPLY) { console.log('  (dry run — pass --apply to write)'); continue; }

    await provisionAndCrawl({
      userId: o.user_id,
      companyName: o.company_name || o.user_id,
      keywords: analysis.keywords,
      socialKeywords: { tiktok: analysis.keywords_tiktok, instagram: analysis.keywords_instagram },
      context: { summary: analysis.summary, target_audience: analysis.target_audience, pain_points: analysis.pain_points },
      deactivateMissing: false, // ADDITIVE — keep existing keywords, add the new ones (maximize coverage, never remove)
    });
    await setOrgAnalysis(o.user_id, sbu, analysis);
    const afterCount = (await appPool().query('SELECT COUNT(*)::int c FROM sbu_keywords WHERE sbu_id=$1 AND active', [sbu])).rows[0].c;
    console.log(`  ✓ active keywords: ${beforeCount} → ${afterCount}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
