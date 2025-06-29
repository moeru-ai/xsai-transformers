import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { EmbedProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { LoadOptionProgressCallback, LoadOptions } from '@xsai-transformers/shared/types'
import type { EmbedResponse } from '@xsai/embed'
import type { CommonRequestOptions } from '@xsai/shared'

import { merge } from '@moeru/std/merge'
import { createTransformersWorker } from '@xsai-transformers/shared/worker'

import type { EmbedProviderOptions, Extract, ExtractResult, Load } from './types'

export type LoadableEmbedProvider<P, T = string, T2 = undefined> = P & {
  loadEmbed: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateEmbed: () => void
}

export const createEmbedProvider = <
  T extends string,
  T2 extends LoadOptions<FeatureExtractionPipelineOptions> & Omit<CommonRequestOptions, 'baseURL' | 'model'>,
>(createOptions: EmbedProviderOptions): LoadableEmbedProvider<EmbedProviderWithExtraOptions<T, T2>, T, T2> => {
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
  const loadEmbed = async (model: (string & {}) | T, options?: T2) => {
    let onProgress: LoadOptionProgressCallback | undefined
    if (options && 'onProgress' in options && typeof options.onProgress === 'function') {
      onProgress = options.onProgress
      delete options.onProgress
    }

    return worker.load<Load>({ data: { modelId: model, options, task: 'feature-extraction' }, type: 'load' }, { onProgress })
  }
  const terminateEmbed = () => worker.dispose()

  return {
    embed: (model, options) => Object.assign(createOptions, {
      fetch: async (_: any, init: RequestInit) => {
        await loadEmbed(model)

        let text: string = ''
        const initBody = init.body?.toString() || '{}'
        let body: LoadOptions<FeatureExtractionPipelineOptions> & { input?: string } = {}
        try {
          body = JSON.parse(initBody)
        } catch (e) {
          // ignore
        }
        text = body.input || ''
        delete body.input
        delete body.onProgress

        const processOptions = merge<LoadOptions<FeatureExtractionPipelineOptions>>({ normalize: true, pooling: 'mean' }, options)

        const res = await worker.process<Extract, ExtractResult>({
          data: { options: processOptions, text },
          type: 'extract',
        }, 'extractResult')
        const result: EmbedResponse = {
          data: [{ embedding: res.output.data, index: 0, object: 'embedding' }],
          model,
          object: 'list',
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }

        const encoder = new TextEncoder()
        return new Response(encoder.encode(JSON.stringify(result)))
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
    loadEmbed,
    terminateEmbed,
  }
}
