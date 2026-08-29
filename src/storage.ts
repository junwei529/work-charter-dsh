import { defineDomain, domainTable, type Domain } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import {
  WORK_CHARTER_STORAGE_SCHEMA_VERSION,
  WorkCharterDtoSchema,
  WorkCharterError,
  WorkCharterIdSchema,
  type WorkCharterDto,
  type WorkCharterId,
} from './types.ts'

export const WORK_CHARTER_STORAGE_DOMAIN_ID = 'work_charter_dsh'
export const WORK_CHARTER_STORAGE_PHYSICAL_VERSION = 1 as const
export const WORK_CHARTER_TABLE_ID = 'charters'

export interface WorkCharterStorageMetadata {
  readonly state: 'ready'
  readonly schemaVersion: 1
}

export const WorkCharterStorageMetadataSchema: z.ZodType<WorkCharterStorageMetadata> = z.object({
  state: z.literal('ready'),
  schemaVersion: z.literal(WORK_CHARTER_STORAGE_SCHEMA_VERSION),
}).strict().readonly()

const initialMetadata: WorkCharterStorageMetadata = Object.freeze({
  state: 'ready',
  schemaVersion: WORK_CHARTER_STORAGE_SCHEMA_VERSION,
})

export const workCharterDomainSpec = defineDomain({
  name: WORK_CHARTER_STORAGE_DOMAIN_ID,
  version: WORK_CHARTER_STORAGE_PHYSICAL_VERSION,
  global: {
    schema: WorkCharterStorageMetadataSchema,
    initial: initialMetadata,
  },
  tables: {
    [WORK_CHARTER_TABLE_ID]: domainTable<WorkCharterId, WorkCharterDto>(WorkCharterDtoSchema),
  },
} as const)

export type WorkCharterDomain = Domain<typeof workCharterDomainSpec>

export function assertWorkCharterStorageReady(domain: WorkCharterDomain): void {
  const metadata = WorkCharterStorageMetadataSchema.safeParse(domain.global.get())
  if (!metadata.success) {
    throw new WorkCharterError(
      'SCHEMA_INCOMPATIBLE',
      'work-charter-dsh storage metadata is not supported',
      false,
      'failed',
    )
  }
  for (const [key, charter] of domain.table(WORK_CHARTER_TABLE_ID).entries()) {
    const parsed = WorkCharterIdSchema.safeParse(key)
    if (!parsed.success || parsed.data !== charter.id) {
      throw new WorkCharterError(
        'SCHEMA_INCOMPATIBLE',
        `Charter table contains an incompatible key: ${String(key)}`,
        false,
        'failed',
      )
    }
    const row = WorkCharterDtoSchema.safeParse(charter)
    if (!row.success) {
      throw new WorkCharterError(
        'SCHEMA_INCOMPATIBLE',
        `Charter table contains an incompatible row for ${String(key)}`,
        false,
        'failed',
        { cause: row.error },
      )
    }
  }
}
