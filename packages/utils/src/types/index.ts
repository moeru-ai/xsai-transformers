import type { AutoModel, PretrainedOptions, ProgressInfo } from '@huggingface/transformers'
import type { ModelSpecificPretrainedOptions } from './hub'

export * from './core'
export * from './devices'
export * from './dtypes'
export * from './hub'

export type PretrainedConfig = NonNullable<Parameters<typeof AutoModel.from_pretrained>[1]>['config']
export type PretrainedConfigFrom<T> = T extends { from_pretrained: (...args: any) => any } ? NonNullable<Parameters<T['from_pretrained']>[1]>['config'] : never
export type PipelineOptionsFrom<T> = T extends (...args: any) => any ? NonNullable<Parameters<T>[2]> : never

export type LoadOptions<T> = Omit<PretrainedOptions & ModelSpecificPretrainedOptions, 'progress_callback'> & { onProgress?: LoadOptionProgressCallback } & T
export type LoadOptionProgressCallback = (progress: ProgressInfo) => void | Promise<void>
