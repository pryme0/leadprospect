'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HUB_CATEGORIES, categoryLabel, locationLabel } from '@/lib/hub/taxonomy';

export interface DirectoryItem {
  slug: string;
  companyName: string;
  logoUrl: string | null;
  about: string | null;
  category: string | null;
  location: string | null;
  premium: boolean;
  verified: boolean;
}

/** Client search/filter shell over a server-rendered listing set (mirrors the
 *  Integrations page pattern: in-memory array + useState, no client fetch). */
export default function HubDirectory({ listings }: { listings: DirectoryItem[] }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Only show category chips that actually have listings.
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) if (l.category) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    return HUB_CATEGORIES.filter((c) => counts.has(c.slug)).map((c) => ({ ...c, count: counts.get(c.slug)! }));
  }, [listings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (activeCategory !== 'all' && l.category !== activeCategory) return false;
      if (!q) return true;
      return (
        l.companyName.toLowerCase().includes(q) ||
        (l.about ?? '').toLowerCase().includes(q) ||
        categoryLabel(l.category).toLowerCase().includes(q) ||
        locationLabel(l.location).toLowerCase().includes(q)
      );
    });
  }, [listings, search, activeCategory]);

  return (
    <>
      {/* Search */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses, categories, cities…"
            className="input-recessed w-full pl-12 pr-4 py-3.5 rounded-full text-body-md"
            aria-label="Search the SYNQ Hub"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-mono-label border transition-colors ${activeCategory === 'all' ? 'bg-primary-container text-on-primary-container border-primary' : 'bg-surface-container text-on-surface-variant border-glass-stroke hover:text-primary'}`}
        >
          All ({listings.length})
        </button>
        {categoriesWithCounts.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActiveCategory(c.slug)}
            className={`px-4 py-2 rounded-full text-mono-label border transition-colors ${activeCategory === c.slug ? 'bg-primary-container text-on-primary-container border-primary' : 'bg-surface-container text-on-surface-variant border-glass-stroke hover:text-primary'}`}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-body-lg text-on-surface-variant">No businesses match your search yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {filtered.map((l) => (
            <Link
              key={l.slug}
              href={`/hub/${l.slug}`}
              className="glass-card rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {l.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover border border-glass-stroke bg-surface-container" />
                ) : (
                  <div className="h-12 w-12 rounded-xl border border-glass-stroke bg-surface-container flex items-center justify-center text-headline-md text-primary">
                    {l.companyName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-body-lg text-on-surface font-semibold truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {l.companyName}
                    {l.verified && <span className="material-symbols-outlined text-primary text-[16px]">verified</span>}
                  </p>
                  <p className="text-mono-label text-on-surface-variant">{categoryLabel(l.category)} · {locationLabel(l.location)}</p>
                </div>
              </div>
              {l.about && <p className="text-body-md text-on-surface-variant line-clamp-2">{l.about}</p>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
