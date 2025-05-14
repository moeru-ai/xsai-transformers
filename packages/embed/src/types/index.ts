import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { LoadOptions, ProgressInfo } from '@xsai-transformers/shared/types'

export enum MessageStatus {
  Loading = 'loading',
  Ready = 'ready',
}

export type { ProgressInfo }

export interface Extract {
  options?: FeatureExtractionPipelineOptions
  text: string | string[]
}

export interface ExtractResult {
  input: {
    options?: FeatureExtractionPipelineOptions
    text: string | string[]
  }
  output: {
    data: number[]
    dims: number[]
  }
}

export interface Load<T = FeatureExtractionPipelineOptions> {
  modelId: string
  options?: LoadOptions<T>
  task: string
}
