import { describe, expect, it } from 'vitest'
import {
  SessionCoordinatorError,
  parseCoordinationRecordId,
  parseCorrelationId,
  parseSessionId,
  parseWorkstreamId,
  type AcceptCoordinationRecordInput,
  type CoordinationRecordDto,
  type SessionCoordinator,
  type SessionId,
} from 'session-coordinator-dsh'
import { WorkCharterCoordinator } from '../../src/coordinator.ts'
import type { WorkCharterDomain } from '../../src/storage.ts'
import {
  parseWorkCharterId,
  parseWorkCharterDecisionId,
  parseWorkCharterNoticeId,
  WorkCharterError,
  type WorkCharterDto,
  type WorkCharterErrorCode,
} from '../../src/types.ts'

const PLANNER = parseSessionId('planner')
const EXECUTOR = parseSessionId('executor')
const ASSESSOR = parseSessionId('assessor')
const ORCHESTRATOR = parseSessionId('orchestrator')
const WORKSTREAM = parseWorkstreamId('ws_11111111-1111-4111-8111-111111111111')
const CHARTER_ID = parseWorkCharterId('wc_22222222-2222-4222-8222-222222222222')
const DECISION_ID = parseWorkCharterDecisionId('wcd_77777777-7777-4777-8777-777777777777')
const NOTICE_ID = parseWorkCharterNoticeId('wcn_33333333-3333-4333-8333-333333333333')
const NOTICE_RECORD_ID = parseCoordinationRecordId('rec_44444444-4444-4444-8444-444444444444')
const DISPOSITION_RECORD_ID = parseCoordinationRecordId('rec_55555555-5555-4555-8555-555555555555')
const PHASE_NOTICE_ID = parseWorkCharterNoticeId('wcn_33333333-3333-4333-8333-333333333334')
const PHASE_NOTICE_RECORD_ID = parseCoordinationRecordId('rec_44444444-4444-4444-8444-444444444445')
const PHASE_DISPOSITION_RECORD_ID = parseCoordinationRecordId('rec_55555555-5555-4555-8555-555555555556')
const CORRECTED_NOTICE_ID = parseWorkCharterNoticeId('wcn_33333333-3333-4333-8333-333333333335')
const CORRECTED_NOTICE_RECORD_ID = parseCoordinationRecordId('rec_44444444-4444-4444-8444-444444444446')
const CORRECTED_DISPOSITION_RECORD_ID = parseCoordinationRecordId('rec_55555555-5555-4555-8555-555555555557')
const CORRELATION_ID = parseCorrelationId('cor_66666666-6666-4666-8666-666666666666')
const NOW = '2026-08-29T01:00:00.000Z'

interface FakeDomainControl {
  readonly domain: WorkCharterDomain
  readonly rows: Map<string, WorkCharterDto>
  failNextPut: boolean
}

interface FakeScdpControl {
  readonly service: SessionCoordinator
  readonly accepted: AcceptCoordinationRecordInput[]
  readonly records: Map<string, CoordinationRecordDto>
  readonly members: Set<SessionId>
  acceptUnknown: boolean
  membershipLookupFails: boolean
  recoveredConflict: boolean
  recoverUnavailable: boolean
}

function fakeDomain(): FakeDomainControl {
  const rows = new Map<string, WorkCharterDto>()
  const control: FakeDomainControl = {
    rows,
    failNextPut: false,
    domain: undefined as unknown as WorkCharterDomain,
  }
  const table = {
    get(key: string): WorkCharterDto | undefined { return rows.get(key) },
    entries(): IterableIterator<[string, WorkCharterDto]> { return rows.entries() },
    async put(key: string, value: WorkCharterDto): Promise<void> {
      await Promise.resolve()
      if (control.failNextPut) {
        control.failNextPut = false
        throw new Error('simulated storage rejection')
      }
      rows.set(key, value)
    },
  }
  ;(control as { domain: WorkCharterDomain }).domain = {
    table: () => table,
  } as unknown as WorkCharterDomain
  return control
}

function fakeScdp(): FakeScdpControl {
  const accepted: AcceptCoordinationRecordInput[] = []
  const records = new Map<string, CoordinationRecordDto>()
  const members = new Set<SessionId>([ORCHESTRATOR, PLANNER, EXECUTOR, ASSESSOR])
  const control: FakeScdpControl = {
    accepted,
    records,
    members,
    acceptUnknown: false,
    membershipLookupFails: false,
    recoveredConflict: false,
    recoverUnavailable: false,
    service: undefined as unknown as SessionCoordinator,
  }
  const service = {
    health: async (): ReturnType<SessionCoordinator['health']> => {
      await Promise.resolve()
      return {
        service: 'session-coordinator-dsh' as const,
        status: 'ok' as const,
        contractVersion: 3 as const,
        storage: { schemaVersion: 2 as const, state: 'ready' as const },
      }
    },
    getWorkstream: async (): ReturnType<SessionCoordinator['getWorkstream']> => {
      await Promise.resolve()
      return {
        id: WORKSTREAM, title: 'test', state: 'open' as const, revision: 0, createdAt: NOW, updatedAt: NOW,
      }
    },
    listWorkstreamSessions: async (): ReturnType<SessionCoordinator['listWorkstreamSessions']> => {
      await Promise.resolve()
      if (control.membershipLookupFails) throw new Error('simulated membership lookup failure')
      return [...control.members].map(sessionId => ({
        workstreamId: WORKSTREAM, sessionId, attachedAt: NOW,
      }))
    },
    listSessionWorkstreams: async (
      { sessionId }: { sessionId: string },
    ): ReturnType<SessionCoordinator['listSessionWorkstreams']> => {
      await Promise.resolve()
      return control.members.has(parseSessionId(sessionId))
        ? [{ workstreamId: WORKSTREAM, sessionId: parseSessionId(sessionId), attachedAt: NOW }]
        : []
    },
    acceptCoordinationRecord: async (
      input: AcceptCoordinationRecordInput,
    ): ReturnType<SessionCoordinator['acceptCoordinationRecord']> => {
      await Promise.resolve()
      accepted.push(input)
      const record = recordFrom(input)
      records.set(record.id, record)
      if (control.acceptUnknown) {
        throw new SessionCoordinatorError('MUTATION_STATE_UNKNOWN', 'simulated unknown acceptance', false, 'unknown')
      }
      return { record, changed: true }
    },
    getCoordinationRecord: async (
      { recordId }: { recordId: string },
    ): ReturnType<SessionCoordinator['getCoordinationRecord']> => {
      await Promise.resolve()
      if (control.recoverUnavailable) throw new Error('simulated recovery read failure')
      const record = records.get(recordId)
      if (record === undefined) throw new SessionCoordinatorError('RECORD_NOT_FOUND', 'missing', false, 'failed')
      if (!control.recoveredConflict) return record
      return { ...record, subject: 'conflicting immutable subject' }
    },
    processCoordinationRecord: async (
      { recordId }: { recordId: string },
    ): ReturnType<SessionCoordinator['processCoordinationRecord']> => {
      await Promise.resolve()
      const current = records.get(recordId)
      if (current === undefined) throw new SessionCoordinatorError('RECORD_NOT_FOUND', 'missing', false, 'failed')
      const record: CoordinationRecordDto = {
        ...current,
        recipients: current.recipients.map(recipient => ({
          ...recipient,
          state: 'delivered' as const,
          attempts: 1,
          deliveredAt: NOW,
          proof: { kind: 'inbox' as const, eventSeq: 1, eventTime: NOW },
        })),
        revision: current.revision + 1,
      }
      records.set(record.id, record)
      return { record, attemptedSessionIds: record.recipients.map(row => row.sessionId) }
    },
  }
  ;(control as { service: SessionCoordinator }).service = service as unknown as SessionCoordinator
  return control
}

function recordFrom(input: AcceptCoordinationRecordInput): CoordinationRecordDto {
  const recipient = input.address.kind === 'session' ? input.address.sessionId : PLANNER
  return {
    id: input.recordId,
    workstreamId: input.workstreamId,
    correlationId: input.correlationId,
    ...(input.causationRecordId === undefined ? {} : { causationRecordId: input.causationRecordId }),
    fromSessionId: input.fromSessionId,
    address: input.address,
    ...(input.subject === undefined ? {} : { subject: input.subject }),
    content: input.content,
    recipients: [{
      sessionId: recipient,
      nativeMessageId: `session-coordinator-dsh:${input.recordId}`,
      state: 'pending',
      attempts: 0,
      updatedAt: NOW,
    }],
    revision: 0,
    acceptedAt: NOW,
    updatedAt: NOW,
  }
}

function coordinatorFixture(): {
  readonly coordinator: WorkCharterCoordinator
  readonly storage: FakeDomainControl
  readonly scdp: FakeScdpControl
} {
  const storage = fakeDomain()
  const scdp = fakeScdp()
  let tick = 0
  const coordinator = new WorkCharterCoordinator(
    storage.domain,
    scdp.service,
    { get: (): Record<string, never> => ({}) } as never,
    { now: (): string => `2026-08-29T01:00:${String(tick++).padStart(2, '0')}.000Z` },
  )
  return { coordinator, storage, scdp }
}

async function activeCharter(
  coordinator: WorkCharterCoordinator,
  protection: 'planner-executor' | 'standard-ope' = 'planner-executor',
): Promise<WorkCharterDto> {
  let result = await coordinator.createCharter({
    charterId: CHARTER_ID,
    target: { kind: 'workstream', workstreamId: WORKSTREAM },
    managedWorkstream: 'notice integration',
    protection,
    authority: {
      revision: 1,
      state: 'approved',
      reference: 'human:test',
      authorizedActions: ['implementation'],
      prohibitedActions: ['publication'],
    },
    contract: {
      outcome: 'Produce one accepted result.', nonGoals: [], scope: [], hardBoundaries: [],
      confirmedContract: ['one result'], necessaryGuardrails: ['no self acceptance'],
      workingProposal: [], assumptions: [], acceptance: ['planner disposition'], stopConditions: [],
    },
    roles: [
      ...(protection === 'standard-ope' ? [{ role: 'orchestrator' as const, sessionId: ORCHESTRATOR }] : []),
      { role: 'planner', sessionId: PLANNER },
      { role: 'executor', sessionId: EXECUTOR },
      { role: 'assessor', sessionId: ASSESSOR },
    ],
    evidence: [],
  })
  result = await coordinator.transitionCharter({
    charterId: result.charter.id,
    expectedRevision: result.charter.revision,
    expectedAuthorityRevision: result.charter.authority.revision,
    actorSessionId: PLANNER,
    command: { kind: 'assign-writer', sessionId: EXECUTOR },
  })
  result = await coordinator.transitionCharter({
    charterId: result.charter.id,
    expectedRevision: result.charter.revision,
    expectedAuthorityRevision: result.charter.authority.revision,
    actorSessionId: PLANNER,
    command: { kind: 'activate' },
  })
  return result.charter
}

async function expectRejectCode(operation: Promise<unknown>, code: WorkCharterErrorCode): Promise<void> {
  try {
    await operation
    throw new Error(`expected WorkCharterError ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(WorkCharterError)
    expect((error as WorkCharterError).code).toBe(code)
  }
}

describe('Work Charter scdp coordination', () => {
  it('rejects every transition attempt by a detached Workstream role', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator)
    scdp.members.delete(PLANNER)
    scdp.members.delete(EXECUTOR)

    const attempts = [
      coordinator.transitionCharter({
        charterId: charter.id,
        expectedRevision: charter.revision,
        expectedAuthorityRevision: charter.authority.revision,
        actorSessionId: PLANNER,
        command: { kind: 'pause', reason: 'detached Planner must not pause' },
      }),
      coordinator.transitionCharter({
        charterId: charter.id,
        expectedRevision: charter.revision,
        expectedAuthorityRevision: charter.authority.revision,
        actorSessionId: EXECUTOR,
        command: { kind: 'update-proposal', workingProposal: ['stale writer change'], assumptions: [] },
      }),
      coordinator.transitionCharter({
        charterId: charter.id,
        expectedRevision: charter.revision,
        expectedAuthorityRevision: charter.authority.revision,
        actorSessionId: EXECUTOR,
        command: {
          kind: 'open-decision',
          decisionId: DECISION_ID,
          question: 'Should a detached writer retain authority?',
          ownerSessionId: PLANNER,
        },
      }),
      coordinator.transitionCharter({
        charterId: charter.id,
        expectedRevision: charter.revision,
        expectedAuthorityRevision: charter.authority.revision,
        actorSessionId: PLANNER,
        command: { kind: 'close', outcome: 'not-accepted', assessmentRef: 'detached:must-not-close' },
      }),
    ]
    for (const attempt of attempts) await expectRejectCode(attempt, 'ROLE_UNAUTHORIZED')

    expect((await coordinator.getCharter({ charterId: charter.id })).revision).toBe(charter.revision)
  })

  it('fails closed when current Workstream membership cannot be revalidated', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator)
    scdp.membershipLookupFails = true

    await expectRejectCode(coordinator.transitionCharter({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: PLANNER,
      command: { kind: 'pause', reason: 'membership lookup unavailable' },
    }), 'COORDINATION_UNAVAILABLE')
    expect((await coordinator.getCharter({ charterId: charter.id })).revision).toBe(charter.revision)
  })

  it('blocks Result Notice submission while a material decision remains open', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    let charter = await activeCharter(coordinator)
    const opened = await coordinator.transitionCharter({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      command: {
        kind: 'open-decision',
        decisionId: DECISION_ID,
        question: 'Which accepted direction should the writer implement?',
        ownerSessionId: PLANNER,
      },
    })
    charter = opened.charter

    await expectRejectCode(coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-complete',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:blocked-by-open-decision'],
      wake: false,
    }), 'OPEN_DECISION')
    expect(scdp.accepted).toHaveLength(0)
    expect((await coordinator.getCharter({ charterId: charter.id })).revision).toBe(charter.revision)
  })

  it('persists an idempotent Result Notice and one causally linked disposition', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    let charter = await activeCharter(coordinator)
    const noticeInput = {
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-complete',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:9-pass'],
      wake: false,
    } as const
    let result = await coordinator.submitResultNotice(noticeInput)
    expect(result.charter.notices[0]?.transport.deliveryState).toBe('delivered')
    expect(scdp.accepted).toHaveLength(1)
    expect(scdp.accepted[0]?.content.body).toContain('"schema":"work-charter-dsh/result-notice/v1"')

    const duplicate = await coordinator.submitResultNotice({
      ...noticeInput,
      expectedRevision: result.charter.revision,
    })
    expect(duplicate.changed).toBe(false)
    expect(scdp.accepted).toHaveLength(1)

    await expectRejectCode(coordinator.submitResultNotice({
      ...noticeInput,
      expectedRevision: result.charter.revision,
      noticeId: CORRECTED_NOTICE_ID,
      noticeRecordId: CORRECTED_NOTICE_RECORD_ID,
    }), 'DISPOSITION_CONFLICT')
    await expectRejectCode(coordinator.submitResultNotice({
      ...noticeInput,
      expectedRevision: result.charter.revision,
      noticeId: CORRECTED_NOTICE_ID,
      noticeRecordId: CORRECTED_NOTICE_RECORD_ID,
      checkpoint: 'implementation-follow-up',
    }), 'INVALID_TRANSITION')
    expect(scdp.accepted).toHaveLength(1)

    charter = result.charter
    await expectRejectCode(coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: ASSESSOR,
      noticeId: NOTICE_ID,
      dispositionRecordId: DISPOSITION_RECORD_ID,
      verdict: 'accepted',
      checkpoint: 'implementation-complete',
      wake: false,
    }), 'ROLE_UNAUTHORIZED')

    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: NOTICE_ID,
      dispositionRecordId: DISPOSITION_RECORD_ID,
      verdict: 'accepted',
      checkpoint: 'implementation-complete',
      wake: false,
    })
    expect(result.charter.notices[0]?.disposition?.verdict).toBe('accepted')
    expect(scdp.accepted[1]?.causationRecordId).toBe(NOTICE_RECORD_ID)
    expect(scdp.accepted[1]?.content.body).toContain('"schema":"work-charter-dsh/disposition/v1"')
  })

  it('blocks accepted close after correction and accepts a later corrected checkpoint', async () => {
    const { coordinator } = coordinatorFixture()
    const charter = await activeCharter(coordinator)
    let result = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-complete',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:first-attempt'],
      wake: false,
    })
    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: NOTICE_ID,
      dispositionRecordId: DISPOSITION_RECORD_ID,
      verdict: 'correction-required',
      checkpoint: 'implementation-complete',
      nextAction: 'submit corrected checkpoint',
      wake: false,
    })

    await expectRejectCode(coordinator.transitionCharter({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      command: { kind: 'close', outcome: 'accepted', assessmentRef: 'assessment:premature' },
    }), 'INVALID_TRANSITION')

    result = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: CORRECTED_NOTICE_ID,
      noticeRecordId: CORRECTED_NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-corrected',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:corrected-attempt'],
      wake: false,
    })
    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: CORRECTED_NOTICE_ID,
      dispositionRecordId: CORRECTED_DISPOSITION_RECORD_ID,
      verdict: 'accepted',
      checkpoint: 'implementation-corrected',
      wake: false,
    })
    result = await coordinator.transitionCharter({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      command: { kind: 'close', outcome: 'accepted', assessmentRef: 'assessment:corrected' },
    })
    expect(result.charter.state).toBe('closed')
    expect(result.charter.notices.map(notice => notice.disposition?.verdict)).toEqual([
      'correction-required',
      'accepted',
    ])
  })

  it('rejects a disposition after a non-accepted close makes the Charter terminal', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    let charter = await activeCharter(coordinator)
    const notice = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-complete',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:pending-assessment'],
      wake: false,
    })
    const closed = await coordinator.transitionCharter({
      charterId: charter.id,
      expectedRevision: notice.charter.revision,
      expectedAuthorityRevision: notice.charter.authority.revision,
      actorSessionId: PLANNER,
      command: { kind: 'close', outcome: 'not-accepted', assessmentRef: 'assessment:rejected' },
    })
    charter = closed.charter

    await expectRejectCode(coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: NOTICE_ID,
      dispositionRecordId: DISPOSITION_RECORD_ID,
      verdict: 'correction-required',
      checkpoint: 'implementation-complete',
      wake: false,
    }), 'INVALID_TRANSITION')
    expect(scdp.accepted).toHaveLength(1)
    expect((await coordinator.getCharter({ charterId: charter.id })).revision).toBe(charter.revision)
  })

  it('routes an accepted Standard O/P/E phase Result Notice from Planner to Orchestrator', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator, 'standard-ope')
    let result = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-complete',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:execution-pass'],
      wake: false,
    })
    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: NOTICE_ID,
      dispositionRecordId: DISPOSITION_RECORD_ID,
      verdict: 'accepted',
      checkpoint: 'implementation-complete',
      wake: false,
    })

    result = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: PHASE_NOTICE_ID,
      noticeRecordId: PHASE_NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'phase-accepted',
      recipientSessionId: ORCHESTRATOR,
      evidenceRefs: ['test:planner-assessment'],
      wake: false,
    })
    expect(result.charter.notices[1]?.transport.deliveryState).toBe('delivered')
    expect(scdp.accepted[2]?.causationRecordId).toBe(DISPOSITION_RECORD_ID)
    expect(scdp.accepted[2]?.content.body).toContain('"schema":"work-charter-dsh/phase-result-notice/v1"')

    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: ORCHESTRATOR,
      noticeId: PHASE_NOTICE_ID,
      dispositionRecordId: PHASE_DISPOSITION_RECORD_ID,
      verdict: 'accepted',
      checkpoint: 'phase-accepted',
      wake: false,
    })
    expect(result.charter.notices[1]?.disposition?.verdict).toBe('accepted')
    expect(scdp.accepted[3]?.causationRecordId).toBe(PHASE_NOTICE_RECORD_ID)
    expect(scdp.accepted[3]?.content.body).toContain('"schema":"work-charter-dsh/phase-disposition/v1"')
  })

  it('rejects a Standard O/P/E phase Result Notice before an execution result is accepted', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator, 'standard-ope')
    await expectRejectCode(coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: PHASE_NOTICE_ID,
      noticeRecordId: PHASE_NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'phase-accepted',
      recipientSessionId: ORCHESTRATOR,
      evidenceRefs: [],
      wake: false,
    }), 'INVALID_TRANSITION')
    expect(scdp.accepted).toHaveLength(0)
  })

  it('rejects a Standard O/P/E phase Result Notice when the latest execution result needs correction', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator, 'standard-ope')
    let result = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-first',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:first-pass'],
      wake: false,
    })
    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: NOTICE_ID,
      dispositionRecordId: DISPOSITION_RECORD_ID,
      verdict: 'accepted',
      checkpoint: 'implementation-first',
      wake: false,
    })
    result = await coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: CORRECTED_NOTICE_ID,
      noticeRecordId: CORRECTED_NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'implementation-second',
      recipientSessionId: PLANNER,
      evidenceRefs: ['test:second-needs-correction'],
      wake: false,
    })
    result = await coordinator.returnDisposition({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: CORRECTED_NOTICE_ID,
      dispositionRecordId: CORRECTED_DISPOSITION_RECORD_ID,
      verdict: 'correction-required',
      checkpoint: 'implementation-second',
      wake: false,
    })

    await expectRejectCode(coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: result.charter.revision,
      expectedAuthorityRevision: result.charter.authority.revision,
      actorSessionId: PLANNER,
      noticeId: PHASE_NOTICE_ID,
      noticeRecordId: PHASE_NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'phase-accepted',
      recipientSessionId: ORCHESTRATOR,
      evidenceRefs: ['test:must-not-bypass-latest-correction'],
      wake: false,
    }), 'INVALID_TRANSITION')
    expect(scdp.accepted).toHaveLength(4)
  })

  it('fails closed when an unknown accept reopens a conflicting immutable record', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator)
    scdp.acceptUnknown = true
    scdp.recoveredConflict = true
    await expectRejectCode(coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'checkpoint',
      recipientSessionId: PLANNER,
      evidenceRefs: [],
      wake: false,
    }), 'DISPOSITION_CONFLICT')
  })

  it('preserves UNKNOWN when an unknown accept cannot be reopened', async () => {
    const { coordinator, scdp } = coordinatorFixture()
    const charter = await activeCharter(coordinator)
    scdp.acceptUnknown = true
    scdp.recoverUnavailable = true
    await expectRejectCode(coordinator.submitResultNotice({
      charterId: charter.id,
      expectedRevision: charter.revision,
      expectedAuthorityRevision: charter.authority.revision,
      actorSessionId: EXECUTOR,
      noticeId: NOTICE_ID,
      noticeRecordId: NOTICE_RECORD_ID,
      correlationId: CORRELATION_ID,
      checkpoint: 'checkpoint',
      recipientSessionId: PLANNER,
      evidenceRefs: [],
      wake: false,
    }), 'DELIVERY_STATE_UNKNOWN')
  })

  it('preserves UNKNOWN when the Charter storage write is rejected', async () => {
    const { coordinator, storage } = coordinatorFixture()
    storage.failNextPut = true
    await expectRejectCode(coordinator.createCharter({
      charterId: CHARTER_ID,
      target: { kind: 'workstream', workstreamId: WORKSTREAM },
      managedWorkstream: 'storage failure',
      protection: 'planner-executor',
      authority: { revision: 1, state: 'proposed', authorizedActions: [], prohibitedActions: [] },
      contract: {
        outcome: 'test', nonGoals: [], scope: [], hardBoundaries: [], confirmedContract: [],
        necessaryGuardrails: [], workingProposal: [], assumptions: [], acceptance: [], stopConditions: [],
      },
      roles: [{ role: 'planner', sessionId: PLANNER }, { role: 'executor', sessionId: EXECUTOR }],
      evidence: [],
    }), 'MUTATION_STATE_UNKNOWN')
  })
})
