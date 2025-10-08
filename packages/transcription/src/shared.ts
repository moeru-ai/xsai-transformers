import type { LoadOptionProgressCallback, ModelSpecificPretrainedOptions, PretrainedOptions } from '@xsai-transformers/shared/types'

import type { LoadParams, TranscriptionWorkerParams, TranscriptionWorkerResults } from './types'

import { createLoadDefinition, createProcessDefinition } from '../../shared/src/worker/rpc'

export const load = createLoadDefinition<LoadParams<Omit<ModelSpecificPretrainedOptions & PretrainedOptions, 'progress_callback'> & { language?: string } & { onProgress?: LoadOptionProgressCallback }>>()
export const transcribe = createProcessDefinition<TranscriptionWorkerParams, TranscriptionWorkerResults>('transcribe')
