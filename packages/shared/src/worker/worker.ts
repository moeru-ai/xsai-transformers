import type { ProgressInfo } from '@huggingface/transformers'

import type { LoadOptionProgressCallback } from '../types'

export type ErrorMessageEvents<E = unknown>
  = | WorkerMessageEvent<{ error?: E, message?: string }, 'error'>

export type LoadMessageEvents<D = undefined, T extends string = string, E = unknown>
  = | ErrorMessageEvents<E>
    | WorkerMessageEvent<D, T>
    | WorkerMessageEvent<{ message: string }, 'info'>
    | WorkerMessageEvent<{ message?: string, status: 'loading' | 'ready' }, 'status'>
    | WorkerMessageEvent<{ progress: ProgressInfo }, 'progress'>

export type ProcessMessageEvents<D = unknown, T = unknown, E = unknown>
  = | ErrorMessageEvents<E>
    | WorkerMessageEvent<D, T>

export interface WorkerMessageEvent<D, T> {
  data: D
  type: T
}

export type WorkerMessageEvents<D = undefined, T extends string = string>
  = | LoadMessageEvents<D, T>
    | ProcessMessageEvents<D, T>

export interface WorkerOptions {
  worker?: Worker
  workerURL?: string | undefined | URL
}

export const createTransformersWorker = <
  T extends WorkerOptions,
  T2 extends { onProgress?: LoadOptionProgressCallback },
>(createOptions: T) => {
  let worker: undefined | Worker
  let isReady = false
  let isLoading = false

  const load = async <D = unknown, E extends WorkerMessageEvent<D, string> = WorkerMessageEvent<D, string>>(payload?: E, options?: T2) => {
    if (!payload)
      throw new Error('Payload is required')

    return new Promise<void>((resolve, reject) => {
      /* eslint-disable sonarjs/cognitive-complexity */
      if (!createOptions.worker && !createOptions.workerURL)
        throw new Error('Either worker or workerURL is required')

      if (isReady) {
        resolve()
        return
      }

      try {
        let onProgress: LoadOptionProgressCallback | undefined
        if (options?.onProgress != null) {
          onProgress = options?.onProgress
          delete options?.onProgress
        }

        if (!isLoading && !isReady && !worker) {
          if (createOptions.worker) {
            worker = createOptions.worker
          }
          else {
            let workerURLString: null | string
            if (createOptions.workerURL instanceof URL) {
              const workerURL = new URL(createOptions.workerURL)
              workerURLString = workerURL.searchParams.get('worker-url')
            }
            else {
              workerURLString = createOptions.workerURL ?? null
            }
            if (!workerURLString)
              throw new Error('Worker URL is required')

            worker = new Worker(workerURLString, { type: 'module' })
          }

          if (!worker)
            throw new Error('Worker not initialized')

          worker.postMessage(payload)

          worker.addEventListener('message', (event: MessageEvent<E>) => {
            switch (event.data.type) {
              case 'error':
                isLoading = false
                reject((event.data.data as { error?: unknown }).error)
                break
              case 'progress':
                if (onProgress != null && typeof onProgress === 'function') {
                  onProgress((event.data.data as unknown as { progress: ProgressInfo }).progress)
                }

                break
            }
          })
        }

        worker!.addEventListener('message', (event: MessageEvent<E>) => {
          if (event.data.type !== 'status' || (event.data.data as unknown as { status: 'loading' | 'ready' }).status !== 'ready')
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

  const ensureLoadBeforeProcess = async (options?: T2 & { loadOptions?: { options?: T2, payload: LoadMessageEvents<any, string> } }) => {
    if (options != null && !options?.loadOptions)
      await load(options?.loadOptions?.payload, options?.loadOptions?.options)
  }

  const process = <ID = unknown, OD = unknown, E extends { data: ID, type: string } = { data: any, type: string }>(payload: E, onResultType: string, options?: T2 & { loadOptions?: { options?: T2, payload: LoadMessageEvents<any, string> } }) => {
    return new Promise<OD>((resolve, reject) => {
      ensureLoadBeforeProcess(options).then(() => {
        if (!worker || !isReady) {
          reject(new Error('Model not loaded'))
          return
        }

        // eslint-disable-next-line sonarjs/no-nested-functions
        worker.addEventListener('error', (event: ErrorEvent) => {
          reject(event)
        })

        let errored = false
        let resultDone = false

        // eslint-disable-next-line sonarjs/no-nested-functions
        worker.addEventListener('message', (event: MessageEvent<{ data: OD, type: string }>) => {
          switch (event.data.type) {
            case 'error':
              errored = true
              reject((event.data.data as unknown as { error?: unknown })?.error)
              break
            case onResultType:
              resultDone = true
              resolve(event.data.data)
              break
            default:
              break
          }
        })

        if (!errored && !resultDone) {
          worker?.postMessage(payload)
        }
      })
    })
  }

  return {
    dispose: () => {
      if (!(worker))
        return
      worker.terminate()
      isReady = false
      isLoading = false
      worker = undefined
    },
    load,
    process,
  }
}
