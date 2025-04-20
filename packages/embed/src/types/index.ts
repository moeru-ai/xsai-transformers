import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { LoadOptions, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type { ProgressInfo }

export interface WorkerMessageBaseEvent<T, D> {
  data: D
  type: T
}

export type WorkerMessageEvent = {
  [K in keyof WorkerMessageEvents]: WorkerMessageBaseEvent<K, WorkerMessageEvents[K]>;
}[keyof WorkerMessageEvents]

export interface WorkerMessageEvents<T = FeatureExtractionPipelineOptions> {
  error: {
    error?: unknown
    message?: string
  }
  extract: {
    options?: FeatureExtractionPipelineOptions
    text: string | string[]
  }
  extractResult: {
    input: {
      options?: FeatureExtractionPipelineOptions
      text: string | string[]
    }
    output: {
      data: number[]
      dims: number[]
    }
  }
  info: {
    message: string
  }
  load: {
    modelId: string
    options?: LoadOptions<T>
    task: string
  }
  progress: {
    progress: ProgressInfo
  }
  status: {
    message?: string
    status: MessageStatus
  }
}
