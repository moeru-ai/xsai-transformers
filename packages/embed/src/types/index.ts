import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { CreateProviderOptions } from '@xsai-ext/shared-providers'
import type { LoadOptions, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type { ProgressInfo }

export interface EmbedProviderOptions extends Omit<CreateProviderOptions, 'baseURL'> {
  baseURL?: string
  worker?: Worker
}

export interface EmbedWorkerParams {
  options?: FeatureExtractionPipelineOptions
  text: string | string[]
}

export interface EmbedWorkerResults {
  data: number[]
  dims: number[]
}

export interface LoadParams<T = FeatureExtractionPipelineOptions> {
  modelId: string
  options?: LoadOptions<T>
  task: string
}
