import type { pipeline } from '@huggingface/transformers'
import type { CreateProviderOptions } from '@xsai-ext/shared-providers'
import type { LoadOptions, PipelineOptionsFrom, PipelineSelfOptionsFrom, ProgressInfo } from '@xsai-transformers/shared/types'
import type { GenerateTextResponse } from '@xsai/generate-text'
import type { ChatOptions } from '@xsai/shared-chat'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type { ProgressInfo }

export interface ChatProviderOptions extends Omit<CreateProviderOptions, 'baseURL'> {
  baseURL?: string
  worker?: Worker
}
export interface ChatWorkerParams extends Partial<ChatOptions> {
  options?: TextGenerationPipelineRunOptions
}

export interface ChatWorkerResults extends GenerateTextResponse {

}

export interface LoadParams<T = TextGenerationPipelineOptions> {
  modelId: string
  options?: LoadOptions<T>
  task: string
}

export type TextGenerationPipelineOptions = PipelineOptionsFrom<typeof pipeline<'text-generation'>>

export type TextGenerationPipelineRunOptions = PipelineSelfOptionsFrom<typeof pipeline<'text-generation'>>
