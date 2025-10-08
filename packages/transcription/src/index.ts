import type { pipeline } from '@huggingface/transformers'
import type { TranscriptionProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { LoadOptionProgressCallback, LoadOptions, PipelineOptionsFrom } from '@xsai-transformers/shared/types'
import type { GenerateTranscriptionResult } from '@xsai/generate-transcription'
import type { CommonRequestOptions } from '@xsai/shared'

import { encodeBase64 } from '@moeru/std/base64'

import type { TranscriptionProviderOptions, TranscriptionWorkerParams, TranscriptionWorkerResults } from './types'

import { createTransformersWorker } from '../../shared/src/worker/worker'

export type LoadableTranscriptionProvider<P, T = string, T2 = undefined> = P & {
  loadTranscribe: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateTranscribe: () => void
}

export const createTranscriptionProvider = <
  T extends string,
  T2 extends LoadOptions<PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>> & Omit<CommonRequestOptions, 'baseURL' | 'model'> & { language?: string },
>(createOptions: TranscriptionProviderOptions): LoadableTranscriptionProvider<TranscriptionProviderWithExtraOptions<T, T2>, T, T2> => {
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
  const loadModel = async (model: (string & {}) | T, options?: T2) => {
    let onProgress: LoadOptionProgressCallback | undefined
    if (options && 'onProgress' in options && typeof options.onProgress === 'function') {
      onProgress = options.onProgress
      delete options.onProgress
    }

    await worker.load({ modelId: model, options, task: 'automatic-speech-recognition' }, { onProgress })
  }
  const terminateTranscribe = () => worker.dispose()

  return {
    loadTranscribe: loadModel,
    terminateTranscribe,
    transcription: (model, options) => Object.assign(createOptions, {
      fetch: async (_: any, init: RequestInit) => {
        await loadModel(model, options)

        // Extract the FormData from the request
        const formData = init.body as FormData
        const file = formData.get('file') as Blob
        if (!file) {
          throw new Error('No file provided')
        }

        // Convert blob to arrayBuffer for processing
        const buffer = await file.arrayBuffer()
        const base64 = encodeBase64(buffer)

        const res = await worker.process<TranscriptionWorkerParams, TranscriptionWorkerResults>({ audio: base64, options }, 'transcribe')
        // TODO: GenerateTranscriptionResult should be typed based on options
        const result: GenerateTranscriptionResult = {
          duration: undefined as never,
          language: undefined as never,
          segments: undefined as never,
          text: res.text,
          words: undefined as never,
        }

        const encoder = new TextEncoder()
        return new Response(encoder.encode(JSON.stringify(result)))
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
  }
}
