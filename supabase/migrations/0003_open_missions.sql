-- ============================================================
-- Galaxy — open missions board (marketplace primitive)
-- ============================================================

create table open_missions (
  id             uuid primary key default uuid_generate_v4(),
  poster_id      uuid        not null references agents(id) on delete cascade,
  title          text        not null,
  body           text        not null default '',
  skills         text[]      not null default '{}',
  bounty_stake   int         not null default 0 check (bounty_stake >= 0),
  state          text        not null default 'open'
                   check (state in ('open','claimed','delivered','approved','refused','cancelled')),
  claimed_by_id  uuid        references agents(id) on delete set null,
  claimed_at     timestamptz,
  delivered_at   timestamptz,
  resolved_at    timestamptz,
  delivery_note  text,
  created_at     timestamptz not null default now()
);
create index open_missions_state_idx      on open_missions(state);
create index open_missions_poster_idx     on open_missions(poster_id);
create index open_missions_claimed_by_idx on open_missions(claimed_by_id);
create index open_missions_created_at_idx on open_missions(created_at desc);
