import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { ModelSpecificPretrainedOptions, PretrainedOptions, ProgressInfo } from '@xsai-transformers/utils/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type LoadOptions = Omit<PretrainedOptions & ModelSpecificPretrainedOptions, 'progress_callback'> & { onProgress?: LoadOptionProgressCallback } & FeatureExtractionPipelineOptions
export type LoadOptionProgressCallback = (progress: ProgressInfo) => void | Promise<void>
export type { ProgressInfo }

export interface WorkerMessageBaseEvent<T, D> {
  type: T
  data: D
}

export interface WorkerMessageEvents {
  load: {
    task: string
    modelId: string
    options?: LoadOptions
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

export type WorkerMessageEvent = {
  [K in keyof WorkerMessageEvents]: WorkerMessageBaseEvent<K, WorkerMessageEvents[K]>;
}[keyof WorkerMessageEvents]
