/* eslint-disable no-restricted-globals */
import type {
  AutomaticSpeechRecognitionPipeline,
  Tensor,
} from '@huggingface/transformers'
import type { PipelineOptionsFrom } from '@xsai-transformers/shared/types'
import type { WorkerMessageEvent } from './types'

import {
  full,
  pipeline,
  TextStreamer,
} from '@huggingface/transformers'
import defu from 'defu'
import { check } from 'gpuu/webgpu'

import { MessageStatus } from './types'

export type * from './types'

const MAX_NEW_TOKENS = 64
let asr: AutomaticSpeechRecognitionPipeline

async function base64ToFeatures(base64Audio: string): Promise<Float32Array> {
  // Decode base64 to binary
  const binaryString = atob(base64Audio)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  let samples: Int16Array

  // byte length of Int16Array should be a multiple of 2
  if (bytes.length % 2 !== 0) {
    samples = new Int16Array(bytes.buffer.slice(44))
  }
  else {
    samples = new Int16Array(bytes.buffer)
  }

  // Convert to Float32Array and normalize to [-1, 1]
  const audio = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    audio[i] = samples[i] / 32768.0
  }

  return audio
}

async function transcribe(audio: string, options: { language: string }) {
  if (!asr) {
    globalThis.postMessage({ type: 'error', data: { error: 'Model not loaded yet.' } } satisfies WorkerMessageEvent)
    return
  }

  try {
    const audioData = await base64ToFeatures(audio)

    const streamer = new TextStreamer(asr.tokenizer, {
      skip_prompt: true,
      decode_kwargs: {
        skip_special_tokens: true,
      },
    })

    const inputs = await asr.processor(audioData)
    const outputs = await asr.model.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      language: options.language,
      streamer,
    })

    const outputText = asr.tokenizer.batch_decode(outputs as Tensor, { skip_special_tokens: true })

    globalThis.postMessage({ type: 'transcribeResult', data: { output: { text: outputText.join('') } } } satisfies WorkerMessageEvent)
  }
  catch (err) {
    globalThis.postMessage({ type: 'error', data: { error: err } } satisfies WorkerMessageEvent)
  }
}

async function load(modelId: string, options?: PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>) {
  try {
    const device = ((await check()).supported) ? 'webgpu' : 'wasm'

    const opts = defu<PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>, PipelineOptionsFrom<typeof pipeline<'automatic-speech-recognition'>>[]>(options, {
      device,
      progress_callback: (progress) => {
        globalThis.postMessage({ type: 'progress', data: { progress } } satisfies WorkerMessageEvent)
      },
    })

    self.postMessage({ type: 'info', data: { message: `Using device: "${device}"` } } satisfies WorkerMessageEvent)
    self.postMessage({ type: 'info', data: { message: 'Loading models...' } } satisfies WorkerMessageEvent)

    // @ts-expect-error - TODO: TS2590: Expression produces a union type that is too complex to represent.
    asr = await pipeline('automatic-speech-recognition', modelId, opts)

    await asr.model.generate({
      input_features: full([1, 128, 3000], 0.0),
      max_new_tokens: 1,
    } as Record<string, unknown>)

    self.postMessage({ type: 'status', data: { status: MessageStatus.Ready, message: 'Ready!' } } satisfies WorkerMessageEvent)
  }
  catch (err) {
    self.postMessage({ type: 'error', data: { error: err } } satisfies WorkerMessageEvent)
    throw err
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerMessageEvent>) => {
  const { type, data } = event.data

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
        globalThis.postMessage({ type: 'error', data: { error: 'Invalid data format for transcribe message.' } } satisfies WorkerMessageEvent)
      }

      break
  }
})
