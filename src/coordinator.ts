import type { SessionStore } from '@deepseek-ai/dsh-session'
import {
  COORDINATION_RECORD_BODY_MAX_CHARS,
  SessionCoordinatorError,
  type CoordinationRecordId,
  type CoordinationRecordDto,
  type SessionCoordinator,
  type SessionId,
  type WorkstreamId,
} from 'session-coordinator-dsh'
import { applyWorkCharterTransition, createWorkCharterRecord, type WorkCharterPolicyRuntime } from './policy.ts'
import { WORK_CHARTER_TABLE_ID, type WorkCharterDomain } from './storage.ts'
import {
  CreateWorkCharterInputSchema,
  GetWorkCharterInputSchema,
  ListSessionWorkChartersInputSchema,
  ListWorkChartersInputSchema,
  ReturnWorkCharterDispositionInputSchema,
  SubmitWorkCharterNoticeInputSchema,
  TransitionWorkCharterInputSchema,
  WorkCharterDtoSchema,
  WorkCharterError,
  latestWorkCharterNoticeForRoute,
  workCharterNoticeRoute,
  type CreateWorkCharterInput,
  type GetWorkCharterInput,
  type ListSessionWorkChartersInput,
  type ListWorkChartersInput,
  type ReturnWorkCharterDispositionInput,
  type SubmitWorkCharterNoticeInput,
  type TransitionWorkCharterInput,
  type WorkCharterDto,
  type WorkCharterMutationResult,
  type WorkCharterNotice,
} from './types.ts'

export class WorkCharterCoordinator {
  private mutationTail: Promise<void> = Promise.resolve()

  constructor(
    private readonly domain: WorkCharterDomain,
    private readonly sessionCoordinator: SessionCoordinator,
    private readonly sessions: SessionStore,
    private readonly runtime: WorkCharterPolicyRuntime,
  ) {}

  async drain(): Promise<void> {
    await this.mutationTail
  }

  createCharter(rawInput: CreateWorkCharterInput): Promise<WorkCharterMutationResult> {
    const input = CreateWorkCharterInputSchema.parse(rawInput)
    return this.enqueue(async () => {
      await this.validateTargetAndRoles(input.target, input.roles.map(role => role.sessionId))
      const existing = this.read(input.charterId)
      if (existing !== undefined) {
        if (matchesCreateInput(existing, input)) return { charter: existing, changed: false }
        throw new WorkCharterError(
          'INVALID_TRANSITION',
          `Charter ${input.charterId} already exists with different content`,
          false,
          'failed',
        )
      }
      const charter = createWorkCharterRecord(input, this.runtime)
      await this.persist(charter, 'create')
      return { charter, changed: true }
    })
  }

  getCharter(rawInput: GetWorkCharterInput): Promise<WorkCharterDto> {
    const input = GetWorkCharterInputSchema.parse(rawInput)
    return Promise.resolve(this.requireCharter(input.charterId))
  }

  listCharters(rawInput: ListWorkChartersInput = {}): Promise<readonly WorkCharterDto[]> {
    const input = ListWorkChartersInputSchema.parse(rawInput)
    const rows = this.readAll().filter((charter) => {
      if (input.state !== undefined && charter.state !== input.state) return false
      if (input.workstreamId !== undefined
        && (charter.target.kind !== 'workstream' || charter.target.workstreamId !== input.workstreamId)) return false
      if (input.sessionId !== undefined
        && (charter.target.kind !== 'session' || charter.target.sessionId !== input.sessionId)) return false
      return true
    })
    return Promise.resolve(rows)
  }

  async listSessionCharters(rawInput: ListSessionWorkChartersInput): Promise<readonly WorkCharterDto[]> {
    const input = ListSessionWorkChartersInputSchema.parse(rawInput)
    const memberships = await this.callScdp(
      () => this.sessionCoordinator.listSessionWorkstreams({ sessionId: input.sessionId }),
      'list Session Workstreams',
    )
    const workstreamIds = new Set(memberships.map(membership => membership.workstreamId))
    return this.readAll().filter(charter => charterAppliesToSession(charter, input.sessionId, workstreamIds))
  }

  listRoleCharters(sessionId: SessionId): readonly WorkCharterDto[] {
    return this.readAll().filter(charter =>
      charter.target.kind === 'session' && charter.target.sessionId === sessionId
      || charter.roles.some(role => role.sessionId === sessionId)
      || charter.writer?.sessionId === sessionId)
  }

  transitionCharter(rawInput: TransitionWorkCharterInput): Promise<WorkCharterMutationResult> {
    const input = TransitionWorkCharterInputSchema.parse(rawInput)
    return this.enqueue(async () => {
      const current = this.requireCharter(input.charterId)
      await this.validateTargetAndRoles(current.target, [input.actorSessionId])
      if (input.command.kind === 'change-coordination') {
        await this.validateTargetAndRoles(current.target, input.command.roles.map(role => role.sessionId))
      }
      if (input.command.kind === 'activate' || input.command.kind === 'resume') {
        await this.validateTargetAndRoles(current.target, current.roles.map(role => role.sessionId))
      }
      const result = applyWorkCharterTransition(current, input, this.runtime)
      if (result.changed) await this.persist(result.charter, `transition ${input.command.kind}`)
      return result
    })
  }

  submitResultNotice(rawInput: SubmitWorkCharterNoticeInput): Promise<WorkCharterMutationResult> {
    const input = SubmitWorkCharterNoticeInputSchema.parse(rawInput)
    return this.enqueue(async () => {
      const current = this.requireCharter(input.charterId)
      requireExpectedRevisions(current, input.expectedRevision, input.expectedAuthorityRevision)
      if (current.target.kind !== 'workstream') {
        throw new WorkCharterError(
          'INVALID_TRANSITION',
          'cross-Session Result Notice requires a scdp Workstream-target Charter',
          false,
          'failed',
        )
      }
      if (current.state !== 'active' && current.state !== 'paused') {
        throw invalidTransition(`Result Notice requires active or paused state; current state is ${current.state}`)
      }
      const openDecision = current.decisions.find(decision => decision.state === 'open')
      if (openDecision !== undefined) {
        throw new WorkCharterError(
          'OPEN_DECISION',
          `decision ${openDecision.id} remains open; Result Notice submission is blocked`,
          false,
          'failed',
        )
      }
      const route = requireResultNoticeRoute(current, input)
      const existing = current.notices.find(notice => notice.id === input.noticeId)
      if (existing !== undefined) {
        if (noticeMatchesInput(existing, input)) return { charter: current, changed: false }
        throw new WorkCharterError(
          'DISPOSITION_CONFLICT',
          `Result Notice ${input.noticeId} already exists with different content`,
          false,
          'failed',
        )
      }
      const duplicateCheckpoint = current.notices.find(notice =>
        notice.checkpoint === input.checkpoint && workCharterNoticeRoute(current, notice) === route.kind)
      if (duplicateCheckpoint !== undefined) {
        throw new WorkCharterError(
          'DISPOSITION_CONFLICT',
          `checkpoint ${input.checkpoint} already has Result Notice ${duplicateCheckpoint.id} on the ${route.kind} route`,
          false,
          'failed',
        )
      }
      const previous = latestWorkCharterNoticeForRoute(current, route.kind)
      if (previous !== undefined && previous.disposition === undefined) {
        throw invalidTransition(`Result Notice ${previous.id} still awaits disposition on the ${route.kind} route`)
      }
      await this.validateTargetAndRoles(current.target, [input.actorSessionId, input.recipientSessionId])
      const body = coordinationBody({
        schema: route.kind === 'standard-phase'
          ? 'work-charter-dsh/phase-result-notice/v1'
          : 'work-charter-dsh/result-notice/v1',
        charterId: current.id,
        authorityRevision: current.authority.revision,
        checkpoint: input.checkpoint,
        evidenceRefs: input.evidenceRefs,
        returnToSessionId: input.actorSessionId,
      })
      const accepted = await this.acceptOrRecoverRecord({
        recordId: input.noticeRecordId,
        workstreamId: current.target.workstreamId,
        correlationId: input.correlationId,
        ...(route.kind === 'standard-phase' ? { causationRecordId: route.causationRecordId } : {}),
        fromSessionId: input.actorSessionId,
        address: { kind: 'session', sessionId: input.recipientSessionId },
        subject: route.kind === 'standard-phase'
          ? `Work Charter phase Result Notice ${input.noticeId}`
          : `Work Charter Result Notice ${input.noticeId}`,
        content: { kind: 'request', body },
      })
      const processed = await this.processOrPreserveUnknown(accepted, input.recipientSessionId, input.wake)
      const notice: WorkCharterNotice = {
        id: input.noticeId,
        checkpoint: input.checkpoint,
        fromSessionId: input.actorSessionId,
        toSessionId: input.recipientSessionId,
        evidenceRefs: input.evidenceRefs,
        submittedAt: this.runtime.now(),
        transport: {
          correlationId: input.correlationId,
          noticeRecordId: input.noticeRecordId,
          deliveryState: deliveryStateFor(processed, input.recipientSessionId),
        },
      }
      const charter = appendNotice(current, notice, this.runtime.now())
      await this.persist(charter, `record Result Notice ${input.noticeId}`)
      return { charter, changed: true }
    })
  }

  returnDisposition(rawInput: ReturnWorkCharterDispositionInput): Promise<WorkCharterMutationResult> {
    const input = ReturnWorkCharterDispositionInputSchema.parse(rawInput)
    return this.enqueue(async () => {
      const current = this.requireCharter(input.charterId)
      requireExpectedRevisions(current, input.expectedRevision, input.expectedAuthorityRevision)
      if (current.state === 'closed') {
        throw invalidTransition('closed Charter state is terminal')
      }
      if (current.target.kind !== 'workstream') {
        throw invalidTransition('cross-Session disposition requires a scdp Workstream-target Charter')
      }
      const noticeIndex = current.notices.findIndex(notice => notice.id === input.noticeId)
      if (noticeIndex < 0) {
        throw new WorkCharterError('NOTICE_NOT_FOUND', `Result Notice ${input.noticeId} was not found`, false, 'failed')
      }
      const notice = current.notices[noticeIndex]
      if (notice === undefined) throw new WorkCharterError('INTERNAL', 'notice index became unavailable', false, 'failed')
      if (notice.toSessionId !== input.actorSessionId) {
        throw new WorkCharterError(
          'ROLE_UNAUTHORIZED',
          `only Result Notice recipient ${notice.toSessionId} may return its disposition`,
          false,
          'failed',
        )
      }
      if (notice.checkpoint !== input.checkpoint) {
        throw new WorkCharterError(
          'DISPOSITION_CONFLICT',
          `disposition checkpoint ${input.checkpoint} does not match notice checkpoint ${notice.checkpoint}`,
          false,
          'failed',
        )
      }
      if (notice.disposition !== undefined) {
        if (dispositionMatchesInput(notice, input)) return { charter: current, changed: false }
        throw new WorkCharterError(
          'DISPOSITION_CONFLICT',
          `Result Notice ${notice.id} already has a different disposition`,
          false,
          'failed',
        )
      }
      if (input.verdict === 'decision-required'
        && !current.decisions.some(decision => decision.id === input.decisionId && decision.state === 'open')) {
        throw invalidTransition(`decision-required disposition must reference an open decision ${String(input.decisionId)}`)
      }
      await this.validateTargetAndRoles(current.target, [notice.fromSessionId, notice.toSessionId])
      const phaseDisposition = workCharterNoticeRoute(current, notice) === 'standard-phase'
      const body = coordinationBody({
        schema: phaseDisposition
          ? 'work-charter-dsh/phase-disposition/v1'
          : 'work-charter-dsh/disposition/v1',
        charterId: current.id,
        noticeId: notice.id,
        authorityRevision: current.authority.revision,
        checkpoint: input.checkpoint,
        verdict: input.verdict,
        ...(input.nextAction === undefined ? {} : { nextAction: input.nextAction }),
        ...(input.decisionId === undefined ? {} : { decisionId: input.decisionId }),
      })
      const accepted = await this.acceptOrRecoverRecord({
        recordId: input.dispositionRecordId,
        workstreamId: current.target.workstreamId,
        correlationId: notice.transport.correlationId,
        causationRecordId: notice.transport.noticeRecordId,
        fromSessionId: input.actorSessionId,
        address: { kind: 'session', sessionId: notice.fromSessionId },
        subject: phaseDisposition
          ? `Work Charter phase disposition for ${notice.id}`
          : `Work Charter disposition for ${notice.id}`,
        content: {
          kind: 'outcome',
          body,
          outcome: input.verdict === 'accepted' ? 'succeeded' : 'failed',
          outcomeCode: input.verdict,
        },
      })
      const processed = await this.processOrPreserveUnknown(accepted, notice.fromSessionId, input.wake)
      const returnedAt = this.runtime.now()
      const replacement: WorkCharterNotice = {
        ...notice,
        transport: {
          ...notice.transport,
          dispositionRecordId: input.dispositionRecordId,
          dispositionDeliveryState: deliveryStateFor(processed, notice.fromSessionId),
        },
        disposition: {
          verdict: input.verdict,
          checkpoint: input.checkpoint,
          returnedBy: input.actorSessionId,
          returnedAt,
          ...(input.nextAction === undefined ? {} : { nextAction: input.nextAction }),
          ...(input.decisionId === undefined ? {} : { decisionId: input.decisionId }),
        },
      }
      const charter = replaceNotice(current, noticeIndex, replacement, returnedAt)
      await this.persist(charter, `record disposition for ${notice.id}`)
      return { charter, changed: true }
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.mutationTail.then(operation, operation)
    this.mutationTail = run.then(() => undefined, () => undefined)
    return run
  }

  private read(charterId: WorkCharterDto['id']): WorkCharterDto | undefined {
    const row = this.domain.table(WORK_CHARTER_TABLE_ID).get(charterId)
    return row === undefined ? undefined : WorkCharterDtoSchema.parse(row)
  }

  private requireCharter(charterId: WorkCharterDto['id']): WorkCharterDto {
    const charter = this.read(charterId)
    if (charter === undefined) {
      throw new WorkCharterError('CHARTER_NOT_FOUND', `Charter ${charterId} was not found`, false, 'failed')
    }
    return charter
  }

  private readAll(): readonly WorkCharterDto[] {
    return [...this.domain.table(WORK_CHARTER_TABLE_ID).entries()]
      .map(([, charter]) => WorkCharterDtoSchema.parse(charter))
      .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  }

  private async persist(charter: WorkCharterDto, operation: string): Promise<void> {
    try {
      await this.domain.table(WORK_CHARTER_TABLE_ID).put(charter.id, charter)
    } catch (error) {
      throw new WorkCharterError(
        'MUTATION_STATE_UNKNOWN',
        `${operation} storage write was rejected; durable state is unknown until reopen`,
        false,
        'unknown',
        { cause: error },
      )
    }
    const stored = this.domain.table(WORK_CHARTER_TABLE_ID).get(charter.id)
    if (stored === undefined || !sameJson(stored, charter)) {
      throw new WorkCharterError(
        'MUTATION_STATE_UNKNOWN',
        `${operation} did not reopen as the intended Charter revision`,
        false,
        'unknown',
      )
    }
  }

  private async validateTargetAndRoles(
    target: WorkCharterDto['target'],
    roleSessionIds: readonly SessionId[],
  ): Promise<void> {
    if (target.kind === 'session') {
      if (this.sessions.get(target.sessionId) === undefined) {
        throw new WorkCharterError('TARGET_NOT_FOUND', `DSH Session ${target.sessionId} is not live`, false, 'failed')
      }
      return
    }
    const workstream = await this.callScdp(
      () => this.sessionCoordinator.getWorkstream({ workstreamId: target.workstreamId }),
      `load Workstream ${target.workstreamId}`,
    )
    if (workstream.state !== 'open') {
      throw new WorkCharterError('TARGET_NOT_FOUND', `Workstream ${target.workstreamId} is closed`, false, 'failed')
    }
    const memberships = await this.callScdp(
      () => this.sessionCoordinator.listWorkstreamSessions({ workstreamId: target.workstreamId }),
      `list Workstream ${target.workstreamId} members`,
    )
    const members = new Set(memberships.map(membership => membership.sessionId))
    for (const sessionId of roleSessionIds) {
      if (!members.has(sessionId)) {
        throw new WorkCharterError(
          'ROLE_UNAUTHORIZED',
          `Session ${sessionId} is not a member of Workstream ${target.workstreamId}`,
          false,
          'failed',
        )
      }
    }
  }

  private async acceptOrRecoverRecord(
    input: Parameters<SessionCoordinator['acceptCoordinationRecord']>[0],
  ): Promise<CoordinationRecordDto> {
    try {
      const record = (await this.sessionCoordinator.acceptCoordinationRecord(input)).record
      assertAcceptedRecordMatches(record, input)
      return record
    } catch (error) {
      if (error instanceof SessionCoordinatorError && error.state === 'unknown') {
        let record: CoordinationRecordDto
        try {
          record = await this.sessionCoordinator.getCoordinationRecord({ recordId: input.recordId })
        } catch (readError) {
          throw new WorkCharterError(
            'DELIVERY_STATE_UNKNOWN',
            `coordination record ${input.recordId} acceptance is unknown`,
            false,
            'unknown',
            { cause: readError },
          )
        }
        assertAcceptedRecordMatches(record, input)
        return record
      }
      throw mapScdpError(error, `accept coordination record ${input.recordId}`)
    }
  }

  private async processOrPreserveUnknown(
    accepted: CoordinationRecordDto,
    recipientSessionId: SessionId,
    wake: boolean,
  ): Promise<CoordinationRecordDto> {
    try {
      return (await this.sessionCoordinator.processCoordinationRecord({
        recordId: accepted.id,
        recipientSessionIds: [recipientSessionId],
        wake,
      })).record
    } catch {
      try {
        return await this.sessionCoordinator.getCoordinationRecord({ recordId: accepted.id })
      } catch {
        return withUnknownDelivery(accepted, recipientSessionId)
      }
    }
  }

  private async callScdp<T>(operation: () => Promise<T>, action: string): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      throw mapScdpError(error, action)
    }
  }
}

function appendNotice(current: WorkCharterDto, notice: WorkCharterNotice, now: string): WorkCharterDto {
  return mutateNoticeList(current, [...current.notices, notice], now)
}

function replaceNotice(
  current: WorkCharterDto,
  index: number,
  notice: WorkCharterNotice,
  now: string,
): WorkCharterDto {
  return mutateNoticeList(
    current,
    current.notices.map((candidate, candidateIndex) => candidateIndex === index ? notice : candidate),
    now,
  )
}

function mutateNoticeList(current: WorkCharterDto, notices: readonly WorkCharterNotice[], now: string): WorkCharterDto {
  if (current.revision === Number.MAX_SAFE_INTEGER) throw invalidTransition('Charter revision space is exhausted')
  return WorkCharterDtoSchema.parse({
    ...current,
    notices,
    revision: current.revision + 1,
    updatedAt: now,
  })
}

function requireExpectedRevisions(
  current: WorkCharterDto,
  expectedRevision: number,
  expectedAuthorityRevision: number,
): void {
  if (current.revision !== expectedRevision) {
    throw new WorkCharterError(
      'REVISION_CONFLICT',
      `expected Charter revision ${String(expectedRevision)}, current ${String(current.revision)}`,
      false,
      'failed',
    )
  }
  if (current.authority.revision !== expectedAuthorityRevision) {
    throw new WorkCharterError(
      'AUTHORITY_CONFLICT',
      `expected authority revision ${String(expectedAuthorityRevision)}, current ${String(current.authority.revision)}`,
      false,
      'failed',
    )
  }
}

function matchesCreateInput(existing: WorkCharterDto, input: CreateWorkCharterInput): boolean {
  return existing.state === 'draft'
    && existing.revision === 0
    && existing.writer === undefined
    && existing.decisions.length === 0
    && existing.notices.length === 0
    && existing.target.kind === input.target.kind
    && sameJson(existing.target, input.target)
    && existing.managedWorkstream === input.managedWorkstream
    && existing.protection === input.protection
    && sameJson(existing.authority, input.authority)
    && sameJson(existing.contract, input.contract)
    && sameJson(existing.roles, input.roles)
    && sameJson(existing.evidence, input.evidence)
}

function charterAppliesToSession(
  charter: WorkCharterDto,
  sessionId: SessionId,
  workstreamIds: ReadonlySet<WorkstreamId>,
): boolean {
  return charter.target.kind === 'session'
    ? charter.target.sessionId === sessionId
    : workstreamIds.has(charter.target.workstreamId)
}

function noticeMatchesInput(notice: WorkCharterNotice, input: SubmitWorkCharterNoticeInput): boolean {
  return notice.checkpoint === input.checkpoint
    && notice.fromSessionId === input.actorSessionId
    && notice.toSessionId === input.recipientSessionId
    && notice.transport.noticeRecordId === input.noticeRecordId
    && notice.transport.correlationId === input.correlationId
    && sameJson(notice.evidenceRefs, input.evidenceRefs)
}

function dispositionMatchesInput(notice: WorkCharterNotice, input: ReturnWorkCharterDispositionInput): boolean {
  const disposition = notice.disposition
  return disposition !== undefined
    && disposition.verdict === input.verdict
    && disposition.checkpoint === input.checkpoint
    && disposition.returnedBy === input.actorSessionId
    && disposition.nextAction === input.nextAction
    && disposition.decisionId === input.decisionId
    && notice.transport.dispositionRecordId === input.dispositionRecordId
}

function requireResultNoticeRoute(
  current: WorkCharterDto,
  input: SubmitWorkCharterNoticeInput,
): { readonly kind: 'writer' } | {
  readonly kind: 'standard-phase'
  readonly causationRecordId: CoordinationRecordId
} {
  const recipientIsControl = current.roles.some(role =>
    role.sessionId === input.recipientSessionId && role.role !== 'executor')
  if (current.writer?.sessionId === input.actorSessionId) {
    if (!recipientIsControl) {
      throw new WorkCharterError(
        'ROLE_UNAUTHORIZED',
        `Result Notice recipient ${input.recipientSessionId} is not an assigned assessment/control role`,
        false,
        'failed',
      )
    }
    return { kind: 'writer' }
  }

  const isStandardPhaseRoute = current.protection === 'standard-ope'
    && hasRole(current, input.actorSessionId, 'planner')
    && hasRole(current, input.recipientSessionId, 'orchestrator')
  if (!isStandardPhaseRoute) {
    throw new WorkCharterError(
      'ROLE_UNAUTHORIZED',
      'only the current writer, or the assigned Standard O/P/E Planner reporting to the Orchestrator, may submit a Result Notice',
      false,
      'failed',
    )
  }

  const acceptedExecutionNotice = latestWorkCharterNoticeForRoute(current, 'writer')
  if (acceptedExecutionNotice?.transport.dispositionRecordId === undefined) {
    throw invalidTransition('Planner phase Result Notice requires a prior accepted Executor Result Notice')
  }
  if (!hasRole(current, acceptedExecutionNotice.fromSessionId, 'executor')
    || (!hasRole(current, acceptedExecutionNotice.toSessionId, 'planner')
      && !hasRole(current, acceptedExecutionNotice.toSessionId, 'assessor'))
    || acceptedExecutionNotice.disposition?.verdict !== 'accepted'
    || acceptedExecutionNotice.disposition.returnedBy !== acceptedExecutionNotice.toSessionId) {
    throw invalidTransition('Planner phase Result Notice requires the latest Executor Result Notice to be accepted')
  }
  return {
    kind: 'standard-phase',
    causationRecordId: acceptedExecutionNotice.transport.dispositionRecordId,
  }
}

function hasRole(
  charter: WorkCharterDto,
  sessionId: SessionId,
  role: WorkCharterDto['roles'][number]['role'],
): boolean {
  return charter.roles.some(assignment => assignment.sessionId === sessionId && assignment.role === role)
}

function coordinationBody(value: Readonly<Record<string, unknown>>): string {
  const body = JSON.stringify(value)
  if (body.length > COORDINATION_RECORD_BODY_MAX_CHARS) {
    throw new WorkCharterError(
      'INVALID_INPUT',
      `coordination body exceeds ${String(COORDINATION_RECORD_BODY_MAX_CHARS)} characters`,
      false,
      'failed',
    )
  }
  return body
}

function deliveryStateFor(record: CoordinationRecordDto, sessionId: SessionId): CoordinationRecordDto['recipients'][number]['state'] {
  return record.recipients.find(recipient => recipient.sessionId === sessionId)?.state ?? 'unknown'
}

function withUnknownDelivery(record: CoordinationRecordDto, sessionId: SessionId): CoordinationRecordDto {
  const recipients = record.recipients.map(recipient => recipient.sessionId === sessionId
    ? {
        sessionId: recipient.sessionId,
        nativeMessageId: recipient.nativeMessageId,
        state: 'unknown' as const,
        attempts: recipient.attempts,
        updatedAt: recipient.updatedAt,
        failure: { code: 'UNKNOWN' as const, message: 'delivery state could not be re-read after processing failure' },
      }
    : recipient)
  return { ...record, recipients }
}

function assertAcceptedRecordMatches(
  record: CoordinationRecordDto,
  input: Parameters<SessionCoordinator['acceptCoordinationRecord']>[0],
): void {
  const intended = {
    id: input.recordId,
    workstreamId: input.workstreamId,
    correlationId: input.correlationId,
    ...(input.causationRecordId === undefined ? {} : { causationRecordId: input.causationRecordId }),
    fromSessionId: input.fromSessionId,
    address: input.address,
    ...(input.subject === undefined ? {} : { subject: input.subject }),
    content: input.content,
  }
  const accepted = {
    id: record.id,
    workstreamId: record.workstreamId,
    correlationId: record.correlationId,
    ...(record.causationRecordId === undefined ? {} : { causationRecordId: record.causationRecordId }),
    fromSessionId: record.fromSessionId,
    address: record.address,
    ...(record.subject === undefined ? {} : { subject: record.subject }),
    content: record.content,
  }
  if (!sameJson(accepted, intended)) {
    throw new WorkCharterError(
      'DISPOSITION_CONFLICT',
      `coordination record ${input.recordId} exists with different immutable content`,
      false,
      'failed',
    )
  }
}

function mapScdpError(error: unknown, action: string): WorkCharterError {
  if (error instanceof WorkCharterError) return error
  if (error instanceof SessionCoordinatorError) {
    if (error.code === 'WORKSTREAM_NOT_FOUND' || error.code === 'SESSION_NOT_FOUND') {
      return new WorkCharterError('TARGET_NOT_FOUND', `${action}: ${error.message}`, false, error.state, { cause: error })
    }
    return new WorkCharterError(
      'COORDINATION_UNAVAILABLE',
      `${action}: ${error.message}`,
      error.retryable,
      error.state,
      { cause: error },
    )
  }
  return new WorkCharterError('COORDINATION_UNAVAILABLE', `${action} failed`, false, 'unknown', { cause: error })
}

function invalidTransition(message: string): WorkCharterError {
  return new WorkCharterError('INVALID_TRANSITION', message, false, 'failed')
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
