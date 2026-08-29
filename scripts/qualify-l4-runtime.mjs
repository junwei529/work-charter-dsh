import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const consumerRoot = resolve(process.argv[2] ?? '.verification/clean-consumer')
const requireFromConsumer = createRequire(join(consumerRoot, 'package.json'))

async function importConsumer(specifier) {
  const resolved = requireFromConsumer.resolve(specifier)
  return import(pathToFileURL(resolved).href)
}

const [
  cordis,
  loaderModule,
  llm,
  sessions,
  scdp,
  workCharter,
] = await Promise.all([
  importConsumer('@deepseek-ai/cordis'),
  importConsumer('@deepseek-ai/cordis-plugin-loader'),
  importConsumer('@deepseek-ai/dsh-llm'),
  importConsumer('@deepseek-ai/dsh-session'),
  importConsumer('session-coordinator-dsh'),
  importConsumer('work-charter-dsh/types'),
])

const { Context } = cordis
const Loader = loaderModule.default
const { LlmAdapter, createUserMessage } = llm
const { SessionId } = sessions
const {
  parseCoordinationRecordId,
  parseCorrelationId,
} = scdp
const {
  WORK_CHARTER_CONTRACT_VERSION,
  WORK_CHARTER_STORAGE_SCHEMA_VERSION,
  parseWorkCharterId,
  parseWorkCharterNoticeId,
} = workCharter

const ORCHESTRATOR = SessionId('l4-qualification-orchestrator')
const PLANNER = SessionId('l4-qualification-planner')
const EXECUTOR = SessionId('l4-qualification-executor')
const CHARTER = parseWorkCharterId('wc_10000000-0000-4000-8000-000000000001')
const EXECUTION_NOTICE = parseWorkCharterNoticeId('wcn_20000000-0000-4000-8000-000000000001')
const PHASE_NOTICE = parseWorkCharterNoticeId('wcn_20000000-0000-4000-8000-000000000002')
const MANDATE_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000001')
const DEFINITION_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000002')
const EXECUTION_NOTICE_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000003')
const EXECUTION_DISPOSITION_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000004')
const PHASE_NOTICE_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000005')
const PHASE_DISPOSITION_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000006')
const FALLBACK_PHASE_NOTICE_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000007')
const FALLBACK_PHASE_DISPOSITION_RECORD = parseCoordinationRecordId('rec_30000000-0000-4000-8000-000000000008')
const CORRELATION = parseCorrelationId('cor_40000000-0000-4000-8000-000000000001')
const ROLE_PROVIDERS = {
  orchestrator: 'l4-orchestrator',
  planner: 'l4-planner',
  executor: 'l4-executor',
}

class RoleAdapter extends LlmAdapter {
  turns = []

  resolveModel(provider, model) {
    return Promise.resolve({ provider, id: model, name: model })
  }

  count(provider) {
    return this.turns.filter(turn => turn.provider === provider).length
  }

  latestOutput(provider) {
    return this.turns.filter(turn => turn.provider === provider).at(-1)?.output
  }

  async * stream(options) {
    const input = latestUserText(options.messages)
    const output = roleOutput(options.provider, input)
    this.turns.push({ provider: options.provider, input, output })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: output }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: output } }
    yield { type: 'usage', usage: { inputTokens: input.length, outputTokens: output.length } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

function latestUserText(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user') continue
    if (message.source?.kind === 'plugin'
      && message.source.plugin === '@deepseek-ai/dsh-system-prompt') continue
    return message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
  }
  return ''
}

function roleOutput(provider, input) {
  if (provider === ROLE_PROVIDERS.orchestrator) {
    if (input.includes('BEGIN_L4_PHASE_ONE')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/phase-mandate/v1',
        phase: 'phase-one',
        outcome: 'Prove the complete Standard O/P/E delivery chain.',
        plannerSessionId: PLANNER,
      })
    }
    if (input.includes('work-charter-dsh/phase-result-notice/v1')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/phase-disposition/v1',
        checkpoint: 'phase-one-accepted',
        verdict: 'accepted',
        recipientSessionId: PLANNER,
      })
    }
  }
  if (provider === ROLE_PROVIDERS.planner) {
    if (input.includes('work-charter-dsh/phase-mandate/v1')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/phase-definition/v1',
        phase: 'phase-one',
        executionTranche: 'l4-runtime-chain',
        executorSessionId: EXECUTOR,
        acceptance: ['all six role messages are acknowledged and consumed'],
      })
    }
    if (input.includes('work-charter-dsh/result-notice/v1')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/execution-assessment/v1',
        checkpoint: 'execution-complete',
        verdict: 'accepted',
        executorSessionId: EXECUTOR,
      })
    }
    if (input.includes('work-charter-dsh/phase-disposition/v1')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/phase-close-observation/v1',
        checkpoint: 'phase-one-accepted',
        dispositionObserved: true,
      })
    }
  }
  if (provider === ROLE_PROVIDERS.executor) {
    if (input.includes('work-charter-dsh/phase-definition/v1')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/execution-result/v1',
        checkpoint: 'execution-complete',
        evidenceRefs: ['l4:executor-agent-consumed-definition'],
        plannerSessionId: PLANNER,
      })
    }
    if (input.includes('work-charter-dsh/disposition/v1')) {
      return JSON.stringify({
        schema: 'work-charter-dsh/execution-disposition-observation/v1',
        checkpoint: 'execution-complete',
        dispositionObserved: true,
      })
    }
  }
  throw new Error('unexpected L4 role input for ' + provider + ': ' + input.slice(0, 300))
}

function contract() {
  return {
    outcome: 'Qualify the complete Standard O/P/E runtime delivery chain.',
    nonGoals: ['publication', 'external model efficacy'],
    scope: ['exact installed DSH/scdp/Work Charter local artifact graph'],
    hardBoundaries: ['no external effects', 'no raw scdp fallback may count as a Work Charter PASS'],
    confirmedContract: ['exercise three distinct Orchestrator, Planner, and Executor Sessions'],
    necessaryGuardrails: ['Host-authoritative role policy', 'checkpoint-bound causal delivery'],
    workingProposal: ['keyless deterministic role adapters over real DSH AgentLoops'],
    assumptions: [],
    acceptance: [
      'O to P mandate delivery is acknowledged and consumed',
      'P to E definition delivery is acknowledged and consumed',
      'E to P Result Notice delivery is acknowledged and consumed',
      'P to E disposition delivery is acknowledged and consumed',
      'P to O phase Result Notice delivery is acknowledged and consumed',
      'O to P phase disposition delivery is acknowledged and consumed',
    ],
    stopConditions: ['any role, revision, delivery, or model-consumption ambiguity'],
  }
}

async function createProfile(profileRoot, adapter) {
  const coordinationRoot = join(profileRoot, 'coordination')
  const sessionRoot = join(profileRoot, 'sessions')
  await mkdir(coordinationRoot, { recursive: true })
  await mkdir(sessionRoot, { recursive: true })
  const ctx = new Context()
  const baseUrl = pathToFileURL(join(consumerRoot, 'runtime-qualification.mjs')).href
  await ctx.plugin(Loader, { baseUrl })

  const create = async (id, name, config = undefined) => {
    await ctx.loader.create({ id, name, ...(config === undefined ? {} : { config }) })
    await ctx.loader.await()
  }

  await create('webserver', '@deepseek-ai/dsh-host-webserver', { host: '127.0.0.1', port: 0 })
  await create('connection', '@deepseek-ai/dsh-client-connection')
  await create('storage', '@deepseek-ai/dsh-storage')
  await create('storage-json', '@deepseek-ai/dsh-storage-json', { root: coordinationRoot })
  await create('storage-domain', '@deepseek-ai/dsh-storage-domain', { backend: 'json' })
  await create('typert-registry', '@deepseek-ai/dsh-typert-registry')
  await create('typert-loader', '@deepseek-ai/dsh-typert-loader')
  await create('api-gateway', '@deepseek-ai/dsh-api-gateway')
  await create('api-remotes', '@deepseek-ai/dsh-api-remotes')
  await create('llm', '@deepseek-ai/dsh-llm')
  await create('sessions', '@deepseek-ai/dsh-session')
  await create('session-persistence', '@deepseek-ai/dsh-session-persistence-jsonl', {
    root: sessionRoot,
    compression: 'none',
  })
  await create('system-prompt', '@deepseek-ai/dsh-system-prompt')
  await create('skills', '@deepseek-ai/dsh-skill')
  await create('tools', '@deepseek-ai/dsh-tools')
  await create('agents', '@deepseek-ai/dsh-agent')
  ctx.llm.registerAdapter(Object.values(ROLE_PROVIDERS), adapter)
  await create('agent-loop', '@deepseek-ai/dsh-agent-loop', { agents: [] })
  await create('session-coordinator', 'session-coordinator-dsh')
  await create('work-charter', 'work-charter-dsh')
  await new Promise(resolveTimer => setTimeout(resolveTimer, 0))
  await ctx.loader.await()
  return ctx
}

async function waitForTurn(adapter, provider, previousCount, label) {
  const deadline = Date.now() + 10_000
  while (adapter.count(provider) <= previousCount) {
    if (Date.now() >= deadline) throw new Error('timed out waiting for ' + label)
    await new Promise(resolveTimer => setTimeout(resolveTimer, 10))
  }
}

async function promptRole(adapter, agent, provider, text, label) {
  const previousCount = adapter.count(provider)
  agent.followup(createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }))
  await waitForTurn(adapter, provider, previousCount, label)
  await agent.whenIdle()
  const output = adapter.latestOutput(provider)
  if (output === undefined) throw new Error(label + ' produced no model output')
  return output
}

async function reconcileAcknowledged(ctx, recordId, recipientSessionId, label) {
  const reconciled = await ctx.sessionCoordinator.reconcileCoordinationRecord({
    recordId,
    recipientSessionIds: [recipientSessionId],
  })
  const recipient = reconciled.record.recipients.find(row => row.sessionId === recipientSessionId)
  if (recipient?.state !== 'acknowledged' || recipient.proof?.kind !== 'user-message') {
    throw new Error(label + ' was not durably acknowledged: ' + JSON.stringify(recipient))
  }
  return recipient
}

async function relay(ctx, adapter, agent, provider, input, label) {
  const previousCount = adapter.count(provider)
  await ctx.sessionCoordinator.acceptCoordinationRecord({
    recordId: input.recordId,
    workstreamId: input.workstreamId,
    correlationId: input.correlationId,
    ...(input.causationRecordId === undefined ? {} : { causationRecordId: input.causationRecordId }),
    fromSessionId: input.fromSessionId,
    address: { kind: 'session', sessionId: input.toSessionId },
    subject: input.subject,
    content: input.kind === 'outcome'
      ? {
          kind: 'outcome',
          body: input.body,
          outcome: input.outcome,
          ...(input.outcomeCode === undefined ? {} : { outcomeCode: input.outcomeCode }),
        }
      : { kind: input.kind, body: input.body },
  })
  const processed = await ctx.sessionCoordinator.processCoordinationRecord({
    recordId: input.recordId,
    recipientSessionIds: [input.toSessionId],
    wake: true,
  })
  if (!processed.attemptedSessionIds.includes(input.toSessionId)) {
    throw new Error(label + ' did not attempt the intended Session')
  }
  await waitForTurn(adapter, provider, previousCount, label + ' model consumption')
  await agent.whenIdle()
  const delivery = await reconcileAcknowledged(ctx, input.recordId, input.toSessionId, label)
  const output = adapter.latestOutput(provider)
  if (output === undefined) throw new Error(label + ' produced no model output')
  return { delivery, output }
}

function hasRoleContext(agent, role) {
  return agent.session.events.some(event => event.type === 'user/message'
    && event.data.source.kind === 'plugin'
    && event.data.source.plugin === '@deepseek-ai/dsh-system-prompt'
    && event.data.content.some(block => block.type === 'text'
      && block.text.includes('Protection: standard-ope | your role: ' + role)))
}

async function captureError(operation) {
  try {
    await operation
    return undefined
  } catch (error) {
    return {
      code: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

if (WORK_CHARTER_CONTRACT_VERSION !== 1 || WORK_CHARTER_STORAGE_SCHEMA_VERSION !== 1) {
  throw new Error('public Work Charter version constants mismatch')
}

const runId = process.env.WORK_CHARTER_L4_RUN_ID ?? randomUUID()
const profileRoot = join(consumerRoot, 'profile-runtime', 'l4', runId)
const adapter = new RoleAdapter()
let ctx
let report

try {
  ctx = await createProfile(profileRoot, adapter)
  const service = ctx.get('workCharter')
  if (service === undefined) throw new Error('Loader did not mount ctx.workCharter')

  const orchestrator = ctx.agentLoop.create(ORCHESTRATOR, {
    provider: ROLE_PROVIDERS.orchestrator,
    model: 'deterministic',
  })
  const planner = ctx.agentLoop.create(PLANNER, {
    provider: ROLE_PROVIDERS.planner,
    model: 'deterministic',
  })
  const executor = ctx.agentLoop.create(EXECUTOR, {
    provider: ROLE_PROVIDERS.executor,
    model: 'deterministic',
  })

  const workstream = await ctx.sessionCoordinator.createWorkstream({
    title: 'L4 Standard O/P/E runtime qualification',
  })
  for (const sessionId of [ORCHESTRATOR, PLANNER, EXECUTOR]) {
    await ctx.sessionCoordinator.attachSession({ workstreamId: workstream.id, sessionId })
  }

  let mutation = await service.createCharter({
    charterId: CHARTER,
    target: { kind: 'workstream', workstreamId: workstream.id },
    managedWorkstream: 'L4 Standard O/P/E runtime qualification',
    protection: 'standard-ope',
    authority: {
      revision: 1,
      state: 'approved',
      reference: 'user:l4-runtime-test-2026-08-29',
      authorizedActions: ['local L4 runtime qualification'],
      prohibitedActions: ['publication', 'external effects'],
    },
    contract: contract(),
    roles: [
      { role: 'orchestrator', sessionId: ORCHESTRATOR },
      { role: 'planner', sessionId: PLANNER },
      { role: 'executor', sessionId: EXECUTOR },
    ],
    evidence: [],
  })
  mutation = await service.transitionCharter({
    charterId: CHARTER,
    expectedRevision: mutation.charter.revision,
    expectedAuthorityRevision: mutation.charter.authority.revision,
    actorSessionId: ORCHESTRATOR,
    command: { kind: 'assign-writer', sessionId: EXECUTOR },
  })
  mutation = await service.transitionCharter({
    charterId: CHARTER,
    expectedRevision: mutation.charter.revision,
    expectedAuthorityRevision: mutation.charter.authority.revision,
    actorSessionId: ORCHESTRATOR,
    command: { kind: 'activate' },
  })

  const mandate = await promptRole(
    adapter,
    orchestrator,
    ROLE_PROVIDERS.orchestrator,
    'BEGIN_L4_PHASE_ONE',
    'Orchestrator mandate generation',
  )
  const mandateRelay = await relay(ctx, adapter, planner, ROLE_PROVIDERS.planner, {
    recordId: MANDATE_RECORD,
    workstreamId: workstream.id,
    correlationId: CORRELATION,
    fromSessionId: ORCHESTRATOR,
    toSessionId: PLANNER,
    subject: 'L4 Phase Mandate',
    kind: 'request',
    body: mandate,
  }, 'O to P mandate')

  const definitionRelay = await relay(ctx, adapter, executor, ROLE_PROVIDERS.executor, {
    recordId: DEFINITION_RECORD,
    workstreamId: workstream.id,
    correlationId: CORRELATION,
    causationRecordId: MANDATE_RECORD,
    fromSessionId: PLANNER,
    toSessionId: EXECUTOR,
    subject: 'L4 Phase Definition',
    kind: 'request',
    body: mandateRelay.output,
  }, 'P to E definition')

  const plannerBeforeNotice = adapter.count(ROLE_PROVIDERS.planner)
  mutation = await service.submitResultNotice({
    charterId: CHARTER,
    expectedRevision: mutation.charter.revision,
    expectedAuthorityRevision: mutation.charter.authority.revision,
    actorSessionId: EXECUTOR,
    noticeId: EXECUTION_NOTICE,
    noticeRecordId: EXECUTION_NOTICE_RECORD,
    correlationId: CORRELATION,
    checkpoint: 'execution-complete',
    recipientSessionId: PLANNER,
    evidenceRefs: [definitionRelay.output],
    wake: true,
  })
  await waitForTurn(adapter, ROLE_PROVIDERS.planner, plannerBeforeNotice, 'E to P Result Notice model consumption')
  await planner.whenIdle()
  const executionNoticeDelivery = await reconcileAcknowledged(
    ctx,
    EXECUTION_NOTICE_RECORD,
    PLANNER,
    'E to P Result Notice',
  )
  const plannerAssessment = adapter.latestOutput(ROLE_PROVIDERS.planner)
  if (plannerAssessment === undefined) throw new Error('Planner produced no execution assessment')

  const executorBeforeDisposition = adapter.count(ROLE_PROVIDERS.executor)
  mutation = await service.returnDisposition({
    charterId: CHARTER,
    expectedRevision: mutation.charter.revision,
    expectedAuthorityRevision: mutation.charter.authority.revision,
    actorSessionId: PLANNER,
    noticeId: EXECUTION_NOTICE,
    dispositionRecordId: EXECUTION_DISPOSITION_RECORD,
    verdict: 'accepted',
    checkpoint: 'execution-complete',
    wake: true,
  })
  await waitForTurn(
    adapter,
    ROLE_PROVIDERS.executor,
    executorBeforeDisposition,
    'P to E execution disposition model consumption',
  )
  await executor.whenIdle()
  const executionDispositionDelivery = await reconcileAcknowledged(
    ctx,
    EXECUTION_DISPOSITION_RECORD,
    EXECUTOR,
    'P to E execution disposition',
  )

  const orchestratorBeforePhaseNotice = adapter.count(ROLE_PROVIDERS.orchestrator)
  const phaseNoticeError = await captureError(service.submitResultNotice({
    charterId: CHARTER,
    expectedRevision: mutation.charter.revision,
    expectedAuthorityRevision: mutation.charter.authority.revision,
    actorSessionId: PLANNER,
    noticeId: PHASE_NOTICE,
    noticeRecordId: PHASE_NOTICE_RECORD,
    correlationId: CORRELATION,
    checkpoint: 'phase-one-accepted',
    recipientSessionId: ORCHESTRATOR,
    evidenceRefs: [plannerAssessment],
    wake: true,
  }))

  let phaseNoticeDelivery
  let phaseDispositionDelivery
  let fallback
  if (phaseNoticeError === undefined) {
    await waitForTurn(
      adapter,
      ROLE_PROVIDERS.orchestrator,
      orchestratorBeforePhaseNotice,
      'P to O phase Result Notice model consumption',
    )
    await orchestrator.whenIdle()
    phaseNoticeDelivery = await reconcileAcknowledged(
      ctx,
      PHASE_NOTICE_RECORD,
      ORCHESTRATOR,
      'P to O phase Result Notice',
    )
    const current = await service.getCharter({ charterId: CHARTER })
    const plannerBeforePhaseDisposition = adapter.count(ROLE_PROVIDERS.planner)
    mutation = await service.returnDisposition({
      charterId: CHARTER,
      expectedRevision: current.revision,
      expectedAuthorityRevision: current.authority.revision,
      actorSessionId: ORCHESTRATOR,
      noticeId: PHASE_NOTICE,
      dispositionRecordId: PHASE_DISPOSITION_RECORD,
      verdict: 'accepted',
      checkpoint: 'phase-one-accepted',
      wake: true,
    })
    await waitForTurn(
      adapter,
      ROLE_PROVIDERS.planner,
      plannerBeforePhaseDisposition,
      'O to P phase disposition model consumption',
    )
    await planner.whenIdle()
    phaseDispositionDelivery = await reconcileAcknowledged(
      ctx,
      PHASE_DISPOSITION_RECORD,
      PLANNER,
      'O to P phase disposition',
    )
  } else {
    if (phaseNoticeError.code !== 'ROLE_UNAUTHORIZED') {
      throw new Error('unexpected P to O phase Result Notice failure: ' + JSON.stringify(phaseNoticeError))
    }
    const fallbackPhaseNotice = await relay(ctx, adapter, orchestrator, ROLE_PROVIDERS.orchestrator, {
      recordId: FALLBACK_PHASE_NOTICE_RECORD,
      workstreamId: workstream.id,
      correlationId: CORRELATION,
      causationRecordId: EXECUTION_DISPOSITION_RECORD,
      fromSessionId: PLANNER,
      toSessionId: ORCHESTRATOR,
      subject: 'Diagnostic raw scdp phase Result Notice',
      kind: 'request',
      body: JSON.stringify({
        schema: 'work-charter-dsh/phase-result-notice/v1',
        checkpoint: 'phase-one-accepted',
        evidenceRefs: [plannerAssessment],
        returnToSessionId: PLANNER,
      }),
    }, 'diagnostic raw scdp P to O phase Result Notice')
    const fallbackPhaseDisposition = await relay(ctx, adapter, planner, ROLE_PROVIDERS.planner, {
      recordId: FALLBACK_PHASE_DISPOSITION_RECORD,
      workstreamId: workstream.id,
      correlationId: CORRELATION,
      causationRecordId: FALLBACK_PHASE_NOTICE_RECORD,
      fromSessionId: ORCHESTRATOR,
      toSessionId: PLANNER,
      subject: 'Diagnostic raw scdp phase disposition',
      kind: 'outcome',
      outcome: 'succeeded',
      outcomeCode: 'accepted',
      body: fallbackPhaseNotice.output,
    }, 'diagnostic raw scdp O to P phase disposition')
    fallback = {
      rawScdpPhaseNoticeDelivery: fallbackPhaseNotice.delivery.state,
      rawScdpPhaseDispositionDelivery: fallbackPhaseDisposition.delivery.state,
      targetModelsConsumedBoth: true,
    }
  }

  const roleContext = {
    orchestrator: hasRoleContext(orchestrator, 'orchestrator'),
    planner: hasRoleContext(planner, 'planner'),
    executor: hasRoleContext(executor, 'executor'),
  }
  if (!Object.values(roleContext).every(Boolean)) {
    throw new Error('one or more role Agents did not receive standard-ope runtime context')
  }

  report = {
    runtime: phaseNoticeError === undefined ? 'PASS' : 'FAIL',
    qualification: 'L4_STANDARD_OPE',
    runId,
    profileRoot,
    installedGraph: {
      dsh: '0.1.2-alpha.1',
      sessionCoordinator: '0.1.1-alpha.1',
      workCharter: '0.1.0-alpha.1',
      node: process.version,
    },
    charter: {
      protection: mutation.charter.protection,
      orchestrator: ORCHESTRATOR,
      planner: PLANNER,
      executor: EXECUTOR,
      distinctRoles: new Set([ORCHESTRATOR, PLANNER, EXECUTOR]).size === 3,
      active: mutation.charter.state === 'active',
      roleContext,
    },
    chain: {
      orchestratorToPlannerMandate: mandateRelay.delivery.state,
      plannerToExecutorDefinition: definitionRelay.delivery.state,
      executorToPlannerResultNotice: executionNoticeDelivery.state,
      plannerToExecutorDisposition: executionDispositionDelivery.state,
      plannerToOrchestratorPhaseNotice: phaseNoticeDelivery?.state ?? 'rejected-before-transport',
      orchestratorToPlannerPhaseDisposition: phaseDispositionDelivery?.state ?? 'not-created',
      targetModelsConsumedDeliveredContent: true,
    },
    failure: phaseNoticeError === undefined
      ? undefined
      : {
          code: 'L4_PHASE_RESULT_ROUTE_UNSUPPORTED',
          origin: 'work-charter-dsh Host role policy',
          observedError: phaseNoticeError,
          meaning: 'Planner cannot submit the phase-level Result Notice required by Standard O/P/E.',
        },
    diagnosticFallback: fallback,
  }
} catch (error) {
  report = {
    runtime: 'ERROR',
    qualification: 'L4_STANDARD_OPE',
    runId,
    profileRoot,
    error: {
      code: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    },
  }
} finally {
  if (ctx !== undefined) await ctx.fiber.dispose()
}

await mkdir(profileRoot, { recursive: true })
await writeFile(join(profileRoot, 'result.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
process.stdout.write(JSON.stringify(report) + '\n')
if (report.runtime !== 'PASS') process.exitCode = 1
