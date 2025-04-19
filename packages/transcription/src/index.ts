import type { CreateProviderOptions, TranscriptionProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { GenerateTranscriptionResult } from '@xsai/generate-transcription'
import type { CommonRequestOptions } from '@xsai/shared'
import type { LoadOptionProgressCallback, LoadOptions, WorkerMessageEvent } from './worker'

import defu from 'defu'

export type LoadableTranscriptionProvider<P, T = string, T2 = undefined> = P & {
  loadTranscribe: (model: (string & {}) | T, options?: T2) => Promise<void>
  terminateTranscribe: () => void
}

export function createTranscriptionProvider<T extends string, T2 extends Omit<CommonRequestOptions, 'baseURL' | 'model'> & LoadOptions>(createOptions: CreateProviderOptions): LoadableTranscriptionProvider<TranscriptionProviderWithExtraOptions<T, T2>, T, T2> {
  let worker: Worker
  let isReady = false
  let _options: T2

  function loadModel(model: (string & {}) | T, options?: T2) {
    _options = options

    return new Promise<void>((resolve, reject) => {
      if (isReady) {
        resolve()
        return
      }

      let onProgress: LoadOptionProgressCallback | undefined
      if (options != null && 'onProgress' in options && options.onProgress != null) {
        onProgress = options?.onProgress
        delete options?.onProgress
      }

      try {
        const workerURL = new URL(createOptions.baseURL)

        if (!worker)
          worker = new Worker(workerURL.searchParams.get('worker-url')!, { type: 'module' })
        if (!worker)
          throw new Error('Worker not initialized')

        worker.postMessage({ type: 'load', data: { modelId: model, task: 'feature-extraction', options } } satisfies WorkerMessageEvent)
      }
      catch (err) {
        reject(err)
      }

      worker.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
        switch (event.data.type) {
          case 'error':
            reject(event.data.data.error)
            break
          case 'status':
            if (event.data.data.status === 'ready') {
              isReady = true
              resolve()
            }

            break
          case 'progress':
            if (onProgress != null && typeof onProgress === 'function') {
              onProgress(event.data.data.progress)
            }

            break
        }
      })
    })
  }

  return {
    transcription: (model, options) => Object.assign(createOptions, {
      fetch: (_, init: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
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
              file.arrayBuffer().then((audioData) => {
                const base64 = btoa(
                  new Uint8Array(audioData)
                    .reduce((data, byte) => data + String.fromCharCode(byte), ''),
                )

                worker.postMessage({
                  type: 'transcribe',
                  data: {
                    audio: base64,
                    options: defu(options, _options),
                  },
                } satisfies WorkerMessageEvent)
              }).catch(err => reject(err))
            }
          })
        })
      },
    }) as unknown as Omit<CommonRequestOptions, 'baseURL'> & Partial<T2> as any,
    loadTranscribe: loadModel,
    terminateTranscribe: () => {
      if (worker) {
        worker.terminate()
        worker = undefined
      }
    },
  }
}
