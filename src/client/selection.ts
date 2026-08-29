interface SelectableCharter {
  readonly id: string
  readonly target:
    | { readonly kind: 'session'; readonly sessionId: string }
    | { readonly kind: 'workstream' }
}

export function selectOverlayCharterId(
  rows: readonly SelectableCharter[],
  currentId: string | undefined,
  focusSessionId: string | undefined,
  focusCharterId: string | undefined,
): string | undefined {
  if (focusCharterId !== undefined) {
    return rows.find(row => row.id === focusCharterId)?.id
  }
  if (focusSessionId !== undefined) {
    return rows.find(row => row.target.kind === 'session' && row.target.sessionId === focusSessionId)?.id
  }
  return rows.find(row => row.id === currentId)?.id ?? rows[0]?.id
}
