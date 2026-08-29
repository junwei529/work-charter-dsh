import { describe, expect, it } from 'vitest'
import { parseSessionId, parseWorkstreamId } from 'session-coordinator-dsh'
import { applyWorkCharterTransition, createWorkCharterRecord, validateCoordination } from '../../src/policy.ts'
import {
  parseWorkCharterDecisionId,
  parseWorkCharterEvidenceId,
  parseWorkCharterId,
  WorkCharterEvidenceSchema,
  WorkCharterError,
  type CreateWorkCharterInput,
  type WorkCharterCommand,
  type WorkCharterDto,
  type WorkCharterErrorCode,
} from '../../src/types.ts'

const CONTROLLER = parseSessionId('session-controller')
const PLANNER = parseSessionId('session-planner')
const EXECUTOR = parseSessionId('session-executor')
const ASSESSOR = parseSessionId('session-assessor')
const OUTSIDER = parseSessionId('session-outsider')
const WORKSTREAM = parseWorkstreamId('ws_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
const CHARTER_ID = parseWorkCharterId('wc_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
const EVIDENCE_ID = parseWorkCharterEvidenceId('wce_cccccccc-cccc-4ccc-8ccc-cccccccccccc')
const DECISION_ID = parseWorkCharterDecisionId('wcd_dddddddd-dddd-4ddd-8ddd-dddddddddddd')

function contract(): CreateWorkCharterInput['contract'] {
  return {
    outcome: 'Deliver one bounded candidate.',
    nonGoals: ['No publication.'],
    scope: ['Candidate source.'],
    hardBoundaries: ['No external effects.'],
    confirmedContract: ['Exact outcome remains fixed.'],
    necessaryGuardrails: ['Preserve UNKNOWN.'],
    workingProposal: ['Use the smallest implementation.'],
    assumptions: [],
    acceptance: ['Required evidence passes.'],
    stopConditions: ['Authority is unknown.'],
  }
}

function singleAgentInput(): CreateWorkCharterInput {
  return {
    charterId: CHARTER_ID,
    target: { kind: 'session', sessionId: CONTROLLER },
    managedWorkstream: 'single agent candidate',
    protection: 'durable-single-agent',
    authority: {
      revision: 1,
      state: 'approved',
      reference: 'human-request:test',
      authorizedActions: ['edit candidate source'],
      prohibitedActions: ['publish'],
    },
    contract: contract(),
    roles: [{ role: 'controller', sessionId: CONTROLLER }],
    evidence: [],
  }
}

function plannerExecutorInput(): CreateWorkCharterInput {
  return {
    ...singleAgentInput(),
    target: { kind: 'workstream', workstreamId: WORKSTREAM },
    managedWorkstream: 'planner executor candidate',
    protection: 'planner-executor',
    roles: [
      { role: 'planner', sessionId: PLANNER },
      { role: 'executor', sessionId: EXECUTOR },
      { role: 'assessor', sessionId: ASSESSOR },
    ],
    evidence: [{
      id: EVIDENCE_ID,
      description: 'Run the exact one-shot acceptance probe.',
      subject: 'candidate revision',
      expectedRevision: 'candidate-r1',
      invalidationCondition: 'candidate source changes',
      mode: 'one-shot',
      required: true,
      state: 'pending',
    }],
  }
}

function runtime(): { readonly now: () => string } {
  let tick = 0
  return {
    now: (): string => `2026-08-29T00:00:${String(tick++).padStart(2, '0')}.000Z`,
  }
}

function transition(
  charter: WorkCharterDto,
  actorSessionId: ReturnType<typeof parseSessionId>,
  command: WorkCharterCommand,
  clock: ReturnType<typeof runtime>,
): WorkCharterDto {
  return applyWorkCharterTransition(charter, {
    charterId: charter.id,
    expectedRevision: charter.revision,
    expectedAuthorityRevision: charter.authority.revision,
    actorSessionId,
    command,
  }, clock).charter
}

function expectCode(operation: () => unknown, code: WorkCharterErrorCode): void {
  try {
    operation()
    throw new Error(`expected WorkCharterError ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(WorkCharterError)
    expect((error as WorkCharterError).code).toBe(code)
  }
}

describe('Work Charter policy', () => {
  it('requires independent Planner and Executor roles for a Workstream Charter', () => {
    expectCode(() => {
      validateCoordination(
        { kind: 'workstream', workstreamId: WORKSTREAM },
        'planner-executor',
        [
          { role: 'planner', sessionId: PLANNER },
          { role: 'executor', sessionId: PLANNER },
        ],
      )
    }, 'INVALID_INPUT')
  })

  it('activates only with an eligible writer and rejects stale compare-and-set revisions', () => {
    const clock = runtime()
    let charter = createWorkCharterRecord(singleAgentInput(), clock)
    expectCode(() => {
      transition(charter, CONTROLLER, { kind: 'activate' }, clock)
    }, 'WRITER_CONFLICT')

    charter = transition(charter, CONTROLLER, { kind: 'assign-writer', sessionId: CONTROLLER }, clock)
    charter = transition(charter, CONTROLLER, { kind: 'activate' }, clock)
    expect(charter.state).toBe('active')

    expectCode(() => {
      applyWorkCharterTransition(charter, {
        charterId: charter.id,
        expectedRevision: charter.revision - 1,
        expectedAuthorityRevision: charter.authority.revision,
        actorSessionId: CONTROLLER,
        command: { kind: 'pause', reason: 'stale caller' },
      }, clock)
    }, 'REVISION_CONFLICT')

    expectCode(() => {
      transition(charter, OUTSIDER, { kind: 'pause', reason: 'not assigned' }, clock)
    }, 'ROLE_UNAUTHORIZED')
  })

  it('preserves one-shot consumption and prevents replacement or replay', () => {
    const clock = runtime()
    let charter = createWorkCharterRecord(plannerExecutorInput(), clock)
    charter = transition(charter, PLANNER, { kind: 'assign-writer', sessionId: EXECUTOR }, clock)
    charter = transition(charter, PLANNER, { kind: 'activate' }, clock)
    const consumedAt = '2026-08-29T00:01:00.000Z'
    charter = transition(charter, EXECUTOR, {
      kind: 'record-evidence',
      evidenceId: EVIDENCE_ID,
      state: 'failed',
      observedRevision: 'candidate-r1',
      evidenceRef: 'probe:attempt-1',
      consumedAt,
    }, clock)
    expect(charter.evidence[0]?.consumedAt).toBe(consumedAt)

    expectCode(() => {
      transition(charter, EXECUTOR, {
        kind: 'record-evidence',
        evidenceId: EVIDENCE_ID,
        state: 'passed',
        observedRevision: 'candidate-r1',
        evidenceRef: 'probe:attempt-2',
        consumedAt: '2026-08-29T00:02:00.000Z',
      }, clock)
    }, 'INVALID_TRANSITION')

    charter = transition(charter, EXECUTOR, { kind: 'pause', reason: 'one-shot probe failed' }, clock)
    const consumedEvidence = charter.evidence[0]
    if (consumedEvidence === undefined) throw new Error('expected consumed evidence')
    expectCode(() => {
      transition(charter, PLANNER, {
        kind: 'revise-contract',
        authority: { ...charter.authority, revision: 2 },
        contract: charter.contract,
        evidence: [{
          ...consumedEvidence,
          state: 'passed',
          evidenceRef: 'probe:forged-replacement',
        }],
      }, clock)
    }, 'INVALID_TRANSITION')
    expectCode(() => {
      transition(charter, PLANNER, {
        kind: 'revise-contract',
        authority: { ...charter.authority, revision: 2 },
        contract: charter.contract,
        evidence: [],
      }, clock)
    }, 'INVALID_TRANSITION')
  })

  it('rejects pending one-shot evidence that is already marked consumed', () => {
    const parsed = WorkCharterEvidenceSchema.safeParse({
      id: EVIDENCE_ID,
      description: 'Run the exact one-shot acceptance probe.',
      subject: 'candidate revision',
      expectedRevision: 'candidate-r1',
      invalidationCondition: 'candidate source changes',
      mode: 'one-shot',
      required: true,
      state: 'pending',
      consumedAt: '2026-08-29T00:01:00.000Z',
    })
    expect(parsed.success).toBe(false)
  })

  it('keeps decisions with their semantic owner and blocks resume while one is open', () => {
    const clock = runtime()
    let charter = createWorkCharterRecord(plannerExecutorInput(), clock)
    charter = transition(charter, PLANNER, { kind: 'assign-writer', sessionId: EXECUTOR }, clock)
    charter = transition(charter, PLANNER, { kind: 'activate' }, clock)
    charter = transition(charter, EXECUTOR, {
      kind: 'open-decision',
      decisionId: DECISION_ID,
      question: 'May acceptance scope expand?',
      ownerSessionId: PLANNER,
    }, clock)
    charter = transition(charter, EXECUTOR, { kind: 'pause', reason: 'decision required' }, clock)

    expectCode(() => {
      transition(charter, EXECUTOR, {
        kind: 'resolve-decision',
        decisionId: DECISION_ID,
        state: 'resolved',
        resolution: 'No.',
        authorityRef: 'planner:test',
      }, clock)
    }, 'ROLE_UNAUTHORIZED')
    expectCode(() => {
      transition(charter, PLANNER, { kind: 'resume' }, clock)
    }, 'OPEN_DECISION')

    charter = transition(charter, PLANNER, {
      kind: 'resolve-decision',
      decisionId: DECISION_ID,
      state: 'resolved',
      resolution: 'No scope expansion.',
      authorityRef: 'planner:test',
    }, clock)
    charter = transition(charter, PLANNER, { kind: 'resume' }, clock)
    expect(charter.state).toBe('active')
  })

  it('persists revoked authority while paused and keeps resume fail-closed', () => {
    const clock = runtime()
    let charter = createWorkCharterRecord(singleAgentInput(), clock)
    charter = transition(charter, CONTROLLER, { kind: 'assign-writer', sessionId: CONTROLLER }, clock)
    charter = transition(charter, CONTROLLER, { kind: 'activate' }, clock)
    charter = transition(charter, CONTROLLER, { kind: 'pause', reason: 'authority revoked' }, clock)
    charter = transition(charter, CONTROLLER, {
      kind: 'revise-contract',
      authority: { ...charter.authority, revision: 2, state: 'revoked' },
      contract: charter.contract,
      evidence: charter.evidence,
    }, clock)

    expect(charter.state).toBe('paused')
    expect(charter.authority.state).toBe('revoked')
    expectCode(() => {
      transition(charter, CONTROLLER, { kind: 'resume' }, clock)
    }, 'AUTHORITY_CONFLICT')
  })

  it('prevents Executor self-acceptance and atomically releases the writer on accepted close', () => {
    const clock = runtime()
    let charter = createWorkCharterRecord(plannerExecutorInput(), clock)
    charter = transition(charter, PLANNER, { kind: 'assign-writer', sessionId: EXECUTOR }, clock)
    charter = transition(charter, PLANNER, { kind: 'activate' }, clock)
    charter = transition(charter, EXECUTOR, {
      kind: 'record-evidence',
      evidenceId: EVIDENCE_ID,
      state: 'passed',
      observedRevision: 'candidate-r1',
      evidenceRef: 'probe:accepted',
      consumedAt: '2026-08-29T00:03:00.000Z',
    }, clock)
    expectCode(() => {
      transition(charter, EXECUTOR, { kind: 'close', outcome: 'accepted', assessmentRef: 'self' }, clock)
    }, 'ROLE_UNAUTHORIZED')
    expectCode(() => {
      transition(charter, EXECUTOR, { kind: 'release-writer' }, clock)
    }, 'INVALID_TRANSITION')

    charter = transition(charter, ASSESSOR, {
      kind: 'close', outcome: 'accepted', assessmentRef: 'assessment:1',
    }, clock)
    expect(charter.state).toBe('closed')
    expect(charter.writer).toBeUndefined()
    expect(charter.close?.closedBy).toBe(ASSESSOR)
  })

  it('rejects accepted close before the Charter has been activated', () => {
    const clock = runtime()
    const charter = createWorkCharterRecord(singleAgentInput(), clock)
    expectCode(() => {
      transition(charter, CONTROLLER, {
        kind: 'close', outcome: 'accepted', assessmentRef: 'draft-self-acceptance',
      }, clock)
    }, 'INVALID_TRANSITION')
  })
})
