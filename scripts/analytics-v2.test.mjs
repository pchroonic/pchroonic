import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('Analytics v2 uses temporary session storage instead of a persistent device identifier',()=>{
  const source=read('analytics-v2.js');
  assert.match(source,/sessionStorage\.getItem\(SESSION_KEY\)/);
  assert.match(source,/sessionStorage\.setItem\(SESSION_KEY/);
  assert.doesNotMatch(source,/localStorage\.setItem\(['"]namdar_analytics/i);
  assert.doesNotMatch(source,/navigator\.userAgent|canvas|fingerprint/i);
});

test('production page tracking ignores Vercel preview hosts and records session plus UTM fields',()=>{
  const source=read('api/track-view.js');
  assert.match(source,/namdar\.co\.uk/);
  assert.match(source,/non_production_host/);
  assert.match(source,/session_id:session/);
  assert.match(source,/utm_source/);
  assert.match(source,/utm_medium/);
  assert.match(source,/utm_campaign/);
});

test('Window Cleaning quote creation receives the Analytics v2 session for attribution',()=>{
  const source=read('app.js');
  assert.match(source,/visitorId:window\.NamdarAnalytics\?\.sessionId/);
  assert.match(source,/quote_submitted/);
  assert.match(source,/postcode_checked/);
});

test('customer quote booking and payment journey emits the key funnel events',()=>{
  const account=read('account-original.js');
  const booking=read('account-booking-policy.js');
  const analytics=read('analytics-v2.js');
  assert.match(account,/quote_accepted/);
  assert.match(account,/quote_declined/);
  assert.match(account,/payment_confirmed/);
  assert.match(booking,/booking_submitted/);
  assert.match(analytics,/booking_started/);
  assert.match(analytics,/checkout_started/);
});

test('conversion endpoint only accepts the approved Analytics v2 event vocabulary',()=>{
  const source=read('api/funnel-event.js');
  for(const event of ['quote_started','postcode_checked','quote_submitted','quote_accepted','booking_submitted','checkout_started','payment_confirmed']){
    assert.match(source,new RegExp(`['"]${event}['"]`));
  }
  assert.match(source,/non_production_host/);
  assert.match(source,/EVENTS\.has\(eventType\)/);
});

test('admin analytics reports sessions funnel acquisition campaigns and attributed revenue',()=>{
  const api=read('api/admin-page-analytics.js');
  const ui=read('admin-page-analytics.js');
  for(const token of ['selectedSessionIds','funnel','acquisition','campaigns','visitorForPayment','sessionToBookingRate']){
    assert.match(api,new RegExp(token));
  }
  assert.match(ui,/Website sessions, funnel & acquisition/);
  assert.match(ui,/Acquisition performance/);
  assert.match(ui,/Sessions → bookings/);
  assert.match(ui,/Attributed revenue/);
  assert.match(api,/totalRevenue/);
  assert.match(api,/attributedRevenue/);
  assert.match(api,/unattributedRevenue/);
  assert.match(ui,/not linked to a v2 session/);
});

test('database migration preserves RLS tables while extending the session and funnel schema',()=>{
  const source=read('supabase/migrations/20260924234226_analytics_v2_session_funnel.sql');
  assert.match(source,/add column if not exists session_id text/);
  assert.match(source,/utm_source text/);
  assert.match(source,/conversion_events_event_type_check/);
  assert.match(source,/quote_id uuid references public\.quotes/);
  assert.match(source,/booking_id uuid references public\.bookings/);
  assert.doesNotMatch(source,/disable row level security/i);
});


test('analytics opt-out deletes the current first-party session data',()=>{
  const source=read('api/analytics-opt-out.js');
  assert.match(source,/page_views\?session_id=eq/);
  assert.match(source,/conversion_events\?visitor_id=eq/);
  assert.match(source,/quote_funnel_links\?visitor_id=eq/);
  assert.match(source,/non_production_host/);
});

test('privacy banner explains the analytics objection and marketing measurement split',()=>{
  const source=read('index.html');
  assert.match(source,/Choose Essential only to opt out of analytics and marketing/);
  assert.match(source,/campaign and advertising measurement/);
});
