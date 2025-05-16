import type { LoadOptionProgressCallback, ModelSpecificPretrainedOptions, PretrainedOptions, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export interface Load {
  modelId: string
  options?: LoadOptions
  task: string
}

export type LoadOptions = Omit<ModelSpecificPretrainedOptions & PretrainedOptions, 'progress_callback'> & { language?: string } & { onProgress?: LoadOptionProgressCallback }
export type { ProgressInfo }

export interface Transcribe {
  /**
   * Base64 encoded audio data.
   */
  audio: string
  options: { language: string }
}

export interface TranscribeResult {
  output: {
    text: string
  }
}
