export interface OverlaySnapshot {
  readonly open: boolean
  readonly focusSessionId?: string | undefined
  readonly focusCharterId?: string | undefined
}

type Listener = () => void

class WorkCharterOverlayController {
  private snapshot: OverlaySnapshot = Object.freeze({ open: false })
  private readonly listeners = new Set<Listener>()

  readonly getSnapshot = (): OverlaySnapshot => this.snapshot

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  open(focusSessionId?: string, focusCharterId?: string): void {
    this.setSnapshot({
      open: true,
      ...(focusSessionId === undefined ? {} : { focusSessionId }),
      ...(focusCharterId === undefined ? {} : { focusCharterId }),
    })
  }

  close(): void {
    this.setSnapshot({ open: false })
  }

  reset(): void {
    this.setSnapshot({ open: false })
  }

  private setSnapshot(snapshot: OverlaySnapshot): void {
    if (this.snapshot.open === snapshot.open
      && this.snapshot.focusSessionId === snapshot.focusSessionId
      && this.snapshot.focusCharterId === snapshot.focusCharterId) return
    this.snapshot = Object.freeze(snapshot)
    for (const listener of [...this.listeners]) listener()
  }
}

export const overlayController = new WorkCharterOverlayController()
