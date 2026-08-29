import { describe, expect, it } from 'vitest'
import { parseSessionId, parseWorkstreamId } from 'session-coordinator-dsh'
import { selectOverlayCharterId } from '../../src/client/selection.ts'
import { parseWorkCharterId } from '../../src/types.ts'

const SESSION = parseSessionId('session-focused')
const OTHER_SESSION = parseSessionId('session-other')
const WORKSTREAM = parseWorkstreamId('ws_77777777-7777-4777-8777-777777777777')
const SESSION_CHARTER = parseWorkCharterId('wc_88888888-8888-4888-8888-888888888888')
const WORKSTREAM_CHARTER = parseWorkCharterId('wc_99999999-9999-4999-8999-999999999999')
const MISSING_CHARTER = parseWorkCharterId('wc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

const rows = [
  { id: SESSION_CHARTER, target: { kind: 'session' as const, sessionId: OTHER_SESSION } },
  { id: WORKSTREAM_CHARTER, target: { kind: 'workstream' as const, workstreamId: WORKSTREAM } },
]

describe('Work Charter overlay selection', () => {
  it('prefers the exact applicable Workstream Charter supplied by a Session action', () => {
    expect(selectOverlayCharterId(rows, SESSION_CHARTER, SESSION, WORKSTREAM_CHARTER)).toBe(WORKSTREAM_CHARTER)
  })

  it('does not fall back to an unrelated global Charter when the focused Charter is stale', () => {
    expect(selectOverlayCharterId(rows, SESSION_CHARTER, SESSION, MISSING_CHARTER)).toBeUndefined()
  })

  it('retains the existing selection for a global overlay open', () => {
    expect(selectOverlayCharterId(rows, WORKSTREAM_CHARTER, undefined, undefined)).toBe(WORKSTREAM_CHARTER)
  })
})
