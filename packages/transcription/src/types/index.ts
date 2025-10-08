import type { pipeline } from '@huggingface/transformers'
import type { CreateProviderOptions } from '@xsai-ext/shared-providers'
import type { LoadOptions, PipelineOptionsFrom, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export interface LoadParams<T = PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>> {
  modelId: string
  options?: LoadOptions<T>
  task: string
}

export interface TranscriptionProviderOptions extends Omit<CreateProviderOptions, 'baseURL'> {
  baseURL?: string
  worker?: Worker
}

export type { ProgressInfo }

export interface TranscriptionWorkerParams {
  /**
   * Base64 encoded audio data.
   */
  audio: string
  options?: { language?: string }
}

export interface TranscriptionWorkerResults {
  text: string
}
