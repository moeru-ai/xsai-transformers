import type { CreateProviderOptions, TranscriptionProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { GenerateTranscriptionResult } from '@xsai/generate-transcription'
import type { CommonRequestOptions } from '@xsai/shared'

import { encodeBase64 } from '@xsai-transformers/shared/base64'
import defu from 'defu'

import type { LoadOptionProgressCallback, LoadOptions, WorkerMessageEvent } from './types'

export type LoadableTranscriptionProvider<P, T = string, T2 = undefined> = P & {
  loadTranscribe: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateTranscribe: () => void
}

export const createTranscriptionProvider
= <T extends string, T2 extends LoadOptions & Omit<CommonRequestOptions, 'baseURL' | 'model'>>
(
  createOptions: CreateProviderOptions,
): LoadableTranscriptionProvider<TranscriptionProviderWithExtraOptions<T, T2>, T, T2> => {
  let worker: undefined | Worker
  let isReady = false
  let isLoading = false
  let _options: T2 | undefined

  const loadModel = async (model: (string & {}) | T, options?: T2) => {
    _options = options

    return new Promise<void>((resolve, reject) => {
      if (isReady) {
        resolve()
        return
      }

      try {
        let onProgress: LoadOptionProgressCallback | undefined
        if (options != null && 'onProgress' in options && options.onProgress != null) {
          onProgress = options?.onProgress
          delete options?.onProgress
        }

        if (!isLoading && !isReady && !worker) {
          try {
            const workerURL = new URL(createOptions.baseURL)
            const workerURLString = workerURL.searchParams.get('worker-url')

            if (!worker && workerURLString)
              worker = new Worker(workerURLString, { type: 'module' })
            if (!worker)
              throw new Error('Worker not initialized')

            worker.postMessage({ data: { modelId: model, options, task: 'automatic-speech-recognition' }, type: 'load' } satisfies WorkerMessageEvent)
          }
          catch (err) {
            isLoading = false
            reject(err)
            return
          }

          worker.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
            switch (event.data.type) {
              case 'error':
                isLoading = false
                reject(event.data.data.error)
                break
              case 'progress':
                if (onProgress != null && typeof onProgress === 'function') {
                  onProgress(event.data.data.progress)
                }

                break
            }
          })
        }

        worker?.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
          if (event.data.type !== 'status' || event.data.data.status !== 'ready')
            return

          isReady = true
          isLoading = false
          resolve()
        })
      }
      catch (err) {
        isLoading = false
        reject(err)
      }
    })
  }

  return {
    loadTranscribe: loadModel,
    terminateTranscribe: () => {
      if (!(worker))
        return
      worker.terminate()
      isReady = false
      isLoading = false
      worker = undefined
    },
    transcription: (model, options) => Object.assign(createOptions, {
      fetch: async (_: any, init: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          // eslint-disable-next-line @masknet/no-then, sonarjs/no-nested-functions
          loadModel(model, options).then(() => {
            if (!worker || !isReady) {
              reject(new Error('Model not loaded'))
              return
            }

            worker.addEventListener('error', (event: ErrorEvent) => {
              reject(event)
            })

            let file: Blob
            let formData: FormData

            try {
              // Extract the FormData from the request
              formData = init.body as FormData
              file = formData.get('file') as Blob

              if (!file) {
                reject(new Error('No file provided'))
                return
              }
            }
            catch (err) {
              reject(err)
              return
            }

            let errored = false
            let resultDone = false

            worker.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
              switch (event.data.type) {
                case 'error':
                  errored = true
                  reject(event.data.data.error)
                  break
                case 'transcribeResult':
                  resultDone = true

                  // eslint-disable-next-line no-case-declarations
                  const result = { text: event.data.data.output.text } satisfies GenerateTranscriptionResult
                  // eslint-disable-next-line no-case-declarations
                  const encoder = new TextEncoder()

                  resolve(new Response(encoder.encode(JSON.stringify(result))))

                  break
                default:
                  break
              }
            })

            if (!errored && !resultDone) {
              // Convert blob to arrayBuffer for processing
              // eslint-disable-next-line @masknet/no-then
              file.arrayBuffer().then((audioData) => {
                const base64 = encodeBase64(audioData)

                worker?.postMessage({
                  data: {
                    audio: base64,
                    options: defu(options, _options),
                  },
                  type: 'transcribe',
                } satisfies WorkerMessageEvent)
              }).catch(err => reject(err))
            }
          })
        })
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
  }
}
