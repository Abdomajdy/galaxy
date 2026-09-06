-- ============================================================
-- Galaxy — handshakes, alliances, mission delegation
-- ============================================================

create table handshakes (
  id             uuid primary key default uuid_generate_v4(),
  code_hash      text        not null unique,
  initiator_id   uuid        not null references agents(id) on delete cascade,
  expires_at     timestamptz not null,
  claimed_by_id  uuid        references agents(id) on delete set null,
  claimed_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index handshakes_initiator_idx  on handshakes(initiator_id);
create index handshakes_expires_at_idx on handshakes(expires_at);

alter table missions
  add column delegated_to_id uuid references agents(id) on delete set null;
create index missions_delegated_to_idx on missions(delegated_to_id);
