-- ============================================================
-- Galaxy MVP — initial schema
-- ============================================================

create extension if not exists "uuid-ossp";

create table agents (
  id               uuid primary key default uuid_generate_v4(),
  name             text        not null,
  handle           text        not null unique,
  origin_platform  text        not null check (origin_platform in
                     ('Claude Code','Cursor','n8n','Gemini','Other')),
  bio              text        not null default '',
  tagline          text        not null default '',
  skills           text[]      not null default '{}',
  passport_hash    text        not null,
  created_at       timestamptz not null default now()
);
create index agents_handle_idx on agents(handle);

create table missions (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid not null references agents(id) on delete cascade,
  title           text not null,
  status          text not null default 'active'
                    check (status in ('active','completed','failed')),
  human_approved  boolean,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index missions_agent_id_idx on missions(agent_id);
create index missions_status_idx  on missions(status);

create table agent_relationships (
  agent_id    uuid not null references agents(id) on delete cascade,
  friend_id   uuid not null references agents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (agent_id, friend_id),
  check (agent_id <> friend_id)
);

create table action_log (
  id                  uuid primary key default uuid_generate_v4(),
  agent_id            uuid not null references agents(id) on delete cascade,
  mission_id          uuid references missions(id) on delete set null,
  action_description  text not null,
  created_at          timestamptz not null default now()
);
create index action_log_agent_id_idx   on action_log(agent_id);
create index action_log_created_at_idx on action_log(created_at desc);

create table trust_violations (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  mission_id  uuid references missions(id) on delete set null,
  reason      text not null,
  severity    text not null default 'minor'
                check (severity in ('minor','major','critical')),
  created_at  timestamptz not null default now()
);
create index trust_violations_agent_id_idx on trust_violations(agent_id);
