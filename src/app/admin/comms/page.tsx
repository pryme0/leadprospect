'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useWorkspaceTheme } from '@/lib/workspace-theme';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ── Types ──────────────────────────────────────────────────────────────────── */

type PageTab = 'inbox' | 'channels' | 'mentions';
type Platform = 'all' | 'instagram' | 'x' | 'whatsapp' | 'email' | 'linkedin' | 'facebook' | 'tiktok';
type Sentiment = 'positive' | 'negative' | 'urgent' | 'neutral';

/**
 * Platforms that expose a real DM inbox (via Unipile) — these can appear in
 * "Open conversations". TikTok (and other social-only channels) have no
 * messaging API, so their activity lives in Mentions + Lead Queue instead. When
 * such an account is selected we show that explicitly rather than an empty table.
 */
const DM_PLATFORMS = new Set<Platform>(['instagram', 'x', 'whatsapp', 'email', 'linkedin', 'facebook']);
const isDmPlatform = (p: Platform) => DM_PLATFORMS.has(p);
type Tone = 'professional' | 'friendly' | 'formal';
/* unipile = OAuth via Unipile hosted link (no manual input needed)
   oauth   = direct platform OAuth with a username/URL input
   handle  = user provides a phone number or handle directly
   token   = user provides an API / bot token
   imap    = user provides email + password */
type AuthType = 'unipile' | 'oauth' | 'handle' | 'token' | 'imap';

interface ConvoMessage {
  id: string;
  from: 'customer' | 'agent';
  text: string;
  time: string;
}

interface TimelineEvent {
  date: string;
  channel: Exclude<Platform, 'all'>;
  event: string;
}

interface Conversation {
  id: string;
  customer: string;
  initials: string;
  platform: Exclude<Platform, 'all'>;
  sentiment: Sentiment;
  snippet: string;
  time: string;
  unread: boolean;
  messages: ConvoMessage[];
  aiReply: string;
  location: string;
  language: string;
  intent: string;
  urgency: number;
  firstContact: string;
  timeline: TimelineEvent[];
}

interface ChannelDef {
  id: string;
  name: string;
  description: string;
  color: string;
  authType: AuthType;
  /* Unipile OAuth — no user input needed, just a button */
  unipileProvider?: string;
  permissions?: string[];           // shown in the Unipile modal
  /* Non-Unipile: input fields */
  inputLabel?: string;
  inputPlaceholder?: string;
  inputType?: 'text' | 'tel' | 'email' | 'password';
  secondaryInputLabel?: string;
  secondaryInputPlaceholder?: string;
  secondaryInputType?: 'text' | 'password';
  /* Optional step-by-step instructions shown above the input */
  instructions?: { step: string }[];
  instructionLink?: string;
}

interface ConnectedAccount {
  channelId: string;
  handle: string;
  connectedAt: string;
}

interface ConvoRow {
  id: string | number;
  customer: string;
  initials: string;
  platform: string;
  sentiment?: string;
  snippet: string;
  time_ago?: string;
  unread?: number | boolean;
  location?: string;
  language?: string;
  intent?: string;
  urgency?: number;
  first_contact?: string;
}

type ModalState =
  | { open: false }
  | { open: true; phase: 'pick' }
  | { open: true; phase: 'form';       channelId: string }
  | { open: true; phase: 'connecting'; channelId: string }
  | { open: true; phase: 'success';    channelId: string };

interface KpiData {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
}

/* ── Channel definitions ────────────────────────────────────────────────────── */

/**
 * Channels connected here that CANNOT ever produce a real conversation thread
 * — no third-party message-sync API exists for them (TikTok has no public DM
 * API; access requires an approved TikTok Business partnership, not something
 * this "connect a handle" flow provides). Excluded from the Open Conversations
 * account-filter so they don't look like a broken/empty inbox.
 */
const NON_MESSAGING_CHANNELS = new Set(['tiktok']);

const CHANNEL_GROUPS: { name: string; channels: ChannelDef[] }[] = [
  {
    name: 'Social Media',
    channels: [
      {
        id: 'instagram', name: 'Instagram', color: '#E1306C', authType: 'unipile',
        unipileProvider: 'INSTAGRAM',
        description: 'Monitor DMs, comments, story replies & brand mentions',
        permissions: ['Read DMs and comments', 'Send replies on your behalf', 'Monitor brand mentions'],
      },
      {
        id: 'x', name: 'X (Twitter)', color: '#e4e4e4', authType: 'unipile',
        unipileProvider: 'TWITTER',
        description: 'Track mentions, replies, DMs and hashtags in real time',
        permissions: ['Read mentions and DMs', 'Post replies', 'Monitor hashtags'],
      },
      {
        id: 'facebook', name: 'Facebook', color: '#1877F2', authType: 'unipile',
        unipileProvider: 'FACEBOOK',
        description: 'Manage page messages, post comments and reviews',
        permissions: ['Read page messages', 'Reply to comments and messages', 'Monitor page reviews'],
      },
      {
        id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', authType: 'unipile',
        unipileProvider: 'LINKEDIN',
        description: 'Receive DMs, page mentions and company post comments',
        permissions: ['Read LinkedIn DMs', 'Send replies', 'Monitor page comments'],
      },
      {
        id: 'tiktok', name: 'TikTok', color: '#69C9D0', authType: 'oauth',
        description: 'Powers lead discovery from public videos & comments — TikTok has no public DM API, so this is not a message inbox',
        inputLabel: 'TikTok Business account handle',
        inputPlaceholder: '@yourbrand',
        inputType: 'text',
        instructions: [
          { step: 'This connects your handle for lead-crawling & mention tracking only' },
          { step: 'TikTok does not offer a public direct-message API to third-party apps' },
          { step: 'Live DM sync would require an approved TikTok Business Messaging partnership' },
        ],
        instructionLink: 'https://developers.tiktok.com',
      },
      {
        id: 'threads', name: 'Threads', color: '#aaaaaa', authType: 'oauth',
        description: 'Track posts, replies and brand mentions',
        inputLabel: 'Threads username',
        inputPlaceholder: '@yourbrand',
        inputType: 'text',
        instructions: [
          { step: 'Threads API access requires an approved Meta Developer app' },
          { step: 'Set META_APP_ID and META_APP_SECRET in your .env' },
          { step: 'Enter your Threads handle to start monitoring' },
        ],
        instructionLink: 'https://developers.facebook.com/docs/threads',
      },
      {
        id: 'youtube', name: 'YouTube', color: '#FF0000', authType: 'oauth',
        description: 'Monitor video comments and channel mentions',
        inputLabel: 'YouTube channel handle',
        inputPlaceholder: '@yourchannel',
        inputType: 'text',
        instructions: [
          { step: 'Go to console.cloud.google.com and create a project' },
          { step: 'Enable the YouTube Data API v3' },
          { step: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env' },
          { step: 'Enter your channel handle below to begin sync' },
        ],
        instructionLink: 'https://console.cloud.google.com',
      },
    ],
  },
  {
    name: 'Messaging',
    channels: [
      {
        id: 'whatsapp', name: 'WhatsApp Business', color: '#25D366', authType: 'unipile',
        unipileProvider: 'WHATSAPP',
        description: 'Receive and respond to WhatsApp Business messages',
        permissions: ['Read incoming messages', 'Send messages and replies', 'View contact details'],
      },
      {
        id: 'telegram', name: 'Telegram', color: '#0088CC', authType: 'token',
        description: 'Manage Telegram bot messages and group mentions',
        inputLabel: 'Bot Token',
        inputPlaceholder: '110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw',
        inputType: 'text',
        instructions: [
          { step: 'Open Telegram and search for @BotFather' },
          { step: 'Send /newbot and follow the prompts to name your bot' },
          { step: 'Copy the API token BotFather provides and paste it below' },
        ],
        instructionLink: 'https://core.telegram.org/bots#botfather',
      },
      {
        id: 'discord', name: 'Discord', color: '#5865F2', authType: 'token',
        description: 'Monitor server mentions, channels and DMs',
        inputLabel: 'Bot Token',
        inputPlaceholder: 'MTA0NjA1...your-bot-token',
        inputType: 'text',
        secondaryInputLabel: 'Server ID (Guild ID)',
        secondaryInputPlaceholder: '1234567890123456789',
        secondaryInputType: 'text',
        instructions: [
          { step: 'Go to discord.com/developers/applications and create an app' },
          { step: 'Under "Bot", click "Reset Token" and copy the token' },
          { step: 'In OAuth2 → URL Generator, add bot + message scopes, invite the bot to your server' },
          { step: 'Right-click your server name → Copy Server ID' },
        ],
        instructionLink: 'https://discord.com/developers/applications',
      },
      {
        id: 'slack', name: 'Slack', color: '#4A154B', authType: 'unipile',
        unipileProvider: 'SLACK',
        description: 'Route Slack messages and mentions into Comm Hub',
        permissions: ['Read channel messages', 'Send replies', 'Monitor mentions'],
      },
      {
        id: 'messenger', name: 'Messenger', color: '#0084FF', authType: 'unipile',
        unipileProvider: 'MESSENGER',
        description: 'Handle Facebook Messenger conversations from your page',
        permissions: ['Read Messenger conversations', 'Send replies', 'Access message metadata'],
      },
    ],
  },
  {
    name: 'Email',
    channels: [
      {
        id: 'gmail', name: 'Gmail', color: '#EA4335', authType: 'unipile',
        unipileProvider: 'GMAIL',
        description: 'Sync your Gmail inbox and auto-categorise inbound emails',
        permissions: ['Read emails in your inbox', 'Send replies on your behalf', 'Label and organise messages'],
      },
      {
        id: 'outlook', name: 'Outlook / M365', color: '#0078D4', authType: 'unipile',
        unipileProvider: 'OUTLOOK365',
        description: 'Connect Outlook or Microsoft 365 email accounts',
        permissions: ['Read inbox and sent mail', 'Send replies', 'Access calendar for scheduling'],
      },
      {
        id: 'imap', name: 'Custom Email (IMAP)', color: '#6B7280', authType: 'imap',
        description: 'Connect any email provider using IMAP credentials',
        inputLabel: 'Email address',
        inputPlaceholder: 'you@yourdomain.com',
        inputType: 'email',
        secondaryInputLabel: 'App password',
        secondaryInputPlaceholder: 'App-specific password (not your main password)',
        secondaryInputType: 'password',
        instructions: [
          { step: 'Enable IMAP in your email provider\'s settings' },
          { step: 'Generate an app-specific password (do not use your main password)' },
          { step: 'Enter your email address and app password below' },
        ],
      },
    ],
  },
  {
    name: 'Business Tools',
    channels: [
      {
        id: 'hubspot', name: 'HubSpot', color: '#FF7A59', authType: 'token',
        description: 'Sync contacts, deals and support tickets automatically',
        inputLabel: 'Private App Token',
        inputPlaceholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        inputType: 'text',
        instructions: [
          { step: 'In HubSpot, go to Settings → Integrations → Private Apps' },
          { step: 'Create a new private app, name it "SYNQ Comm Hub"' },
          { step: 'Grant scopes: crm.objects.contacts.read, tickets.read, conversations.read' },
          { step: 'Copy the generated token and paste it below' },
        ],
        instructionLink: 'https://app.hubspot.com/private-apps',
      },
      {
        id: 'salesforce', name: 'Salesforce', color: '#00A1E0', authType: 'oauth',
        description: 'Create and update CRM records from conversations',
        inputLabel: 'Salesforce Instance URL',
        inputPlaceholder: 'yourorg.salesforce.com',
        inputType: 'text',
        instructions: [
          { step: 'In Salesforce Setup, go to Apps → App Manager → New Connected App' },
          { step: 'Enable OAuth, set callback URL to your app URL + /api/auth/salesforce/callback' },
          { step: 'Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in your .env' },
          { step: 'Enter your Salesforce instance URL below' },
        ],
        instructionLink: 'https://login.salesforce.com',
      },
      {
        id: 'zendesk', name: 'Zendesk', color: '#03363D', authType: 'token',
        description: 'Convert conversations into Zendesk support tickets',
        inputLabel: 'Subdomain',
        inputPlaceholder: 'yourcompany',
        inputType: 'text',
        secondaryInputLabel: 'API Token',
        secondaryInputPlaceholder: 'Paste your Zendesk API token',
        secondaryInputType: 'password',
        instructions: [
          { step: 'In Zendesk Admin, go to Apps & Integrations → Zendesk API' },
          { step: 'Enable Token Access, then click "Add API Token"' },
          { step: 'Enter your subdomain (e.g. "yourcompany" for yourcompany.zendesk.com) and the token' },
        ],
        instructionLink: 'https://support.zendesk.com/hc/en-us/articles/4408889192858',
      },
      {
        id: 'shopify', name: 'Shopify', color: '#96BF48', authType: 'oauth',
        description: 'Pull order history and customer data for AI context',
        inputLabel: 'Store URL',
        inputPlaceholder: 'yourstore.myshopify.com',
        inputType: 'text',
        instructions: [
          { step: 'In Shopify Admin, go to Settings → Apps → Develop apps' },
          { step: 'Create an app and add scopes: read_customers, read_orders, read_products' },
          { step: 'Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in your .env' },
          { step: 'Enter your store URL (yourstore.myshopify.com) below' },
        ],
        instructionLink: 'https://shopify.dev/docs/apps/build/authentication-authorization',
      },
      {
        id: 'freshdesk', name: 'Freshdesk', color: '#25C16F', authType: 'token',
        description: 'Sync and create support tickets from conversations',
        inputLabel: 'Domain',
        inputPlaceholder: 'yourcompany.freshdesk.com',
        inputType: 'text',
        secondaryInputLabel: 'API Key',
        secondaryInputPlaceholder: 'Paste your Freshdesk API key',
        secondaryInputType: 'password',
        instructions: [
          { step: 'In Freshdesk, click your profile icon → Profile Settings' },
          { step: 'Scroll to "Your API Key" on the right side and copy it' },
          { step: 'Enter your domain (yourcompany.freshdesk.com) and API key below' },
        ],
        instructionLink: 'https://support.freshdesk.com/en/support/solutions/articles/215517',
      },
    ],
  },
];

/* ── Static display data ────────────────────────────────────────────────────── */

const DEFAULT_KPIS: KpiData[] = [
  { label: 'Active Conversations', value: '—', sub: 'connect a channel to start', positive: true },
  { label: 'Avg Response Time',    value: '—', sub: 'no data yet',               positive: true },
  { label: 'Mentions Detected',    value: '0', sub: 'across all platforms',       positive: true },
  { label: 'CSAT Score',           value: '—', sub: 'no data yet',               positive: true },
];

const PLATFORM_TABS: { key: Platform; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'instagram', label: 'Instagram' },
  { key: 'x',        label: 'X'         },
  { key: 'whatsapp',  label: 'WhatsApp'  },
  { key: 'email',     label: 'Email'     },
  { key: 'linkedin',  label: 'LinkedIn'  },
  { key: 'facebook',  label: 'Facebook'  },
  { key: 'tiktok',    label: 'TikTok'    },
];

const PLATFORM_COLORS: Record<Exclude<Platform, 'all'>, string> = {
  instagram: '#E1306C',
  x:         '#71767b', // X brand is black/white — use a mid grey that reads on both light + dark
  whatsapp:  '#25D366',
  email:     '#6D5EF9',
  linkedin:  '#0A66C2',
  facebook:  '#1877F2',
  tiktok:    '#69C9D0',
};

/* ── Mention types (real, per-company data from /api/comms/mentions) ─────────── */

interface Mention {
  id: string;
  platform: Exclude<Platform, 'all'>;
  author: string;
  handle: string;
  initials: string;
  text: string;
  url: string;
  time: string;
  sentiment: Sentiment;
  replied: boolean;
  seen: boolean;
  context: string; // provider/source label
}

/* ── Activity types (data comes live from /api/comms/activity) ───────────────── */

interface ActivityEvent { id?: string; event: string; time: string; color: string }
interface ActivityDay { day: string; received: number; sent: number; mentions: number }

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'demo1', customer: 'Samantha Addingi',   initials: 'SA', platform: 'linkedin', sentiment: 'neutral',  snippet: 'Alright thank you for reaching out!',              time: '18h ago', unread: false, messages: [], aiReply: '', location: '', language: '', intent: '', urgency: 4, firstContact: '', timeline: [] },
  { id: 'demo2', customer: 'Gideon Dadi',        initials: 'GD', platform: 'linkedin', sentiment: 'neutral',  snippet: 'Does this make sense with .NET backends?',         time: '4d ago',  unread: true,  messages: [], aiReply: '', location: '', language: '', intent: '', urgency: 6, firstContact: '', timeline: [] },
  { id: 'demo3', customer: 'Prof. David Costa',  initials: 'DC', platform: 'linkedin', sentiment: 'neutral',  snippet: 'Dear Abraham, I hope this message finds you well…', time: '12d ago', unread: false, messages: [], aiReply: '', location: '', language: '', intent: '', urgency: 3, firstContact: '', timeline: [] },
  { id: 'demo4', customer: 'LinkedIn Marketing', initials: 'LM', platform: 'linkedin', sentiment: 'neutral',  snippet: 'In the B2B sector, lead scoring matters more than…', time: '25d ago', unread: false, messages: [], aiReply: '', location: '', language: '', intent: '', urgency: 2, firstContact: '', timeline: [] },
  { id: 'demo5', customer: 'Sankalp Chhabra',    initials: 'SC', platform: 'linkedin', sentiment: 'positive', snippet: 'Saw your post about intent signals — very relevant…',  time: '33d ago', unread: false, messages: [], aiReply: '', location: '', language: '', intent: '', urgency: 5, firstContact: '', timeline: [] },
];

/* ── Main page ──────────────────────────────────────────────────────────────── */

/** Bearer auth headers for the per-user comms APIs (mentions/stats/activity). */
function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export default function CommHubPage() {
  const theme = useWorkspaceTheme();

  /* inbox state */
  const [pageTab,        setPageTab]        = useState<PageTab>('inbox');
  const [selectedId,     setSelectedId]     = useState<string>('');
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [loadingConvos,  setLoadingConvos]  = useState(true);
  const [activePlatform, setActivePlatform] = useState<Platform>('all');
  const [tone,           setTone]           = useState<Tone>('professional');
  const [kbEnabled,      setKbEnabled]      = useState(true);
  const [replies,        setReplies]        = useState<Record<string, string>>({});
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [kpis,      setKpis]      = useState<KpiData[]>(DEFAULT_KPIS);

  /* conversation reply drawer (click a row / account → thread + composer) */
  const [convoDrawerOpen, setConvoDrawerOpen] = useState(false);
  const [accountFilter,   setAccountFilter]   = useState<Platform>('all');

  /* live dashboard data (real, polled) */
  const [activityFeed,   setActivityFeed]   = useState<ActivityEvent[]>([]);
  const [activitySeries, setActivitySeries] = useState<ActivityDay[]>([]);

  const openConvo = (id: string) => {
    setSelectedId(id);
    setConvoDrawerOpen(true);
  };

  /* mentions state */
  const [mentions,          setMentions]          = useState<Mention[]>([]);
  const [selectedMentionId, setSelectedMentionId] = useState<string>('');
  const [mentionsNeedSetup, setMentionsNeedSetup] = useState(false);
  const [mentionsLoaded,    setMentionsLoaded]    = useState(false);
  const [refreshing,        setRefreshing]        = useState(false);
  const [mentionReplies,    setMentionReplies]    = useState<Record<string, string>>({});
  const [mentionSendState,  setMentionSendState]  = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});
  const [mentionSearch,     setMentionSearch]     = useState('');
  const [mentionStatus,     setMentionStatus]     = useState<'all' | 'unreplied' | 'replied'>('all');
  const [mentionPlatform,   setMentionPlatform]   = useState<Platform>('all');
  const [mentionSentiment,  setMentionSentiment]  = useState<'all' | Sentiment>('all');
  const [mentionLastReply,  setMentionLastReply]  = useState<Record<string, string>>({});

  /* channels state */
  const [connected,           setConnected]           = useState<ConnectedAccount[]>([]);
  const [modal,               setModal]               = useState<ModalState>({ open: false });
  const [connectError,        setConnectError]        = useState<string | null>(null);
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);

  const aiReplyTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sentResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const threadRef      = useRef<HTMLDivElement>(null);
  /* Deep-link target from a notification click (?convo=…) — applied once the
     conversations list has loaded so it isn't overwritten by the default. */
  const pendingConvo   = useRef<string | null>(null);

  /* ── Handle redirect / deep-link query params ──
     ?connected= / ?error= (Unipile hosted auth) and ?tab= / ?mention= / ?convo=
     (notification-bell deep links into a specific mention or conversation). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedParam = params.get('connected');
    const errorParam     = params.get('error');
    const tabParam       = params.get('tab');
    const mentionParam   = params.get('mention');
    const convoParam     = params.get('convo');

    if (connectedParam || errorParam || tabParam || mentionParam || convoParam) {
      window.history.replaceState({}, '', '/admin/comms');
    }
    if (connectedParam) {
      setPageTab('channels');
      refreshChannels();
    }
    if (tabParam === 'mentions' || tabParam === 'inbox' || tabParam === 'channels') {
      setPageTab(tabParam);
    }
    if (mentionParam) {
      // The 15s mentions poll preserves a valid selected id, so this sticks.
      setPageTab('mentions');
      setSelectedMentionId(mentionParam);
    }
    if (convoParam) {
      setPageTab('inbox');
      pendingConvo.current = convoParam;
      openConvo(convoParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Core data load: channels + stats + conversations. Reusable so it can run
       on mount AND after a disconnect (to clear that account's traction). ── */
  const loadCore = useCallback((isInitial = false) => {
    fetch('/api/comms/channels', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { connected?: { channel_id: string; handle: string; connected_at: string }[] }) => {
        if (data.connected) {
          setConnected(data.connected.map((ch) => ({
            channelId: ch.channel_id,
            handle: ch.handle,
            connectedAt: ch.connected_at,
          })));
        }
      })
      .catch(() => {});

    fetch('/api/comms/stats', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { activeConversations?: number; avgResponseTime?: string; mentionsDetected?: number; csatScore?: string }) => {
        if (data.activeConversations !== undefined) {
          setKpis([
            { label: 'Active Conversations', value: String(data.activeConversations), sub: 'live from connected accounts', positive: true },
            { label: 'Avg Response Time',    value: data.avgResponseTime ?? '—',      sub: 'across all channels', positive: true },
            { label: 'Mentions Detected',    value: String(data.mentionsDetected),    sub: 'across all platforms', positive: true },
            { label: 'CSAT Score',           value: data.csatScore ?? '—',            sub: 'based on replies sent', positive: true },
          ]);
        }
      })
      .catch(() => {});

    fetch('/api/comms/conversations', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { conversations?: ConvoRow[] }) => {
        const rows = data.conversations ?? [];
        const mapped: Conversation[] = rows.map((row) => ({
          id: String(row.id),
          customer: row.customer,
          initials: row.initials,
          platform: row.platform as Exclude<Platform, 'all'>,
          sentiment: (row.sentiment as Sentiment) ?? 'neutral',
          snippet: row.snippet,
          time: row.time_ago ?? '',
          unread: Boolean(row.unread),
          messages: [],
          aiReply: '',
          location: row.location ?? '',
          language: row.language ?? '',
          intent: row.intent ?? '',
          urgency: row.urgency ?? 5,
          firstContact: row.first_contact ?? '',
          timeline: [],
        }));
        setConversations(mapped);
        if (isInitial && pendingConvo.current) {
          // A notification deep-linked to a specific conversation — open it.
          setSelectedId(pendingConvo.current);
          setConvoDrawerOpen(true);
          pendingConvo.current = null;
        } else if (isInitial && mapped.length > 0) {
          setSelectedId(mapped[0].id);
        } else if (!mapped.some((c) => c.id === selectedId)) {
          // Selected conversation is gone (e.g. its account was disconnected).
          setSelectedId(mapped[0]?.id ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadCore(true); }, [loadCore]);

  /* ── Live loaders (also called on demand after replies to stay in sync) ── */
  const loadMentions = useCallback(() => {
    interface MentionApi {
      id: string; platform: string; author: string; handle: string; initials: string;
      text: string; url: string; time: string; sentiment: string; context: string; replied: boolean; seen: boolean;
    }
    fetch('/api/comms/mentions', { cache: 'no-store', headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { mentions?: MentionApi[]; count?: number; needs_setup?: boolean }) => {
        setMentionsLoaded(true);
        setMentionsNeedSetup(!!data.needs_setup);
        if (!data.mentions) return;
        const list: Mention[] = data.mentions.map((m) => ({
          id: m.id,
          platform: m.platform as Exclude<Platform, 'all'>,
          author: m.author,
          handle: m.handle,
          initials: m.initials,
          text: m.text,
          url: m.url,
          time: m.time,
          sentiment: m.sentiment as Sentiment,
          replied: m.replied,
          seen: m.seen,
          context: m.context,
        }));
        setMentions(list);
        setSelectedMentionId((prev) => (list.some((m) => m.id === prev) ? prev : (list[0]?.id ?? '')));
        if (typeof data.count === 'number') {
          setKpis((prev) => prev.map((k) => (k.label === 'Mentions Detected' ? { ...k, value: String(data.count) } : k)));
        }
      })
      .catch(() => setMentionsLoaded(true));
  }, []);

  const loadActivity = useCallback(() => {
    fetch('/api/comms/activity', { cache: 'no-store', headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { activity?: ActivityEvent[]; chart?: ActivityDay[] }) => {
        if (data.activity) setActivityFeed(data.activity);
        if (data.chart) setActivitySeries(data.chart);
      })
      .catch(() => {});
  }, []);

  /** Trigger server-side ingestion, then reload. force=true bypasses the throttle. */
  const refreshMentions = useCallback((force = false) => {
    if (force) setRefreshing(true);
    return fetch('/api/comms/mentions/refresh', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ force }) })
      .then((r) => r.json())
      .then(() => { loadMentions(); loadActivity(); })
      .catch(() => {})
      .finally(() => { if (force) setRefreshing(false); });
  }, [loadMentions, loadActivity]);

  /* Poll both feeds every 15s; kick a (throttled) ingestion once on mount. */
  useEffect(() => {
    loadMentions();
    loadActivity();
    refreshMentions(false);
    const id = setInterval(() => { loadMentions(); loadActivity(); }, 15_000);
    return () => clearInterval(id);
  }, [loadMentions, loadActivity, refreshMentions]);

  /* Mark mentions seen when the Mentions tab is open (clears the tab badge). */
  useEffect(() => {
    if (pageTab !== 'mentions' || !mentions.some((m) => !m.seen)) return;
    fetch('/api/comms/mentions', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ action: 'seen' }) }).catch(() => {});
    setMentions((prev) => prev.map((m) => ({ ...m, seen: true })));
  }, [pageTab, mentions]);

  /* ── Load conversation detail on selection ── */
  useEffect(() => {
    setSendState('idle');
    fetch(`/api/comms/conversations/${selectedId}`)
      .then((r) => r.json())
      .then((data: {
        conversation?: unknown;
        messages?: { id: string; from_type: string; text: string; time: string }[];
        timeline?: { date: string; channel: string; event: string }[];
        aiReply?: string;
      }) => {
        if (!data.conversation) return;
        const messages: ConvoMessage[] = (data.messages ?? []).map((m) => ({
          id: m.id,
          from: m.from_type as 'customer' | 'agent',
          text: m.text,
          time: m.time,
        }));
        const timeline: TimelineEvent[] = (data.timeline ?? []).map((t) => ({
          date: t.date,
          channel: t.channel as Exclude<Platform, 'all'>,
          event: t.event,
        }));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, messages, timeline } : c))
        );
        if (data.aiReply) {
          setReplies((prev) => ({ ...prev, [selectedId]: data.aiReply as string }));
        }
      })
      .catch(() => {});
  }, [selectedId]);

  /* ── Derived ── */
  const filtered = useMemo(
    () => activePlatform === 'all' ? conversations : conversations.filter((c) => c.platform === activePlatform),
    [activePlatform, conversations]
  );
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? conversations[0],
    [selectedId, conversations]
  );

  /* ── Auto-scroll thread to bottom when messages change ── */
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [selectedId, selected?.messages?.length]);

  const platformCount = (p: Platform) =>
    p === 'all' ? conversations.length : conversations.filter((c) => c.platform === p).length;

  // "Open conversations" table (dashboard tab) is scoped by the connected-account
  // quick filter — compute once so the header count and the rows never disagree
  // (previously the header always showed the unfiltered total while the table
  // silently applied the filter, making a filtered-to-zero view look like data
  // had disappeared).
  const accountFilteredConvos = useMemo(
    () => (conversations.length > 0 ? conversations : MOCK_CONVERSATIONS)
      .filter((c) => accountFilter === 'all' || c.platform === accountFilter),
    [conversations, accountFilter]
  );
  const accountFilterLabel = accountFilter === 'all'
    ? null
    : (connected.find((a) => a.channelId === accountFilter)?.handle || accountFilter);

  const handleSend = () => {
    if (!selected) return;
    const textToSend = (replies[selected.id] ?? '').trim();
    if (!textToSend) return;
    setSendState('sending');
    const convoId = selected.id;
    fetch(`/api/comms/conversations/${convoId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToSend, tone, kb_enabled: kbEnabled }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; messageId?: string; sentAt?: string }) => {
        if (data.success) {
          setSendState('sent');
          /* Reflect the sent reply in Recent Activity right away */
          loadActivity();
          /* Clear the compose box immediately */
          setReplies((prev) => ({ ...prev, [convoId]: '' }));
          /* Optimistic append */
          const newMsg: ConvoMessage = {
            id: data.messageId ?? `sent_${Date.now()}`,
            from: 'agent',
            text: textToSend,
            time: data.sentAt ?? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convoId
                ? { ...c, messages: [...(c.messages ?? []), newMsg], unread: false }
                : c
            )
          );
          /* Re-fetch confirmed thread from server after a short delay */
          setTimeout(() => {
            fetch(`/api/comms/conversations/${convoId}`)
              .then((r) => r.json())
              .then((d: { messages?: { id: string; from_type: string; text: string; time: string }[] }) => {
                if (!d.messages) return;
                const msgs: ConvoMessage[] = d.messages.map((m) => ({
                  id: m.id,
                  from: m.from_type as 'customer' | 'agent',
                  text: m.text,
                  time: m.time,
                }));
                setConversations((prev) =>
                  prev.map((c) => (c.id === convoId ? { ...c, messages: msgs } : c))
                );
              })
              .catch(() => {});
          }, 1500);
          /* Reset send button to idle so user can send again */
          if (sentResetTimer.current) clearTimeout(sentResetTimer.current);
          sentResetTimer.current = setTimeout(() => setSendState('idle'), 2000);
        } else {
          setSendState('idle');
        }
      })
      .catch(() => setSendState('idle'));
  };

  const handleReplyChange = (id: string, text: string) => {
    setReplies((prev) => ({ ...prev, [id]: text }));
    if (aiReplyTimer.current) clearTimeout(aiReplyTimer.current);
    aiReplyTimer.current = setTimeout(() => {
      fetch(`/api/comms/conversations/${id}/ai-reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).catch(() => {});
    }, 800);
  };

  /* ── Refresh channels from API (called after Unipile popup closes) ── */
  const refreshChannels = () => {
    fetch('/api/comms/channels', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { connected?: { channel_id: string; handle: string; connected_at: string }[] }) => {
        if (data.connected) {
          setConnected(data.connected.map((ch) => ({
            channelId: ch.channel_id,
            handle: ch.handle,
            connectedAt: ch.connected_at,
          })));
        }
      })
      .catch(() => {});
  };

  /* ── Channel connect / disconnect ── */
  const openConnect = (channelId: string) => { setConnectError(null); setModal({ open: true, phase: 'form', channelId }); };
  const openPicker  = ()                   => { setConnectError(null); setModal({ open: true, phase: 'pick' }); };

  const handleConnect = (inputValue: string, secondaryValue: string) => {
    if (!modal.open || modal.phase !== 'form') return;
    const { channelId } = modal;
    const ch = CHANNEL_GROUPS.flatMap((g) => g.channels).find((c) => c.id === channelId);

    /* Unipile channels — open hosted auth popup, poll for close, then sync */
    if (ch?.authType === 'unipile') {
      setModal({ open: true, phase: 'connecting', channelId });
      fetch(`/api/comms/channels/oauth-link?channel=${channelId}`, { headers: authHeaders() })
        .then(async (r) => ({ status: r.status, data: await r.json() as { url?: string; demo?: boolean; error?: string; code?: string } }))
        .then(({ status, data }) => {
          if (status === 402 && data.code === 'account_limit') {
            setConnectError(data.error ?? 'Connected-account limit reached for your plan.');
            setModal({ open: true, phase: 'form', channelId });
          } else if (data.url) {
            /* Open Unipile hosted auth in a centred popup */
            const w = 500, h = 700;
            const left = Math.round((screen.width  - w) / 2);
            const top  = Math.round((screen.height - h) / 2);
            const popup = window.open(
              data.url,
              'unipile_auth',
              `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
            );

            if (!popup) {
              /* Popup blocked — fall back to new tab */
              window.open(data.url, '_blank', 'noopener');
            }

            /* Poll every second until the popup closes */
            const poll = setInterval(() => {
              if (!popup || popup.closed) {
                clearInterval(poll);
                /* Re-fetch from Unipile API to get the newly connected account */
                refreshChannels();
                setModal({ open: false });
              }
            }, 1000);
          } else {
            /* Demo mode (no UNIPILE_API_KEY set) */
            simulateConnect(channelId, ch.name);
          }
        })
        .catch(() => simulateConnect(channelId, ch?.name ?? channelId));
      return;
    }

    /* All other channel types — save handle/token to local DB */
    setModal({ open: true, phase: 'connecting', channelId });
    const handle = inputValue.trim() || (ch?.inputPlaceholder ?? channelId);

    fetch(`/api/comms/channels/${channelId}`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ handle, secondary: secondaryValue }),
    })
      .then(async (r) => ({ status: r.status, data: await r.json() as { success?: boolean; account?: { channelId: string; handle: string; connectedAt: string }; error?: string; code?: string } }))
      .then(({ status, data }) => {
        if (status === 402 && data.code === 'account_limit') {
          setConnectError(data.error ?? 'Connected-account limit reached for your plan.');
          setModal({ open: true, phase: 'form', channelId });
        } else if (data.success && data.account) {
          setConnected((prev) => [
            ...prev.filter((a) => a.channelId !== channelId),
            { channelId: data.account!.channelId, handle: data.account!.handle, connectedAt: data.account!.connectedAt },
          ]);
          setModal({ open: true, phase: 'success', channelId });
          setTimeout(() => setModal({ open: false }), 900);
        } else {
          simulateConnect(channelId, ch?.name ?? channelId);
        }
      })
      .catch(() => simulateConnect(channelId, ch?.name ?? channelId));
  };

  const simulateConnect = (channelId: string, name: string) => {
    setTimeout(() => {
      setConnected((prev) => [
        ...prev.filter((a) => a.channelId !== channelId),
        { channelId, handle: name, connectedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
      ]);
      setModal({ open: true, phase: 'success', channelId });
      setTimeout(() => setModal({ open: false }), 900);
    }, 1500);
  };

  const handleDisconnect = async (channelId: string) => {
    setDisconnectConfirmId(null);
    // Optimistic: drop the chip + any filter/selection tied to this account.
    setConnected((prev) => prev.filter((a) => a.channelId !== channelId));
    if (accountFilter === channelId) setAccountFilter('all');
    try {
      await fetch(`/api/comms/channels/${channelId}`, { method: 'DELETE', headers: authHeaders() });
    } catch { /* server cleanup best-effort; still refresh below */ }
    // Pull fresh server truth so the disconnect persists and the account's
    // traction (counts, conversations, mentions) is cleared immediately.
    loadCore();
    loadMentions();
    loadActivity();
  };

  const connectedCount = connected.length;
  const totalChannels  = CHANNEL_GROUPS.reduce((s, g) => s + g.channels.length, 0);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div
          className="flex gap-1 rounded-xl p-1"
          style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
        >
          {([['inbox', 'Inbox'], ['mentions', 'Mentions'], ['channels', 'Connected Channels']] as [PageTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPageTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-all ${
                pageTab === key
                  ? 'bg-[#6D5EF9] text-white shadow'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {key === 'inbox' && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                </svg>
              )}
              {key === 'mentions' && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
              {key === 'channels' && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                  <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                </svg>
              )}
              {label}
              {key === 'mentions' && mentions.some(m => !m.seen) && (
                <span className={`rounded-full px-1.5 py-px text-[9px] font-bold ${pageTab === 'mentions' ? 'bg-white/20 text-white' : 'bg-[#6D5EF9]/20 text-[#6D5EF9]'}`}>
                  {mentions.filter(m => !m.seen).length}
                </span>
              )}
              {key === 'channels' && (
                <span className={`rounded-full px-1.5 py-px text-[9px] font-bold ${pageTab === 'channels' ? 'bg-white/20 text-white' : 'bg-white/[0.07] text-white/30'}`}>
                  {connectedCount}/{totalChannels}
                </span>
              )}
            </button>
          ))}
        </div>

        {pageTab === 'channels' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-white/30">{connectedCount} channels syncing</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <button
              onClick={openPicker}
              className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF9] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-[#5B4FE8]"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Connect a new account
            </button>
          </div>
        )}
      </div>

      {/* ── KPI row (always visible) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* ═══════════════════ MENTIONS TAB ══════════════════════════════════════ */}
      {pageTab === 'mentions' && (() => {
        /* filter + search over the live mentions feed */
        const q = mentionSearch.trim().toLowerCase();
        const filteredMentions = mentions.filter((m) =>
          (mentionStatus === 'all' || (mentionStatus === 'replied' ? m.replied : !m.replied)) &&
          (mentionPlatform === 'all' || m.platform === mentionPlatform) &&
          (mentionSentiment === 'all' || m.sentiment === mentionSentiment) &&
          (q === '' || `${m.author} ${m.handle} ${m.text}`.toLowerCase().includes(q))
        );
        const selectedMention = filteredMentions.find(m => m.id === selectedMentionId) ?? filteredMentions[0];
        const activeMentionId = selectedMention?.id ?? '';
        const sendState = mentionSendState[activeMentionId] ?? 'idle';
        const platformsPresent = Array.from(new Set(mentions.map(m => m.platform)));
        const unrepliedCount = mentions.filter(m => !m.replied).length;

        const handleMentionReply = () => {
          const id = activeMentionId;
          const text = (mentionReplies[id] ?? '').trim();
          if (!id || !text) return;
          setMentionSendState(prev => ({ ...prev, [id]: 'sending' }));
          fetch('/api/comms/mentions', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({ id, text }),
          })
            .then(r => r.json())
            .then((data: { success?: boolean }) => {
              if (data.success) {
                setMentions(prev => prev.map(m => m.id === id ? { ...m, replied: true } : m));
                setMentionLastReply(prev => ({ ...prev, [id]: text }));
                setMentionReplies(prev => ({ ...prev, [id]: '' }));
                setMentionSendState(prev => ({ ...prev, [id]: 'sent' }));
                /* keep Recent Activity + Mentions in sync immediately */
                loadActivity();
                loadMentions();
                setTimeout(() => setMentionSendState(prev => ({ ...prev, [id]: 'idle' })), 2500);
              } else {
                setMentionSendState(prev => ({ ...prev, [id]: 'idle' }));
              }
            })
            .catch(() => setMentionSendState(prev => ({ ...prev, [id]: 'idle' })));
        };

        return (
          <div className="flex flex-col gap-4">

            {/* Toolbar: search + status + platform + sentiment */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
              <div className="relative min-w-[200px] flex-1">
                <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                <input
                  value={mentionSearch}
                  onChange={e => setMentionSearch(e.target.value)}
                  placeholder="Search mentions, authors, handles…"
                  className="w-full rounded-lg py-2 pl-9 pr-3 text-[13px] outline-none transition-all focus:ring-1 focus:ring-[#6D5EF9]/40"
                  style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)', color: 'var(--a-text)' }}
                />
              </div>

              <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
                {([['all', 'All', mentions.length], ['unreplied', 'Unreplied', unrepliedCount], ['replied', 'Replied', mentions.length - unrepliedCount]] as [typeof mentionStatus, string, number][]).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setMentionStatus(key)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-semibold transition-all ${mentionStatus === key ? 'bg-[#6D5EF9] text-white shadow' : 'text-white/50 hover:text-white/80'}`}
                  >
                    {label}
                    <span className={`rounded-full px-1.5 text-[10px] font-bold ${mentionStatus === key ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/40'}`}>{count}</span>
                  </button>
                ))}
              </div>

              <select
                value={mentionPlatform}
                onChange={e => setMentionPlatform(e.target.value as Platform)}
                className="rounded-lg px-3 py-2 text-[12px] font-medium outline-none"
                style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)', color: 'var(--a-text)' }}
              >
                <option value="all">All platforms</option>
                {platformsPresent.map(p => <option key={p} value={p}>{p === 'x' ? 'X (Twitter)' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>

              <select
                value={mentionSentiment}
                onChange={e => setMentionSentiment(e.target.value as 'all' | Sentiment)}
                className="rounded-lg px-3 py-2 text-[12px] font-medium outline-none"
                style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)', color: 'var(--a-text)' }}
              >
                <option value="all">All sentiment</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>

              <button
                onClick={() => refreshMentions(true)}
                disabled={refreshing}
                title="Scan the web for new mentions now"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-white/70 transition-all hover:text-white disabled:opacity-50"
                style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}>
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.311h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
                {refreshing ? 'Scanning…' : 'Refresh'}
              </button>
            </div>

            {mentionsNeedSetup && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(109,94,249,0.08)', border: '1px solid rgba(109,94,249,0.3)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-[#8B7EF9]">radar</span>
                  <p className="text-[13px] text-white/80">
                    Set up mention monitoring to track what people say about your company across the web.
                  </p>
                </div>
                <a href="/admin/settings#mention-monitoring" className="rounded-lg bg-[#6D5EF9] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-[#5B4FE8]">
                  Configure in Settings
                </a>
              </div>
            )}

            {/* Two-pane: list + detail (stacks on mobile) */}
            <div className="flex flex-col overflow-hidden rounded-xl lg:flex-row" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', height: 'calc(100vh - 360px)', minHeight: '520px' }}>

              {/* LEFT — mention list */}
              <div className="flex max-h-[45%] w-full shrink-0 flex-col border-b lg:max-h-none lg:w-[300px] lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--a-border)' }}>
                <div className="flex shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--a-border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{filteredMentions.length} of {mentions.length}</p>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#21F2A6]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#21F2A6]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#21F2A6] opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#21F2A6]" />
                    </span>
                    Live
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredMentions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                      {mentionsNeedSetup ? (
                        <>
                          <span className="material-symbols-outlined text-[26px] text-white/20">radar</span>
                          <p className="text-[12px] font-medium text-white/50">Mention monitoring isn&apos;t set up yet</p>
                          <a href="/admin/settings#mention-monitoring" className="text-[11px] font-semibold text-[#6D5EF9] hover:underline">Configure your brand terms →</a>
                        </>
                      ) : !mentionsLoaded ? (
                        <p className="text-[12px] font-medium text-white/40">Loading mentions…</p>
                      ) : mentions.length === 0 ? (
                        <>
                          <span className="material-symbols-outlined text-[26px] text-white/20">travel_explore</span>
                          <p className="text-[12px] font-medium text-white/50">No mentions found yet</p>
                          <p className="text-[11px] text-white/30">We scan the web every few minutes.</p>
                          <button onClick={() => refreshMentions(true)} disabled={refreshing} className="text-[11px] font-semibold text-[#6D5EF9] hover:underline disabled:opacity-50">{refreshing ? 'Scanning…' : 'Scan now'}</button>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[26px] text-white/20">filter_alt_off</span>
                          <p className="text-[12px] font-medium text-white/50">No mentions match</p>
                          <button onClick={() => { setMentionSearch(''); setMentionStatus('all'); setMentionPlatform('all'); setMentionSentiment('all'); }} className="text-[11px] font-semibold text-[#6D5EF9] hover:underline">Clear filters</button>
                        </>
                      )}
                    </div>
                  ) : filteredMentions.map(m => {
                    const active = activeMentionId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMentionId(m.id)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                        style={{ borderBottom: '1px solid var(--a-border)', background: active ? 'var(--a-card2)' : 'transparent' }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: PLATFORM_COLORS[m.platform] + '26', color: PLATFORM_COLORS[m.platform] }}>
                            {m.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <span className="truncate text-[12px] font-semibold" style={{ color: 'var(--a-text)' }}>{m.author}</span>
                              {!m.replied && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6D5EF9]" title="Unreplied" />}
                              {m.replied && <span className="rounded-full bg-emerald-500/15 px-1.5 py-px text-[9px] font-bold text-emerald-500">Replied</span>}
                              <span className="ml-auto shrink-0 text-[10px] text-white/40">{m.time}</span>
                            </div>
                            <p className="truncate text-[11px] text-white/45">{m.handle}</p>
                            <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-white/65">{m.text}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: PLATFORM_COLORS[m.platform] }} />
                              <span className="text-[10px] font-semibold capitalize" style={{ color: PLATFORM_COLORS[m.platform] }}>{m.platform === 'x' ? 'X' : m.platform}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT — detail + persistent composer */}
              {selectedMention ? (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* header */}
                  <div className="flex shrink-0 items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--a-border)' }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: PLATFORM_COLORS[selectedMention.platform] + '26', color: PLATFORM_COLORS[selectedMention.platform] }}>
                      {selectedMention.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>{selectedMention.author}</p>
                      <p className="truncate text-[11px] text-white/45">{selectedMention.handle}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize" style={{ background: PLATFORM_COLORS[selectedMention.platform] + '1c', color: PLATFORM_COLORS[selectedMention.platform] }}>
                      {selectedMention.platform === 'x' ? 'X (Twitter)' : selectedMention.platform}
                    </span>
                    <span className="text-[11px] text-white/40">{selectedMention.time}</span>
                    <a href={selectedMention.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#6D5EF9] transition-colors hover:bg-[#6D5EF9]/10">
                      Open
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                    </a>
                  </div>

                  {/* body */}
                  <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{selectedMention.context}</p>
                    <div className="rounded-xl px-4 py-4" style={{ background: 'var(--a-card2)', border: '1px solid var(--a-border2)' }}>
                      <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--a-text-80)' }}>{selectedMention.text}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SentimentBadge sentiment={selectedMention.sentiment} />
                      <span className="rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'var(--a-card2)', color: 'var(--a-text-60)' }}>Brand mention</span>
                    </div>
                    {selectedMention.replied && (
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6D5EF9]/15 text-[9px] font-bold text-[#6D5EF9]">You</div>
                        <div className="max-w-[85%] rounded-xl rounded-tl-sm px-3.5 py-2.5" style={{ background: 'rgba(33,242,166,0.10)', border: '1px solid rgba(33,242,166,0.22)' }}>
                          <p className="text-[12px] leading-[1.6]" style={{ color: 'var(--a-text-80)' }}>{mentionLastReply[selectedMention.id] ?? 'You replied to this mention.'}</p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-500"><span className="material-symbols-outlined text-[12px]">check_circle</span>Reply sent</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* persistent composer */}
                  <div className="shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--a-border)' }}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                        {selectedMention.replied ? 'Send a follow-up' : `Reply publicly on ${selectedMention.platform === 'x' ? 'X' : selectedMention.platform}`}
                      </p>
                      {selectedMention.replied && <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500"><span className="material-symbols-outlined text-[13px]">check_circle</span>Replied</span>}
                    </div>
                    <textarea
                      rows={3}
                      value={mentionReplies[activeMentionId] ?? ''}
                      onChange={e => setMentionReplies(prev => ({ ...prev, [activeMentionId]: e.target.value }))}
                      placeholder={selectedMention.replied ? 'Write a follow-up…' : 'Write a reply…'}
                      className="w-full resize-none rounded-xl px-4 py-3 text-[13px] outline-none transition-all focus:ring-1 focus:ring-[#6D5EF9]/40"
                      style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)', color: 'var(--a-text)' }}
                    />
                    <div className="mt-2.5 flex items-center justify-between">
                      <p className="text-[10px] text-white/35">{(mentionReplies[activeMentionId] ?? '').length}/280</p>
                      <button
                        onClick={handleMentionReply}
                        disabled={!mentionReplies[activeMentionId]?.trim() || sendState === 'sending'}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-[12px] font-semibold text-white transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #6D5EF9, #18D8FF)' }}
                      >
                        {sendState === 'sending' ? (
                          <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Sending…</>
                        ) : sendState === 'sent' ? (
                          <><svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>Sent!</>
                        ) : (
                          <><svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.114A28.897 28.897 0 003.105 2.289z" /></svg>{selectedMention.replied ? 'Send follow-up' : 'Send reply'}</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--a-card2)', border: '1px solid var(--a-border)' }}>
                    <span className="material-symbols-outlined text-[26px] text-white/25">alternate_email</span>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--a-text-60)' }}>{mentions.length === 0 ? 'No mentions yet' : 'Select a mention'}</p>
                  <p className="text-[12px] text-white/40">{mentions.length === 0 ? 'Brand mentions across your channels will appear here in real time.' : 'Pick a mention from the list to view and reply.'}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════ INBOX TAB — dashboard ══════════════════════════ */}
      {pageTab === 'inbox' && (
        <div className="space-y-5">

          {/* ── Comms activity chart ── */}
          <div className="rounded-xl p-5" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                  Comms activity
                  <span className="flex items-center gap-1 rounded-full bg-[#21F2A6]/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-[#21F2A6]">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-[#21F2A6]" />Live
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-white/35">Messages in/out and brand mentions · last 7 days</p>
              </div>
              <div className="flex items-center gap-5 text-[11px] text-white/40">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#6D5EF9]" />Received</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#18D8FF]" />Sent</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#21F2A6]" />Mentions</span>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitySeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={8} barGap={2}>
                  <CartesianGrid strokeDasharray="3 5" stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--a-card)', border: '1px solid var(--a-border2)', borderRadius: 10, padding: '8px 12px' }}
                    labelStyle={{ color: 'var(--a-text-40)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}
                    itemStyle={{ color: 'var(--a-text-60)', fontSize: 11 }}
                    cursor={{ fill: theme.grid }}
                  />
                  <Bar dataKey="received" name="Received" fill="#6D5EF9" radius={[3, 3, 0, 0]} fillOpacity={0.9} />
                  <Bar dataKey="sent"     name="Sent"     fill="#18D8FF" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                  <Bar dataKey="mentions" name="Mentions" fill="#21F2A6" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Connected accounts quick-filter ── */}
          <div className="rounded-xl p-4" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-white">Connected accounts</p>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] font-bold text-white/40">{connected.length}</span>
              </div>
              <button
                onClick={() => setPageTab('channels')}
                className="text-[11px] font-semibold text-[#6D5EF9] transition hover:text-[#18D8FF]"
              >
                Manage channels →
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <AccountChip
                label="All accounts"
                color="#6D5EF9"
                count={conversations.length}
                active={accountFilter === 'all'}
                onClick={() => setAccountFilter('all')}
              />
              {connected.map((acc) => {
                const plat = acc.channelId as Platform;
                const color = PLATFORM_COLORS[acc.channelId as Exclude<Platform, 'all'>] ?? '#6D5EF9';
                // Messaging channels count DM conversations; social-only channels
                // (TikTok) have no DMs, so surface their mention count instead of a
                // misleading 0.
                const count = NON_MESSAGING_CHANNELS.has(acc.channelId)
                  ? mentions.filter((m) => m.platform === acc.channelId).length
                  : conversations.filter((c) => c.platform === acc.channelId).length;
                return (
                  <AccountChip
                    key={acc.channelId}
                    label={acc.handle || acc.channelId}
                    color={color}
                    count={count}
                    active={accountFilter === plat}
                    onClick={() => setAccountFilter(plat)}
                    platform={acc.channelId}
                  />
                );
              })}
              {connected.length === 0 && (
                <button
                  onClick={() => { setPageTab('channels'); openPicker(); }}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/40 transition hover:border-[#6D5EF9]/50 hover:text-white/70"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                  Connect your first account
                </button>
              )}
            </div>
          </div>

          {/* ── Two-column: activity feed + conversations table ── */}
          <div className="grid gap-5 lg:grid-cols-[1fr,1.6fr]">

            {/* Left: Recent Activity timeline */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--a-border)' }}>
                <div>
                  <p className="text-[14px] font-semibold text-white">Recent activity</p>
                  <p className="mt-0.5 text-[11px] text-white/35">Latest signal events across all channels</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-[#21F2A6]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#21F2A6]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#21F2A6] opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#21F2A6]" />
                  </span>
                  Live
                </span>
              </div>
              <div className="px-5 py-3 overflow-y-auto" style={{ maxHeight: 400 }}>
                {activityFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <span className="material-symbols-outlined text-[28px] text-white/15">bolt</span>
                    <p className="text-[12px] text-white/40">No activity yet</p>
                    <p className="text-[11px] text-white/25">Replies, mentions, and channel events appear here in real time.</p>
                  </div>
                ) : (
                  <div className="relative pl-5">
                    <div className="absolute left-[7px] top-3 bottom-3 w-px bg-white/[0.05]" />
                    {activityFeed.map((item, i) => (
                      <div key={item.id ?? i} className="relative flex gap-3 py-3">
                        <div
                          className="absolute -left-5 top-[15px] h-2 w-2 rounded-full border-2"
                          style={{ background: item.color, borderColor: 'var(--a-card)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] leading-snug text-white/70">{item.event}</p>
                          <p className="mt-1 text-[10px] text-white/25">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Conversations table */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--a-border)' }}>
                <div>
                  <p className="text-[14px] font-semibold text-white">Open conversations</p>
                  <p className="mt-0.5 text-[11px] text-white/35">
                    {loadingConvos
                      ? 'Loading…'
                      : conversations.length === 0
                        ? 'Demo data — connect a channel to see live conversations'
                        : accountFilter === 'all'
                          ? `${conversations.length} total`
                          : (
                            <>
                              Showing {accountFilteredConvos.length} of {conversations.length} · filtered by <span className="capitalize text-white/55">{accountFilterLabel}</span>{' '}
                              <button
                                onClick={() => setAccountFilter('all')}
                                className="ml-1 font-semibold text-[#6D5EF9] hover:text-[#18D8FF]"
                              >
                                Clear filter
                              </button>
                            </>
                          )}
                  </p>
                </div>
                {!loadingConvos && conversations.length === 0 && (
                  <button
                    onClick={() => { setPageTab('channels'); openPicker(); }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF9] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#5B4FE8]"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    Connect channel
                  </button>
                )}
              </div>
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 372 }}>
                <table className="w-full">
                  <thead className="sticky top-0" style={{ background: 'var(--a-card)' }}>
                    <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                      {['Contact', 'Channel', 'Mood', 'Last message', 'Wait', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingConvos && (accountFilter === 'all' || isDmPlatform(accountFilter)) && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--a-border)' }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-3 rounded-md bg-white/[0.04] animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {accountFilteredConvos.length === 0 && accountFilter !== 'all' && !isDmPlatform(accountFilter) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8">
                          <div className="mx-auto max-w-md text-center">
                            <p className="text-[13px] font-semibold text-white capitalize">{accountFilterLabel} has no message inbox</p>
                            <p className="mx-auto mt-1.5 text-[12px] leading-relaxed text-white/45">
                              {accountFilter === 'tiktok' ? 'TikTok' : accountFilterLabel} doesn’t provide a DM API, so conversations can’t sync here.
                              Your {accountFilter === 'tiktok' ? 'TikTok' : ''} activity lives in Mentions and the Lead Queue instead.
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2">
                              <button
                                onClick={() => { setMentionPlatform(accountFilter); setPageTab('mentions'); }}
                                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110"
                                style={{ background: 'linear-gradient(135deg, #6D5EF9, #18D8FF)' }}
                              >
                                View mentions
                                {mentions.filter((m) => m.platform === accountFilter).length > 0 && (
                                  <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{mentions.filter((m) => m.platform === accountFilter).length}</span>
                                )}
                              </button>
                              <a
                                href="/admin/leads"
                                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold text-white/70 transition-colors hover:text-white"
                                style={{ borderColor: 'var(--a-border2)' }}
                              >
                                View leads
                              </a>
                            </div>
                            <button onClick={() => setAccountFilter('all')} className="mt-3 block w-full text-[11px] text-white/30 hover:text-white/55">
                              or show all accounts
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loadingConvos && accountFilteredConvos.length === 0 && conversations.length > 0 && (accountFilter === 'all' || isDmPlatform(accountFilter)) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <p className="text-[12px] text-white/40">
                            No <span className="capitalize">{accountFilterLabel}</span> conversations in your {conversations.length} total.
                          </p>
                          <button
                            onClick={() => setAccountFilter('all')}
                            className="mt-1.5 text-[12px] font-semibold text-[#6D5EF9] hover:text-[#18D8FF]"
                          >
                            Show all accounts
                          </button>
                        </td>
                      </tr>
                    )}
                    {!loadingConvos && accountFilteredConvos.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => openConvo(String(c.id))}
                        style={{ borderBottom: '1px solid var(--a-border)' }}
                        className="group transition-colors hover:bg-[#6D5EF9]/[0.06] cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar initials={c.initials} size={26} />
                            <span className="text-[12px] font-medium text-white/75 truncate max-w-[100px]">{c.customer}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <PlatformDot color={PLATFORM_COLORS[c.platform as Exclude<Platform, 'all'>] ?? '#6D5EF9'} />
                            <span className="text-[11px] capitalize text-white/40">{c.platform}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <SentimentBadge sentiment={(c.sentiment as Sentiment) ?? 'neutral'} />
                        </td>
                        <td className="px-4 py-3 max-w-[150px]">
                          <span className="block truncate text-[11px] text-white/35">{c.snippet}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[11px] tabular-nums text-white/35">{c.time}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ConvoStatusBadge unread={!!c.unread} time={c.time} />
                            <span className="material-symbols-outlined text-[16px] text-white/15 transition-colors group-hover:text-[#6D5EF9]">chevron_right</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}


      {/* ═══════════════════ CHANNELS TAB ════════════════════════════════════ */}
      {pageTab === 'channels' && (
        <div className="space-y-6">
          {CHANNEL_GROUPS.map((group) => {
            const groupConnectedCount = group.channels.filter((ch) => connected.some((a) => a.channelId === ch.id)).length;
            return (
              <div key={group.name}>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-[12px] font-semibold text-white/60">{group.name}</h3>
                  <span className="text-[11px] text-white/20">{groupConnectedCount}/{group.channels.length} connected</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.channels.map((ch) => {
                    const account = connected.find((a) => a.channelId === ch.id);
                    const isConnected = !!account;
                    const confirmingDisconnect = disconnectConfirmId === ch.id;
                    return (
                      <ChannelCard
                        key={ch.id}
                        ch={ch}
                        account={account}
                        isConnected={isConnected}
                        confirmingDisconnect={confirmingDisconnect}
                        onConnect={() => openConnect(ch.id)}
                        onDisconnectRequest={() => setDisconnectConfirmId(ch.id)}
                        onDisconnectConfirm={() => handleDisconnect(ch.id)}
                        onDisconnectCancel={() => setDisconnectConfirmId(null)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Connect modal ────────────────────────────────────────────────────── */}
      {modal.open && (
        <ConnectModal
          modal={modal}
          error={connectError}
          onPickChannel={(id) => { setConnectError(null); setModal({ open: true, phase: 'form', channelId: id }); }}
          onBack={() => { setConnectError(null); setModal({ open: true, phase: 'pick' }); }}
          onConnect={handleConnect}
          onClose={() => setModal({ open: false })}
        />
      )}

      {/* ── Conversation reply drawer (slide-over) ───────────────────────────── */}
      {convoDrawerOpen && selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setConvoDrawerOpen(false)}
          />

          {/* panel */}
          <div
            className="relative flex h-full w-full max-w-[480px] flex-col shadow-2xl"
            style={{ background: 'var(--a-card)', borderLeft: '1px solid var(--a-border)' }}
          >
            {/* header */}
            <div className="flex shrink-0 items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--a-border)' }}>
              <Avatar initials={selected.initials} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white">{selected.customer}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                  <PlatformDot color={PLATFORM_COLORS[selected.platform] ?? '#6D5EF9'} />
                  <span className="capitalize">{PLATFORM_TABS.find((p) => p.key === selected.platform)?.label ?? selected.platform}</span>
                  <span>·</span>
                  <span>{selected.time}</span>
                </p>
              </div>
              <SentimentBadge sentiment={selected.sentiment} />
              <button
                onClick={() => setConvoDrawerOpen(false)}
                className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
                aria-label="Close"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>

            {/* thread */}
            <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {selected.messages.length > 0 ? (
                selected.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} customer={selected.customer} initials={selected.initials} />
                ))
              ) : (
                <MessageBubble
                  msg={{ id: 'snippet', from: 'customer', text: selected.snippet || 'No messages loaded for this conversation yet.', time: selected.time }}
                  customer={selected.customer}
                  initials={selected.initials}
                />
              )}
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="flex items-center gap-1.5 rounded-full bg-[#6D5EF9]/10 px-2.5 py-1 text-[10px] font-semibold text-[#6D5EF9]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6D5EF9] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6D5EF9]" />
                  </span>
                  AI suggested reply
                </span>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>
            </div>

            {/* composer */}
            <div className="shrink-0 p-4" style={{ borderTop: '1px solid var(--a-border)' }}>
              <div className="mb-2.5 flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">Tone</span>
                <div className="flex gap-1">
                  {(['professional', 'friendly', 'formal'] as Tone[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize transition-all ${
                        tone === t ? 'bg-[#6D5EF9]/15 text-[#6D5EF9]' : 'text-white/30 hover:bg-white/[0.05] hover:text-white/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">KB</span>
                  <button
                    onClick={() => setKbEnabled((v) => !v)}
                    className={`relative h-4 w-7 rounded-full transition-colors ${kbEnabled ? 'bg-[#6D5EF9]' : 'bg-white/[0.08]'}`}
                  >
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${kbEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                value={replies[selected.id] ?? ''}
                onChange={(e) => handleReplyChange(selected.id, e.target.value)}
                className="w-full resize-none rounded-lg p-3 text-[13px] leading-relaxed text-white/80 outline-none transition-all placeholder:text-white/20 focus:ring-1 focus:ring-[#6D5EF9]/40"
                style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}
                placeholder="Write a reply or edit the AI suggestion…"
              />
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleSend}
                  disabled={sendState !== 'idle' || !(replies[selected.id] ?? '').trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF9] px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-[#5B4FE8] disabled:opacity-50"
                >
                  {sendState === 'sending' ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : sendState === 'sent' ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.114A28.897 28.897 0 003.105 2.289z" /></svg>
                  )}
                  {sendState === 'sent' ? 'Sent' : sendState === 'sending' ? 'Sending…' : 'Approve & Send'}
                </button>
                <button className="rounded-lg px-3 py-2 text-[12px] font-medium text-white/40 transition-all hover:bg-white/[0.05] hover:text-white/70">Reject</button>
                <button className="ml-auto rounded-lg px-3 py-2 text-[12px] font-medium text-amber-400/70 transition-all hover:bg-amber-500/[0.07] hover:text-amber-400">Escalate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Brand glyphs (simple-icons paths) so each connected account shows its platform. */
const BRAND_ICONS: Record<string, { d: string; color: string }> = {
  whatsapp: { color: '#25D366', d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
  linkedin: { color: '#0A66C2', d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  instagram: { color: '#E1306C', d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
  facebook: { color: '#1877F2', d: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  tiktok: { color: '#ffffff', d: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  x: { color: '#e4e4e4', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
};

function PlatformIcon({ platform, size = 15 }: { platform: string; size?: number }) {
  const brand = BRAND_ICONS[platform];
  if (!brand) {
    return <span className="rounded-full" style={{ width: size * 0.55, height: size * 0.55, background: PLATFORM_COLORS[platform as Exclude<Platform, 'all'>] ?? '#6D5EF9' }} />;
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={brand.color} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={brand.d} />
    </svg>
  );
}

function AccountChip({
  label, color, count, active, onClick, platform,
}: { label: string; color: string; count: number; active: boolean; onClick: () => void; platform?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
        active ? 'text-white' : 'text-white/55 hover:text-white/80'
      }`}
      style={{
        borderColor: active ? color : 'var(--a-border)',
        background: active ? color + '20' : 'transparent',
      }}
    >
      {platform ? <PlatformIcon platform={platform} /> : <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      <span className="max-w-[140px] truncate capitalize">{label}</span>
      <span className="rounded-full bg-white/[0.08] px-1.5 py-px text-[10px] font-bold text-white/50">{count}</span>
    </button>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub, positive }: KpiData) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
      <p className="mb-1 text-[11px] font-medium text-white/40">{label}</p>
      <p className="text-[22px] font-bold tracking-tight text-white">{value}</p>
      <p className={`mt-1 text-[11px] font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{sub}</p>
    </div>
  );
}

function Avatar({ initials, size }: { initials: string; size: number }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full bg-[#6D5EF9]/20 font-bold text-[#6D5EF9]"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function PlatformDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

function SentimentBadge({ sentiment, small }: { sentiment: Sentiment; small?: boolean }) {
  const cfg = {
    positive: { label: 'Positive', cls: 'bg-emerald-500/15 text-emerald-400' },
    negative: { label: 'Negative', cls: 'bg-red-500/15 text-red-400'         },
    urgent:   { label: 'Urgent',   cls: 'bg-amber-500/15 text-amber-400'     },
    neutral:  { label: 'Neutral',  cls: 'bg-white/[0.06] text-white/40'      },
  }[sentiment];
  void small;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {sentiment === 'urgent' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

function ConvoStatusBadge({ unread, time }: { unread: boolean; time: string }) {
  let status = 'Open';
  if (unread) {
    status = 'New';
  } else if (time.includes('h')) {
    status = 'Active';
  } else {
    const days = parseInt(time);
    if (!isNaN(days) && days > 14) status = 'Cold';
  }
  const map: Record<string, string> = {
    'New':    'bg-[#6D5EF9]/15 text-[#6D5EF9]',
    'Active': 'bg-emerald-500/15 text-emerald-400',
    'Open':   'bg-white/[0.06] text-white/35',
    'Cold':   'bg-amber-500/10 text-amber-500/60',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status]}`}>{status}</span>;
}

function ConvoCard({ convo, active, onClick }: { convo: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2.5 text-left transition-all ${active ? '' : 'hover:bg-white/[0.03]'}`}
      style={active ? { background: 'var(--a-card2)' } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative mt-0.5 shrink-0">
          <Avatar initials={convo.initials} size={30} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2" style={{ background: PLATFORM_COLORS[convo.platform], borderColor: 'var(--a-card)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-semibold text-white/80">{convo.customer}</p>
            {convo.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6D5EF9]" />}
            <span className="ml-auto shrink-0 text-[10px] text-white/20">{convo.time}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/35">{convo.snippet}</p>
          <div className="mt-1.5"><SentimentBadge sentiment={convo.sentiment} small /></div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg, customer, initials }: { msg: ConvoMessage; customer: string; initials: string }) {
  const isCustomer = msg.from === 'customer';
  return (
    <div className={`flex gap-2.5 ${isCustomer ? '' : 'flex-row-reverse'}`}>
      <div className="mt-0.5 shrink-0">
        {isCustomer ? (
          <Avatar initials={initials} size={26} />
        ) : (
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-bold text-white/40">PG</div>
        )}
      </div>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isCustomer ? '' : 'items-end'}`}>
        <div
          className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${isCustomer ? 'text-white/75' : 'bg-[#6D5EF9]/15 text-white/80'}`}
          style={isCustomer ? { background: 'var(--a-bg)', border: '1px solid var(--a-border)' } : undefined}
        >
          {msg.text}
        </div>
        <p className="text-[10px] text-white/20">{msg.time}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px]">{icon}</span>
      <span className="w-[72px] shrink-0 text-[11px] text-white/25">{label}</span>
      <span className="truncate text-[11px] text-white/55">{value}</span>
    </div>
  );
}

function AnalysisRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[64px] shrink-0 text-[11px] text-white/30">{label}</span>
      {children ?? <span className="text-[11px] text-white/60">{value}</span>}
    </div>
  );
}

function UrgencyBar({ value }: { value: number }) {
  const pct   = (value / 10) * 100;
  const color = value >= 8 ? '#EF4444' : value >= 5 ? '#F59E0B' : '#10B981';
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>{value}/10</span>
    </div>
  );
}

/* ── ChannelCard ─────────────────────────────────────────────────────────────── */

function ChannelCard({
  ch, account, isConnected, confirmingDisconnect,
  onConnect, onDisconnectRequest, onDisconnectConfirm, onDisconnectCancel,
}: {
  ch: ChannelDef;
  account: ConnectedAccount | undefined;
  isConnected: boolean;
  confirmingDisconnect: boolean;
  onConnect: () => void;
  onDisconnectRequest: () => void;
  onDisconnectConfirm: () => void;
  onDisconnectCancel: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl p-4 transition-all ${isConnected ? 'ring-1' : ''}`}
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        ...(isConnected ? { ringColor: ch.color + '30' } : {}),
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-2.5">
        <div className="shrink-0">
          <PlatformLogo id={ch.id} size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white/85">{ch.name}</p>
          {ch.authType === 'unipile' && <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#18D8FF]/70">Unipile</span>}
          {ch.authType === 'oauth'   && <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">OAuth</span>}
          {ch.authType === 'token'   && <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">API Token</span>}
          {ch.authType === 'handle'  && <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">Direct</span>}
          {ch.authType === 'imap'    && <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">IMAP</span>}
        </div>
        {isConnected && <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-400 mt-1" />}
      </div>

      <p className="mb-4 text-[11px] leading-relaxed text-white/35">{ch.description}</p>

      {/* Status + action */}
      <div className="mt-auto" style={{ borderTop: '1px solid var(--a-border)', paddingTop: '12px' }}>
        {isConnected && !confirmingDisconnect && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-emerald-400">Connected</p>
              <p className="mt-0.5 truncate text-[11px] text-white/40">{account?.handle}</p>
            </div>
            <button
              onClick={onDisconnectRequest}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/25 transition-all hover:bg-red-500/[0.08] hover:text-red-400"
            >
              Disconnect
            </button>
          </div>
        )}

        {isConnected && confirmingDisconnect && (
          <div>
            <p className="mb-2 text-[11px] text-white/50">Disconnect <span className="font-semibold text-white/70">{account?.handle}</span>?</p>
            <div className="flex gap-2">
              <button
                onClick={onDisconnectConfirm}
                className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-500/[0.1]"
                style={{ border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Yes, disconnect
              </button>
              <button
                onClick={onDisconnectCancel}
                className="flex-1 rounded-lg py-1.5 text-[11px] font-medium text-white/40 transition-all hover:bg-white/[0.05]"
                style={{ border: '1px solid var(--a-border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/20">Not connected</p>
            <button
              onClick={onConnect}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: ch.color }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Connect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ConnectModal ────────────────────────────────────────────────────────────── */

const PICKER_SECTIONS = [
  {
    label: 'Social & Messaging',
    items: [
      { id: 'linkedin',  name: 'LinkedIn'           },
      { id: 'whatsapp',  name: 'WhatsApp Business'  },
      { id: 'instagram', name: 'Instagram'           },
      { id: 'messenger', name: 'Facebook Messenger'  },
      { id: 'telegram',  name: 'Telegram'            },
      { id: 'x',         name: 'X (Twitter)'         },
      { id: 'facebook',  name: 'Facebook'            },
      { id: 'slack',     name: 'Slack'               },
      { id: 'tiktok',    name: 'TikTok'              },
      { id: 'discord',   name: 'Discord'             },
      { id: 'threads',   name: 'Threads'             },
      { id: 'youtube',   name: 'YouTube'             },
    ],
  },
  {
    label: 'Email',
    items: [
      { id: 'gmail',   name: 'Google (Gmail)'      },
      { id: 'imap',    name: 'IMAP / Custom Email' },
      { id: 'outlook', name: 'Microsoft (Outlook)' },
    ],
  },
  {
    label: 'Business Tools',
    items: [
      { id: 'hubspot',    name: 'HubSpot'    },
      { id: 'salesforce', name: 'Salesforce' },
      { id: 'zendesk',    name: 'Zendesk'    },
      { id: 'shopify',    name: 'Shopify'    },
      { id: 'freshdesk',  name: 'Freshdesk'  },
    ],
  },
] as const;

const MODAL_INPUT_CLS =
  'w-full rounded-lg px-3 py-2.5 text-[13px] text-white/80 outline-none transition-all placeholder:text-white/20 focus:ring-1 focus:ring-[#6D5EF9]/50';
const MODAL_INPUT_STYLE = { background: 'var(--a-bg)', border: '1px solid var(--a-border)' } as React.CSSProperties;

function ConnectModal({
  modal, onPickChannel, onBack, onConnect, onClose, error,
}: {
  modal: ModalState & { open: true };
  onPickChannel: (channelId: string) => void;
  onBack: () => void;
  onConnect: (inputValue: string, secondaryValue: string) => void;
  onClose: () => void;
  error?: string | null;
}) {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credMethod,   setCredMethod]   = useState<'credentials' | 'cookies'>('credentials');
  const [cookieValue,  setCookieValue]  = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ch = modal.phase !== 'pick'
    ? CHANNEL_GROUPS.flatMap((g) => g.channels).find((c) => c.id === modal.channelId)
    : null;

  useEffect(() => {
    if (modal.phase === 'form') {
      setEmail(''); setPassword(''); setCookieValue('');
      setCredMethod('credentials'); setShowOptional(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [modal.phase, modal.phase === 'form' && modal.channelId]);

  const isUnipile  = ch?.authType === 'unipile';
  const isLinkedIn = modal.phase === 'form' && modal.channelId === 'linkedin';

  const canSubmit = (() => {
    if (!ch) return false;
    if (ch.authType === 'unipile') {
      if (isLinkedIn && credMethod === 'cookies') return cookieValue.trim().length > 0;
      return email.trim().length > 0 && password.trim().length > 0;
    }
    return email.trim().length > 0;
  })();

  const handleSubmit = () => {
    if (isLinkedIn && credMethod === 'cookies') {
      onConnect(cookieValue, '');
    } else {
      onConnect(email, password);
    }
  };

  const platformName = ch?.name ?? (modal.phase !== 'pick' ? modal.channelId : '');

  const CloseBtn = () => (
    <button onClick={onClose} className="rounded-lg p-1.5 text-white/25 transition hover:bg-white/[0.06] hover:text-white/60">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && modal.phase !== 'connecting') onClose(); }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', maxHeight: 'min(85vh, 660px)' }}
      >

        {/* ════════════ PICK PHASE ════════════ */}
        {modal.phase === 'pick' && (
          <>
            <div className="flex items-start justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--a-border)' }}>
              <div>
                <h2 className="text-[15px] font-semibold text-white">Connect a new account</h2>
                <p className="text-[12px] text-white/40 mt-0.5">Select the type of account you want to connect</p>
              </div>
              <CloseBtn />
            </div>

            <div className="flex-1 overflow-y-auto">
              {PICKER_SECTIONS.map((section, si) => (
                <div key={section.label}>
                  {si > 0 && <div className="mx-4" style={{ borderTop: '1px solid var(--a-border)' }} />}
                  <p className="px-5 pt-3.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                    {section.label}
                  </p>
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onPickChannel(item.id)}
                      className="flex w-full items-center gap-3.5 px-5 py-2.5 text-left transition-all hover:bg-white/[0.04] active:bg-white/[0.07]"
                    >
                      <PlatformLogo id={item.id} size={36} />
                      <span className="flex-1 text-[13px] font-medium text-white/80">{item.name}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-white/20">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--a-border)' }}>
              <button
                onClick={onClose}
                className="w-full rounded-xl py-2.5 text-[13px] font-medium text-white/40 transition-all hover:bg-white/[0.05] hover:text-white/70"
                style={{ border: '1px solid var(--a-border)' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ════════════ CONNECTING / SUCCESS ════════════ */}
        {(modal.phase === 'connecting' || modal.phase === 'success') && ch && (
          <>
            <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--a-border)' }}>
              <PlatformLogo id={modal.channelId} size={30} />
              <h2 className="text-[14px] font-semibold text-white">{platformName}</h2>
            </div>
            <div className="flex flex-col items-center px-6 py-10 text-center">
              {modal.phase === 'success' ? (
                <>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/12">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7 text-emerald-400">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold text-white">{platformName} connected</p>
                  <p className="mt-1.5 text-[12px] text-white/40">Messages will start syncing into your inbox</p>
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: (ch.color ?? '#6D5EF9') + '18' }}>
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/10" style={{ borderTopColor: ch.color ?? '#6D5EF9' }} />
                  </div>
                  <p className="text-[15px] font-semibold text-white">
                    {isUnipile ? `Connecting ${platformName}…` : 'Verifying credentials…'}
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/35">This usually takes just a moment</p>
                </>
              )}
            </div>
          </>
        )}

        {/* ════════════ FORM PHASE ════════════ */}
        {modal.phase === 'form' && ch && (
          <>
            {/* Header: back arrow + platform logo + title + close */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--a-border)' }}>
              <button
                onClick={onBack}
                className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                </svg>
              </button>
              <PlatformLogo id={modal.channelId} size={28} />
              <h2 className="flex-1 text-[14px] font-semibold text-white">Sign in to {platformName}</h2>
              <CloseBtn />
            </div>

            {error && (
              <div className="mx-5 mt-4 rounded-xl px-3.5 py-3 text-[12px] font-medium text-amber-300" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.24)' }}>
                {error}
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

              {/* ── UNIPILE: email + password (or cookie for LinkedIn) ── */}
              {isUnipile && (
                <>
                  {/* LinkedIn: Credentials / Cookies tab */}
                  {isLinkedIn && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold text-white/40">Choose a method</p>
                      <div className="flex rounded-xl p-1" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
                        {(['credentials', 'cookies'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setCredMethod(m)}
                            className={`flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-all ${
                              credMethod === m ? 'bg-[#6D5EF9] text-white shadow' : 'text-white/35 hover:text-white/60'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!isLinkedIn || credMethod === 'credentials') && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold text-white/40">Email address</label>
                        <input
                          ref={inputRef}
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={MODAL_INPUT_CLS}
                          style={MODAL_INPUT_STYLE}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-white/40">Password</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 hover:text-white/50 transition-colors"
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className={MODAL_INPUT_CLS}
                          style={MODAL_INPUT_STYLE}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                        />
                      </div>
                    </>
                  )}

                  {isLinkedIn && credMethod === 'cookies' && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-white/40">li_at cookie value</label>
                      <textarea
                        value={cookieValue}
                        onChange={(e) => setCookieValue(e.target.value)}
                        placeholder="Paste your li_at cookie value here…"
                        rows={3}
                        className="w-full resize-none rounded-lg px-3 py-2.5 text-[12px] text-white/80 outline-none transition-all placeholder:text-white/20 focus:ring-1 focus:ring-[#6D5EF9]/50"
                        style={MODAL_INPUT_STYLE}
                      />
                      <p className="mt-1.5 text-[11px] text-white/25">Dev tools → Application → Cookies → linkedin.com → li_at</p>
                    </div>
                  )}

                  {/* Optional settings */}
                  <button
                    type="button"
                    onClick={() => setShowOptional((v) => !v)}
                    className="flex items-center gap-2 text-[12px] font-medium text-white/30 transition-colors hover:text-white/50"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${showOptional ? 'rotate-90' : ''}`}>
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                    Optional settings
                  </button>
                  {showOptional && (
                    <div className="rounded-xl p-3.5" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
                      <p className="text-[11px] text-white/25">Advanced options will be available after connecting.</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-white/20">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-[#18D8FF]/50">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    Secured by <span className="font-semibold text-[#18D8FF]/60 ml-0.5">Unipile</span>
                  </div>
                </>
              )}

              {/* ── TOKEN channels ── */}
              {ch.authType === 'token' && (
                <>
                  {ch.instructions && ch.instructions.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25">Setup steps</p>
                      <ol className="space-y-2">
                        {ch.instructions.map((item, i) => (
                          <li key={i} className="flex gap-2.5 text-[12px] text-white/55">
                            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/40">{i + 1}</span>
                            {item.step}
                          </li>
                        ))}
                      </ol>
                      {ch.instructionLink && (
                        <a href={ch.instructionLink} target="_blank" rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#6D5EF9] hover:text-[#3b82f6] transition-colors">
                          Open documentation
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                  {ch.inputLabel && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-white/40">{ch.inputLabel}</label>
                      <input ref={inputRef} type={ch.inputType ?? 'text'} value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={ch.inputPlaceholder} className={MODAL_INPUT_CLS} style={MODAL_INPUT_STYLE}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !ch.secondaryInputLabel) handleSubmit(); }} />
                    </div>
                  )}
                  {ch.secondaryInputLabel && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-white/40">{ch.secondaryInputLabel}</label>
                      <input type={ch.secondaryInputType ?? 'text'} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={ch.secondaryInputPlaceholder} className={MODAL_INPUT_CLS} style={MODAL_INPUT_STYLE}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
                    </div>
                  )}
                </>
              )}

              {/* ── OAUTH channels ── */}
              {ch.authType === 'oauth' && (
                <>
                  {ch.instructions && ch.instructions.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25">Setup steps</p>
                      <ol className="space-y-2">
                        {ch.instructions.map((item, i) => (
                          <li key={i} className="flex gap-2.5 text-[12px] text-white/55">
                            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/40">{i + 1}</span>
                            {item.step}
                          </li>
                        ))}
                      </ol>
                      {ch.instructionLink && (
                        <a href={ch.instructionLink} target="_blank" rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#6D5EF9] hover:text-[#3b82f6] transition-colors">
                          Open documentation
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                  {ch.inputLabel && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-white/40">{ch.inputLabel}</label>
                      <input ref={inputRef} type={ch.inputType ?? 'text'} value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={ch.inputPlaceholder} className={MODAL_INPUT_CLS} style={MODAL_INPUT_STYLE}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
                    </div>
                  )}
                </>
              )}

              {/* ── IMAP ── */}
              {ch.authType === 'imap' && (
                <>
                  <div className="flex gap-2.5 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-amber-400/80"
                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-px h-3.5 w-3.5 shrink-0">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Use an <strong>app-specific password</strong> — never your main email password.
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-white/40">Email address</label>
                    <input ref={inputRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder={ch.inputPlaceholder ?? 'you@yourdomain.com'} className={MODAL_INPUT_CLS} style={MODAL_INPUT_STYLE} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-white/40">App password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder={ch.secondaryInputPlaceholder ?? 'App-specific password'}
                      className={MODAL_INPUT_CLS} style={MODAL_INPUT_STYLE}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
                  </div>
                  <button type="button" onClick={() => setShowOptional((v) => !v)}
                    className="flex items-center gap-2 text-[12px] font-medium text-white/30 transition-colors hover:text-white/50">
                    <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${showOptional ? 'rotate-90' : ''}`}>
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                    Optional settings
                  </button>
                  {showOptional && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-white/40">IMAP host (optional)</label>
                      <input type="text" placeholder="imap.yourdomain.com" className={MODAL_INPUT_CLS} style={MODAL_INPUT_STYLE} />
                      <p className="mt-1 text-[10px] text-white/20">Leave blank to auto-detect from email domain</p>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Footer */}
            <div className="shrink-0 flex gap-2.5 px-5 py-4" style={{ borderTop: '1px solid var(--a-border)' }}>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-medium text-white/35 transition-all hover:bg-white/[0.05] hover:text-white/60"
                style={{ border: '1px solid var(--a-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-35"
                style={{ background: ch.color ?? '#6D5EF9' }}
              >
                {isUnipile ? (
                  <>
                    Login
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </>
                ) : ch.authType === 'oauth' ? (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                    Continue
                  </>
                ) : 'Connect'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ── PlatformLogo ────────────────────────────────────────────────────────────── */

function PlatformLogo({ id, size = 40 }: { id: string; size?: number }) {
  const R = Math.round(size * 0.225);
  const S = size;
  switch (id) {
    case 'linkedin': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#0A66C2"/>
        <path fill="white" d="M11.5 16h-3v12h3V16zm-1.5-5.5c-.9 0-1.7.8-1.7 1.7s.8 1.7 1.7 1.7 1.7-.8 1.7-1.7-.8-1.7-1.7-1.7zm15 7c-2 0-3.2.9-3.6 1.8V16h-3v12h3v-6.5c0-2.1 1-3 2.4-3 1.5 0 2.2.9 2.2 3V28h3v-7c0-3.8-2-4.5-4-4.5z"/>
      </svg>
    );
    case 'whatsapp': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#25D366"/>
        <path fill="white" d="M20 8C13.4 8 8 13.4 8 20c0 2.2.6 4.2 1.7 6L8 32l6.2-1.6c1.7 1 3.7 1.5 5.8 1.5 6.6 0 12-5.4 12-12S26.6 8 20 8zm6.1 16.5c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.6-.6-2.8-1.2-4.6-4-4.8-4.2-.2-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.7 1.6c.1.2.1.3 0 .5l-.4.4-.3.4c-.1.2-.2.4.1.7.2.3.9 1.4 1.9 2.3.8.8 1.6 1 2 1.1.3.1.5.1.6-.1l.4-.5c.3-.3.5-.2.7-.1l1.6.8c.2.1.4.2.4.3.1.2.1.7-.1 1.6z"/>
      </svg>
    );
    case 'instagram': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#E1306C"/>
        <rect x="12" y="12" width="16" height="16" rx="5" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="20" cy="20" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="27" cy="13" r="1.5" fill="white"/>
      </svg>
    );
    case 'messenger': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#0084FF"/>
        <path fill="white" d="M20 9C13.9 9 9 13.6 9 19.3c0 3.2 1.5 6.1 3.9 8v4.1l3.8-2.1c1 .3 2.1.4 3.3.4 6.1 0 11-4.6 11-10.3S26.1 9 20 9zm1.1 13.9l-2.8-3-5.4 3 5.9-6.3 2.9 3 5.4-3-6 6.3z"/>
      </svg>
    );
    case 'telegram': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#0088CC"/>
        <path fill="white" d="M9.8 19.4l20-7.7c.9-.3 1.7.2 1.4 1.5l-3.4 16c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.5-8.6c.4-.4-.1-.6-.6-.2L15.2 22l-5-1.6c-1.1-.3-1.1-1 .6-1z"/>
      </svg>
    );
    case 'x': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#000"/>
        <path fill="white" d="M22.5 18.3L29.8 10h-1.7l-6.4 7.4L16.5 10H11l7.7 11.1L11 30h1.7l6.7-7.8 5.4 7.8H30l-7.5-11.7zm-2.4 2.8l-.8-1.1-6.2-8.9h2.7l5 7.2.8 1.1 6.5 9.4h-2.7l-5.3-7.7z"/>
      </svg>
    );
    case 'facebook': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#1877F2"/>
        <path fill="white" d="M22 32v-9.5h3l.5-3.5H22v-2c0-1 .5-2 2-2h1.5v-3S24 11.5 22 11.5c-3.3 0-5 2-5 5V19h-3v3.5h3V32h5z"/>
      </svg>
    );
    case 'slack': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#4A154B"/>
        <path fill="#E01E5A" d="M14 22a2 2 0 01-2-2 2 2 0 012-2h2v2a2 2 0 01-2 2zm0-5.5H8.5a2 2 0 010-4 2 2 0 012 2V16H14z"/>
        <path fill="#36C5F0" d="M22 14a2 2 0 012-2 2 2 0 012 2v5.5h-2a2 2 0 01-2-2V14zm5.5 0V8.5a2 2 0 010 4h-2v1.5h2z"/>
        <path fill="#2EB67D" d="M26 22a2 2 0 012 2 2 2 0 01-2 2h-2v-2a2 2 0 012-2zm0 5.5h5.5a2 2 0 010 4 2 2 0 01-2-2v-2H26z"/>
        <path fill="#ECB22E" d="M18 26a2 2 0 01-2 2 2 2 0 01-2-2v-5.5h2a2 2 0 012 2V26zm-5.5 0v5.5a2 2 0 010-4h2V26h-2z"/>
      </svg>
    );
    case 'tiktok': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#010101"/>
        <path fill="#69C9D0" d="M29.5 17.5a7 7 0 01-4.5-1.8v9.5c0 3.6-3 6.5-6.7 6.5a6.6 6.6 0 01-6.6-6.5c0-3.6 3-6.5 6.6-6.5.4 0 .7 0 1 .1v3.6c-.3-.1-.7-.2-1-.2-1.8 0-3.3 1.4-3.3 3.1s1.5 3.1 3.3 3.1c1.9 0 3.4-1.4 3.4-3.1V9h3.3c.1.4.2.8.4 1.2.6 1.3 2 2.3 3.6 2.3v5z"/>
        <path fill="white" d="M28.5 16.5a7 7 0 01-4.5-1.8v9.5c0 3.6-3 6.5-6.7 6.5a6.6 6.6 0 01-6.6-6.5c0-3.6 3-6.5 6.6-6.5.4 0 .7 0 1 .1v3.6c-.3-.1-.7-.2-1-.2-1.8 0-3.3 1.4-3.3 3.1s1.5 3.1 3.3 3.1c1.9 0 3.4-1.4 3.4-3.1V8h3.3c.1.4.2.8.4 1.2.6 1.3 2 2.3 3.6 2.3v5z" opacity="0.85"/>
      </svg>
    );
    case 'discord': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#5865F2"/>
        <path fill="white" d="M29 12.8A19 19 0 0023.5 11c-.3.4-.5.9-.7 1.3a17.5 17.5 0 00-5.6 0 10 10 0 00-.7-1.3 19.5 19.5 0 00-5.5 1.8C8.3 18 7.5 23 8 27.5a20 20 0 005.9 3 14 14 0 001.3-2.2c-.7-.3-1.4-.6-2-.9.2-.1.3-.3.5-.4a14 14 0 0012.6 0c.2.1.3.3.5.4-.6.3-1.3.6-2 .9.4.7.8 1.4 1.3 2.2A20 20 0 0032 27.5c.5-5-1-9.4-3-14.7zm-13 11c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5zm8 0c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5z"/>
      </svg>
    );
    case 'threads': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#101010"/>
        <path fill="white" d="M25.7 19.2c-.2-.1-.5-.2-.7-.3-.5-4.4-2.7-6.9-6.8-6.9-2.5 0-4.4 1-5.5 2.9l2 1.4c.8-1.2 2-1.8 3.5-1.8 2 0 3.2 1 3.6 3.1a12 12 0 00-2.8-.2c-2.9 0-5.3 1.6-5.3 4.3 0 2.9 2.4 4.3 5.3 4.3 2.2 0 4-.9 5-2.5.5.8.7 1.6.7 2.6h2.5c0-1.8-.5-3.4-1.8-4.6l.3.2-.7-2.1-.3-.4zm-6.2 5c-1.5 0-2.6-.7-2.6-2s1.1-1.9 2.8-1.9c.9 0 1.8.1 2.6.3-.3 2-1.5 3.6-2.8 3.6z"/>
      </svg>
    );
    case 'youtube': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#FF0000"/>
        <path fill="white" d="M32 15.4c-.4-1.3-1.4-2.2-2.5-2.5C27 12 20 12 20 12s-7 0-9.5.9c-1.2.3-2.1 1.2-2.5 2.5-.9 2.4-.9 7.6-.9 7.6s0 5.1.9 7.6c.4 1.2 1.3 2.2 2.5 2.5C13 32 20 32 20 32s7 0 9.5-.9c1.1-.3 2.1-1.3 2.5-2.5.9-2.5.9-7.6.9-7.6s0-5.2-.9-7.6zM17.5 24.5v-9l8 4.5-8 4.5z"/>
      </svg>
    );
    case 'gmail': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="white" stroke="#E5E7EB" strokeWidth="1"/>
        <path fill="#EA4335" d="M11 14.6l2.4-2A1 1 0 0114.5 12H11v2.6z"/>
        <path fill="#C5221F" d="M29 14.6l-2.4-2A1 1 0 0025.5 12H29v2.6z"/>
        <path fill="#FBBC04" d="M25.5 12.5L20 16.5l-5.5-4v4.5L20 21l5.5-3.5v-5z"/>
        <path fill="#4285F4" d="M11 17.3l3.5 2.2V12.5L11 14.6V17.3z"/>
        <path fill="#34A853" d="M25.5 19.5V29H29c.5 0 1-.4 1-1V17.3l-3.5 2.2z"/>
        <path fill="#4285F4" d="M11 18v10c0 .6.5 1 1 1h3.5V19.5L11 18z"/>
      </svg>
    );
    case 'imap': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#1E3A5F"/>
        <rect x="9" y="13" width="22" height="16" rx="2.5" stroke="white" strokeWidth="1.8" fill="none"/>
        <path stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 16l11 8.5L31 16"/>
      </svg>
    );
    case 'outlook': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#0078D4"/>
        <rect x="9" y="13" width="13" height="15" rx="2" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="15.5" cy="20.5" r="3" stroke="white" strokeWidth="1.5" fill="none"/>
        <path fill="white" opacity="0.5" d="M23 13h8v5.5l-4 2.5-4-2.5V13z"/>
        <path fill="white" opacity="0.4" d="M23 19l4 2.5 4-2.5V28h-8V19z"/>
      </svg>
    );
    case 'hubspot': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#FF7A59"/>
        <circle cx="24.5" cy="16.5" r="3" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="15.5" cy="23.5" r="3" stroke="white" strokeWidth="1.8" fill="none"/>
        <path stroke="white" strokeWidth="1.8" strokeLinecap="round" d="M21.5 16.5h-9M15.5 20.5v-9"/>
        <path stroke="white" strokeWidth="1.8" strokeLinecap="round" d="M18.5 23.5h3.5"/>
      </svg>
    );
    case 'salesforce': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#00A1E0"/>
        <path fill="white" d="M17 14c-2 0-3.5 1.4-3.8 3.2-.5-.3-1.1-.5-1.7-.5C9.4 16.7 8 18.1 8 20s1.4 3.3 3.5 3.3c.4 0 .7-.1 1.1-.2.5 1.2 1.7 2 3.1 2 .9 0 1.7-.3 2.3-.9.7.8 1.7 1.3 2.9 1.3 1.8 0 3.3-1.2 3.7-2.9.4.1.9.2 1.3.2 2.3 0 4.1-1.9 4.1-4.2s-1.8-4.3-4.1-4.3c-.4 0-.8.1-1.1.2-.5-1.7-2-3-3.7-3-1 0-1.9.4-2.5 1-.6-.8-1.5-1.2-2.6-1.2"/>
      </svg>
    );
    case 'zendesk': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#03363D"/>
        <path fill="#87929D" d="M20 12a8 8 0 000 16V12z"/>
        <path fill="white" d="M12 22.5h16l-16 6V22.5zM28 17.5H12l16-6v6z"/>
      </svg>
    );
    case 'shopify': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#96BF48"/>
        <path fill="white" d="M27.2 14c-.1-.1-.2-.1-.3-.1s-2.2-.2-2.2-.2l-1.6-1.6c-.2-.2-.5-.1-.6 0l-.8.3c-.5-1.5-1.5-2.9-3.2-2.9h-.2c-.4-.6-1-1-1.6-1-4 0-5.9 5-6.5 7.6l-2.7.9c-.9.3-.9.3-1 1.1L5 30l14 2.6 7.5-1.6L27.2 14zm-5.8.2l-1.5.5c-.1-.6-.2-1.3-.4-1.9.8.2 1.4.8 1.9 1.4zm-2.7.9l-3.1 1c.5-1.8 1.4-2.7 2.2-3 .3.5.5 1.3.5 2h.4zm-1.4-3.2c.2 0 .4.1.5.2-.8.4-1.7 1.4-2.1 3.5l-2.4.8C14.4 14.1 15.7 12 17.3 12z"/>
      </svg>
    );
    case 'freshdesk': return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#25C16F"/>
        <path fill="white" d="M20 10c-5.5 0-10 4.5-10 10v9h4v-9a6 6 0 0112 0v9h4V20c0-5.5-4.5-10-10-10zm-3 12h-3v-2a6 6 0 0112 0v2h-3v-2a3 3 0 00-6 0v2z"/>
      </svg>
    );
    default: return (
      <svg width={S} height={S} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx={R} fill="#1E293B"/>
        <circle cx="20" cy="20" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none"/>
      </svg>
    );
  }
}
