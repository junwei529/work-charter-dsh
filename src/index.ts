import { Service, type Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type { PromptAssembly } from '@deepseek-ai/dsh-system-prompt'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  SESSION_COORDINATOR_CONTRACT_VERSION,
  SessionCoordinatorHealthSchema,
} from 'session-coordinator-dsh'
import { z } from 'zod'
import { WorkCharterCoordinator } from './coordinator.ts'
import { renderWorkCharterContext, WORK_CHARTER_CONTEXT_NAME } from './model-context.ts'
import { registerWorkCharterTools } from './model-tools.ts'
import { defaultPolicyRuntime } from './policy.ts'
import { registerWorkCharterSkill } from './skill.ts'
import {
  assertWorkCharterStorageReady,
  workCharterDomainSpec,
  type WorkCharterDomain,
} from './storage.ts'
import {
  WORK_CHARTER_CONTRACT_VERSION,
  WORK_CHARTER_STORAGE_SCHEMA_VERSION,
  WORK_CHARTER_UPSTREAM_PACKAGE_SHA256,
  WORK_CHARTER_UPSTREAM_PACKAGE_TREE,
  WORK_CHARTER_UPSTREAM_VERSION,
  WorkCharterError,
  WorkCharterHealthSchema,
  type CreateWorkCharterInput,
  type GetWorkCharterInput,
  type ListSessionWorkChartersInput,
  type ListWorkChartersInput,
  type ReturnWorkCharterDispositionInput,
  type SubmitWorkCharterNoticeInput,
  type TransitionWorkCharterInput,
  type WorkCharterDto,
  type WorkCharterHealth,
  type WorkCharterMutationResult,
  type WorkCharterRemoteOutcome,
  type WorkCharterServiceContract,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    workCharter: WorkCharterServiceContract
  }
}

export * from './types.ts'
export { renderWorkCharterContext, WORK_CHARTER_CONTEXT_NAME } from './model-context.ts'

const HEALTH: WorkCharterHealth = Object.freeze({
  service: 'work-charter-dsh',
  status: 'ok',
  contractVersion: WORK_CHARTER_CONTRACT_VERSION,
  storage: Object.freeze({
    schemaVersion: WORK_CHARTER_STORAGE_SCHEMA_VERSION,
    state: 'ready',
  }),
  upstream: Object.freeze({
    version: WORK_CHARTER_UPSTREAM_VERSION,
    packageSha256: WORK_CHARTER_UPSTREAM_PACKAGE_SHA256,
    packageTree: WORK_CHARTER_UPSTREAM_PACKAGE_TREE,
  }),
  sessionCoordinatorContractVersion: SESSION_COORDINATOR_CONTRACT_VERSION,
})

export class WorkCharterService extends TypertRemoteService implements WorkCharterServiceContract {
  static inject = ['storageDomain', 'sessionCoordinator', 'sessions', 'systemPrompt', 'skills', 'tools']

  private domain?: WorkCharterDomain
  private coordinator?: WorkCharterCoordinator

  constructor(ctx: Context) {
    super(ctx, 'workCharter')
  }

  protected async [Service.init](): Promise<void> {
    let domain: WorkCharterDomain | undefined
    try {
      const coordinatorHealth = SessionCoordinatorHealthSchema.safeParse(
        await this.ctx.sessionCoordinator.health(),
      )
      if (!coordinatorHealth.success) {
        throw new WorkCharterError(
          'COORDINATION_UNAVAILABLE',
          'session-coordinator-dsh health does not match the required public contract',
          false,
          'failed',
        )
      }

      domain = await this.ctx.storageDomain.open(workCharterDomainSpec)
      assertWorkCharterStorageReady(domain)
      const coordinator = new WorkCharterCoordinator(
        domain,
        this.ctx.sessionCoordinator,
        this.ctx.sessions,
        defaultPolicyRuntime,
      )
      this.domain = domain
      this.coordinator = coordinator

      await registerWorkCharterSkill(this.ctx)
      registerWorkCharterTools(this.ctx, coordinator)
      this.registerModelContext(coordinator)

      this.ctx.effect(
        (): (() => Promise<void>) => async () => {
          await coordinator.drain()
          await domain?.close()
        },
        'work-charter-dsh.domain-close',
      )
    } catch (error) {
      await domain?.close()
      throw mapInitializationFailure(error)
    }
  }

  @Remote('health')
  health(): Promise<WorkCharterHealth> {
    this.requireCoordinator()
    assertWorkCharterStorageReady(this.requireDomain())
    return Promise.resolve(WorkCharterHealthSchema.parse(HEALTH))
  }

  createCharter(input: CreateWorkCharterInput): Promise<WorkCharterMutationResult> {
    return this.requireCoordinator().createCharter(input)
  }

  getCharter(input: GetWorkCharterInput): Promise<WorkCharterDto> {
    return this.requireCoordinator().getCharter(input)
  }

  listCharters(input: ListWorkChartersInput = {}): Promise<readonly WorkCharterDto[]> {
    return this.requireCoordinator().listCharters(input)
  }

  listSessionCharters(input: ListSessionWorkChartersInput): Promise<readonly WorkCharterDto[]> {
    return this.requireCoordinator().listSessionCharters(input)
  }

  transitionCharter(input: TransitionWorkCharterInput): Promise<WorkCharterMutationResult> {
    return this.requireCoordinator().transitionCharter(input)
  }

  submitResultNotice(input: SubmitWorkCharterNoticeInput): Promise<WorkCharterMutationResult> {
    return this.requireCoordinator().submitResultNotice(input)
  }

  returnDisposition(input: ReturnWorkCharterDispositionInput): Promise<WorkCharterMutationResult> {
    return this.requireCoordinator().returnDisposition(input)
  }

  @Remote('chartersList')
  chartersList(
    input: ListWorkChartersInput,
    signal: AbortSignal,
  ): Promise<WorkCharterRemoteOutcome<readonly WorkCharterDto[]>> {
    signal.throwIfAborted()
    return remoteOutcome(() => this.listCharters(input))
  }

  @Remote('chartersGet')
  chartersGet(input: GetWorkCharterInput): Promise<WorkCharterRemoteOutcome<WorkCharterDto>> {
    return remoteOutcome(() => this.getCharter(input))
  }

  @Remote('sessionChartersList')
  sessionChartersList(
    input: ListSessionWorkChartersInput,
    signal: AbortSignal,
  ): Promise<WorkCharterRemoteOutcome<readonly WorkCharterDto[]>> {
    signal.throwIfAborted()
    return remoteOutcome(() => this.listSessionCharters(input))
  }

  private registerModelContext(coordinator: WorkCharterCoordinator): void {
    this.ctx.on('system-prompt/assemble', async (
      assembly: PromptAssembly,
      context,
      next,
    ) => {
      const agent = context.agent
      if (agent === undefined) return next()

      let charters: readonly WorkCharterDto[]
      let coordinationState: 'available' | 'unknown' = 'available'
      let coordinationMessage: string | undefined
      try {
        charters = await coordinator.listSessionCharters({ sessionId: agent.id })
      } catch (error) {
        charters = coordinator.listRoleCharters(agent.id)
        coordinationState = 'unknown'
        coordinationMessage = error instanceof Error ? error.message : 'coordination lookup failed'
      }

      const text = renderWorkCharterContext({
        sessionId: agent.id,
        charters,
        coordinationState,
        ...(coordinationMessage === undefined ? {} : { coordinationMessage }),
      })
      if (text !== '') assembly.contexts.push({ name: WORK_CHARTER_CONTEXT_NAME, text })
      return next()
    })
  }

  private requireCoordinator(): WorkCharterCoordinator {
    if (this.coordinator === undefined) {
      throw new WorkCharterError(
        'STORAGE_UNAVAILABLE',
        'work-charter-dsh lifecycle service is not ready',
        true,
        'unknown',
      )
    }
    return this.coordinator
  }

  private requireDomain(): WorkCharterDomain {
    if (this.domain === undefined) {
      throw new WorkCharterError('STORAGE_UNAVAILABLE', 'work-charter-dsh storage is not ready', true, 'unknown')
    }
    return this.domain
  }
}

async function remoteOutcome<T>(operation: () => Promise<T>): Promise<WorkCharterRemoteOutcome<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    const normalized = normalizeError(error)
    return { ok: false, error: normalized.toDTO() }
  }
}

function normalizeError(error: unknown): WorkCharterError {
  if (error instanceof WorkCharterError) return error
  if (error instanceof z.ZodError) {
    return new WorkCharterError('INVALID_INPUT', 'Work Charter input failed runtime validation', false, 'failed', {
      cause: error,
    })
  }
  return new WorkCharterError('INTERNAL', 'work-charter-dsh request failed unexpectedly', false, 'unknown', {
    cause: error,
  })
}

function mapInitializationFailure(error: unknown): WorkCharterError {
  if (error instanceof WorkCharterError) return error
  const code = errorCode(error)
  if (code === 'version-mismatch') {
    return new WorkCharterError('SCHEMA_INCOMPATIBLE', 'storage physical version is incompatible', false, 'failed', {
      cause: error,
    })
  }
  return new WorkCharterError(
    'STORAGE_UNAVAILABLE',
    'work-charter-dsh initialization failed; runtime state is unavailable',
    true,
    'unknown',
    { cause: error },
  )
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

export {
  WORK_CHARTER_STORAGE_DOMAIN_ID,
  WORK_CHARTER_STORAGE_PHYSICAL_VERSION,
  WORK_CHARTER_TABLE_ID,
  type WorkCharterDomain,
} from './storage.ts'

export default WorkCharterService
