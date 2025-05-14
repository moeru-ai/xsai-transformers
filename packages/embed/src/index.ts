import type { FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { CreateProviderOptions, EmbedProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { LoadOptions } from '@xsai-transformers/shared/types'
import type { EmbedResponse } from '@xsai/embed'
import type { CommonRequestOptions } from '@xsai/shared'

import { createTransformersWorker } from '@xsai-transformers/shared/worker'
import defu from 'defu'

import type { Extract, ExtractResult, Load } from './types'

export type LoadableEmbedProvider<P, T = string, T2 = undefined> = P & {
  loadEmbed: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateEmbed: () => void
}

export const createEmbedProvider = <
  T extends string,
  T2 extends LoadOptions<FeatureExtractionPipelineOptions> & Omit<CommonRequestOptions, 'baseURL' | 'model'>,
>(createOptions: CreateProviderOptions): LoadableEmbedProvider<EmbedProviderWithExtraOptions<T, T2>, T, T2> => {
  if (!createOptions.baseURL) {
    throw new Error('baseURL is required')
  }

  const workerURL = new URL(createOptions.baseURL).searchParams.get('worker-url')
  if (!workerURL) {
    throw new Error('worker-url is required')
  }

  const worker = createTransformersWorker({ workerURL })
  const loadEmbed = async (model: (string & {}) | T, options?: T2) => worker.load<Load>({ data: { modelId: model, task: 'feature-extraction' }, type: 'load' }, options)
  const terminateEmbed = () => worker.dispose()

  return {
    embed: (model, options) => Object.assign(createOptions, {
      fetch: async (_: any, init: RequestInit) => {
        await loadEmbed(model)

        let text: string = ''
        const initBody = init.body?.toString() || '{}'
        const body: LoadOptions<FeatureExtractionPipelineOptions> & { input?: string } = JSON.parse(initBody)
        text = body.input || ''
        delete body.input
        delete body.onProgress

        const processOptions = defu<
          LoadOptions<FeatureExtractionPipelineOptions>,
          LoadOptions<FeatureExtractionPipelineOptions>[]
        >(options, { normalize: true, pooling: 'mean' })

        const res = await worker.process<Extract, ExtractResult>({ data: { options: processOptions, text }, type: 'extract' }, 'extractResult')
        const result = {
          data: [{ embedding: res.output.data, index: 0, object: 'embedding' }],
          model,
          object: 'list',
          usage: { prompt_tokens: 0, total_tokens: 0 },
        } satisfies EmbedResponse

        const encoder = new TextEncoder()
        return new Response(encoder.encode(JSON.stringify(result)))
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
    loadEmbed,
    terminateEmbed,
  }
}
