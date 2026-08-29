import type { SessionId } from 'session-coordinator-dsh'
import {
  TransitionWorkCharterInputSchema,
  WorkCharterDtoSchema,
  WorkCharterError,
  latestWorkCharterNoticeForRoute,
  workCharterCoordinationIssue,
  type CreateWorkCharterInput,
  type TransitionWorkCharterInput,
  type WorkCharterDto,
  type WorkCharterEvidence,
  type WorkCharterProtection,
  type WorkCharterRole,
  type WorkCharterRoleAssignment,
  type WorkCharterTarget,
} from './types.ts'

export interface WorkCharterPolicyRuntime {
  readonly now: () => string
}

export const defaultPolicyRuntime: WorkCharterPolicyRuntime = {
  now: () => new Date().toISOString(),
}

export function createWorkCharterRecord(
  input: CreateWorkCharterInput,
  runtime: WorkCharterPolicyRuntime = defaultPolicyRuntime,
): WorkCharterDto {
  validateCoordination(input.target, input.protection, input.roles)
  const now = runtime.now()
  return WorkCharterDtoSchema.parse({
    id: input.charterId,
    target: input.target,
    managedWorkstream: input.managedWorkstream,
    protection: input.protection,
    state: 'draft',
    revision: 0,
    authority: input.authority,
    contract: input.contract,
    roles: input.roles,
    evidence: input.evidence,
    decisions: [],
    notices: [],
    createdAt: now,
    updatedAt: now,
  })
}

export interface PolicyTransitionResult {
  readonly charter: WorkCharterDto
  readonly changed: boolean
}

export function applyWorkCharterTransition(
  current: WorkCharterDto,
  rawInput: TransitionWorkCharterInput,
  runtime: WorkCharterPolicyRuntime = defaultPolicyRuntime,
): PolicyTransitionResult {
  const input = TransitionWorkCharterInputSchema.parse(rawInput)
  requireCurrentRevision(current, input.expectedRevision, input.expectedAuthorityRevision)
  if (current.state === 'closed') {
    throw policyError('INVALID_TRANSITION', 'closed Charter state is terminal')
  }

  const now = runtime.now()
  const actor = input.actorSessionId
  const controlRoles = controllerRoles(current.protection)
  const actorControls = hasAnyRole(current.roles, actor, controlRoles)
  const actorWrites = current.writer?.sessionId === actor
  const actorAssesses = hasAnyRole(current.roles, actor, ['assessor', 'planner'])

  switch (input.command.kind) {
    case 'activate': {
      requireControl(actorControls, actor, 'activate')
      requireState(current, 'draft', 'activate')
      requireApprovedAuthority(current)
      requireWriter(current)
      requireNoOpenDecisions(current)
      return changed(current, { state: 'active' }, now)
    }
    case 'pause': {
      if (!actorControls && !actorWrites) throw unauthorized(actor, 'pause')
      requireState(current, 'active', 'pause')
      return changed(current, {
        state: 'paused',
        lastStop: { reason: input.command.reason, stoppedBy: actor, stoppedAt: now },
      }, now)
    }
    case 'resume': {
      requireControl(actorControls, actor, 'resume')
      requireState(current, 'paused', 'resume')
      requireApprovedAuthority(current)
      requireWriter(current)
      requireNoOpenDecisions(current)
      return changed(current, { state: 'active' }, now)
    }
    case 'revise-contract': {
      requireControl(actorControls, actor, 'revise the contract')
      requireDraftOrPaused(current, 'revise the contract')
      if (input.command.authority.revision !== current.authority.revision + 1) {
        throw policyError(
          'AUTHORITY_CONFLICT',
          `contract revision must advance authority from ${String(current.authority.revision)} to ${String(current.authority.revision + 1)}`,
        )
      }
      preserveConsumedEvidence(current.evidence, input.command.evidence)
      return changed(current, {
        authority: input.command.authority,
        contract: input.command.contract,
        evidence: input.command.evidence,
      }, now)
    }
    case 'update-proposal': {
      if (!actorControls && !actorWrites) throw unauthorized(actor, 'update the Working Proposal')
      const contract = {
        ...current.contract,
        workingProposal: input.command.workingProposal,
        assumptions: input.command.assumptions,
      }
      if (sameJson(contract, current.contract)) return { charter: current, changed: false }
      return changed(current, { contract }, now)
    }
    case 'assign-writer': {
      requireControl(actorControls, actor, 'assign the writer')
      requireDraftOrPaused(current, 'assign the writer')
      requireEligibleWriter(current.protection, current.roles, input.command.sessionId)
      if (current.writer !== undefined) {
        if (current.writer.sessionId === input.command.sessionId) return { charter: current, changed: false }
        throw policyError(
          'WRITER_CONFLICT',
          `writer ${current.writer.sessionId} must be released before assigning ${input.command.sessionId}`,
        )
      }
      return changed(current, {
        writer: { sessionId: input.command.sessionId, assignedBy: actor, assignedAt: now },
      }, now)
    }
    case 'release-writer': {
      if (!actorControls && !actorWrites) throw unauthorized(actor, 'release the writer')
      requireDraftOrPaused(current, 'release the writer')
      if (current.writer === undefined) return { charter: current, changed: false }
      return changed(current, { writer: undefined }, now)
    }
    case 'record-evidence': {
      const command = input.command
      if (!actorControls && !actorWrites && !actorAssesses) throw unauthorized(actor, 'record evidence')
      const index = current.evidence.findIndex(item => item.id === command.evidenceId)
      if (index < 0) throw policyError('INVALID_INPUT', `evidence ${command.evidenceId} is not declared`)
      const existing = current.evidence[index]
      if (existing === undefined) throw policyError('INTERNAL', 'evidence index became unavailable')
      const consumedAt = existing.mode === 'one-shot'
        ? command.consumedAt
        : undefined
      if (existing.mode === 'one-shot' && consumedAt === undefined) {
        throw policyError('INVALID_INPUT', 'one-shot evidence requires the exact consumption timestamp')
      }
      const replacement: WorkCharterEvidence = {
        ...existing,
        state: command.state,
        observedRevision: command.observedRevision,
        evidenceRef: command.evidenceRef,
        ...(consumedAt === undefined ? {} : { consumedAt }),
        recordedAt: now,
        recordedBy: actor,
      }
      if (existing.mode === 'one-shot' && existing.consumedAt !== undefined) {
        if (sameJson(existing, replacement)) return { charter: current, changed: false }
        throw policyError('INVALID_TRANSITION', `one-shot evidence ${existing.id} is already consumed`)
      }
      const evidence = replaceAt(current.evidence, index, replacement)
      return changed(current, { evidence }, now)
    }
    case 'open-decision': {
      const command = input.command
      if (!actorControls && !actorWrites) throw unauthorized(actor, 'open a decision')
      requireAssignedSession(current.roles, command.ownerSessionId, 'decision owner')
      const existing = current.decisions.find(decision => decision.id === command.decisionId)
      const decision = {
        id: command.decisionId,
        question: command.question,
        ownerSessionId: command.ownerSessionId,
        state: 'open' as const,
        openedAt: now,
        openedBy: actor,
      }
      if (existing !== undefined) {
        if (existing.state === 'open'
          && existing.question === decision.question
          && existing.ownerSessionId === decision.ownerSessionId) {
          return { charter: current, changed: false }
        }
        throw policyError('INVALID_TRANSITION', `decision ${existing.id} already exists with different state`)
      }
      return changed(current, { decisions: [...current.decisions, decision] }, now)
    }
    case 'resolve-decision': {
      const command = input.command
      const index = current.decisions.findIndex(decision => decision.id === command.decisionId)
      if (index < 0) throw policyError('INVALID_INPUT', `decision ${command.decisionId} is not declared`)
      const existing = current.decisions[index]
      if (existing === undefined) throw policyError('INTERNAL', 'decision index became unavailable')
      if (existing.ownerSessionId !== actor) {
        throw unauthorized(actor, `resolve decision ${existing.id}; semantic owner is ${existing.ownerSessionId}`)
      }
      const replacement = {
        ...existing,
        state: command.state,
        resolution: command.resolution,
        authorityRef: command.authorityRef,
        resolvedAt: now,
      }
      if (existing.state !== 'open') {
        if (sameJson(existing, replacement)) return { charter: current, changed: false }
        throw policyError('INVALID_TRANSITION', `decision ${existing.id} already has a terminal disposition`)
      }
      return changed(current, { decisions: replaceAt(current.decisions, index, replacement) }, now)
    }
    case 'change-coordination': {
      requireControl(actorControls, actor, 'change coordination')
      requireDraftOrPaused(current, 'change coordination')
      validateCoordination(current.target, input.command.protection, input.command.roles)
      if (current.writer !== undefined) {
        requireEligibleWriter(input.command.protection, input.command.roles, current.writer.sessionId)
      }
      if (current.protection === input.command.protection && sameJson(current.roles, input.command.roles)) {
        return { charter: current, changed: false }
      }
      return changed(current, {
        protection: input.command.protection,
        roles: input.command.roles,
      }, now)
    }
    case 'close': {
      if (input.command.outcome === 'accepted') {
        if (current.state !== 'active') {
          throw policyError('INVALID_TRANSITION', 'accepted close requires an active Charter')
        }
        requireAcceptanceActor(current, actor)
        requireApprovedAuthority(current)
        requireWriter(current)
        requireNoOpenDecisions(current)
        requireCompleteEvidence(current)
        requireAcceptedLatestNotices(current)
      } else {
        requireControl(actorControls, actor, 'close the Charter without acceptance')
      }
      return changed(current, {
        state: 'closed',
        writer: undefined,
        close: {
          outcome: input.command.outcome,
          assessmentRef: input.command.assessmentRef,
          closedBy: actor,
          closedAt: now,
        },
      }, now)
    }
    default:
      return assertNever(input.command)
  }
}

export function validateCoordination(
  target: WorkCharterTarget,
  protection: WorkCharterProtection,
  roles: readonly WorkCharterRoleAssignment[],
): void {
  const issue = workCharterCoordinationIssue(target, protection, roles)
  if (issue !== undefined) throw policyError('INVALID_INPUT', issue)
}

function changed(
  current: WorkCharterDto,
  patch: Partial<WorkCharterDto>,
  now: string,
): PolicyTransitionResult {
  if (current.revision === Number.MAX_SAFE_INTEGER) {
    throw policyError('INVALID_TRANSITION', 'Charter revision space is exhausted')
  }
  const next = WorkCharterDtoSchema.parse({
    ...current,
    ...patch,
    revision: current.revision + 1,
    updatedAt: now,
  })
  return { charter: next, changed: true }
}

function requireCurrentRevision(current: WorkCharterDto, revision: number, authorityRevision: number): void {
  if (current.revision !== revision) {
    throw policyError('REVISION_CONFLICT', `expected Charter revision ${String(revision)}, current ${String(current.revision)}`)
  }
  if (current.authority.revision !== authorityRevision) {
    throw policyError(
      'AUTHORITY_CONFLICT',
      `expected authority revision ${String(authorityRevision)}, current ${String(current.authority.revision)}`,
    )
  }
}

function requireControl(allowed: boolean, actor: SessionId, action: string): void {
  if (!allowed) throw unauthorized(actor, action)
}

function unauthorized(actor: SessionId, action: string): WorkCharterError {
  return policyError('ROLE_UNAUTHORIZED', `Session ${actor} is not authorized to ${action}`)
}

function requireState(current: WorkCharterDto, state: WorkCharterDto['state'], action: string): void {
  if (current.state !== state) {
    throw policyError('INVALID_TRANSITION', `${action} requires ${state} state; current state is ${current.state}`)
  }
}

function requireDraftOrPaused(current: WorkCharterDto, action: string): void {
  if (current.state !== 'draft' && current.state !== 'paused') {
    throw policyError('INVALID_TRANSITION', `${action} requires draft or paused state; current state is ${current.state}`)
  }
}

function requireApprovedAuthority(current: WorkCharterDto): void {
  if (current.authority.state !== 'approved' || current.authority.reference === undefined) {
    throw policyError('AUTHORITY_CONFLICT', 'active or accepted work requires externally referenced approved authority')
  }
}

function requireWriter(current: WorkCharterDto): void {
  if (current.writer === undefined) throw policyError('WRITER_CONFLICT', 'active work requires one assigned writer')
  requireEligibleWriter(current.protection, current.roles, current.writer.sessionId)
}

function requireEligibleWriter(
  protection: WorkCharterProtection,
  roles: readonly WorkCharterRoleAssignment[],
  sessionId: SessionId,
): void {
  const role: WorkCharterRole = protection === 'current-task' || protection === 'durable-single-agent'
    ? 'controller'
    : 'executor'
  if (!roles.some(assignment => assignment.role === role && assignment.sessionId === sessionId)) {
    throw policyError('ROLE_UNAUTHORIZED', `writer ${sessionId} must hold the ${role} role for ${protection}`)
  }
}

function requireAssignedSession(
  roles: readonly WorkCharterRoleAssignment[],
  sessionId: SessionId,
  label: string,
): void {
  if (!roles.some(assignment => assignment.sessionId === sessionId)) {
    throw policyError('ROLE_UNAUTHORIZED', `${label} ${sessionId} is not assigned to this Charter`)
  }
}

function controllerRoles(protection: WorkCharterProtection): readonly WorkCharterRole[] {
  switch (protection) {
    case 'current-task':
    case 'durable-single-agent':
      return ['controller']
    case 'planner-executor':
      return ['planner']
    case 'standard-ope':
      return ['orchestrator', 'planner']
    default:
      return assertNever(protection)
  }
}

function hasAnyRole(
  roles: readonly WorkCharterRoleAssignment[],
  sessionId: SessionId,
  allowed: readonly WorkCharterRole[],
): boolean {
  return roles.some(assignment => assignment.sessionId === sessionId && allowed.includes(assignment.role))
}

function requireNoOpenDecisions(current: WorkCharterDto): void {
  const open = current.decisions.find(decision => decision.state === 'open')
  if (open !== undefined) throw policyError('OPEN_DECISION', `decision ${open.id} remains open`)
}

function requireCompleteEvidence(current: WorkCharterDto): void {
  const incomplete = current.evidence.find(evidence => evidence.required && evidence.state !== 'passed')
  if (incomplete !== undefined) {
    throw policyError('EVIDENCE_INCOMPLETE', `required evidence ${incomplete.id} is ${incomplete.state}`)
  }
}

function requireAcceptedLatestNotices(current: WorkCharterDto): void {
  for (const route of ['writer', 'standard-phase'] as const) {
    const latest = latestWorkCharterNoticeForRoute(current, route)
    if (latest === undefined || latest.disposition?.verdict === 'accepted') continue
    if (latest.disposition === undefined) {
      throw policyError('INVALID_TRANSITION', `Result Notice ${latest.id} still awaits disposition`)
    }
    throw policyError(
      'INVALID_TRANSITION',
      `latest ${route} Result Notice ${latest.id} has non-accepted disposition ${latest.disposition.verdict}`,
    )
  }
}

function requireAcceptanceActor(current: WorkCharterDto, actor: SessionId): void {
  if (current.protection === 'current-task' || current.protection === 'durable-single-agent') {
    if (!hasAnyRole(current.roles, actor, ['controller'])) throw unauthorized(actor, 'record acceptance')
    return
  }
  if (!hasAnyRole(current.roles, actor, ['planner', 'assessor'])) {
    throw unauthorized(actor, 'record independent acceptance')
  }
  if (hasAnyRole(current.roles, actor, ['executor'])) {
    throw policyError('ROLE_UNAUTHORIZED', 'executor cannot accept its own work')
  }
}

function preserveConsumedEvidence(
  current: readonly WorkCharterEvidence[],
  replacement: readonly WorkCharterEvidence[],
): void {
  for (const evidence of current) {
    if (evidence.mode !== 'one-shot' || evidence.consumedAt === undefined) continue
    const next = replacement.find(candidate => candidate.id === evidence.id)
    if (next === undefined || !sameJson(next, evidence)) {
      throw policyError(
        'INVALID_TRANSITION',
        `contract revision must preserve consumed one-shot evidence ${evidence.id}`,
      )
    }
  }
}

function replaceAt<T>(items: readonly T[], index: number, replacement: T): readonly T[] {
  return items.map((item, candidate) => candidate === index ? replacement : item)
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function policyError(code: ConstructorParameters<typeof WorkCharterError>[0], message: string): WorkCharterError {
  return new WorkCharterError(code, message, false, 'failed')
}

function assertNever(value: never): never {
  throw new WorkCharterError('INTERNAL', `unhandled Work Charter value ${String(value)}`, false, 'failed')
}
