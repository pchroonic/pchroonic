create table if not exists public.security_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  last_seen_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

alter table public.security_rate_limits enable row level security;

revoke all on table public.security_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.security_rate_limits to service_role;

create index if not exists security_rate_limits_last_seen_idx
  on public.security_rate_limits (last_seen_at);

create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.security_rate_limits%rowtype;
begin
  if coalesce(length(trim(p_scope)), 0) = 0
     or coalesce(length(trim(p_key_hash)), 0) = 0
     or p_limit < 1
     or p_window_seconds < 1
     or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  insert into public.security_rate_limits as rl (
    scope, key_hash, window_started_at, request_count, last_seen_at
  ) values (
    left(trim(p_scope), 120), left(trim(p_key_hash), 96), v_now, 1, v_now
  )
  on conflict (scope, key_hash) do update
  set
    window_started_at = case
      when rl.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
      else rl.window_started_at
    end,
    request_count = case
      when rl.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
      else rl.request_count + 1
    end,
    last_seen_at = v_now
  returning * into v_row;

  allowed := v_row.request_count <= p_limit;
  current_count := v_row.request_count;
  remaining := greatest(0, p_limit - v_row.request_count);
  reset_at := v_row.window_started_at + make_interval(secs => p_window_seconds);
  return next;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, text, integer, integer) to service_role;

comment on table public.security_rate_limits is
  'Server-only fixed-window counters keyed by privacy-preserving hashes. No raw IP address or customer identifier is stored.';
comment on function public.consume_security_rate_limit(text, text, integer, integer) is
  'Atomically consumes one request from a server-only fixed-window rate limit and returns the limit state.';
