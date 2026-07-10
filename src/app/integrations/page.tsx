'use client';

import { useState } from 'react';
import Link from 'next/link';

type Tool = { name: string; category: string; icon: string };

const tools: Tool[] = [
  { name: 'Salesforce', category: 'CRM', icon: 'database' },
  { name: 'HubSpot', category: 'CRM', icon: 'hub' },
  { name: 'Slack', category: 'Comms', icon: 'chat' },
  { name: 'Zapier', category: 'Marketing', icon: 'bolt' },
  { name: 'Zendesk', category: 'Sales', icon: 'support_agent' },
  { name: 'Segment', category: 'Marketing', icon: 'grid_view' },
  { name: 'Intercom', category: 'Comms', icon: 'forum' },
  { name: 'Jira', category: 'Engineering', icon: 'task' },
  { name: 'GitHub', category: 'Engineering', icon: 'code' },
  { name: 'Asana', category: 'Engineering', icon: 'assignment' },
  { name: 'Marketo', category: 'Marketing', icon: 'campaign' },
  { name: 'Mailchimp', category: 'Marketing', icon: 'mail' },
  { name: 'Pipedrive', category: 'Sales', icon: 'trending_up' },
  { name: 'Outreach', category: 'Sales', icon: 'send' },
  { name: 'Gong', category: 'Sales', icon: 'mic' },
  { name: 'Microsoft Teams', category: 'Comms', icon: 'groups' },
  { name: 'Notion', category: 'Comms', icon: 'description' },
  { name: 'Linear', category: 'Engineering', icon: 'polyline' },
  { name: 'Airtable', category: 'CRM', icon: 'table_chart' },
  { name: 'Amplitude', category: 'Marketing', icon: 'analytics' },
  { name: 'Mixpanel', category: 'Marketing', icon: 'data_exploration' },
  { name: 'Stripe', category: 'Sales', icon: 'payments' },
  { name: 'Datadog', category: 'Engineering', icon: 'monitoring' },
  { name: 'Sentry', category: 'Engineering', icon: 'error' },
  { name: 'Zoom', category: 'Comms', icon: 'video_call' },
  { name: 'Discord', category: 'Comms', icon: 'sports_esports' },
  { name: 'Postman', category: 'Engineering', icon: 'api' },
  { name: 'Figma', category: 'Engineering', icon: 'draw' },
  { name: 'Shopify', category: 'Sales', icon: 'shopping_cart' },
  { name: 'Oracle', category: 'CRM', icon: 'storage' },
  { name: 'Copper', category: 'CRM', icon: 'token' },
  { name: 'Front', category: 'Comms', icon: 'move_to_inbox' },
  { name: 'Typeform', category: 'Marketing', icon: 'quiz' },
  { name: 'Monday.com', category: 'Engineering', icon: 'view_kanban' },
];

const categories = ['All Tools', 'CRM', 'Marketing', 'Sales', 'Comms', 'Engineering'];

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Tools');

  const filtered = tools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All Tools' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="pt-32 pb-stack-lg">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop text-center mb-stack-lg relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-glass-stroke mb-6">
          <span className="w-2 h-2 rounded-full bg-tertiary"></span>
          <span className="font-mono-label text-mono-label text-tertiary uppercase">Connects with 30+ everyday tools</span>
        </div>
        <h1 className="font-display-xl text-display-xl mb-6 tracking-tight">Connect the tools you <span className="text-primary">already use</span></h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-stack-md">
          Link your accounts once, and SYNQ works quietly in the background — no technical setup needed.
        </p>
        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative group">
          <div className="absolute inset-0 bg-primary-container blur-2xl opacity-10 group-focus-within:opacity-20 transition-opacity"></div>
          <div className="relative flex items-center bg-deep-obsidian border border-glass-stroke rounded-xl px-4 py-4 focus-within:border-primary transition-all">
            <span className="material-symbols-outlined text-outline mr-3">search</span>
            <input
              className="bg-transparent border-none text-on-surface w-full focus:ring-0 font-body-md placeholder:text-outline-variant"
              id="integrationSearch"
              placeholder="Search tools…"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-1 ml-2">
              <kbd className="bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded text-[10px] font-mono-label">CMD</kbd>
              <kbd className="bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded text-[10px] font-mono-label">K</kbd>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-stack-md">
        <div className="flex flex-wrap justify-center gap-3 overflow-x-auto hide-scrollbar pb-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`category-btn px-6 py-2 rounded-full glass-card font-mono-label uppercase ${
                  isActive ? 'active border-primary text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Integration Grid */}
      <section className="max-w-container-max mx-auto px-margin-desktop">
        <div className="integration-grid gap-gutter" id="integrationsContainer">
          {filtered.map((tool) => (
            <div
              key={tool.name}
              className="glass-card rounded-lg p-6 flex flex-col items-center justify-center text-center group cursor-pointer aspect-square"
            >
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-white transition-colors">{tool.icon}</span>
              </div>
              <span className="font-body-md font-bold text-on-surface block mb-1">{tool.name}</span>
              <span className="font-mono-label text-[10px] text-outline uppercase">{tool.category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Spotlight (Bento Layout) */}
      <section className="max-w-container-max mx-auto px-margin-desktop mt-stack-lg">
        <h2 className="font-headline-md text-headline-md mb-8">Popular connections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Large Bento Item */}
          <div className="md:col-span-2 glass-card rounded-xl p-8 relative overflow-hidden flex flex-col justify-between h-[400px]">
            <div className="z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#00A1E0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl">cloud</span>
                </div>
                <h3 className="font-headline-md text-headline-md">Salesforce</h3>
              </div>
              <p className="text-on-surface-variant max-w-md font-body-md">
                Keeps your customer list up to date automatically, so you never enter the same contact twice.
              </p>
            </div>
            <div className="mt-auto z-10">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
                <li className="flex items-center gap-2 text-tertiary font-mono-label uppercase">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Automatic
                </li>
                <li className="flex items-center gap-2 text-tertiary font-mono-label uppercase">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Secure
                </li>
              </ul>
              <Link href="/signup" className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all w-fit">
                Connect <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="absolute bottom-[-10%] right-[-5%] w-2/3 h-2/3 opacity-40"></div>
          </div>

          {/* Small Bento Item 1 */}
          <div className="glass-card rounded-xl p-8 flex flex-col justify-between border-secondary/20">
            <div>
              <span className="material-symbols-outlined text-secondary text-4xl mb-4">terminal</span>
              <h3 className="font-headline-md text-headline-md mb-2">Custom connections</h3>
              <p className="text-on-surface-variant font-body-md">Link your own tools if you need something special.</p>
            </div>
            <Link
              href="/signup"
              className="mt-6 border border-glass-stroke rounded-lg py-2 text-on-surface hover:bg-surface-container transition-colors text-center"
            >
              Connect
            </Link>
          </div>

          {/* Small Bento Item 2 */}
          <div className="glass-card rounded-xl p-8 flex flex-col justify-between border-tertiary/20">
            <div>
              <span className="material-symbols-outlined text-tertiary text-4xl mb-4">bolt</span>
              <h3 className="font-headline-md text-headline-md mb-2">Zapier</h3>
              <p className="text-on-surface-variant font-body-md">Connect thousands of other apps through Zapier.</p>
            </div>
            <Link
              href="/signup"
              className="mt-6 border border-glass-stroke rounded-lg py-2 text-on-surface hover:bg-surface-container transition-colors text-center"
            >
              Connect
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
