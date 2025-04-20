/* eslint-disable no-restricted-globals */
import type {
  AutomaticSpeechRecognitionPipeline,
  Tensor,
} from '@huggingface/transformers'
import type { PipelineOptionsFrom } from '@xsai-transformers/shared/types'

import {
  full,
  pipeline,
  TextStreamer,
} from '@huggingface/transformers'
import { decodeBase64 } from '@xsai-transformers/shared/base64'
import defu from 'defu'
import { check } from 'gpuu/webgpu'

import type { WorkerMessageEvent } from './types'

import { MessageStatus } from './types'

export type * from './types'

const MAX_NEW_TOKENS = 64
// eslint-disable-next-line @masknet/no-top-level
let asr: AutomaticSpeechRecognitionPipeline

const base64ToFeatures = async (base64Audio: string): Promise<Float32Array> => {
  // Decode base64 to binary
  const bytes = decodeBase64(base64Audio)

  let samples: Int16Array

  // byte length of Int16Array should be a multiple of 2
  if (bytes.length % 2 !== 0) {
    // @ts-expect-error - ArrayBufferLike is absolutely Iterable<number>
    samples = Int16Array.from(bytes.buffer.slice(44))
  }
  else {
    // @ts-expect-error - ArrayBufferLike is absolutely Iterable<number>
    samples = Int16Array.from(bytes.buffer)
  }

  // Convert to Float32Array and normalize to [-1, 1]
  const audio = Float32Array.from(Array.from({ length: samples.length }))
  for (let i = 0; i < samples.length; i++) {
    audio[i] = samples[i] / 32768.0
  }

  return audio
}

const load = async (modelId: string, options?: PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>) => {
  try {
    const device = ((await check()).supported) ? 'webgpu' : 'wasm'

    const opts = defu<PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>, PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>[]>(options, {
      device,
      progress_callback: (progress) => {
        globalThis.postMessage({ data: { progress }, type: 'progress' } satisfies WorkerMessageEvent)
      },
    })

    self.postMessage({ data: { message: `Using device: "${device}"` }, type: 'info' } satisfies WorkerMessageEvent)
    self.postMessage({ data: { message: 'Loading models...' }, type: 'info' } satisfies WorkerMessageEvent)

    // @ts-expect-error - TS2590: Expression produces a union type that is too complex to represent.
    asr = await pipeline('automatic-speech-recognition', modelId, opts)

    await asr.model.generate({
      input_features: full([1, 128, 3000], 0.0),
      max_new_tokens: 1,
    } as Record<string, unknown>)

    self.postMessage({ data: { message: 'Ready!', status: MessageStatus.Ready }, type: 'status' } satisfies WorkerMessageEvent)
  }
  catch (err) {
    self.postMessage({ data: { error: err }, type: 'error' } satisfies WorkerMessageEvent)
    throw err
  }
}

const transcribe = async (audio: string, options: { language: string }) => {
  if (!asr) {
    globalThis.postMessage({ data: { error: 'Model not loaded yet.' }, type: 'error' } satisfies WorkerMessageEvent)
    return
  }

  try {
    const audioData = await base64ToFeatures(audio)

    const streamer = new TextStreamer(asr.tokenizer, {
      decode_kwargs: {
        skip_special_tokens: true,
      },
      skip_prompt: true,
    })

    const inputs = await asr.processor(audioData)
    const outputs = await asr.model.generate({
      ...inputs,
      language: options.language,
      max_new_tokens: MAX_NEW_TOKENS,
      streamer,
    })

    const outputText = asr.tokenizer.batch_decode(outputs as Tensor, { skip_special_tokens: true })

    globalThis.postMessage({ data: { output: { text: outputText.join('') } }, type: 'transcribeResult' } satisfies WorkerMessageEvent)
  }
  catch (err) {
    globalThis.postMessage({ data: { error: err }, type: 'error' } satisfies WorkerMessageEvent)
  }
}

// eslint-disable-next-line @masknet/no-top-level
self.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
  const { data, type } = event.data

  switch (type) {
    case 'load':
      load(event.data.data.modelId, event.data.data.options)
      break
    case 'transcribe':
      if ('audio' in data) {
        if (!('language' in data))
          data.options.language = 'english'

        transcribe(event.data.data.audio, event.data.data.options)
      }
      else {
        globalThis.postMessage({ data: { error: 'Invalid data format for transcribe message.' }, type: 'error' } satisfies WorkerMessageEvent)
      }

      break
  }
})
