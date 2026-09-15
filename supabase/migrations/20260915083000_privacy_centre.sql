create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  requester_email text not null,
  requester_name text,
  request_type text not null check (request_type in ('access','portability','rectification','erasure','restriction','objection','marketing','other')),
  details text,
  identity_status text not null default 'needs_verification' check (identity_status in ('verified','needs_verification')),
  status text not null default 'received' check (status in ('received','identity_check','in_progress','completed','refused','cancelled')),
  source text not null default 'portal' check (source in ('portal','email','phone','in_person','other')),
  requested_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '1 month'),
  completed_at timestamptz,
  response_summary text,
  admin_notes text,
  created_by_staff uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_customer_id_idx on public.privacy_requests(customer_id);
create index if not exists privacy_requests_status_due_idx on public.privacy_requests(status, due_at);
create index if not exists privacy_requests_email_idx on public.privacy_requests(lower(requester_email));

alter table public.privacy_requests enable row level security;

insert into public.legal_documents (slug,title,content_html,version,published,updated_at)
values (
  'privacy',
  'Privacy Policy',
  $privacy$
<h2>Who we are</h2>
<p>Namdar is the trading name used for this UK sole-trader property-services business. The sole trader operating Namdar is the data controller for personal information used by the business. For privacy enquiries, contact <a href="mailto:support@namdar.co.uk">support@namdar.co.uk</a>. The controller's formal legal name and postal correspondence address will be added to this notice before wider commercial launch.</p>

<h2>What information we collect</h2>
<p>Depending on how you use Namdar, we may collect your name, email address, telephone number, service and billing address, postcode, account and security information, quote and booking details, job notes and photographs, support and chat messages, newsletter preferences, feedback, invoices and payment records, referral and reward activity, and technical information needed to operate and secure the website.</p>
<p>We do not ask you to put passwords, full card details or unnecessary sensitive information into quote, support or chat messages.</p>

<h2>Why we use your information and our lawful bases</h2>
<ul>
<li><strong>Quotes, accounts, bookings and services:</strong> to take steps at your request before entering a contract and to perform a contract with you.</li>
<li><strong>Invoices, tax and accounting records:</strong> to comply with legal obligations and keep proper business records.</li>
<li><strong>Website, service and security operations:</strong> for our legitimate interests in running, protecting and improving Namdar, preventing misuse, handling customer service and keeping appropriate business records, where those interests are not overridden by your rights.</li>
<li><strong>Marketing emails:</strong> only where you have given consent. You can withdraw that consent at any time without affecting service emails.</li>
<li><strong>Advertising or other non-essential browser storage:</strong> only after the consent required for those technologies has been given.</li>
</ul>

<h2>Automated estimates</h2>
<p>The website can calculate a guide estimate from the information you provide. That estimate does not itself create a booking or final price. Namdar reviews the job details before a final quote is sent, so we do not use the guide estimate to make a solely automated decision that has legal or similarly significant effects on you.</p>

<h2>Who we share information with</h2>
<p>We share personal information only where needed to operate Namdar, provide a requested service, meet legal duties or protect the business. Service-provider categories can include website and database hosting, email delivery, security and anti-bot services, authentication providers you choose to use, address or mapping services, and payment services when online payments are enabled. Current technology providers can include Supabase, Vercel, Resend, Cloudflare and OpenStreetMap-related services. Advertising technology is only loaded where it is enabled and you have made the required choice.</p>
<p>We may also disclose information where required by law, to professional advisers, insurers, law-enforcement bodies or regulators where there is a lawful reason to do so. We do not sell customer personal information.</p>

<h2>International transfers</h2>
<p>Some technology providers may process information outside the UK. Where UK restricted-transfer rules apply, we use the relevant UK adequacy arrangements or appropriate contractual and organisational safeguards made available by the provider, and we review providers as our systems change.</p>

<h2>How long we keep information</h2>
<p>We keep personal information only for as long as it is reasonably needed for the purpose for which it was collected, to handle disputes or to meet legal, tax, accounting and security obligations. The exact period therefore depends on the record:</p>
<ul>
<li>active account and service information is kept while needed to provide your account and services;</li>
<li>quote, booking, support and communication records are reviewed and retained only while they remain useful for customer service, contractual records, disputes or legitimate business needs;</li>
<li>invoice, payment and accounting records are kept for the period required by UK tax and accounting law;</li>
<li>marketing subscription information is kept while you are subscribed, with limited consent/opt-out evidence retained where needed to respect your choice;</li>
<li>security and audit records are kept for a limited period proportionate to fraud prevention, troubleshooting and accountability;</li>
<li>when you confirm account deletion, Namdar currently provides a 30-day recovery period before the authentication account is purged, while records that must legally be retained may be kept separately for the required period.</li>
</ul>

<h2>Your data-protection rights</h2>
<p>Depending on the circumstances, UK data-protection law gives you rights to be informed, obtain a copy of your personal information, correct inaccurate information, ask for deletion, restrict processing, object to certain processing, receive eligible information in a portable format, and withdraw consent where processing relies on consent.</p>
<p>You can use My Namdar's Privacy &amp; data area or contact <a href="mailto:support@namdar.co.uk">support@namdar.co.uk</a>. We normally respond without undue delay and within one month. We may need reasonable information to confirm identity, and complex or multiple requests may lawfully take longer. Exercising a right is normally free, although the law allows limited exceptions for manifestly unfounded or excessive requests.</p>

<h2>Marketing choices</h2>
<p>Marketing is separate from essential quote, booking, account, security, invoice and support communications. You can update newsletter topics, unsubscribe from marketing emails, or change your marketing preference without losing service communications.</p>

<h2>Cookies and similar technologies</h2>
<p>Namdar uses essential browser storage for functions such as secure sign-in and remembering privacy choices. Optional advertising or marketing technologies are not loaded until the required consent has been given. You can change your choice using the Cookie settings control. See the <a href="/cookies">Cookie Policy</a> for more detail.</p>

<h2>Security</h2>
<p>Namdar uses measures including encrypted HTTPS connections, access controls, privileged multi-factor authentication, anti-bot checks, private storage for customer files, rate limits, audit records and restricted database access. No online service can guarantee absolute security, so we also limit access and collect only information needed for the service.</p>

<h2>Children</h2>
<p>Namdar's property services and customer accounts are intended for adults. We do not knowingly design the service for children.</p>

<h2>Complaints</h2>
<p>Please contact us first if you have a privacy concern so we can try to resolve it. You also have the right to complain to the UK Information Commissioner's Office (ICO). Information about making a complaint is available at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint/</a>.</p>

<h2>Changes to this notice</h2>
<p>We update this notice when Namdar's services, providers or legal obligations change. The current version and last-updated date are shown on this page.</p>
$privacy$,
  2,
  true,
  now()
)
on conflict (slug) do update set
  title=excluded.title,
  content_html=excluded.content_html,
  version=greatest(public.legal_documents.version + 1, excluded.version),
  published=true,
  updated_at=now();

insert into public.legal_documents (slug,title,content_html,version,published,updated_at)
values (
  'cookies',
  'Cookie Policy',
  $cookies$
<h2>What this policy covers</h2>
<p>This policy explains how Namdar uses cookies, local storage and similar browser technologies. Some are essential to provide a feature you request; others are optional and are used only after the required choice has been made.</p>

<h2>Essential storage</h2>
<p>Essential technologies may be used without an advertising or marketing choice where they are necessary to provide the website or a feature you request. They include:</p>
<ul>
<li><strong>Authentication and security:</strong> session information used by Namdar's authentication service so you can securely sign in, remain signed in and protect your account.</li>
<li><strong>Privacy choice:</strong> browser storage that remembers whether you chose essential-only or allowed optional marketing/advertising technologies.</li>
<li><strong>Chat continuity:</strong> when you use Ask Namdar, browser storage may remember the conversation reference so the same chat can resume.</li>
<li><strong>Referral continuity:</strong> when you deliberately follow a Namdar referral link, first-party storage may remember the referral so the requested reward can be attributed.</li>
</ul>
<p>These items last only as long as needed for their function, until they expire, you sign out, you change the relevant setting, or you clear your browser storage.</p>

<h2>Optional advertising and marketing technology</h2>
<p>Namdar does not load its optional advertising technology until you select the option that allows it. If advertising is enabled on the site and you consent, third-party advertising technology such as Google AdSense may then set or read cookies and similar identifiers according to its own policies.</p>
<p>Changing from marketing/advertising to essential-only prevents Namdar from loading optional advertising on subsequent page loads. A page reload is used when withdrawing that choice so already-loaded advertising code is no longer active on the page.</p>

<h2>Analytics</h2>
<p>Namdar may record limited first-party page-view information, such as the page path and referring website host, to understand service usage. The current page-view endpoint does not place a separate analytics cookie or browser identifier. If Namdar later introduces analytics that uses non-essential cookies or browser identifiers, it will be placed behind the appropriate consent control before use.</p>

<h2>Managing your choice</h2>
<p>You can reopen Cookie settings from the website and choose essential-only or allow the optional category. You can also clear cookies and site storage in your browser. Blocking essential authentication storage may prevent secure account features from working.</p>

<h2>Third-party services</h2>
<p>Some features you choose to use can involve third parties, for example authentication providers, maps or security checks. Those providers may process technical information necessary to deliver the requested feature. Optional advertising is treated separately and is controlled by the choice described above.</p>

<h2>More information</h2>
<p>For information about how Namdar uses personal information, lawful bases, retention and your rights, see the <a href="/privacy">Privacy Policy</a>. Privacy questions can be sent to <a href="mailto:support@namdar.co.uk">support@namdar.co.uk</a>.</p>
$cookies$,
  2,
  true,
  now()
)
on conflict (slug) do update set
  title=excluded.title,
  content_html=excluded.content_html,
  version=greatest(public.legal_documents.version + 1, excluded.version),
  published=true,
  updated_at=now();
