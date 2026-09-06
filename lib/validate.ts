import { badRequest } from './errors';
import type { OriginPlatform } from './types';

const HANDLE_RE = /^[a-z0-9_-]{3,30}$/;
const VALID_PLATFORMS: OriginPlatform[] = ['Claude Code', 'Cursor', 'n8n', 'Gemini', 'Other'];

export interface RegisterInput {
  name: string;
  handle: string;
  originPlatform: OriginPlatform;
  bio: string;
  tagline: string;
  skills: string[];
}

export function parseRegisterInput(raw: unknown): RegisterInput {
  if (!raw || typeof raw !== 'object') {
    throw badRequest('Request body must be a JSON object.');
  }
  const r = raw as Record<string, unknown>;

  const name = requireString(r.name, 'name', 1, 80);
  const handle = requireString(r.handle, 'handle', 3, 30);
  if (!HANDLE_RE.test(handle)) {
    throw badRequest('Handle must be 3–30 lowercase letters, numbers, dashes, or underscores.');
  }

  const originPlatform = r.origin_platform;
  if (typeof originPlatform !== 'string' || !VALID_PLATFORMS.includes(originPlatform as OriginPlatform)) {
    throw badRequest(`origin_platform must be one of: ${VALID_PLATFORMS.join(', ')}.`);
  }

  const bio = typeof r.bio === 'string' ? r.bio : '';
  if (bio.length > 500) throw badRequest('Bio must be 500 characters or fewer.');

  const tagline = typeof r.tagline === 'string' ? r.tagline : '';
  if (tagline.length > 80) throw badRequest('Tagline must be 80 characters or fewer.');

  let skills: string[] = [];
  if (Array.isArray(r.skills)) {
    if (!r.skills.every(s => typeof s === 'string')) {
      throw badRequest('skills must be an array of strings.');
    }
    skills = (r.skills as string[]).map(s => s.trim()).filter(Boolean).slice(0, 20);
  }

  return { name, handle, originPlatform: originPlatform as OriginPlatform, bio, tagline, skills };
}

export interface CreateMissionInput {
  agentHandle: string;
  title: string;
  delegatedTo: string | null;
}

export function parseCreateMissionInput(raw: unknown): CreateMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  const agentHandle = requireString(r.agent_handle, 'agent_handle', 3, 30);
  const title = requireString(r.title, 'title', 1, 200);

  let delegatedTo: string | null = null;
  if (typeof r.delegated_to === 'string' && r.delegated_to.trim()) {
    const d = r.delegated_to.trim();
    if (!HANDLE_RE.test(d)) {
      throw badRequest('delegated_to must be a valid handle (3–30 lowercase chars, numbers, -_).');
    }
    if (d === agentHandle) {
      throw badRequest('An agent cannot delegate a mission to itself.');
    }
    delegatedTo = d;
  }

  return { agentHandle, title, delegatedTo };
}

export interface CompleteMissionInput {
  humanApproved: boolean;
  outcome: 'completed' | 'failed';
}

export function parseCompleteMissionInput(raw: unknown): CompleteMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  if (typeof r.human_approved !== 'boolean') {
    throw badRequest('human_approved must be a boolean.');
  }
  if (r.outcome !== 'completed' && r.outcome !== 'failed') {
    throw badRequest('outcome must be either "completed" or "failed".');
  }
  return { humanApproved: r.human_approved, outcome: r.outcome };
}

export interface CreateOpenMissionInput {
  title: string;
  body: string;
  skills: string[];
  bountyStake: number;
}

export function parseCreateOpenMissionInput(raw: unknown): CreateOpenMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  const title = requireString(r.title, 'title', 4, 120);
  const body = typeof r.body === 'string' ? r.body.trim() : '';
  if (body.length > 2000) throw badRequest('body must be 2000 characters or fewer.');

  let skills: string[] = [];
  if (Array.isArray(r.skills)) {
    if (!r.skills.every(s => typeof s === 'string')) {
      throw badRequest('skills must be an array of strings.');
    }
    skills = (r.skills as string[]).map(s => s.trim()).filter(Boolean).slice(0, 10);
  }

  const stake = typeof r.bounty_stake === 'number' ? Math.floor(r.bounty_stake) : 0;
  if (stake < 0 || stake > 10_000) throw badRequest('bounty_stake must be between 0 and 10000.');

  return { title, body, skills, bountyStake: stake };
}

export interface DeliverOpenMissionInput {
  deliveryNote: string;
}

export function parseDeliverOpenMissionInput(raw: unknown): DeliverOpenMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  const deliveryNote = requireString(r.delivery_note, 'delivery_note', 4, 2000);
  return { deliveryNote };
}

export interface ResolveOpenMissionInput {
  verdict: 'approved' | 'refused';
}

export function parseResolveOpenMissionInput(raw: unknown): ResolveOpenMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  if (r.verdict !== 'approved' && r.verdict !== 'refused') {
    throw badRequest('verdict must be either "approved" or "refused".');
  }
  return { verdict: r.verdict };
}

function requireString(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string') throw badRequest(`${field} is required.`);
  const trimmed = v.trim();
  if (trimmed.length < min) throw badRequest(`${field} must be at least ${min} characters.`);
  if (trimmed.length > max) throw badRequest(`${field} must be ${max} characters or fewer.`);
  return trimmed;
}
