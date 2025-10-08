import type { FeatureExtractionPipeline } from '@huggingface/transformers'
import type { PipelineOptionsFrom } from '@xsai-transformers/shared/types'

import { pipeline } from '@huggingface/transformers'
import { merge } from '@moeru/std/merge'
import { defineInvokeHandler, defineStreamInvokeHandler, toStreamHandler } from '@unbird/eventa'
import { createContext } from '@unbird/eventa/adapters/webworkers/worker'
import { isWebGPUSupported } from 'gpuu/webgpu'

import { extract, load } from '../shared'
import { MessageStatus } from '../types'

const { context } = createContext()

// eslint-disable-next-line @masknet/no-top-level
let embed: FeatureExtractionPipeline

// eslint-disable-next-line @masknet/no-top-level
defineInvokeHandler(context, extract, async ({ options, text }) => {
  const result = await embed(text, options)
  const resultArray = result.tolist()
  const embedding: number[] = Array.from(resultArray[0] || [])
  return { data: embedding, dims: result.dims }
})

// eslint-disable-next-line @masknet/no-top-level
defineStreamInvokeHandler(context, load, toStreamHandler(async ({ emit, payload: { modelId, options } }) => {
  const device = (await isWebGPUSupported()) ? 'webgpu' : 'wasm'

  const opts = merge<PipelineOptionsFrom<typeof pipeline<'feature-extraction'>>>({
    device,
    progress_callback: (p) => {
      emit({ data: { progress: p }, type: 'progress' })
    },
  }, options)

  emit({ data: { message: `Using device: "${device}"` }, type: 'info' })
  emit({ data: { message: 'Loading models...' }, type: 'info' })

  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore - TS2590: Expression produces a union type that is too complex to represent.
  embed = await pipeline('feature-extraction', modelId, opts)

  emit({ data: { message: 'Ready!', status: MessageStatus.Ready }, type: 'status' })
}))
