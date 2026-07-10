/**
 * SYNQ Hub slug utilities. A listing's slug is generated ONCE from the company
 * name and then frozen (persisted on org_profiles.hub_slug) so public URLs never
 * change when a business later edits its name — renaming would silently break
 * every inbound link and its SEO.
 */

/** Company name → SEO-friendly slug. Diacritics stripped, non-alphanumerics → '-'. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/**
 * Given a desired base slug and a predicate that reports whether a candidate is
 * already taken, return the first free slug (base, base-2, base-3, …). Pure —
 * the caller supplies the "is taken" check (DB lookup), so this stays testable.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = base || 'business';
  if (!(await isTaken(root))) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // Astronomically unlikely; fall back to a time-independent suffix.
  return `${root}-x`;
}
