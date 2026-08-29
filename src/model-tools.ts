import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  parseCoordinationRecordId,
  parseCorrelationId,
  parseSessionId,
} from 'session-coordinator-dsh'
import type { WorkCharterCoordinator } from './coordinator.ts'
import {
  parseWorkCharterId,
  parseWorkCharterDecisionId,
  parseWorkCharterNoticeId,
  WorkCharterError,
  type WorkCharterDto,
  type WorkCharterMutationResult,
} from './types.ts'

const STATUS_OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      coordination_state: { type: 'string', required: true, enum: ['available', 'unknown'] },
      charters_json: { type: 'string', required: true },
      message: { type: 'string', required: true },
    },
  } as const,
  render: (
    _args: unknown,
    value: { coordination_state: 'available' | 'unknown'; charters_json: string; message: string },
  ): Array<{ type: 'text'; text: string }> => [
    { type: 'text' as const, text: JSON.stringify(value) },
  ],
}

const MUTATION_OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      changed: { type: 'boolean', required: true },
      charter_json: { type: 'string', required: true },
    },
  } as const,
  render: (
    _args: unknown,
    value: { changed: boolean; charter_json: string },
  ): Array<{ type: 'text'; text: string }> => [
    { type: 'text' as const, text: JSON.stringify(value) },
  ],
}

export function registerWorkCharterTools(ctx: Context, coordinator: WorkCharterCoordinator): void {
  ctx.tools.register(defineTool({
    name: 'work_charter_status',
    description: 'Read every Work Charter currently applicable to this exact DSH Session. Call before any Charter update and reuse exact Charter and authority revisions.',
    parameters: {},
    output: STATUS_OUTPUT,
    async execute(_args, exec) {
      const sessionId = requireAgentSessionId(exec.agent?.id)
      try {
        const charters = await coordinator.listSessionCharters({ sessionId })
        return { coordination_state: 'available' as const, charters_json: JSON.stringify(charters), message: '' }
      } catch (error) {
        return {
          coordination_state: 'unknown' as const,
          charters_json: JSON.stringify(coordinator.listRoleCharters(sessionId)),
          message: error instanceof Error ? error.message : 'coordination lookup failed',
        }
      }
    },
    isConcurrencySafe: () => true,
  }))

  ctx.tools.register(defineTool({
    name: 'work_charter_create_draft',
    description: 'Create a proposed, inactive Charter draft for this Session. This never approves or activates it; external authority and a later Host transition are required.',
    parameters: {
      managed_workstream: { type: 'string', required: true, description: 'Stable human name for the managed work subject.' },
      protection: {
        type: 'string',
        required: true,
        enum: ['current-task', 'durable-single-agent'],
        description: 'Least sufficient same-Session protection level.',
      },
      outcome: { type: 'string', required: true },
      non_goals: { type: 'array', items: { type: 'string' }, required: true },
      scope: { type: 'array', items: { type: 'string' }, required: true },
      hard_boundaries: { type: 'array', items: { type: 'string' }, required: true },
      confirmed_contract: { type: 'array', items: { type: 'string' }, required: true },
      necessary_guardrails: { type: 'array', items: { type: 'string' }, required: true },
      working_proposal: { type: 'array', items: { type: 'string' }, required: true },
      assumptions: { type: 'array', items: { type: 'string' }, required: true },
      acceptance: { type: 'array', items: { type: 'string' }, required: true },
      stop_conditions: { type: 'array', items: { type: 'string' }, required: true },
      requested_authority_ref: {
        type: 'string',
        description: 'Optional reference to the still-proposed authority request; this is not approval evidence.',
      },
    },
    output: MUTATION_OUTPUT,
    async execute(args, exec) {
      const sessionId = requireAgentSessionId(exec.agent?.id)
      const result = await coordinator.createCharter({
        charterId: parseWorkCharterId(`wc_${randomUUID()}`),
        target: { kind: 'session', sessionId },
        managedWorkstream: args.managed_workstream,
        protection: args.protection,
        authority: {
          revision: 1,
          state: 'proposed',
          ...(meaningful(args.requested_authority_ref) ? { reference: args.requested_authority_ref } : {}),
          authorizedActions: [],
          prohibitedActions: [],
        },
        contract: {
          outcome: args.outcome,
          nonGoals: args.non_goals,
          scope: args.scope,
          hardBoundaries: args.hard_boundaries,
          confirmedContract: args.confirmed_contract,
          necessaryGuardrails: args.necessary_guardrails,
          workingProposal: args.working_proposal,
          assumptions: args.assumptions,
          acceptance: args.acceptance,
          stopConditions: args.stop_conditions,
        },
        roles: [{ role: 'controller', sessionId }],
        evidence: [],
      })
      return mutationValue(result)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'work_charter_transition',
    description: 'Apply a bounded Host-validated transition to one existing Charter. Read status first; stale revisions and unauthorized actors fail closed.',
    parameters: {
      charter_id: { type: 'string', required: true },
      revision: { type: 'integer', required: true },
      authority_revision: { type: 'integer', required: true },
      action: {
        type: 'string',
        required: true,
        enum: ['activate', 'pause', 'resume', 'assign-writer', 'release-writer'],
      },
      reason: { type: 'string', description: 'Required for pause.' },
      writer_session_id: { type: 'string', description: 'Required for assign-writer.' },
    },
    output: MUTATION_OUTPUT,
    async execute(args, exec) {
      const actorSessionId = requireAgentSessionId(exec.agent?.id)
      const command = args.action === 'pause'
        ? { kind: 'pause' as const, reason: requireText(args.reason, 'pause requires reason') }
        : args.action === 'assign-writer'
          ? {
              kind: 'assign-writer' as const,
              sessionId: parseSessionId(requireText(args.writer_session_id, 'assign-writer requires writer_session_id')),
            }
          : args.action === 'activate'
            ? { kind: 'activate' as const }
            : args.action === 'resume'
              ? { kind: 'resume' as const }
              : { kind: 'release-writer' as const }
      const result = await coordinator.transitionCharter({
        charterId: parseWorkCharterId(args.charter_id),
        expectedRevision: args.revision,
        expectedAuthorityRevision: args.authority_revision,
        actorSessionId,
        command,
      })
      return mutationValue(result)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'work_charter_result_notice',
    description: 'Submit one checkpoint-bound Result Notice through session-coordinator-dsh. Submission is blocked while any Charter decision remains open or the previous notice on that route still awaits disposition. A route accepts only one notice per checkpoint; after correction, use a distinct checkpoint. The current writer may report to an assigned assessment/control role; only the latest accepted execution notice permits the Standard O/P/E Planner to report the phase result to the Orchestrator. Reuse stable ids; do not retry an UNKNOWN delivery with new ids.',
    parameters: {
      charter_id: { type: 'string', required: true },
      revision: { type: 'integer', required: true },
      authority_revision: { type: 'integer', required: true },
      notice_id: { type: 'string', required: true, description: 'Stable wcn_<uuid> id.' },
      record_id: { type: 'string', required: true, description: 'Stable scdp rec_<uuid> id.' },
      correlation_id: { type: 'string', required: true, description: 'Stable scdp cor_<uuid> id.' },
      checkpoint: { type: 'string', required: true },
      recipient_session_id: { type: 'string', required: true },
      evidence_refs: { type: 'array', items: { type: 'string' }, required: true },
      wake: { type: 'boolean' },
    },
    output: MUTATION_OUTPUT,
    async execute(args, exec) {
      const result = await coordinator.submitResultNotice({
        charterId: parseWorkCharterId(args.charter_id),
        expectedRevision: args.revision,
        expectedAuthorityRevision: args.authority_revision,
        actorSessionId: requireAgentSessionId(exec.agent?.id),
        noticeId: parseWorkCharterNoticeId(args.notice_id),
        noticeRecordId: parseCoordinationRecordId(args.record_id),
        correlationId: parseCorrelationId(args.correlation_id),
        checkpoint: args.checkpoint,
        recipientSessionId: parseSessionId(args.recipient_session_id),
        evidenceRefs: args.evidence_refs,
        wake: args.wake ?? false,
      })
      return mutationValue(result)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'work_charter_disposition',
    description: 'Return the exact Result Notice recipient disposition exactly once: accepted, correction-required, or decision-required.',
    parameters: {
      charter_id: { type: 'string', required: true },
      revision: { type: 'integer', required: true },
      authority_revision: { type: 'integer', required: true },
      notice_id: { type: 'string', required: true },
      disposition_record_id: { type: 'string', required: true },
      checkpoint: { type: 'string', required: true },
      verdict: {
        type: 'string', required: true, enum: ['accepted', 'correction-required', 'decision-required'],
      },
      next_action: { type: 'string' },
      decision_id: { type: 'string', description: 'Required only for decision-required.' },
      wake: { type: 'boolean' },
    },
    output: MUTATION_OUTPUT,
    async execute(args, exec) {
      const decisionId = meaningful(args.decision_id) ? parseWorkCharterDecisionId(args.decision_id) : undefined
      const result = await coordinator.returnDisposition({
        charterId: parseWorkCharterId(args.charter_id),
        expectedRevision: args.revision,
        expectedAuthorityRevision: args.authority_revision,
        actorSessionId: requireAgentSessionId(exec.agent?.id),
        noticeId: parseWorkCharterNoticeId(args.notice_id),
        dispositionRecordId: parseCoordinationRecordId(args.disposition_record_id),
        verdict: args.verdict,
        checkpoint: args.checkpoint,
        ...(meaningful(args.next_action) ? { nextAction: args.next_action } : {}),
        ...(decisionId === undefined ? {} : { decisionId }),
        wake: args.wake ?? false,
      })
      return mutationValue(result)
    },
  }))
}

function requireAgentSessionId(value: string | undefined): ReturnType<typeof parseSessionId> {
  if (value === undefined) throw invalidInput('work-charter tools require an exact DSH agent Session')
  return parseSessionId(value)
}

function requireText(value: string | undefined, message: string): string {
  if (!meaningful(value)) throw invalidInput(message)
  return value
}

function meaningful(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ''
}

function invalidInput(message: string): WorkCharterError {
  return new WorkCharterError('INVALID_INPUT', message, false, 'failed')
}

function mutationValue(result: WorkCharterMutationResult): { changed: boolean; charter_json: string } {
  return { changed: result.changed, charter_json: JSON.stringify(result.charter satisfies WorkCharterDto) }
}
