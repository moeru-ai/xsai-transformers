# xsAI 🤗 Transformers.js Provider

> [Playground in Browser](https://xsai-transformers.netlify.app/#/)

A special [Transformers.js](https://huggingface.co/docs/transformers.js/en/index) provider for [`xsai`](https://github.com/moeru-ai/xsai), the extra-small AI SDK. Capable of performing tasks of
embedding, transcriptions, speech synthesis, and text generations right in the browser (Node.js supported too).

<!-- automd:badges name="xsai" provider="badgen" color="cyan" license bundlephobia -->

[![npm version](https://flat.badgen.net/npm/v/xsai-transformers?color=cyan)](https://npmjs.com/package/xsai-transformers)
[![npm downloads](https://flat.badgen.net/npm/dm/xsai-transformers?color=cyan)](https://npm.chart.dev/xsai-transformers)
[![bundle size](https://flat.badgen.net/bundlephobia/minzip/xsai-transformers?color=cyan)](https://bundlephobia.com/package/xsai-transformers)
[![license](https://flat.badgen.net/github/license/moeru-ai/xsai-transformers?color=cyan)](https://github.com/moeru-ai/xsai-transformers/blob/main/LICENSE.md)

<!-- /automd -->

xsAI Transformers.js Provider aligned the API of xsAI:

```ts
import { createEmbedProvider } from '@xsai-transformers/embed'
import embedWorkerURL from '@xsai-transformers/embed/worker?worker&url'
import { embed } from '@xsai/embed'

const transformers = createEmbedProvider({ baseURL: `xsai-transformers:///?worker-url=${embedWorkerURL}` })

// [
//   -0.038177140057086945,
//   0.032910916954278946,
//   -0.005459371022880077,
//   // ...
// ]
const { embedding } = await embed({
  ...transformers.embed('Xenova/all-MiniLM-L6-v2'),
  input: 'sunny day at the beach'
})
```

## Features

`xsai-transformers` is just a wrapper for [🤗 Transformers.js](https://huggingface.co/docs/transformers.js/en/index). Any HuggingFace available models are possible to inference with if ONNX format of model is prepared.

While enjoying the lightweight size and compositing of APIs from xsAI, we made every possible `xsai-transformers` sub-providers (embedding, transcription, speech) compatible to existing xsAI implementation, this means, for either `xsai` or `@xsai/generate-transcription`, `@xsai/embed`, there is no need to re-write everything to get on hands of `xsai-transformers`, the only needed thing is to install and go.

### Runtime-agnostic

`xsai-transformers` doesn't depend on WebGPU or Browser Built-in Modules, it works well in Node.js and other runtimes, as long as Worker thread of WebGPU are ported and supported..

## Usage

### Install

> Just like xsAI's atomic design of every feature, you can also install only some of the utils of `xsai-transformers`, such as `@xsai-transformers/embed` and `@xsai-transformers/transcription`.

<!-- automd:pm-install name="xsai" auto=false -->

```sh
# npm
npm install xsai-transformers

# yarn
yarn add xsai-transformers

# pnpm
pnpm install xsai-transformers

# bun
bun install xsai-transformers

# deno
deno install xsai-transformers
```

<!-- /automd -->

### Examples

###### Embedding [(see above)](#xsai--transformersjs-provider)

###### Transcription

```ts
import { createTranscriptionProvider } from '@xsai-transformers/transcription'
import transcriptionWorkerURL from '@xsai-transformers/transcription/worker?worker&url'
import { generateTranscription } from '@xsai/generate-transcription'

const transformers = createTranscriptionProvider({ baseURL: `xsai-transformers:///?worker-url=${transcriptionWorkerURL}}` })
const file: File = undefined // Audio file
const { text } = await generateTranscription({ ...transformers.transcribe('onnx-community/whisper-large-v3-turbo'), file })
```

### Status

xsAI [Transformers.js](https://huggingface.co/docs/transformers.js/en/index) is currently in an early stage of development and may introduce breaking changes at any time.

## License

[MIT](LICENSE.md)
