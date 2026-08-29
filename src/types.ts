import {
  CoordinationRecordIdSchema,
  CorrelationIdSchema,
  DeliveryStateSchema,
  SessionIdSchema,
  WorkstreamIdSchema,
  type CoordinationRecordId,
  type CorrelationId,
  type DeliveryState,
  type SessionId,
  type WorkstreamId,
} from 'session-coordinator-dsh'
import { z } from 'zod'

export type {
  CoordinationRecordId,
  CorrelationId,
  DeliveryState,
  SessionId,
  WorkstreamId,
} from 'session-coordinator-dsh'

export const WORK_CHARTER_CONTRACT_VERSION = 1 as const
export const WORK_CHARTER_STORAGE_SCHEMA_VERSION = 1 as const
export const WORK_CHARTER_UPSTREAM_VERSION = '0.3.0' as const
export const WORK_CHARTER_UPSTREAM_PACKAGE_SHA256
  = '7b67ea1f7073fa66ac91c36f3e39c735b54c04174e2fa3672068f8fa8948a5b2' as const
export const WORK_CHARTER_UPSTREAM_PACKAGE_TREE = '0ac3cbb0f1fa8fa51d8f832c8127eabc9863ec9e' as const

export const CHARTER_TEXT_MAX_CHARS = 8_192 as const
export const CHARTER_LIST_MAX_ITEMS = 100 as const

const IsoTimestampSchema = z.iso.datetime({ offset: true })
const RevisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const PositiveRevisionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const TextSchema = z.string().transform(value => value.trim()).pipe(z.string().min(1).max(CHARTER_TEXT_MAX_CHARS))
const ShortTextSchema = z.string().transform(value => value.trim()).pipe(z.string().min(1).max(240))
const TextListSchema = z.array(TextSchema).max(CHARTER_LIST_MAX_ITEMS).readonly()

declare const WORK_CHARTER_ID_BRAND: unique symbol
declare const WORK_CHARTER_EVIDENCE_ID_BRAND: unique symbol
declare const WORK_CHARTER_DECISION_ID_BRAND: unique symbol
declare const WORK_CHARTER_NOTICE_ID_BRAND: unique symbol

export type WorkCharterId = string & { readonly [WORK_CHARTER_ID_BRAND]: 'WorkCharterId' }
export type WorkCharterEvidenceId = string & {
  readonly [WORK_CHARTER_EVIDENCE_ID_BRAND]: 'WorkCharterEvidenceId'
}
export type WorkCharterDecisionId = string & {
  readonly [WORK_CHARTER_DECISION_ID_BRAND]: 'WorkCharterDecisionId'
}
export type WorkCharterNoticeId = string & {
  readonly [WORK_CHARTER_NOTICE_ID_BRAND]: 'WorkCharterNoticeId'
}

const UUID_BODY = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const WORK_CHARTER_ID_RE = new RegExp(`^wc_${UUID_BODY}$`)
const EVIDENCE_ID_RE = new RegExp(`^wce_${UUID_BODY}$`)
const DECISION_ID_RE = new RegExp(`^wcd_${UUID_BODY}$`)
const NOTICE_ID_RE = new RegExp(`^wcn_${UUID_BODY}$`)

export const WorkCharterIdSchema: z.ZodType<WorkCharterId> = z.string()
  .regex(WORK_CHARTER_ID_RE, 'expected wc_ followed by a lowercase RFC 9562 UUID')
  .transform(value => value as WorkCharterId)
export const WorkCharterEvidenceIdSchema: z.ZodType<WorkCharterEvidenceId> = z.string()
  .regex(EVIDENCE_ID_RE, 'expected wce_ followed by a lowercase RFC 9562 UUID')
  .transform(value => value as WorkCharterEvidenceId)
export const WorkCharterDecisionIdSchema: z.ZodType<WorkCharterDecisionId> = z.string()
  .regex(DECISION_ID_RE, 'expected wcd_ followed by a lowercase RFC 9562 UUID')
  .transform(value => value as WorkCharterDecisionId)
export const WorkCharterNoticeIdSchema: z.ZodType<WorkCharterNoticeId> = z.string()
  .regex(NOTICE_ID_RE, 'expected wcn_ followed by a lowercase RFC 9562 UUID')
  .transform(value => value as WorkCharterNoticeId)

export function parseWorkCharterId(input: unknown): WorkCharterId {
  return parseIdentifier(WorkCharterIdSchema, input, 'WorkCharterId')
}

export function parseWorkCharterEvidenceId(input: unknown): WorkCharterEvidenceId {
  return parseIdentifier(WorkCharterEvidenceIdSchema, input, 'WorkCharterEvidenceId')
}

export function parseWorkCharterDecisionId(input: unknown): WorkCharterDecisionId {
  return parseIdentifier(WorkCharterDecisionIdSchema, input, 'WorkCharterDecisionId')
}

export function parseWorkCharterNoticeId(input: unknown): WorkCharterNoticeId {
  return parseIdentifier(WorkCharterNoticeIdSchema, input, 'WorkCharterNoticeId')
}

function parseIdentifier<T>(schema: z.ZodType<T>, input: unknown, name: string): T {
  const parsed = schema.safeParse(input)
  if (parsed.success) return parsed.data
  throw new WorkCharterError('INVALID_INPUT', `${name} has an invalid canonical form`, false, 'failed', {
    cause: parsed.error,
  })
}

export const WorkCharterTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('workstream'), workstreamId: WorkstreamIdSchema }).strict().readonly(),
  z.object({ kind: z.literal('session'), sessionId: SessionIdSchema }).strict().readonly(),
])
export type WorkCharterTarget = z.infer<typeof WorkCharterTargetSchema>

export const WorkCharterProtectionSchema = z.enum([
  'current-task',
  'durable-single-agent',
  'planner-executor',
  'standard-ope',
])
export type WorkCharterProtection = z.infer<typeof WorkCharterProtectionSchema>

export const WorkCharterRunStateSchema = z.enum(['draft', 'active', 'paused', 'closed'])
export type WorkCharterRunState = z.infer<typeof WorkCharterRunStateSchema>

export const WorkCharterRoleSchema = z.enum([
  'controller',
  'orchestrator',
  'planner',
  'executor',
  'assessor',
])
export type WorkCharterRole = z.infer<typeof WorkCharterRoleSchema>

export interface WorkCharterRoleAssignment {
  readonly role: WorkCharterRole
  readonly sessionId: SessionId
}
export const WorkCharterRoleAssignmentSchema: z.ZodType<WorkCharterRoleAssignment> = z.object({
  role: WorkCharterRoleSchema,
  sessionId: SessionIdSchema,
}).strict().readonly()

export const WorkCharterRoleAssignmentsSchema: z.ZodType<readonly WorkCharterRoleAssignment[]> = z
  .array(WorkCharterRoleAssignmentSchema)
  .min(1)
  .max(8)
  .superRefine((assignments, ctx) => {
    const roles = new Set<WorkCharterRole>()
    for (const assignment of assignments) {
      if (roles.has(assignment.role)) {
        ctx.addIssue({ code: 'custom', message: `role ${assignment.role} is assigned more than once` })
      }
      roles.add(assignment.role)
    }
  })
  .readonly()

export function workCharterCoordinationIssue(
  target: WorkCharterTarget,
  protection: WorkCharterProtection,
  roles: readonly WorkCharterRoleAssignment[],
): string | undefined {
  const byRole = new Map(roles.map(assignment => [assignment.role, assignment.sessionId]))
  if (protection === 'current-task' || protection === 'durable-single-agent') {
    if (roles.length !== 1 || !byRole.has('controller')) {
      return `${protection} requires exactly one controller role`
    }
    if (target.kind === 'session' && byRole.get('controller') !== target.sessionId) {
      return 'a Session-target Charter must assign that Session as controller'
    }
    return
  }
  if (target.kind !== 'workstream') return `${protection} requires a scdp Workstream target`
  if (protection === 'planner-executor') {
    if (!byRole.has('planner') || !byRole.has('executor') || byRole.has('orchestrator') || byRole.has('controller')) {
      return 'planner-executor requires planner and executor, with optional assessor only'
    }
    if (byRole.get('planner') === byRole.get('executor') || byRole.get('assessor') === byRole.get('executor')) {
      return 'planner/assessor must remain independent from executor'
    }
    return
  }
  if (!byRole.has('orchestrator') || !byRole.has('planner') || !byRole.has('executor') || byRole.has('controller')) {
    return 'standard-ope requires orchestrator, planner, and executor, with optional assessor'
  }
  const orchestrator = byRole.get('orchestrator')
  const planner = byRole.get('planner')
  const executor = byRole.get('executor')
  if (new Set([orchestrator, planner, executor]).size !== 3 || byRole.get('assessor') === executor) {
    return 'Standard O/P/E control roles must be distinct from the executor'
  }
  return
}

export interface WorkCharterContract {
  readonly outcome: string
  readonly nonGoals: readonly string[]
  readonly scope: readonly string[]
  readonly hardBoundaries: readonly string[]
  readonly confirmedContract: readonly string[]
  readonly necessaryGuardrails: readonly string[]
  readonly workingProposal: readonly string[]
  readonly assumptions: readonly string[]
  readonly acceptance: readonly string[]
  readonly stopConditions: readonly string[]
}
export const WorkCharterContractSchema: z.ZodType<WorkCharterContract> = z.object({
  outcome: TextSchema,
  nonGoals: TextListSchema,
  scope: TextListSchema,
  hardBoundaries: TextListSchema,
  confirmedContract: TextListSchema,
  necessaryGuardrails: TextListSchema,
  workingProposal: TextListSchema,
  assumptions: TextListSchema,
  acceptance: TextListSchema,
  stopConditions: TextListSchema,
}).strict().readonly()

export const WorkCharterAuthorityStateSchema = z.enum(['proposed', 'approved', 'revoked', 'unknown'])
export type WorkCharterAuthorityState = z.infer<typeof WorkCharterAuthorityStateSchema>

export interface WorkCharterAuthority {
  readonly revision: number
  readonly state: WorkCharterAuthorityState
  readonly reference?: string | undefined
  readonly authorizedActions: readonly string[]
  readonly prohibitedActions: readonly string[]
}
export const WorkCharterAuthoritySchema: z.ZodType<WorkCharterAuthority> = z.object({
  revision: PositiveRevisionSchema,
  state: WorkCharterAuthorityStateSchema,
  reference: ShortTextSchema.optional(),
  authorizedActions: TextListSchema,
  prohibitedActions: TextListSchema,
}).strict().superRefine((authority, ctx) => {
  if (authority.state === 'approved' && authority.reference === undefined) {
    ctx.addIssue({ code: 'custom', path: ['reference'], message: 'approved authority requires an external reference' })
  }
}).readonly()

export const WorkCharterEvidenceModeSchema = z.enum(['repeatable', 'one-shot'])
export type WorkCharterEvidenceMode = z.infer<typeof WorkCharterEvidenceModeSchema>
export const WorkCharterEvidenceStateSchema = z.enum(['pending', 'passed', 'failed', 'unknown'])
export type WorkCharterEvidenceState = z.infer<typeof WorkCharterEvidenceStateSchema>

export interface WorkCharterEvidence {
  readonly id: WorkCharterEvidenceId
  readonly description: string
  readonly subject: string
  readonly expectedRevision: string
  readonly invalidationCondition: string
  readonly mode: WorkCharterEvidenceMode
  readonly required: boolean
  readonly state: WorkCharterEvidenceState
  readonly observedRevision?: string | undefined
  readonly evidenceRef?: string | undefined
  readonly consumedAt?: string | undefined
  readonly recordedAt?: string | undefined
  readonly recordedBy?: SessionId | undefined
}
export const WorkCharterEvidenceSchema: z.ZodType<WorkCharterEvidence> = z.object({
  id: WorkCharterEvidenceIdSchema,
  description: TextSchema,
  subject: TextSchema,
  expectedRevision: ShortTextSchema,
  invalidationCondition: TextSchema,
  mode: WorkCharterEvidenceModeSchema,
  required: z.boolean(),
  state: WorkCharterEvidenceStateSchema,
  observedRevision: ShortTextSchema.optional(),
  evidenceRef: ShortTextSchema.optional(),
  consumedAt: IsoTimestampSchema.optional(),
  recordedAt: IsoTimestampSchema.optional(),
  recordedBy: SessionIdSchema.optional(),
}).strict().superRefine((evidence, ctx) => {
  if (evidence.state === 'pending' && (
    evidence.observedRevision !== undefined || evidence.evidenceRef !== undefined
    || evidence.consumedAt !== undefined || evidence.recordedAt !== undefined
    || evidence.recordedBy !== undefined
  )) {
    ctx.addIssue({ code: 'custom', message: 'pending evidence cannot carry an observed result' })
  }
  if (evidence.state !== 'pending' && (
    evidence.observedRevision === undefined || evidence.evidenceRef === undefined
    || evidence.recordedAt === undefined || evidence.recordedBy === undefined
  )) {
    ctx.addIssue({ code: 'custom', message: 'recorded evidence requires revision, reference, time, and recorder' })
  }
  if (evidence.mode === 'repeatable' && evidence.consumedAt !== undefined) {
    ctx.addIssue({ code: 'custom', message: 'repeatable evidence does not use one-shot consumption state' })
  }
  if (evidence.mode === 'one-shot' && evidence.state !== 'pending' && evidence.consumedAt === undefined) {
    ctx.addIssue({ code: 'custom', message: 'one-shot evidence records its consumption point' })
  }
}).readonly()

export const WorkCharterDecisionStateSchema = z.enum(['open', 'resolved', 'unknown'])
export type WorkCharterDecisionState = z.infer<typeof WorkCharterDecisionStateSchema>

export interface WorkCharterDecision {
  readonly id: WorkCharterDecisionId
  readonly question: string
  readonly ownerSessionId: SessionId
  readonly state: WorkCharterDecisionState
  readonly openedAt: string
  readonly openedBy: SessionId
  readonly resolution?: string | undefined
  readonly authorityRef?: string | undefined
  readonly resolvedAt?: string | undefined
}
export const WorkCharterDecisionSchema: z.ZodType<WorkCharterDecision> = z.object({
  id: WorkCharterDecisionIdSchema,
  question: TextSchema,
  ownerSessionId: SessionIdSchema,
  state: WorkCharterDecisionStateSchema,
  openedAt: IsoTimestampSchema,
  openedBy: SessionIdSchema,
  resolution: TextSchema.optional(),
  authorityRef: ShortTextSchema.optional(),
  resolvedAt: IsoTimestampSchema.optional(),
}).strict().superRefine((decision, ctx) => {
  const hasResolution = decision.resolution !== undefined
    || decision.authorityRef !== undefined || decision.resolvedAt !== undefined
  if (decision.state === 'open' && hasResolution) {
    ctx.addIssue({ code: 'custom', message: 'open decision cannot carry resolution fields' })
  }
  if (decision.state !== 'open' && (
    decision.resolution === undefined || decision.authorityRef === undefined || decision.resolvedAt === undefined
  )) {
    ctx.addIssue({ code: 'custom', message: 'resolved or unknown decision requires resolution provenance' })
  }
}).readonly()

export const WorkCharterVerdictSchema = z.enum(['accepted', 'correction-required', 'decision-required'])
export type WorkCharterVerdict = z.infer<typeof WorkCharterVerdictSchema>

export interface WorkCharterDisposition {
  readonly verdict: WorkCharterVerdict
  readonly checkpoint: string
  readonly returnedBy: SessionId
  readonly returnedAt: string
  readonly nextAction?: string | undefined
  readonly decisionId?: WorkCharterDecisionId | undefined
}
export const WorkCharterDispositionSchema: z.ZodType<WorkCharterDisposition> = z.object({
  verdict: WorkCharterVerdictSchema,
  checkpoint: ShortTextSchema,
  returnedBy: SessionIdSchema,
  returnedAt: IsoTimestampSchema,
  nextAction: TextSchema.optional(),
  decisionId: WorkCharterDecisionIdSchema.optional(),
}).strict().superRefine((disposition, ctx) => {
  if (disposition.verdict === 'decision-required' && disposition.decisionId === undefined) {
    ctx.addIssue({ code: 'custom', message: 'decision-required disposition requires a decision id' })
  }
  if (disposition.verdict !== 'decision-required' && disposition.decisionId !== undefined) {
    ctx.addIssue({ code: 'custom', message: 'only decision-required disposition may name a decision id' })
  }
}).readonly()

export interface WorkCharterNoticeTransport {
  readonly correlationId: CorrelationId
  readonly noticeRecordId: CoordinationRecordId
  readonly deliveryState: DeliveryState
  readonly dispositionRecordId?: CoordinationRecordId | undefined
  readonly dispositionDeliveryState?: DeliveryState | undefined
}
export const WorkCharterNoticeTransportSchema: z.ZodType<WorkCharterNoticeTransport> = z.object({
  correlationId: CorrelationIdSchema,
  noticeRecordId: CoordinationRecordIdSchema,
  deliveryState: DeliveryStateSchema,
  dispositionRecordId: CoordinationRecordIdSchema.optional(),
  dispositionDeliveryState: DeliveryStateSchema.optional(),
}).strict().readonly()

export interface WorkCharterNotice {
  readonly id: WorkCharterNoticeId
  readonly checkpoint: string
  readonly fromSessionId: SessionId
  readonly toSessionId: SessionId
  readonly evidenceRefs: readonly string[]
  readonly submittedAt: string
  readonly transport: WorkCharterNoticeTransport
  readonly disposition?: WorkCharterDisposition | undefined
}
export const WorkCharterNoticeSchema: z.ZodType<WorkCharterNotice> = z.object({
  id: WorkCharterNoticeIdSchema,
  checkpoint: ShortTextSchema,
  fromSessionId: SessionIdSchema,
  toSessionId: SessionIdSchema,
  evidenceRefs: z.array(ShortTextSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
  submittedAt: IsoTimestampSchema,
  transport: WorkCharterNoticeTransportSchema,
  disposition: WorkCharterDispositionSchema.optional(),
}).strict().superRefine((notice, ctx) => {
  const hasRecord = notice.transport.dispositionRecordId !== undefined
  const hasDelivery = notice.transport.dispositionDeliveryState !== undefined
  if (hasRecord !== hasDelivery) {
    ctx.addIssue({ code: 'custom', message: 'disposition record and delivery state must be recorded together' })
  }
  if ((notice.disposition !== undefined) !== (hasRecord && hasDelivery)) {
    ctx.addIssue({ code: 'custom', message: 'terminal disposition requires its exact transport record and delivery state' })
  }
}).readonly()

export interface WorkCharterWriter {
  readonly sessionId: SessionId
  readonly assignedBy: SessionId
  readonly assignedAt: string
}
export const WorkCharterWriterSchema: z.ZodType<WorkCharterWriter> = z.object({
  sessionId: SessionIdSchema,
  assignedBy: SessionIdSchema,
  assignedAt: IsoTimestampSchema,
}).strict().readonly()

export interface WorkCharterStopRecord {
  readonly reason: string
  readonly stoppedBy: SessionId
  readonly stoppedAt: string
}
export const WorkCharterStopRecordSchema: z.ZodType<WorkCharterStopRecord> = z.object({
  reason: TextSchema,
  stoppedBy: SessionIdSchema,
  stoppedAt: IsoTimestampSchema,
}).strict().readonly()

export const WorkCharterCloseOutcomeSchema = z.enum(['accepted', 'not-accepted', 'unknown'])
export type WorkCharterCloseOutcome = z.infer<typeof WorkCharterCloseOutcomeSchema>

export interface WorkCharterCloseRecord {
  readonly outcome: WorkCharterCloseOutcome
  readonly assessmentRef: string
  readonly closedBy: SessionId
  readonly closedAt: string
}
export const WorkCharterCloseRecordSchema: z.ZodType<WorkCharterCloseRecord> = z.object({
  outcome: WorkCharterCloseOutcomeSchema,
  assessmentRef: ShortTextSchema,
  closedBy: SessionIdSchema,
  closedAt: IsoTimestampSchema,
}).strict().readonly()

export interface WorkCharterDto {
  readonly id: WorkCharterId
  readonly target: WorkCharterTarget
  readonly managedWorkstream: string
  readonly protection: WorkCharterProtection
  readonly state: WorkCharterRunState
  readonly revision: number
  readonly authority: WorkCharterAuthority
  readonly contract: WorkCharterContract
  readonly roles: readonly WorkCharterRoleAssignment[]
  readonly writer?: WorkCharterWriter | undefined
  readonly lastStop?: WorkCharterStopRecord | undefined
  readonly evidence: readonly WorkCharterEvidence[]
  readonly decisions: readonly WorkCharterDecision[]
  readonly notices: readonly WorkCharterNotice[]
  readonly close?: WorkCharterCloseRecord | undefined
  readonly createdAt: string
  readonly updatedAt: string
}

export type WorkCharterNoticeRoute = 'writer' | 'standard-phase'

export function workCharterNoticeRoute(
  charter: Pick<WorkCharterDto, 'protection' | 'roles'>,
  notice: Pick<WorkCharterNotice, 'fromSessionId' | 'toSessionId'>,
): WorkCharterNoticeRoute {
  const standardPhase = charter.protection === 'standard-ope'
    && charter.roles.some(role => role.role === 'planner' && role.sessionId === notice.fromSessionId)
    && charter.roles.some(role => role.role === 'orchestrator' && role.sessionId === notice.toSessionId)
  return standardPhase ? 'standard-phase' : 'writer'
}

export function latestWorkCharterNoticeForRoute(
  charter: Pick<WorkCharterDto, 'protection' | 'roles' | 'notices'>,
  route: WorkCharterNoticeRoute,
): WorkCharterNotice | undefined {
  for (let index = charter.notices.length - 1; index >= 0; index -= 1) {
    const notice = charter.notices[index]
    if (notice !== undefined && workCharterNoticeRoute(charter, notice) === route) return notice
  }
  return undefined
}

export const WorkCharterDtoSchema: z.ZodType<WorkCharterDto> = z.object({
  id: WorkCharterIdSchema,
  target: WorkCharterTargetSchema,
  managedWorkstream: TextSchema,
  protection: WorkCharterProtectionSchema,
  state: WorkCharterRunStateSchema,
  revision: RevisionSchema,
  authority: WorkCharterAuthoritySchema,
  contract: WorkCharterContractSchema,
  roles: WorkCharterRoleAssignmentsSchema,
  writer: WorkCharterWriterSchema.optional(),
  lastStop: WorkCharterStopRecordSchema.optional(),
  evidence: z.array(WorkCharterEvidenceSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
  decisions: z.array(WorkCharterDecisionSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
  notices: z.array(WorkCharterNoticeSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
  close: WorkCharterCloseRecordSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
}).strict().superRefine((charter, ctx) => {
  const unique = (values: readonly unknown[], label: string): void => {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', message: `${label} ids must be unique` })
  }
  unique(charter.evidence.map(item => item.id), 'evidence')
  unique(charter.decisions.map(item => item.id), 'decision')
  unique(charter.notices.map(item => item.id), 'notice')
  const checkpointRoutes = charter.notices.map(notice =>
    JSON.stringify([workCharterNoticeRoute(charter, notice), notice.checkpoint]))
  if (new Set(checkpointRoutes).size !== checkpointRoutes.length) {
    ctx.addIssue({ code: 'custom', message: 'Result Notice checkpoints must be unique within each route' })
  }
  const coordinationIssue = workCharterCoordinationIssue(charter.target, charter.protection, charter.roles)
  if (coordinationIssue !== undefined) ctx.addIssue({ code: 'custom', message: coordinationIssue })
  if (charter.writer !== undefined) {
    const requiredRole: WorkCharterRole = charter.protection === 'current-task'
      || charter.protection === 'durable-single-agent' ? 'controller' : 'executor'
    if (!charter.roles.some(role => role.role === requiredRole && role.sessionId === charter.writer?.sessionId)) {
      ctx.addIssue({ code: 'custom', message: `writer must hold the ${requiredRole} role` })
    }
  }
  if (charter.state === 'active'
    && (charter.authority.state !== 'approved' || charter.authority.reference === undefined)) {
    ctx.addIssue({ code: 'custom', message: 'active Charter requires externally referenced approved authority' })
  }
  if (charter.state === 'active' && charter.writer === undefined) {
    ctx.addIssue({ code: 'custom', message: 'active Charter requires one eligible writer' })
  }
  if (charter.state === 'closed' && charter.close === undefined) {
    ctx.addIssue({ code: 'custom', message: 'closed Charter requires a close record' })
  }
  if (charter.state !== 'closed' && charter.close !== undefined) {
    ctx.addIssue({ code: 'custom', message: 'open Charter cannot carry a close record' })
  }
  if (charter.close?.outcome === 'accepted') {
    if (charter.writer !== undefined) ctx.addIssue({ code: 'custom', message: 'accepted close cannot retain a writer' })
    if (charter.authority.state !== 'approved' || charter.authority.reference === undefined) {
      ctx.addIssue({ code: 'custom', message: 'accepted close requires externally referenced approved authority' })
    }
    if (charter.evidence.some(evidence => evidence.required && evidence.state !== 'passed')) {
      ctx.addIssue({ code: 'custom', message: 'accepted close requires all required evidence to pass' })
    }
    if (charter.decisions.some(decision => decision.state === 'open')) {
      ctx.addIssue({ code: 'custom', message: 'accepted close cannot retain an open decision' })
    }
    for (const route of ['writer', 'standard-phase'] as const) {
      const latest = latestWorkCharterNoticeForRoute(charter, route)
      if (latest !== undefined && latest.disposition?.verdict !== 'accepted') {
        ctx.addIssue({ code: 'custom', message: `accepted close requires the latest ${route} Result Notice to be accepted` })
      }
    }
    const closerRoles = charter.roles
      .filter(role => role.sessionId === charter.close?.closedBy)
      .map(role => role.role)
    const closerAccepts = charter.protection === 'current-task' || charter.protection === 'durable-single-agent'
      ? closerRoles.includes('controller')
      : (closerRoles.includes('planner') || closerRoles.includes('assessor')) && !closerRoles.includes('executor')
    if (!closerAccepts) ctx.addIssue({ code: 'custom', message: 'accepted close requires an eligible independent acceptance actor' })
  }
}).readonly()

export interface CreateWorkCharterInput {
  readonly charterId: WorkCharterId
  readonly target: WorkCharterTarget
  readonly managedWorkstream: string
  readonly protection: WorkCharterProtection
  readonly authority: WorkCharterAuthority
  readonly contract: WorkCharterContract
  readonly roles: readonly WorkCharterRoleAssignment[]
  readonly evidence: readonly WorkCharterEvidence[]
}
export const CreateWorkCharterInputSchema: z.ZodType<CreateWorkCharterInput> = z.object({
  charterId: WorkCharterIdSchema,
  target: WorkCharterTargetSchema,
  managedWorkstream: TextSchema,
  protection: WorkCharterProtectionSchema,
  authority: WorkCharterAuthoritySchema,
  contract: WorkCharterContractSchema,
  roles: WorkCharterRoleAssignmentsSchema,
  evidence: z.array(WorkCharterEvidenceSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
}).strict().readonly()

export interface WorkCharterMutationResult {
  readonly charter: WorkCharterDto
  readonly changed: boolean
}
export const WorkCharterMutationResultSchema: z.ZodType<WorkCharterMutationResult> = z.object({
  charter: WorkCharterDtoSchema,
  changed: z.boolean(),
}).strict().readonly()

export interface GetWorkCharterInput { readonly charterId: WorkCharterId }
export const GetWorkCharterInputSchema: z.ZodType<GetWorkCharterInput> = z.object({
  charterId: WorkCharterIdSchema,
}).strict().readonly()

export interface ListWorkChartersInput {
  readonly state?: WorkCharterRunState | undefined
  readonly workstreamId?: WorkstreamId | undefined
  readonly sessionId?: SessionId | undefined
}
export const ListWorkChartersInputSchema: z.ZodType<ListWorkChartersInput> = z.object({
  state: WorkCharterRunStateSchema.optional(),
  workstreamId: WorkstreamIdSchema.optional(),
  sessionId: SessionIdSchema.optional(),
}).strict().readonly()

export interface ListSessionWorkChartersInput { readonly sessionId: SessionId }
export const ListSessionWorkChartersInputSchema: z.ZodType<ListSessionWorkChartersInput> = z.object({
  sessionId: SessionIdSchema,
}).strict().readonly()

export const WorkCharterCommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('activate') }).strict().readonly(),
  z.object({ kind: z.literal('pause'), reason: TextSchema }).strict().readonly(),
  z.object({ kind: z.literal('resume') }).strict().readonly(),
  z.object({
    kind: z.literal('revise-contract'),
    authority: WorkCharterAuthoritySchema,
    contract: WorkCharterContractSchema,
    evidence: z.array(WorkCharterEvidenceSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
  }).strict().readonly(),
  z.object({
    kind: z.literal('update-proposal'),
    workingProposal: TextListSchema,
    assumptions: TextListSchema,
  }).strict().readonly(),
  z.object({ kind: z.literal('assign-writer'), sessionId: SessionIdSchema }).strict().readonly(),
  z.object({ kind: z.literal('release-writer') }).strict().readonly(),
  z.object({
    kind: z.literal('record-evidence'),
    evidenceId: WorkCharterEvidenceIdSchema,
    state: z.enum(['passed', 'failed', 'unknown']),
    observedRevision: ShortTextSchema,
    evidenceRef: ShortTextSchema,
    consumedAt: IsoTimestampSchema.optional(),
  }).strict().readonly(),
  z.object({
    kind: z.literal('open-decision'),
    decisionId: WorkCharterDecisionIdSchema,
    question: TextSchema,
    ownerSessionId: SessionIdSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal('resolve-decision'),
    decisionId: WorkCharterDecisionIdSchema,
    state: z.enum(['resolved', 'unknown']),
    resolution: TextSchema,
    authorityRef: ShortTextSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal('change-coordination'),
    protection: WorkCharterProtectionSchema,
    roles: WorkCharterRoleAssignmentsSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal('close'),
    outcome: WorkCharterCloseOutcomeSchema,
    assessmentRef: ShortTextSchema,
  }).strict().readonly(),
])
export type WorkCharterCommand = z.infer<typeof WorkCharterCommandSchema>

export interface TransitionWorkCharterInput {
  readonly charterId: WorkCharterId
  readonly expectedRevision: number
  readonly expectedAuthorityRevision: number
  readonly actorSessionId: SessionId
  readonly command: WorkCharterCommand
}
export const TransitionWorkCharterInputSchema: z.ZodType<TransitionWorkCharterInput> = z.object({
  charterId: WorkCharterIdSchema,
  expectedRevision: RevisionSchema,
  expectedAuthorityRevision: PositiveRevisionSchema,
  actorSessionId: SessionIdSchema,
  command: WorkCharterCommandSchema,
}).strict().readonly()

export interface SubmitWorkCharterNoticeInput {
  readonly charterId: WorkCharterId
  readonly expectedRevision: number
  readonly expectedAuthorityRevision: number
  readonly actorSessionId: SessionId
  readonly noticeId: WorkCharterNoticeId
  readonly noticeRecordId: CoordinationRecordId
  readonly correlationId: CorrelationId
  readonly checkpoint: string
  readonly recipientSessionId: SessionId
  readonly evidenceRefs: readonly string[]
  readonly wake: boolean
}
export const SubmitWorkCharterNoticeInputSchema: z.ZodType<SubmitWorkCharterNoticeInput> = z.object({
  charterId: WorkCharterIdSchema,
  expectedRevision: RevisionSchema,
  expectedAuthorityRevision: PositiveRevisionSchema,
  actorSessionId: SessionIdSchema,
  noticeId: WorkCharterNoticeIdSchema,
  noticeRecordId: CoordinationRecordIdSchema,
  correlationId: CorrelationIdSchema,
  checkpoint: ShortTextSchema,
  recipientSessionId: SessionIdSchema,
  evidenceRefs: z.array(ShortTextSchema).max(CHARTER_LIST_MAX_ITEMS).readonly(),
  wake: z.boolean(),
}).strict().readonly()

export interface ReturnWorkCharterDispositionInput {
  readonly charterId: WorkCharterId
  readonly expectedRevision: number
  readonly expectedAuthorityRevision: number
  readonly actorSessionId: SessionId
  readonly noticeId: WorkCharterNoticeId
  readonly dispositionRecordId: CoordinationRecordId
  readonly verdict: WorkCharterVerdict
  readonly checkpoint: string
  readonly nextAction?: string | undefined
  readonly decisionId?: WorkCharterDecisionId | undefined
  readonly wake: boolean
}
export const ReturnWorkCharterDispositionInputSchema: z.ZodType<ReturnWorkCharterDispositionInput> = z.object({
  charterId: WorkCharterIdSchema,
  expectedRevision: RevisionSchema,
  expectedAuthorityRevision: PositiveRevisionSchema,
  actorSessionId: SessionIdSchema,
  noticeId: WorkCharterNoticeIdSchema,
  dispositionRecordId: CoordinationRecordIdSchema,
  verdict: WorkCharterVerdictSchema,
  checkpoint: ShortTextSchema,
  nextAction: TextSchema.optional(),
  decisionId: WorkCharterDecisionIdSchema.optional(),
  wake: z.boolean(),
}).strict().superRefine((input, ctx) => {
  if (input.verdict === 'decision-required' && input.decisionId === undefined) {
    ctx.addIssue({ code: 'custom', path: ['decisionId'], message: 'decision-required requires decisionId' })
  }
  if (input.verdict !== 'decision-required' && input.decisionId !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['decisionId'], message: 'decisionId is only valid for decision-required' })
  }
}).readonly()

export type WorkCharterFailureState = 'failed' | 'unknown'
export type WorkCharterErrorCode =
  | 'INVALID_INPUT'
  | 'STORAGE_UNAVAILABLE'
  | 'SCHEMA_INCOMPATIBLE'
  | 'MUTATION_STATE_UNKNOWN'
  | 'CHARTER_NOT_FOUND'
  | 'TARGET_NOT_FOUND'
  | 'REVISION_CONFLICT'
  | 'AUTHORITY_CONFLICT'
  | 'ROLE_UNAUTHORIZED'
  | 'WRITER_CONFLICT'
  | 'INVALID_TRANSITION'
  | 'OPEN_DECISION'
  | 'EVIDENCE_INCOMPLETE'
  | 'NOTICE_NOT_FOUND'
  | 'DISPOSITION_CONFLICT'
  | 'COORDINATION_UNAVAILABLE'
  | 'DELIVERY_STATE_UNKNOWN'
  | 'INTERNAL'

export interface WorkCharterErrorDto {
  readonly code: WorkCharterErrorCode
  readonly message: string
  readonly retryable: boolean
  readonly state: WorkCharterFailureState
}
export const WorkCharterErrorDtoSchema: z.ZodType<WorkCharterErrorDto> = z.object({
  code: z.enum([
    'INVALID_INPUT', 'STORAGE_UNAVAILABLE', 'SCHEMA_INCOMPATIBLE', 'MUTATION_STATE_UNKNOWN',
    'CHARTER_NOT_FOUND', 'TARGET_NOT_FOUND', 'REVISION_CONFLICT', 'AUTHORITY_CONFLICT',
    'ROLE_UNAUTHORIZED', 'WRITER_CONFLICT', 'INVALID_TRANSITION', 'OPEN_DECISION',
    'EVIDENCE_INCOMPLETE', 'NOTICE_NOT_FOUND', 'DISPOSITION_CONFLICT', 'COORDINATION_UNAVAILABLE',
    'DELIVERY_STATE_UNKNOWN', 'INTERNAL',
  ]),
  message: z.string(),
  retryable: z.boolean(),
  state: z.enum(['failed', 'unknown']),
}).strict().readonly()

export class WorkCharterError extends Error {
  override readonly name = 'WorkCharterError'

  constructor(
    readonly code: WorkCharterErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly state: WorkCharterFailureState,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }

  toDTO(): WorkCharterErrorDto {
    return WorkCharterErrorDtoSchema.parse({
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      state: this.state,
    })
  }
}

export interface WorkCharterStorageHealth {
  readonly schemaVersion: 1
  readonly state: 'ready'
}
export interface WorkCharterHealth {
  readonly service: 'work-charter-dsh'
  readonly status: 'ok'
  readonly contractVersion: 1
  readonly storage: WorkCharterStorageHealth
  readonly upstream: {
    readonly version: '0.3.0'
    readonly packageSha256: typeof WORK_CHARTER_UPSTREAM_PACKAGE_SHA256
    readonly packageTree: typeof WORK_CHARTER_UPSTREAM_PACKAGE_TREE
  }
  readonly sessionCoordinatorContractVersion: 3
}
export const WorkCharterHealthSchema: z.ZodType<WorkCharterHealth> = z.object({
  service: z.literal('work-charter-dsh'),
  status: z.literal('ok'),
  contractVersion: z.literal(WORK_CHARTER_CONTRACT_VERSION),
  storage: z.object({
    schemaVersion: z.literal(WORK_CHARTER_STORAGE_SCHEMA_VERSION),
    state: z.literal('ready'),
  }).strict().readonly(),
  upstream: z.object({
    version: z.literal(WORK_CHARTER_UPSTREAM_VERSION),
    packageSha256: z.literal(WORK_CHARTER_UPSTREAM_PACKAGE_SHA256),
    packageTree: z.literal(WORK_CHARTER_UPSTREAM_PACKAGE_TREE),
  }).strict().readonly(),
  sessionCoordinatorContractVersion: z.literal(3),
}).strict().readonly()

export interface WorkCharterServiceContract {
  health(): Promise<WorkCharterHealth>
  createCharter(input: CreateWorkCharterInput): Promise<WorkCharterMutationResult>
  getCharter(input: GetWorkCharterInput): Promise<WorkCharterDto>
  listCharters(input?: ListWorkChartersInput): Promise<readonly WorkCharterDto[]>
  listSessionCharters(input: ListSessionWorkChartersInput): Promise<readonly WorkCharterDto[]>
  transitionCharter(input: TransitionWorkCharterInput): Promise<WorkCharterMutationResult>
  submitResultNotice(input: SubmitWorkCharterNoticeInput): Promise<WorkCharterMutationResult>
  returnDisposition(input: ReturnWorkCharterDispositionInput): Promise<WorkCharterMutationResult>
}

export type WorkCharterRemoteOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: WorkCharterErrorDto }

export function workCharterRemoteOutcomeSchema<T extends z.ZodType>(
  value: T,
): z.ZodType<WorkCharterRemoteOutcome<z.output<T>>> {
  return z.union([
    z.object({ ok: z.literal(true), value }).strict().readonly(),
    z.object({ ok: z.literal(false), error: WorkCharterErrorDtoSchema }).strict().readonly(),
  ]) as unknown as z.ZodType<WorkCharterRemoteOutcome<z.output<T>>>
}

export const WorkCharterMutationRemoteOutcomeSchema
  = workCharterRemoteOutcomeSchema(WorkCharterMutationResultSchema)
export const WorkCharterGetRemoteOutcomeSchema = workCharterRemoteOutcomeSchema(WorkCharterDtoSchema)
export const WorkCharterListRemoteOutcomeSchema = workCharterRemoteOutcomeSchema(
  z.array(WorkCharterDtoSchema).readonly(),
)
