import { defineInvoke, defineStreamInvoke } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/webworkers'
import { readableStreamToAsyncIterator } from '@moeru/std/async-iterator'

import type { LoadOptionProgressCallback } from '../types'
import type { LoadMessageEvents } from './events'

import { createLoadDefinition, createProcessDefinition } from './rpc'

export interface WorkerOptions {
  worker?: Worker
  workerURL?: string | undefined | URL
}

function getOnProgress(optionsMayHaveOnProgress?: null | { onProgress?: LoadOptionProgressCallback | null }): LoadOptionProgressCallback | undefined {
  if (optionsMayHaveOnProgress == null)
    return undefined
  if (typeof optionsMayHaveOnProgress !== 'object') {
    return undefined
  }
  if (typeof optionsMayHaveOnProgress.onProgress !== 'function') {
    return undefined
  }

  const onProgress = optionsMayHaveOnProgress.onProgress
  delete optionsMayHaveOnProgress.onProgress

  return onProgress
}

function getWorker(optionsMayHaveWorkerOrWorkerURL?: null | { worker?: null | Worker, workerURL?: null | string | URL }): Worker {
  if (optionsMayHaveWorkerOrWorkerURL == null)
    throw new TypeError('Either worker or workerURL is required')
  if (typeof optionsMayHaveWorkerOrWorkerURL !== 'object')
    throw new TypeError('Either worker or workerURL is required')

  if (optionsMayHaveWorkerOrWorkerURL.worker != null)
    return optionsMayHaveWorkerOrWorkerURL.worker

  if (optionsMayHaveWorkerOrWorkerURL.workerURL != null) {
    let workerURLString: null | string

    if (optionsMayHaveWorkerOrWorkerURL.workerURL instanceof URL) {
      workerURLString = optionsMayHaveWorkerOrWorkerURL.workerURL.searchParams.get('worker-url')
    }
    else if (typeof optionsMayHaveWorkerOrWorkerURL.workerURL === 'string') {
      workerURLString = optionsMayHaveWorkerOrWorkerURL.workerURL
    }
    else {
      throw new TypeError('Worker URL is required')
    }
    if (!workerURLString)
      throw new TypeError('Worker URL is required')

    return new Worker(workerURLString, { type: 'module' })
  }

  throw new TypeError('Either worker or workerURL is required')
}

export const createTransformersWorker = <
  T extends WorkerOptions,
  T2 extends { onProgress?: LoadOptionProgressCallback },
>(createOptions: T) => {
  let worker: undefined | Worker
  let workerContext: ReturnType<typeof createContext>['context'] | undefined

  let isReady = false
  let isLoading = false

  const load = async <Params>(payload?: Params, options?: T2) => {
    if (!payload)
      throw new Error('Payload is required')
    if (isReady) {
      return
    }

    try {
      if (!isLoading && !isReady && !worker) {
        worker = getWorker(createOptions)
        workerContext = createContext(worker).context

        const onProgress = getOnProgress(options)
        const load = defineStreamInvoke(workerContext, createLoadDefinition<Params>())
        const loading = readableStreamToAsyncIterator(load(payload))

        for await (const loadEvent of loading) {
          if (onProgress && loadEvent.data && loadEvent.type === 'progress') {
            onProgress(loadEvent.data.progress)
          }
        }
      }

      isReady = true
      isLoading = false
    }
    catch (err) {
      isLoading = false
      throw err
    }
  }

  const ensureLoadBeforeProcess = async (options?: T2 & { loadOptions?: { options?: T2, payload: LoadMessageEvents<any, string> } }) => {
    if (options != null && !options?.loadOptions)
      await load(options?.loadOptions?.payload, options?.loadOptions?.options)
  }

  const process = async <Params, Results>(payload: Params, onResultType: string, options?: T2 & { loadOptions?: { options?: T2, payload: LoadMessageEvents<any, string> } }) => {
    await ensureLoadBeforeProcess(options)
    if (!worker || !isReady) {
      throw new Error('Model not loaded')
    }

    const processDefinition = createProcessDefinition<Params, Results>(onResultType)
    const process = defineInvoke(workerContext!, processDefinition)
    return process(payload)
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
