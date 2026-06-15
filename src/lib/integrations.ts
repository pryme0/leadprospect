export type IntegrationCategory = 'ad-platform' | 'crm' | 'capture' | 'enrichment';

export interface IntegrationMetric {
  label: string;
  value: string;
  detail: string;
}

export interface IntegrationDataset {
  name: string;
  fields: string[];
  cadence: string;
}

export interface IntegrationMapping {
  source: string;
  destination: string;
  rule: string;
}

export interface IntegrationRecord {
  id: string;
  title: string;
  detail: string;
  score: number;
  status: string;
}

export interface IntegrationDefinition {
  id: string;
  label: string;
  key: string;
  description: string;
  icon: string;
  category: IntegrationCategory;
  accent: string;
  summary: string;
  docsUrl: string;
  apiNotes: string[];
  pulls: IntegrationDataset[];
  sends: IntegrationDataset[];
  metrics: IntegrationMetric[];
  mappings: IntegrationMapping[];
  records: IntegrationRecord[];
  actions: string[];
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'google-ads',
    label: 'Google Ads',
    key: 'GOOGLE_ADS_CUSTOMER_ID',
    description: 'Import paid-search performance and upload qualified offline conversion feedback.',
    icon: 'G',
    category: 'ad-platform',
    accent: '#4285f4',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
    summary: 'Uses the Google Ads API for campaign, ad group, keyword/search query, asset, and conversion reporting. Qualified lead outcomes are written back as offline or enhanced conversions for leads with click IDs and hashed first-party data where available.',
    apiNotes: [
      'Reads reporting data through GAQL resources such as campaign, ad group, ad, keyword/search term, landing page, assets, and conversion action metrics.',
      'Writes offline conversion feedback through ConversionUploadService using identifiers such as gclid, conversion action, conversion time, value, currency, and consent.',
      'Enhanced conversions for leads require normalized and SHA-256 hashed first-party data such as email or phone, plus the required customer data terms and feature enablement.',
    ],
    pulls: [
      { name: 'Campaign and ad group performance', fields: ['customer_id', 'campaign_id', 'ad_group_id', 'cost_micros', 'clicks', 'conversions'], cadence: 'Every 30 minutes' },
      { name: 'Search and landing intent', fields: ['search_term', 'keyword_text', 'final_url', 'conversion_action', 'segments.date'], cadence: 'Hourly' },
      { name: 'Lead attribution identifiers', fields: ['gclid', 'gbraid', 'wbraid', 'conversion_action_id', 'conversion_date_time'], cadence: 'On conversion event' },
    ],
    sends: [
      { name: 'Offline conversion upload', fields: ['gclid', 'conversion_action_id', 'conversion_date_time', 'conversion_value', 'currency_code', 'ad_user_data_consent'], cadence: 'Daily or on qualification' },
      { name: 'Enhanced conversion for leads', fields: ['hashed_email', 'hashed_phone', 'conversion_action', 'conversion_value', 'order_id'], cadence: 'On qualified lead' },
    ],
    metrics: [
      { label: 'Signals pulled', value: '468', detail: 'campaign and search-intent rows' },
      { label: 'Qualified leads', value: '92', detail: 'uploaded as offline conversions' },
      { label: 'Match keys', value: '3', detail: 'gclid, gbraid, wbraid' },
      { label: 'Upload lag', value: '1d', detail: 'qualification to conversion feedback' },
    ],
    mappings: [
      { source: 'gclid / gbraid / wbraid', destination: 'lead.attribution.click_id', rule: 'Primary key for Google conversion feedback' },
      { source: 'search_term', destination: 'signal.intent_keywords', rule: 'Used for commercial-intent scoring' },
      { source: 'campaign.id', destination: 'lead.source_campaign_id', rule: 'Preserves paid-search attribution lineage' },
      { source: 'conversion_action', destination: 'lead.buying_stage', rule: 'Maps demo, pricing, lead-form, and contact actions' },
    ],
    records: [
      { id: 'G-2048', title: 'Multi-location healthcare demo', detail: 'Search conversion tied to pricing and demo terms with a valid click identifier.', score: 91, status: 'Upload conversion' },
      { id: 'G-2017', title: 'B2B logistics CRM dedupe query', detail: 'High-intent campaign click with Salesforce integration landing-page activity.', score: 76, status: 'Enriching' },
      { id: 'G-1984', title: 'Agency attribution search', detail: 'Repeated conversion-quality searches from the same account domain.', score: 69, status: 'Nurture' },
    ],
    actions: ['Sync campaign report', 'Review search-term scoring', 'Upload offline conversions'],
  },
  {
    id: 'meta-ads',
    label: 'Meta Lead Ads',
    key: 'META_ADS_ACCOUNT_ID',
    description: 'Import Facebook and Instagram lead ad responses with form, ad, campaign, and page context.',
    icon: 'M',
    category: 'ad-platform',
    accent: '#1877f2',
    docsUrl: 'https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads',
    summary: 'Uses Meta Marketing API lead ads endpoints and webhooks to collect submitted form responses from Facebook and Instagram. ProspectGrid maps form fields and ad context into scoring, dedupe, and CRM routing.',
    apiNotes: [
      'Lead ads expose submitted field data, form IDs, ad IDs, page context, creation time, and lead identifiers when the app has the correct page and leads permissions.',
      'Best practice is webhook-first ingestion for new leads, with API backfill for missed records and auditing.',
      'Qualified outcomes can be sent back through Meta conversion/event pipelines using hashed user data and event metadata when consent and policy requirements are met.',
    ],
    pulls: [
      { name: 'Lead ad submissions', fields: ['leadgen_id', 'created_time', 'field_data', 'form_id', 'page_id'], cadence: 'Webhook plus backfill' },
      { name: 'Ad and campaign context', fields: ['ad_id', 'adset_id', 'campaign_id', 'creative_id', 'platform'], cadence: 'Hourly' },
      { name: 'Form schema', fields: ['questions', 'custom_questions', 'privacy_policy_url', 'thank_you_page'], cadence: 'On form change' },
    ],
    sends: [
      { name: 'Qualified lead event', fields: ['event_name', 'event_time', 'action_source', 'hashed_email', 'hashed_phone', 'value'], cadence: 'On qualification' },
    ],
    metrics: [
      { label: 'Forms captured', value: '57', detail: 'Facebook and Instagram lead ads' },
      { label: 'Duplicate risk', value: '14%', detail: 'matched before CRM create' },
      { label: 'Best placement', value: 'Reels', detail: 'highest scored leads' },
      { label: 'Webhook health', value: '99%', detail: 'recent lead delivery success' },
    ],
    mappings: [
      { source: 'field_data.email', destination: 'lead.email', rule: 'Primary contact and dedupe key' },
      { source: 'form_id', destination: 'lead.source_form_id', rule: 'Preserves form lineage' },
      { source: 'ad_id', destination: 'lead.source_ad_id', rule: 'Joins lead quality to creative and spend' },
      { source: 'custom_questions', destination: 'signal.qualifiers', rule: 'Feeds fit and urgency scoring' },
    ],
    records: [
      { id: 'M-991', title: 'Fintech attribution checklist', detail: 'Lead ad form response asked about HubSpot routing and attribution.', score: 86, status: 'Hot route' },
      { id: 'M-884', title: 'Retail customer suppression request', detail: 'Instagram placement lead asks about excluding existing customers.', score: 71, status: 'Needs owner' },
      { id: 'M-772', title: 'Agency lead-quality audit', detail: 'Facebook form response with multi-client attribution pain.', score: 68, status: 'Nurture' },
    ],
    actions: ['Pull recent leads', 'Audit form mappings', 'Send qualified events'],
  },
  {
    id: 'tiktok-ads',
    label: 'TikTok Lead Generation',
    key: 'TIKTOK_ADS_ACCOUNT_ID',
    description: 'Import TikTok instant-form leads and campaign context for fast callback routing.',
    icon: 'T',
    category: 'ad-platform',
    accent: '#111827',
    docsUrl: 'https://business-api.tiktok.com/portal/docs',
    summary: 'Uses TikTok Business API lead-generation and reporting endpoints to retrieve instant form submissions, campaign/ad identifiers, creative context, and performance metrics for territory and urgency scoring.',
    apiNotes: [
      'Instant form records are represented as lead objects tied to advertiser, campaign, ad group, ad, form, and create time context.',
      'Campaign and ad reporting should be joined to leads by advertiser, campaign, ad group, and ad identifiers rather than by creative text alone.',
      'Server-side event feedback should be treated as conversion/event feedback, not as arbitrary lead-score writes, and must follow TikTok event matching requirements.',
    ],
    pulls: [
      { name: 'Instant form leads', fields: ['lead_id', 'create_time', 'form_id', 'campaign_id', 'adgroup_id', 'ad_id'], cadence: 'Near real-time or scheduled' },
      { name: 'Submitted lead fields', fields: ['field_name', 'field_value', 'email', 'phone_number', 'custom_answers'], cadence: 'With lead pull' },
      { name: 'Campaign performance', fields: ['campaign_id', 'adgroup_id', 'ad_id', 'impressions', 'clicks', 'conversion'], cadence: 'Hourly' },
    ],
    sends: [
      { name: 'Event feedback', fields: ['event', 'event_time', 'event_id', 'user', 'properties', 'context'], cadence: 'On qualified conversion' },
    ],
    metrics: [
      { label: 'Forms active', value: '9', detail: 'instant forms monitored' },
      { label: 'Qualified leads', value: '36', detail: 'from TikTok forms' },
      { label: 'Avg urgency', value: '72', detail: 'callback-sensitive leads' },
      { label: 'Callback SLA', value: '9m', detail: 'median handoff time' },
    ],
    mappings: [
      { source: 'lead_id', destination: 'lead.external_id', rule: 'Prevents duplicate lead imports' },
      { source: 'campaign_id / adgroup_id / ad_id', destination: 'lead.source_hierarchy', rule: 'Joins form response to campaign reporting' },
      { source: 'custom_answers', destination: 'signal.qualifiers', rule: 'Used for fit and urgency scoring' },
      { source: 'field_value.phone_number', destination: 'lead.phone', rule: 'Callback routing and consent checks' },
    ],
    records: [
      { id: 'T-447', title: 'Home services territory lead', detail: 'Instant form lead requested callbacks across three service areas.', score: 78, status: 'Assign route' },
      { id: 'T-409', title: 'Clinic booking campaign lead', detail: 'Same-week booking answer and phone number present.', score: 74, status: 'Hot route' },
      { id: 'T-382', title: 'Local franchise expansion', detail: 'Campaign-level demand matched active territory but missing owner.', score: 63, status: 'Needs owner' },
    ],
    actions: ['Pull instant forms', 'Review campaign joins', 'Send conversion event'],
  },
  {
    id: 'linkedin-ads',
    label: 'LinkedIn Ads',
    key: 'LINKEDIN_ADS_ACCOUNT_ID',
    description: 'Import LinkedIn Lead Gen Forms and B2B campaign/account context.',
    icon: 'in',
    category: 'ad-platform',
    accent: '#0a66c2',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
    summary: 'Uses LinkedIn Marketing APIs for lead form responses, campaign context, ad analytics, and B2B attributes such as company, job title, seniority, and campaign attribution.',
    apiNotes: [
      'Lead Gen Form responses are tied to sponsored content/campaign context and include submitted answers from the form schema.',
      'LinkedIn data is strongest for B2B routing when form fields, job title, company, campaign, and seniority/role targeting are preserved.',
      'Conversion feedback should be modeled as conversion/event reporting, while audience activation depends on the customer match or matched-audience setup available to the advertiser.',
    ],
    pulls: [
      { name: 'Lead Gen Form responses', fields: ['lead_id', 'submitted_at', 'form_id', 'campaign_id', 'creative_id', 'answers'], cadence: 'Near real-time or scheduled' },
      { name: 'B2B profile fields', fields: ['first_name', 'last_name', 'email', 'company_name', 'job_title'], cadence: 'With lead response' },
      { name: 'Campaign analytics', fields: ['campaign_id', 'impressions', 'clicks', 'cost', 'conversions'], cadence: 'Hourly' },
    ],
    sends: [
      { name: 'Conversion feedback', fields: ['conversion_id', 'event_time', 'value', 'currency', 'user_match_keys'], cadence: 'On qualified lead' },
      { name: 'Matched audience update', fields: ['company_domain', 'email_hash', 'lifecycle_stage'], cadence: 'Daily when enabled' },
    ],
    metrics: [
      { label: 'Companies matched', value: '284', detail: 'with B2B context' },
      { label: 'Committee leads', value: '41', detail: 'multi-contact accounts' },
      { label: 'Avg fit score', value: '81', detail: 'account quality' },
      { label: 'Email coverage', value: '73%', detail: 'submitted or enriched' },
    ],
    mappings: [
      { source: 'company_name', destination: 'account.name', rule: 'Account matching key' },
      { source: 'job_title', destination: 'lead.role', rule: 'Seniority and department scoring' },
      { source: 'campaign_id', destination: 'lead.source_campaign_id', rule: 'Revenue attribution' },
      { source: 'answers', destination: 'signal.qualifiers', rule: 'Qualification and routing logic' },
    ],
    records: [
      { id: 'L-778', title: 'Aster Logistics revenue ops', detail: 'Lead Gen Form response from revenue operations asked about Salesforce dedupe.', score: 73, status: 'Enriching' },
      { id: 'L-762', title: 'Beacon Financial expansion', detail: 'Multiple contacts from the same company engaged with campaign assets.', score: 88, status: 'Hot route' },
      { id: 'L-719', title: 'Healthcare operations director', detail: 'Submitted role and company fields indicate buying authority.', score: 91, status: 'Hot route' },
    ],
    actions: ['Sync lead forms', 'Review account matches', 'Send conversion feedback'],
  },
  {
    id: 'hubspot',
    label: 'HubSpot CRM',
    key: 'HUBSPOT_PRIVATE_APP_TOKEN',
    description: 'Read and update HubSpot contacts, companies, deals, owners, properties, and associations.',
    icon: 'H',
    category: 'crm',
    accent: '#ff7a59',
    docsUrl: 'https://developers.hubspot.com/docs/guides/crm/understanding-the-crm',
    summary: 'Uses HubSpot CRM object APIs to match contacts and companies, read owners and lifecycle context, update lead-score properties, and create or update deals when a route is qualified.',
    apiNotes: [
      'HubSpot CRM data is object-based: contacts, companies, deals, tickets, properties, owners, and associations should be read and written through CRM APIs.',
      'Private app tokens or OAuth scopes should include only the CRM object and property permissions required by the workspace.',
      'Deal creation should include pipeline, deal stage, amount, associated company/contact, and owner when available.',
    ],
    pulls: [
      { name: 'Contacts and companies', fields: ['hs_object_id', 'email', 'phone', 'company', 'associated_company_id'], cadence: 'Every 15 minutes' },
      { name: 'Owners and lifecycle', fields: ['hubspot_owner_id', 'lifecyclestage', 'createdate', 'lastmodifieddate'], cadence: 'Every 15 minutes' },
      { name: 'Deals and associations', fields: ['deal_id', 'pipeline', 'dealstage', 'amount', 'associated_contact_id'], cadence: 'Hourly' },
    ],
    sends: [
      { name: 'Contact score update', fields: ['email', 'prospectgrid_score', 'prospectgrid_route_reason', 'lead_source'], cadence: 'On scoring update' },
      { name: 'Deal or task creation', fields: ['dealname', 'pipeline', 'dealstage', 'amount', 'hubspot_owner_id'], cadence: 'On hot route' },
    ],
    metrics: [
      { label: 'Contacts matched', value: '128', detail: 'against sourced leads' },
      { label: 'Deals created', value: '19', detail: 'from hot routes' },
      { label: 'Owner coverage', value: '94%', detail: 'mapped routes' },
      { label: 'Duplicate blocks', value: '27', detail: 'contact creates prevented' },
    ],
    mappings: [
      { source: 'lead.email', destination: 'contact.email', rule: 'Primary match and dedupe key' },
      { source: 'lead_score', destination: 'contact.prospectgrid_score', rule: 'Custom property updated on scoring runs' },
      { source: 'routing_reason', destination: 'contact.prospectgrid_route_reason', rule: 'Visible to sales owners' },
      { source: 'pipeline_value', destination: 'deal.amount', rule: 'Creates forecast context on hot routes' },
    ],
    records: [
      { id: 'H-311', title: 'Meta lead matched to existing contact', detail: 'Existing contact updated with score and route reason instead of duplicate create.', score: 86, status: 'Synced' },
      { id: 'H-298', title: 'Google Ads hot route', detail: 'Created deal and assigned healthcare owner.', score: 91, status: 'Deal created' },
      { id: 'H-244', title: 'Suppressed customer segment', detail: 'Existing lifecycle stage blocked new outbound route.', score: 48, status: 'Suppressed' },
    ],
    actions: ['Sync CRM records', 'Review owner coverage', 'Create test route'],
  },
  {
    id: 'salesforce',
    label: 'Salesforce',
    key: 'SALESFORCE_CLIENT_ID',
    description: 'Sync Salesforce leads, contacts, accounts, campaign members, opportunities, and owners.',
    icon: 'S',
    category: 'crm',
    accent: '#0176d3',
    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm',
    summary: 'Uses Salesforce REST API sObjects for lead/contact/account matching, campaign attribution, owner assignment, opportunity context, and custom score fields.',
    apiNotes: [
      'Salesforce REST integrations should use sObject resources for Lead, Contact, Account, Campaign, CampaignMember, Opportunity, User, and custom fields.',
      'Deduplication should compare account website/domain and contact email before creating a new Lead.',
      'Custom score and route fields should be validated before activation because field API names vary by org.',
    ],
    pulls: [
      { name: 'Account and contact match', fields: ['Account.Id', 'Account.Website', 'Contact.Email', 'OwnerId'], cadence: 'Every 30 minutes' },
      { name: 'Lead and campaign context', fields: ['Lead.Id', 'Lead.Email', 'LeadSource', 'CampaignMember.CampaignId'], cadence: 'Hourly' },
      { name: 'Opportunity context', fields: ['Opportunity.Id', 'StageName', 'Amount', 'CloseDate', 'AccountId'], cadence: 'Hourly' },
    ],
    sends: [
      { name: 'Lead upsert and routing', fields: ['Company', 'Email', 'Phone', 'LeadSource', 'OwnerId', 'ProspectGrid_Score__c'], cadence: 'Near real-time' },
      { name: 'Campaign membership', fields: ['CampaignId', 'LeadId', 'ContactId', 'Status'], cadence: 'On attribution match' },
    ],
    metrics: [
      { label: 'Connection', value: 'Draft', detail: 'OAuth not configured' },
      { label: 'Mapped fields', value: '12', detail: 'ready for validation' },
      { label: 'Projected dedupe', value: '31%', detail: 'expected account matches' },
      { label: 'Owner rules', value: '8', detail: 'territory-ready routes' },
    ],
    mappings: [
      { source: 'company_domain', destination: 'Account.Website', rule: 'Primary account dedupe key' },
      { source: 'lead_score', destination: 'Lead.ProspectGrid_Score__c', rule: 'Custom score field' },
      { source: 'source_campaign', destination: 'CampaignMember.CampaignId', rule: 'Campaign attribution' },
      { source: 'route_owner', destination: 'Lead.OwnerId', rule: 'Territory owner assignment' },
    ],
    records: [
      { id: 'S-112', title: 'Aster Logistics account match', detail: 'Account exists, route owner available, custom score field mapped.', score: 73, status: 'Ready' },
      { id: 'S-097', title: 'Beacon Financial expansion', detail: 'Opportunity context found for expansion route.', score: 88, status: 'Ready' },
      { id: 'S-041', title: 'Retail suppression candidate', detail: 'Needs campaign membership mapping before activation.', score: 48, status: 'Blocked' },
    ],
    actions: ['Connect Salesforce', 'Validate custom fields', 'Preview dedupe run'],
  },
  {
    id: 'website-forms',
    label: 'Website Forms',
    key: 'WEB_FORM_SIGNING_SECRET',
    description: 'Capture signed inbound form submissions with consent, UTM, page, and qualification context.',
    icon: 'W',
    category: 'capture',
    accent: '#65a30d',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/FormData',
    summary: 'Uses ProspectGrid-owned webhooks and form handlers to capture first-party submissions, verify payload signatures, preserve attribution, and score form answers before CRM routing.',
    apiNotes: [
      'This is a first-party connector, so the most important correctness concerns are signature verification, consent capture, payload schema stability, and replay protection.',
      'UTM and referrer values should be captured at submission time because ad platforms may not expose full click context later.',
      'Consent state must be stored as a first-class lead field before any outbound routing or enrichment workflow.',
    ],
    pulls: [
      { name: 'Form submissions', fields: ['email', 'phone', 'company', 'form_id', 'consent', 'submitted_at'], cadence: 'Instant' },
      { name: 'Attribution payload', fields: ['utm_source', 'utm_medium', 'utm_campaign', 'landing_path', 'referrer'], cadence: 'Instant' },
      { name: 'Qualification answers', fields: ['timeline', 'budget_range', 'team_size', 'use_case'], cadence: 'Instant' },
    ],
    sends: [
      { name: 'Lead score and route', fields: ['lead_score', 'route_status', 'routing_reason', 'consent_status'], cadence: 'Within 5 seconds' },
    ],
    metrics: [
      { label: 'Forms received', value: '43', detail: 'this month' },
      { label: 'Verified payloads', value: '100%', detail: 'signature checks passing' },
      { label: 'Qualified rate', value: '37%', detail: 'high or medium intent' },
      { label: 'Median route', value: '5s', detail: 'capture to queue' },
    ],
    mappings: [
      { source: 'utm_campaign', destination: 'lead.source_campaign', rule: 'Attribution lineage' },
      { source: 'landing_path', destination: 'lead.entry_page', rule: 'Offer and page context' },
      { source: 'timeline', destination: 'signal.urgency_inputs', rule: 'Urgency scoring' },
      { source: 'consent', destination: 'lead.consent_status', rule: 'Compliance gate before outreach' },
    ],
    records: [
      { id: 'W-532', title: 'Pricing page demo form', detail: 'High-intent healthcare operator with verified consent.', score: 91, status: 'Hot route' },
      { id: 'W-488', title: 'Integration page request', detail: 'Logistics lead asked about Salesforce dedupe.', score: 73, status: 'Enriching' },
      { id: 'W-455', title: 'Newsletter to demo conversion', detail: 'Multi-touch lead from nurture campaign.', score: 62, status: 'Nurture' },
    ],
    actions: ['Copy webhook URL', 'Test signed payload', 'Review form fields'],
  },
  {
    id: 'lead-enrichment',
    label: 'Lead Enrichment',
    key: 'ENRICHMENT_API_KEY',
    description: 'Append provider-specific firmographic, contact, verification, and dedupe intelligence.',
    icon: 'E',
    category: 'enrichment',
    accent: '#7c3aed',
    docsUrl: 'https://clearbit.com/docs',
    summary: 'Represents an enrichment-provider connector. ProspectGrid normalizes provider responses into company, person, contact-verification, fit-score, and dedupe fields before routing to CRM.',
    apiNotes: [
      'Provider schemas vary, so enrichment fields should be normalized into ProspectGrid-owned company, person, and verification objects.',
      'Do not assume every provider returns phone, verified email, employee count, revenue, or LinkedIn URL for every lead.',
      'Dedupe confidence should be stored separately from firmographic fit so routing rules can decide whether to create, update, or suppress a CRM record.',
    ],
    pulls: [
      { name: 'Company profile', fields: ['domain', 'company_name', 'industry', 'employee_count', 'location'], cadence: 'On new lead' },
      { name: 'Person profile', fields: ['name', 'title', 'seniority', 'department', 'linkedin_url'], cadence: 'On new lead' },
      { name: 'Contact verification', fields: ['email', 'email_status', 'phone', 'confidence'], cadence: 'Before CRM route' },
    ],
    sends: [
      { name: 'Normalized enrichment object', fields: ['company', 'title', 'seniority', 'verified_email', 'fit_score', 'dedupe_confidence'], cadence: 'Before scoring completes' },
    ],
    metrics: [
      { label: 'Records enriched', value: '156', detail: 'this month' },
      { label: 'Email coverage', value: '73%', detail: 'verified or appended' },
      { label: 'Company match', value: '88%', detail: 'domain confidence' },
      { label: 'Dedupe saves', value: '27', detail: 'CRM creates prevented' },
    ],
    mappings: [
      { source: 'employee_count', destination: 'account.size_band', rule: 'Fit scoring' },
      { source: 'industry', destination: 'account.industry', rule: 'Segment routing' },
      { source: 'seniority', destination: 'lead.seniority', rule: 'Buying committee detection' },
      { source: 'dedupe_confidence', destination: 'lead.dedupe_status', rule: 'CRM create gate' },
    ],
    records: [
      { id: 'E-901', title: 'Northstar Clinics enriched', detail: 'Added verified email, operations title, and company size.', score: 91, status: 'Complete' },
      { id: 'E-877', title: 'Aster Logistics dedupe match', detail: 'Matched Salesforce account with revenue operations owner.', score: 73, status: 'Complete' },
      { id: 'E-820', title: 'Retail lead missing email', detail: 'Company matched but contact email still unavailable.', score: 48, status: 'Partial' },
    ],
    actions: ['Run enrichment batch', 'Review partial matches', 'Export dedupe report'],
  },
];

export function getIntegrationById(id: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find((integration) => integration.id === id);
}
