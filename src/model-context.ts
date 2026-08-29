import type { SessionId } from 'session-coordinator-dsh'
import type { WorkCharterDto, WorkCharterRole } from './types.ts'

export const WORK_CHARTER_CONTEXT_NAME = 'work-charter-dsh:active-charters'
export const WORK_CHARTER_CONTEXT_MAX_CHARS = 32_000

export interface WorkCharterContextInput {
  readonly sessionId: SessionId
  readonly charters: readonly WorkCharterDto[]
  readonly coordinationState?: 'available' | 'unknown' | undefined
  readonly coordinationMessage?: string | undefined
}

/**
 * Render the authoritative current policy snapshot for one DSH Session.
 * DSH records this dynamic context as a durable user-role runtime snapshot.
 */
export function renderWorkCharterContext(input: WorkCharterContextInput): string {
  const applicable = input.charters
    .filter(charter => charter.state === 'active' || charter.state === 'paused')
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)

  if (applicable.length === 0 && input.coordinationState !== 'unknown') return ''

  const parts: string[] = [
    '# Current Work Charter state',
    '',
    `Session: ${input.sessionId}`,
    'This is a logged snapshot of Host-authoritative policy state. It does not grant DSH, filesystem, Git, network, approval, or external-effect permissions.',
  ]

  if (input.coordinationState === 'unknown') {
    parts.push(
      '',
      '## Coordination state: UNKNOWN',
      normalizeLine(input.coordinationMessage ?? 'session-coordinator-dsh could not prove current Workstream membership.'),
      'Do not infer that no Charter applies. Continue only within an independently proven local Charter assignment; otherwise stop and surface the uncertainty.',
    )
  }

  for (const charter of applicable) {
    parts.push('', renderCharter(charter, input.sessionId))
  }

  const rendered = parts.join('\n')
  if (rendered.length <= WORK_CHARTER_CONTEXT_MAX_CHARS) return rendered
  return `${rendered.slice(0, WORK_CHARTER_CONTEXT_MAX_CHARS - 196)}\n\n[TRUNCATED: Work Charter context exceeded the bounded snapshot size. Read authoritative state with work_charter_status before acting.]`
}

function renderCharter(charter: WorkCharterDto, sessionId: SessionId): string {
  const roles = charter.roles.filter(role => role.sessionId === sessionId).map(role => role.role)
  const openDecisions = charter.decisions.filter(decision => decision.state === 'open')
  const pendingEvidence = charter.evidence.filter(evidence => evidence.required && evidence.state !== 'passed')
  const awaitingDisposition = charter.notices.filter(notice => notice.disposition === undefined)
  const target = charter.target.kind === 'session'
    ? `Session ${charter.target.sessionId}`
    : `Workstream ${charter.target.workstreamId}`
  const lines = [
    `## Charter ${charter.id}`,
    `State: ${charter.state.toUpperCase()} | revision ${String(charter.revision)} | authority revision ${String(charter.authority.revision)} (${charter.authority.state})`,
    `Target: ${target} | managed workstream: ${normalizeLine(charter.managedWorkstream)}`,
    `Protection: ${charter.protection} | your role: ${roles.length === 0 ? 'member' : roles.join(', ')}`,
    `Current writer: ${charter.writer?.sessionId ?? 'none'}`,
    `Authority reference: ${charter.authority.reference ?? 'UNKNOWN'}`,
    '',
    `Outcome: ${normalizeLine(charter.contract.outcome)}`,
    renderList('Confirmed contract', charter.contract.confirmedContract),
    renderList('Necessary guardrails', charter.contract.necessaryGuardrails),
    renderList('Working proposal', charter.contract.workingProposal),
    renderList('Assumptions / open facts', charter.contract.assumptions),
    renderList('Scope', charter.contract.scope),
    renderList('Non-goals', charter.contract.nonGoals),
    renderList('Hard boundaries', charter.contract.hardBoundaries),
    renderList('Acceptance', charter.contract.acceptance),
    renderList('Stop conditions', charter.contract.stopConditions),
    renderList('Authorized actions', charter.authority.authorizedActions),
    renderList('Prohibited actions', charter.authority.prohibitedActions),
    renderEvidence(pendingEvidence),
    renderDecisions(openDecisions),
    renderNotices(awaitingDisposition),
  ]
  if (charter.state === 'paused') {
    lines.push(
      `PAUSED: ${normalizeLine(charter.lastStop?.reason ?? 'reason UNKNOWN')}`,
      'Do not resume merely because a new turn or Session started. Resume requires an authorized Host transition.',
    )
  }
  return lines.filter(line => line !== '').join('\n')
}

function renderList(label: string, values: readonly string[]): string {
  return `${label}: ${values.length === 0 ? 'none' : values.map(value => normalizeLine(value)).join(' | ')}`
}

function renderEvidence(evidence: WorkCharterDto['evidence']): string {
  if (evidence.length === 0) return 'Required evidence not passed: none'
  return `Required evidence not passed: ${evidence.map(item =>
    `${item.id}=${item.state}/${item.mode}; subject=${normalizeLine(item.subject)}; expected=${normalizeLine(item.expectedRevision)}`,
  ).join(' | ')}`
}

function renderDecisions(decisions: WorkCharterDto['decisions']): string {
  if (decisions.length === 0) return 'Open decisions: none'
  return `Open decisions: ${decisions.map(decision =>
    `${decision.id}; owner=${decision.ownerSessionId}; question=${normalizeLine(decision.question)}`,
  ).join(' | ')}`
}

function renderNotices(notices: WorkCharterDto['notices']): string {
  if (notices.length === 0) return 'Result Notices awaiting disposition: none'
  return `Result Notices awaiting disposition: ${notices.map(notice =>
    `${notice.id}; checkpoint=${normalizeLine(notice.checkpoint)}; from=${notice.fromSessionId}; to=${notice.toSessionId}; delivery=${notice.transport.deliveryState}`,
  ).join(' | ')}`
}

export function roleForSession(charter: WorkCharterDto, sessionId: SessionId): readonly WorkCharterRole[] {
  return charter.roles.filter(role => role.sessionId === sessionId).map(role => role.role)
}

function normalizeLine(value: string): string {
  return value.replaceAll(/\s+/g, ' ').trim()
}
