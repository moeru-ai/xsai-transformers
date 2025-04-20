/* eslint-disable no-restricted-globals */
import type { FeatureExtractionPipeline, FeatureExtractionPipelineOptions } from '@huggingface/transformers'
import type { PipelineOptionsFrom } from '@xsai-transformers/shared/types'

import { pipeline } from '@huggingface/transformers'
import { defu } from 'defu'
import { check } from 'gpuu/webgpu'

import type { WorkerMessageEvent } from '../types'

import { MessageStatus } from '../types'

const isWebGPUSupported = async (): Promise<boolean> => {
  const result = await check()
  return result.supported
}

// eslint-disable-next-line @masknet/no-top-level
let embed: FeatureExtractionPipeline

const extract = async (text: string | string[], options?: FeatureExtractionPipelineOptions) => {
  const result = await embed(text, options)
  const resultArray = result.tolist()
  self.postMessage({ data: { input: { options, text }, output: { data: Array.from(resultArray[0] || []), dims: result.dims } }, type: 'extractResult' } satisfies WorkerMessageEvent)
}

const load = async (modelId: string, options?: Omit<PipelineOptionsFrom<typeof pipeline<'feature-extraction'>>, 'progress_callback'>) => {
  try {
    const device = (await isWebGPUSupported()) ? 'webgpu' : 'wasm'

    const opts = defu<PipelineOptionsFrom<typeof pipeline<'feature-extraction'>>, PipelineOptionsFrom<typeof pipeline<'feature-extraction'>>[]>(options, {
      device,
      progress_callback: (progress) => {
        self.postMessage({ data: { progress }, type: 'progress' } satisfies WorkerMessageEvent)
      },
    })

    self.postMessage({ data: { message: `Using device: "${device}"` }, type: 'info' } satisfies WorkerMessageEvent)
    self.postMessage({ data: { message: 'Loading models...' }, type: 'info' } satisfies WorkerMessageEvent)

    // @ts-expect-error - TS2590: Expression produces a union type that is too complex to represent.
    embed = await pipeline('feature-extraction', modelId, opts)

    self.postMessage({ data: { message: 'Ready!', status: MessageStatus.Ready }, type: 'status' } satisfies WorkerMessageEvent)
  }
  catch (err) {
    self.postMessage({ data: { error: err }, type: 'error' } satisfies WorkerMessageEvent)
    throw err
  }
}

// eslint-disable-next-line @masknet/no-top-level
self.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
  const { type } = event.data

  switch (type) {
    case 'extract':
      extract(event.data.data.text, event.data.data.options)
      break
    case 'load':
      load(event.data.data.modelId, event.data.data.options)
      break
  }
})
