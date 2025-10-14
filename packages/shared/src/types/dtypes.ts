import type { pipeline } from '@huggingface/transformers'

export type DType = DTypeItem | Record<string, DTypeItem>
export type DTypeItem = Exclude<NonNullable<Required<Parameters<typeof pipeline>>[2]['dtype']>, string>[string]
