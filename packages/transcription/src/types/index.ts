import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { ModelSpecificPretrainedOptions, PretrainedOptions, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type LoadOptionProgressCallback = (progress: ProgressInfo) => Promise<void> | void
export type LoadOptions = FeatureExtractionPipelineOptions & Omit<ModelSpecificPretrainedOptions & PretrainedOptions, 'progress_callback'> & { onProgress?: LoadOptionProgressCallback }
export type { ProgressInfo }

export interface WorkerMessageBaseEvent<T, D> {
  data: D
  type: T
}

export type WorkerMessageEvent = {
  [K in keyof WorkerMessageEvents]: WorkerMessageBaseEvent<K, WorkerMessageEvents[K]>;
}[keyof WorkerMessageEvents]

export interface WorkerMessageEvents {
  error: {
    error?: unknown
    message?: string
  }
  info: {
    message: string
  }
  load: {
    modelId: string
    options?: LoadOptions
    task: string
  }
  progress: {
    progress: ProgressInfo
  }
  status: {
    message?: string
    status: MessageStatus
  }
  transcribe: {
    audio: string
    options?: any
  }
  transcribeResult: {
    output: {
      text: string
    }
  }
}
