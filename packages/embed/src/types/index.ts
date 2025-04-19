import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { LoadOptions, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type { ProgressInfo }

export interface WorkerMessageBaseEvent<T, D> {
  type: T
  data: D
}

export interface WorkerMessageEvents<T = FeatureExtractionPipelineOptions> {
  load: {
    task: string
    modelId: string
    options?: LoadOptions<T>
  }
  error: {
    error?: unknown
    message?: string
  }
  status: {
    status: MessageStatus
    message?: string
  }
  info: {
    message: string
  }
  progress: {
    progress: ProgressInfo
  }
  extract: {
    text: string | string[]
    options?: FeatureExtractionPipelineOptions
  }
  extractResult: {
    input: {
      text: string | string[]
      options?: FeatureExtractionPipelineOptions
    }
    output: {
      data: number[]
      dims: number[]
    }
  }
}

export type WorkerMessageEvent = {
  [K in keyof WorkerMessageEvents]: WorkerMessageBaseEvent<K, WorkerMessageEvents[K]>;
}[keyof WorkerMessageEvents]
