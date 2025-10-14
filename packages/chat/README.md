# `@xsai-transformers/chat`

Experimental provider implementation of [🤗 Transformers.js](https://github.com/huggingface/transformers.js) for [xsai](https://github.com/moeru-ai/xsai).

This enables you possibilities to use any models supported by [🤗 Transformers.js](https://github.com/huggingface/transformers.js) the feel of [xsai](https://github.com/moeru-ai/xsai) just like you are directly request OpenAI API but **pure locally within the browser**.

> This is also possible for runtime with WebGPU or Web Workers support, e.g. Node.js.

> [!WARNING]
>
> This haven't been released yet, it is currently only used by [Project AIRI](https://github.com/moeru-ai/airi)'s stage and memory layer, if you found this helpful, join us to discuss on [xsai #41](https://github.com/moeru-ai/xsai/issues/41).

## Example usage

```shell
ni @xsai-transformers/chat -D # from @antfu/ni, can be installed via `npm i -g @antfu/ni`
pnpm i @xsai-transformers/chat -D
yarn i @xsai-transformers/chat -D
npm i @xsai-transformers/chat -D
```

```ts
import { createChatProvider } from '@xsai-transformers/chat'
import chatWorkerURL from '@xsai-transformers/chat/worker?worker&url'
import { generateText } from '@xsai/chat'

const chatProvider = createChatProvider({ baseURL: `xsai-transformers:///?worker-url=${chatWorkerURL}` })

const handleChat = () => {
  const res = await generateText({
    ...chatProvider.chat('onnx-community/gemma-3-270m-it-ONNX', { dtype: 'q4' }),
    messages: [{ content: 'Hi! How are you?', role: 'user' }],
  })

  console.log(res)
}
```
