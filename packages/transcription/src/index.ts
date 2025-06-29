import type { CreateProviderOptions, TranscriptionProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { LoadOptionProgressCallback } from '@xsai-transformers/shared/types'
import type { GenerateTranscriptionResult } from '@xsai/generate-transcription'
import type { CommonRequestOptions } from '@xsai/shared'

import { encodeBase64 } from '@moeru/std/base64'

import type { Load, LoadOptions, Transcribe, TranscribeResult } from './types'

import { createTransformersWorker } from '../../shared/src/worker/worker'

export type LoadableTranscriptionProvider<P, T = string, T2 = undefined> = P & {
  loadTranscribe: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateTranscribe: () => void
}

export const createTranscriptionProvider
= <T extends string, T2 extends LoadOptions & Omit<CommonRequestOptions, 'baseURL' | 'model'>>
(
  createOptions: CreateProviderOptions,
): LoadableTranscriptionProvider<TranscriptionProviderWithExtraOptions<T, T2>, T, T2> => {
  if (!createOptions.baseURL) {
    throw new Error('baseURL is required')
  }

  const workerURL = new URL(createOptions.baseURL).searchParams.get('worker-url')
  if (!workerURL) {
    throw new Error('worker-url is required')
  }

  const worker = createTransformersWorker({ workerURL })

  const loadModel = async (model: (string & {}) | T, options?: T2) => {
    let onProgress: LoadOptionProgressCallback | undefined
    if (options && 'onProgress' in options && typeof options.onProgress === 'function') {
      onProgress = options.onProgress
      delete options.onProgress
    }

    return worker.load<Load>({ data: { modelId: model, options, task: 'automatic-speech-recognition' }, type: 'load' }, { onProgress })
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

        const res = await worker.process<Transcribe, TranscribeResult>({
          data: { audio: base64, options },
          type: 'transcribe',
        }, 'transcribeResult')

        // TODO: GenerateTranscriptionResult should be typed based on options
        const result: GenerateTranscriptionResult = {
          duration: 0, // Not supported yet
          language: options?.language ?? '', // Reflect the language used from options
          segments: [], // Not supported yet
          text: res.output.text,
          words: [], // Not supported yet
        }

        const encoder = new TextEncoder()
        return new Response(encoder.encode(JSON.stringify(result)))
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
  }
}
