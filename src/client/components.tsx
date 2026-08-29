import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type {
  SessionId,
  WorkCharterDto,
  WorkCharterId,
} from 'work-charter-dsh/types'
import { overlayController } from './controller.ts'
import { selectOverlayCharterId } from './selection.ts'

export const UI_CONTRIBUTION_ID = 'work-charter-dsh'

export interface WorkCharterUiApi {
  readonly listCharters: (signal?: AbortSignal) => Promise<readonly WorkCharterDto[]>
  readonly listSessionCharters: (sessionId: SessionId, signal?: AbortSignal) => Promise<readonly WorkCharterDto[]>
  readonly open: (sessionId?: SessionId, charterId?: WorkCharterId) => void
  readonly withdrawalSignal: AbortSignal
}

export interface GlobalActionInjected { readonly open: () => Promise<void> }
export type WorkCharterGlobalActionProps = GlobalActionInjected & { readonly wide: boolean }

export function WorkCharterGlobalAction({ wide, open }: WorkCharterGlobalActionProps): ReactNode {
  return (
    <button
      type="button"
      data-testid="work-charter-dsh.action"
      aria-label="Open Work Charters"
      title="Work Charters"
      onClick={() => { void open().catch(logOpenFailure) }}
    >
      {wide ? 'Work Charters' : 'WC'}
    </button>
  )
}

export type WorkCharterSessionActionProps = {
  readonly sessionId: SessionId
  readonly api: WorkCharterUiApi
}

export function WorkCharterSessionAction({ sessionId, api }: WorkCharterSessionActionProps): ReactNode {
  const [charters, setCharters] = useState<readonly WorkCharterDto[]>([])
  const [unknown, setUnknown] = useState(false)

  useEffect(() => {
    let active = true
    let current: AbortController | undefined
    const refresh = async (): Promise<void> => {
      current?.abort()
      const controller = new AbortController()
      current = controller
      try {
        const rows = await api.listSessionCharters(sessionId, controller.signal)
        if (active) {
          setCharters(rows.filter(row => row.state === 'active' || row.state === 'paused'))
          setUnknown(false)
        }
      } catch {
        if (active && !controller.signal.aborted) setUnknown(true)
      }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5_000)
    return (): void => {
      active = false
      current?.abort()
      window.clearInterval(timer)
    }
  }, [api, sessionId])

  if (charters.length === 0 && !unknown) return null
  const paused = charters.some(charter => charter.state === 'paused')
  const label = unknown
    ? 'Work Charter state UNKNOWN'
    : `${String(charters.length)} Work Charter${charters.length === 1 ? '' : 's'} · ${paused ? 'PAUSED' : 'active'}`
  return (
    <button
      type="button"
      data-testid="work-charter-dsh.session-action"
      aria-label={label}
      title={label}
      onClick={() => {
        const focused = charters.find(charter => charter.state === 'active') ?? charters[0]
        api.open(sessionId, focused?.id)
      }}
    >
      {unknown ? 'WC ?' : paused ? 'WC paused' : `WC ${String(charters.length)}`}
    </button>
  )
}

export type WorkCharterOverlayProps = { readonly api: WorkCharterUiApi }

const BACKDROP_STYLE: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
  background: 'rgba(0, 0, 0, 0.3)', pointerEvents: 'auto',
}
const PANEL_STYLE: CSSProperties = {
  width: 'min(1040px, calc(100vw - 32px))', maxHeight: 'min(820px, calc(100vh - 32px))',
  overflow: 'auto', borderRadius: 12, background: 'Canvas', color: 'CanvasText',
  boxShadow: '0 18px 56px rgba(0, 0, 0, 0.3)', padding: 20, position: 'relative',
}
const GRID_STYLE: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'minmax(250px, 0.85fr) minmax(380px, 1.5fr)', gap: 18,
}
const ROW_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }

export function WorkCharterOverlay({ api }: WorkCharterOverlayProps): ReactNode {
  const overlay = useSyncExternalStore(
    overlayController.subscribe,
    overlayController.getSnapshot,
    overlayController.getSnapshot,
  )
  const [rows, setRows] = useState<readonly WorkCharterDto[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [filter, setFilter] = useState('')

  const selected = rows.find(row => row.id === selectedId)
  const visible = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase()
    return rows.filter(row => query === '' || JSON.stringify(row).toLocaleLowerCase().includes(query))
  }, [filter, rows])

  const run = useCallback(async (operation: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      await operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [])

  const load = useCallback(async (): Promise<void> => {
    const controller = new AbortController()
    const withdraw = (): void => { controller.abort() }
    api.withdrawalSignal.addEventListener('abort', withdraw, { once: true })
    try {
      const next = await api.listCharters(controller.signal)
      setRows(next)
      setSelectedId(current => selectOverlayCharterId(
        next,
        current,
        overlay.focusSessionId,
        overlay.focusCharterId,
      ))
    } finally {
      api.withdrawalSignal.removeEventListener('abort', withdraw)
    }
  }, [api, overlay.focusCharterId, overlay.focusSessionId])

  useEffect(() => {
    if (!overlay.open) return
    void run(load)
  }, [load, overlay.open, run])

  if (!overlay.open) return null

  return (
    <div
      data-testid="work-charter-dsh.overlay"
      data-contribution-id={UI_CONTRIBUTION_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Work Charters"
      style={BACKDROP_STYLE}
      onMouseDown={(event) => { if (event.target === event.currentTarget) overlayController.close() }}
    >
      <section style={PANEL_STYLE}>
        <button
          type="button" aria-label="Close Work Charters" data-testid="work-charter-dsh.close"
          onClick={() => { overlayController.close() }} style={{ position: 'absolute', right: 8, top: 8 }}
        >×</button>
        <h2>Work Charters</h2>
        <p>Host state is authoritative. This Remote panel is read-only and does not grant permissions.</p>
        {error === undefined ? null : <p role="alert">{error}</p>}
        <div style={GRID_STYLE}>
          <section>
            <div style={ROW_STYLE}>
              <input aria-label="Filter Charters" value={filter} onChange={event => { setFilter(event.target.value) }} />
              <button type="button" disabled={busy} onClick={() => { void run(load) }}>Refresh</button>
            </div>
            <ul>
              {visible.map(charter => (
                <li key={charter.id}>
                  <button type="button" onClick={() => { setSelectedId(charter.id) }}>
                    {charter.managedWorkstream} · {charter.state} · r{charter.revision}
                  </button>
                </li>
              ))}
            </ul>
            {visible.length === 0 ? <p>No matching Charters.</p> : null}
          </section>
          <section>
            {selected === undefined ? <p>No Charter selected.</p> : (
              <>
                <h3>{selected.managedWorkstream}</h3>
                <p>
                  <strong>{selected.state.toUpperCase()}</strong> · revision {selected.revision}
                  {' · '}authority {selected.authority.state}/r{selected.authority.revision}
                  {' · '}writer {selected.writer?.sessionId ?? 'none'}
                </p>
                <h4>Authoritative DTO</h4>
                <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(selected, null, 2)}</pre>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

function logOpenFailure(error: unknown): void {
  console.error('work-charter-dsh action failed to open', error)
}
