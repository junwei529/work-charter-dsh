import { describe, expect, it } from 'vitest'
import { parseSessionId } from 'session-coordinator-dsh'
import { renderWorkCharterContext, WORK_CHARTER_CONTEXT_MAX_CHARS } from '../../src/model-context.ts'
import { createWorkCharterRecord } from '../../src/policy.ts'
import { parseWorkCharterId } from '../../src/types.ts'

const SESSION = parseSessionId('session-context')

function draft(): ReturnType<typeof createWorkCharterRecord> {
  return createWorkCharterRecord({
    charterId: parseWorkCharterId('wc_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
    target: { kind: 'session', sessionId: SESSION },
    managedWorkstream: 'context projection',
    protection: 'current-task',
    authority: {
      revision: 1,
      state: 'approved',
      reference: 'human:test',
      authorizedActions: ['edit'],
      prohibitedActions: ['publish'],
    },
    contract: {
      outcome: 'Build one candidate.',
      nonGoals: [],
      scope: ['source'],
      hardBoundaries: ['no publication'],
      confirmedContract: ['one candidate'],
      necessaryGuardrails: ['preserve UNKNOWN'],
      workingProposal: ['small implementation'],
      assumptions: [],
      acceptance: ['independent review'],
      stopConditions: ['authority unknown'],
    },
    roles: [{ role: 'controller', sessionId: SESSION }],
    evidence: [],
  }, { now: () => '2026-08-29T00:00:00.000Z' })
}

describe('model-visible Work Charter context', () => {
  it('omits inactive drafts', () => {
    expect(renderWorkCharterContext({ sessionId: SESSION, charters: [draft()] })).toBe('')
  })

  it('renders active authority, role, contract, and permission disclaimer', () => {
    const charter = {
      ...draft(),
      state: 'active' as const,
      revision: 2,
      writer: {
        sessionId: SESSION,
        assignedBy: SESSION,
        assignedAt: '2026-08-29T00:00:01.000Z',
      },
    }
    const text = renderWorkCharterContext({ sessionId: SESSION, charters: [charter] })
    expect(text).toContain('Host-authoritative policy state')
    expect(text).toContain('does not grant DSH, filesystem, Git, network')
    expect(text).toContain('Confirmed contract: one candidate')
    expect(text).toContain(`Current writer: ${SESSION}`)
  })

  it('preserves coordination uncertainty for a locally assigned Charter', () => {
    const text = renderWorkCharterContext({
      sessionId: SESSION,
      charters: [],
      coordinationState: 'unknown',
      coordinationMessage: 'membership lookup failed',
    })
    expect(text).toContain('Coordination state: UNKNOWN')
    expect(text).toContain('Do not infer that no Charter applies')
  })

  it('bounds model context size with an explicit recovery instruction', () => {
    const huge = {
      ...draft(),
      state: 'active' as const,
      contract: {
        ...draft().contract,
        workingProposal: Array.from({ length: 100 }, (_, index) => `${String(index)}-${'x'.repeat(1000)}`),
      },
    }
    const text = renderWorkCharterContext({ sessionId: SESSION, charters: [huge] })
    expect(text.length).toBeLessThanOrEqual(WORK_CHARTER_CONTEXT_MAX_CHARS)
    expect(text).toContain('[TRUNCATED:')
    expect(text).toContain('work_charter_status')
  })
})
