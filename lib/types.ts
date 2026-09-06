export type OriginPlatform = 'Claude Code' | 'Cursor' | 'n8n' | 'Gemini' | 'Other';

export interface Agent {
  id: string;
  name: string;
  handle: string;
  originPlatform: OriginPlatform;
  bio: string;
  tagline: string;
  skills: string[];
  createdAt: string;
}

export type MissionStatus = 'active' | 'completed' | 'failed';

export interface Mission {
  id: string;
  agentId: string;
  title: string;
  status: MissionStatus;
  humanApproved: boolean | null;
  delegatedToId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AllianceEntry {
  handle: string;
  name: string;
  tagline: string;
  since: string;
}

export interface HandshakeRow {
  id: string;
  code_hash: string;
  initiator_id: string;
  expires_at: string;
  claimed_by_id: string | null;
  claimed_at: string | null;
  created_at: string;
}

export type OpenMissionState =
  | 'open'
  | 'claimed'
  | 'delivered'
  | 'approved'
  | 'refused'
  | 'cancelled';

export interface OpenMission {
  id: string;
  posterId: string;
  title: string;
  body: string;
  skills: string[];
  bountyStake: number;
  state: OpenMissionState;
  claimedById: string | null;
  claimedAt: string | null;
  deliveredAt: string | null;
  resolvedAt: string | null;
  deliveryNote: string | null;
  createdAt: string;
}

export interface OpenMissionRow {
  id: string;
  poster_id: string;
  title: string;
  body: string;
  skills: string[];
  bounty_stake: number;
  state: OpenMissionState;
  claimed_by_id: string | null;
  claimed_at: string | null;
  delivered_at: string | null;
  resolved_at: string | null;
  delivery_note: string | null;
  created_at: string;
}

export function rowToOpenMission(row: OpenMissionRow): OpenMission {
  return {
    id: row.id,
    posterId: row.poster_id,
    title: row.title,
    body: row.body,
    skills: row.skills,
    bountyStake: row.bounty_stake,
    state: row.state,
    claimedById: row.claimed_by_id,
    claimedAt: row.claimed_at,
    deliveredAt: row.delivered_at,
    resolvedAt: row.resolved_at,
    deliveryNote: row.delivery_note,
    createdAt: row.created_at,
  };
}

export interface ActionLogEntry {
  id: string;
  agentId: string;
  agentHandle: string;
  agentName: string;
  missionId: string | null;
  description: string;
  createdAt: string;
}

export interface ScoreBreakdown {
  total: number;
  missionsComponent: number;
  approvalComponent: number;
  trustComponent: number;
  isUnproven: boolean;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface ProfilePayload {
  agent: Agent;
  score: ScoreBreakdown;
  missions: Mission[];
  violationsCount: number;
  activityLast7Days: ActivityDay[];
}

export interface AgentRow {
  id: string;
  name: string;
  handle: string;
  origin_platform: OriginPlatform;
  bio: string;
  tagline: string;
  skills: string[];
  passport_hash: string;
  created_at: string;
}

export interface MissionRow {
  id: string;
  agent_id: string;
  title: string;
  status: MissionStatus;
  human_approved: boolean | null;
  delegated_to_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    originPlatform: row.origin_platform,
    bio: row.bio,
    tagline: row.tagline,
    skills: row.skills,
    createdAt: row.created_at,
  };
}

export function rowToMission(row: MissionRow): Mission {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    status: row.status,
    humanApproved: row.human_approved,
    delegatedToId: row.delegated_to_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
