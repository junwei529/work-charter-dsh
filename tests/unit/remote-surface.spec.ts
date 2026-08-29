import { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { describe, expect, it } from 'vitest'
import { WorkCharterService } from 'work-charter-dsh'

describe('Work Charter Remote surface', () => {
  it('exposes only read-only browser operations', async () => {
    const ctx = new Context()
    try {
      const service = new WorkCharterService(ctx)
      expect(remoteMethods(service).map(marker => marker.exportName ?? marker.method)).toEqual([
        'health',
        'chartersList',
        'chartersGet',
        'sessionChartersList',
      ])
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
