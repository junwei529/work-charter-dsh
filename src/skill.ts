import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'

const SKILL_URL = new URL('../assets/work-charter-dsh.md', import.meta.url)

export async function registerWorkCharterSkill(ctx: Context): Promise<() => void> {
  const content = await readFile(SKILL_URL, 'utf8')
  return ctx.skills.register({
    name: 'work-charter',
    description: 'Bound consequential DSH work by outcome, authority, writer, evidence, recovery, and independent acceptance.',
    whenToUse: 'Use on direct Work Charter intent or clear continuity, writer, stale-evidence, recovery, authorization, or assessment symptoms in consequential DSH work. Do not trigger for a small task, one failure or correction, size or duration alone, or documentation or shell concerns without a policy symptom.',
    source: 'runtime',
    content,
    invocation: { modelInvocable: true, userInvocable: true },
    metadata: {
      upstreamVersion: '0.3.0',
      adaptation: 'work-charter-dsh',
    },
  })
}
