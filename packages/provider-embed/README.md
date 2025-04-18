# `@xsai-transformers/provider-embed`

Experimental provider implementation of [🤗 Transformers.js](https://github.com/huggingface/transformers.js) for [xsai](https://github.com/moeru-ai/xsai).

This enables you possibilities to use any models supported by [🤗 Transformers.js](https://github.com/huggingface/transformers.js) the feel of [xsai](https://github.com/moeru-ai/xsai) just like you are directly request OpenAI API but **pure locally within the browser**.

> This is also possible for runtime with WebGPU or Web Workers support, e.g. Node.js.

> [!WARNING]
>
> This haven't been released yet, it is currently only used by [Project AIRI](https://github.com/moeru-ai/airi)'s stage and memory layer, if you found this helpful, join us to discuss on [xsai #41](https://github.com/moeru-ai/xsai/issues/41).

## Example usage

```shell
ni @xsai-transformers/provider-embed -D # from @antfu/ni, can be installed via `npm i -g @antfu/ni`
pnpm i @xsai-transformers/provider-embed -D
yarn i @xsai-transformers/provider-embed -D
npm i @xsai-transformers/provider-embed -D
```

```ts
import { createEmbedProvider } from '@xsai-transformers/provider-embed'
import EmbedWorkerURL from '@xsai-transformers/provider-embed/worker?worker&url'
import { embed } from '@xsai/embed'

const embedProvider = createEmbedProvider({ baseURL: `xsai-transformers:///?worker-url=${embedWorkerURL}` })

const res = await embed({
  ...embedProvider.embed('Xenova/all-MiniLM-L6-v2'),
  input: 'Hello, world!',
})

console.log(res.embedding)
// {
//   embedding: Array<number>[768],
// }
```
