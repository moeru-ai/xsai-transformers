import type { pipeline } from '@huggingface/transformers'
import type { PipelineOptionsFrom } from '@xsai-transformers/shared/types'

import type { ChatWorkerParams, ChatWorkerResults, LoadParams } from './types'

import { createLoadDefinition, createProcessDefinition } from '../../shared/src/worker/rpc'

export const load = createLoadDefinition<LoadParams<Omit<PipelineOptionsFrom<typeof pipeline<'text-generation'>>, 'progress_callback'>>>()
export const chatCompletion = createProcessDefinition<ChatWorkerParams, ChatWorkerResults>('chat-completion')
