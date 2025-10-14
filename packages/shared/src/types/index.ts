import type { AutoModel, PretrainedOptions, ProgressInfo } from '@huggingface/transformers'

import type { ModelSpecificPretrainedOptions } from './hub'

export * from './core'
export * from './devices'
export * from './dtypes'
export * from './hub'

export type LoadOptionProgressCallback = (progress: ProgressInfo) => Promise<void> | void
export type LoadOptions<T> = Omit<ModelSpecificPretrainedOptions & PretrainedOptions, 'progress_callback'> & T & { onProgress?: LoadOptionProgressCallback }
export type PipelineOptionsFrom<T> = T extends (...args: any) => any ? NonNullable<Parameters<T>[2]> : never
export type PipelineSelfOptionsFrom<T> = T extends (...args: any) => Promise<(infer R)> ? R extends (...args: any) => any ? NonNullable<Parameters<R>[1]> : never : never

export type PretrainedConfig = NonNullable<Parameters<typeof AutoModel.from_pretrained>[1]>['config']
export type PretrainedConfigFrom<T> = T extends { from_pretrained: (...args: any) => any } ? NonNullable<Parameters<T['from_pretrained']>[1]>['config'] : never
