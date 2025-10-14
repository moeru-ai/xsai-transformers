import type { ChatProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { LoadOptionProgressCallback, LoadOptions } from '@xsai-transformers/shared/types'
import type { CommonRequestOptions } from '@xsai/shared'
import type { ChatOptions } from '@xsai/shared-chat'

import { merge } from '@moeru/std/merge'
import { createTransformersWorker } from '@xsai-transformers/shared/worker'

import type {
  ChatProviderOptions,
  ChatWorkerParams,
  ChatWorkerResults,
  TextGenerationPipelineOptions,
  TextGenerationPipelineRunOptions,
} from './types'

export type LoadableChatProvider<P, T = string, T2 = undefined> = P & {
  loadChat: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateChat: () => void
}

export const createChatProvider = <
  T extends string,
  T2 extends LoadOptions<TextGenerationPipelineOptions> & Omit<CommonRequestOptions, 'baseURL' | 'model'>,
>(createOptions: ChatProviderOptions): LoadableChatProvider<ChatProviderWithExtraOptions<T, T2>, T, T2> => {
  // If worker is provided directly, use it; otherwise extract from baseURL
  let workerOptions: { worker?: Worker, workerURL?: string | URL }

  if (createOptions.worker) {
    workerOptions = { worker: createOptions.worker }
  }
  else {
    if (!createOptions.baseURL) {
      throw new Error('baseURL is required when worker is not provided')
    }

    const workerURL = new URL(createOptions.baseURL).searchParams.get('worker-url')
    if (!workerURL) {
      throw new Error('worker-url is required when worker is not provided')
    }

    workerOptions = { workerURL }
  }

  const worker = createTransformersWorker(workerOptions)
  const loadChat = async (model: (string & {}) | T, options?: T2) => {
    let onProgress: LoadOptionProgressCallback | undefined
    if (options && 'onProgress' in options && typeof options.onProgress === 'function') {
      onProgress = options.onProgress
      delete options.onProgress
    }

    await worker.load({ modelId: model, options, task: 'text-generation' }, { onProgress })
  }

  const terminateChat = () => worker.dispose()

  return {
    chat: (model, options) => Object.assign(createOptions, {
      fetch: async (_: any, init: RequestInit) => {
        await loadChat(model, { onProgress: options?.onProgress } as LoadOptions<any>)

        const initBody = init.body?.toString() || '{}'
        const body: ChatOptions & LoadOptions<TextGenerationPipelineRunOptions> = JSON.parse(initBody)

        const processOptions = merge<LoadOptions<TextGenerationPipelineRunOptions>>({ }, options)
        const res = await worker.process<ChatWorkerParams, ChatWorkerResults>({ messages: body.messages, options: processOptions }, 'chat-completion')
        const encoder = new TextEncoder()
        return new Response(encoder.encode(JSON.stringify(res)))
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
    loadChat,
    terminateChat,
  }
}
