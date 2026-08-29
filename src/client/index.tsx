import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import TYPERT_REMOTE from 'work-charter-dsh/remote'
import type {
  SessionId,
  WorkCharterDto,
  WorkCharterRemoteOutcome,
} from 'work-charter-dsh/types'
import {
  UI_CONTRIBUTION_ID,
  WorkCharterGlobalAction,
  WorkCharterOverlay,
  WorkCharterSessionAction,
  type WorkCharterUiApi,
} from './components.tsx'
import { overlayController } from './controller.ts'

export { UI_CONTRIBUTION_ID } from './components.tsx'

export const inject = ['remote', 'slots']

const uiSlots = [
  'sidebar.footer.action',
  'conversation.session.header.actions',
  'shell.overlay',
] as const

function assertUiContributionIdsAvailable(ctx: ClientContext): void {
  for (const slot of uiSlots) {
    if (ctx.slots.entries(slot).some(entry => entry.options.id === UI_CONTRIBUTION_ID)) {
      throw new Error(`slot "${slot}" already has an entry with id "${UI_CONTRIBUTION_ID}"`)
    }
  }
}

export async function apply(ctx: ClientContext): Promise<void> {
  assertUiContributionIdsAvailable(ctx)
  const unmountRemote = await ctx.remote.$mount(TYPERT_REMOTE)
  ctx.effect((): typeof unmountRemote => unmountRemote, 'work-charter-dsh.remote-unmount')
  const remoteLifetime = new AbortController()
  ctx.effect((): (() => void) => () => { remoteLifetime.abort() }, 'work-charter-dsh.remote-lifetime')
  ctx.effect((): (() => void) => () => { overlayController.reset() }, 'work-charter-dsh.overlay-reset')

  const remote = ctx.get('remote.workCharter') as ClientContext['remote']['workCharter'] | undefined
  if (remote === undefined) throw new Error('generated workCharter Remote did not mount')

  const api: WorkCharterUiApi = {
    listCharters: async signal => unwrapRemote(await remote.chartersList({}, signal)),
    listSessionCharters: async (sessionId, signal) => unwrapRemote(
      await remote.sessionChartersList({ sessionId }, signal),
    ),
    open: (sessionId, charterId) => { overlayController.open(sessionId, charterId) },
    withdrawalSignal: remoteLifetime.signal,
  }

  const open = async (): Promise<void> => {
    const health = await remote.health()
    if (!health.ok) throw new Error(`${health.error.code}: ${health.error.message}`)
    overlayController.open()
  }

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: UI_CONTRIBUTION_ID,
    order: 110,
    label: 'Work Charters',
    inject: () => ({ open }),
  }, WorkCharterGlobalAction))

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: UI_CONTRIBUTION_ID,
    order: -10,
    inject: () => ({ api }),
  }, WorkCharterSessionAction))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: UI_CONTRIBUTION_ID,
    order: 110,
    inject: () => ({ api }),
  }, WorkCharterOverlay))
}

type RemoteTransportResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

function unwrapRemote<T>(result: RemoteTransportResult<WorkCharterRemoteOutcome<T>>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  if (!result.value.ok) throw new Error(`${result.value.error.code}: ${result.value.error.message}`)
  return result.value.value
}

// Keep imported endpoint payloads in the generated Client declaration surface.
export type WorkCharterClientDto = WorkCharterDto
export type WorkCharterClientSessionId = SessionId
