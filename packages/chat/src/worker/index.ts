import type { Chat, TextGenerationOutput, TextGenerationPipeline, TextGenerationSingle } from '@huggingface/transformers'
import type { PipelineOptionsFrom } from '@xsai-transformers/shared/types'
import type { GenerateTextResponse } from '@xsai/generate-text'
import type { AssistantMessage } from '@xsai/shared-chat'

import { pipeline } from '@huggingface/transformers'
import { defineInvokeHandler, defineStreamInvokeHandler, nanoid, toStreamHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/webworkers/worker'
import { merge } from '@moeru/std/merge'
import { isWebGPUSupported } from 'gpuu/webgpu'

import { chatCompletion, load } from '../shared'
import { MessageStatus } from '../types'

const { context } = createContext()

// eslint-disable-next-line @masknet/no-top-level
let chat: TextGenerationPipeline
// eslint-disable-next-line @masknet/no-top-level
let chatModelId: string

function generateTextResponseFromChoices(choices: GenerateTextResponse['choices'], usage: {
  completion_tokens: number
  prompt_tokens: number
  total_tokens: number
}): GenerateTextResponse {
  return {
    choices,
    created: Math.floor(Date.now() / 1000),
    id: nanoid(),
    model: chatModelId,
    object: 'chat.completion',
    system_fingerprint: '',
    usage,
  }
}

function isChat(result: TextGenerationSingle): result is { generated_text: Chat } {
  return 'generated_text' in result && Array.isArray(result.generated_text)
}

function isMultipleSingle(result: TextGenerationOutput): result is TextGenerationSingle[] {
  return Array.isArray(result)
}

function isSingleOutput(result: TextGenerationOutput | TextGenerationOutput[]): result is TextGenerationOutput {
  return Array.isArray(result) && result.length > 0 && !Array.isArray(result[0])
}

function isString(result: TextGenerationSingle): result is { generated_text: string } {
  return 'generated_text' in result && typeof result.generated_text === 'string'
}

// eslint-disable-next-line @masknet/no-top-level, sonarjs/cognitive-complexity
defineInvokeHandler(context, chatCompletion, async ({ messages, options }) => {
  const promptTokens = messages?.reduce((acc, msg) => acc + chat.tokenizer.tokenize(typeof msg.content === 'string' ? msg.content : '').length, 0) || 0

  const result = await chat(messages as any as Chat[], options)
  const normalizedResults: TextGenerationOutput[] = []
  if (isSingleOutput(result) && isMultipleSingle(result)) {
    normalizedResults.push(result)
  }
  if (!isSingleOutput(result)) {
    normalizedResults.push(...result)
  }

  if (normalizedResults.length === 1) {
    const firstNormalizedResult = normalizedResults[0]
    if (isMultipleSingle(firstNormalizedResult)) {
      const chatMessages = firstNormalizedResult[0]
      if (isChat(chatMessages)) {
        const generatedChoice = chatMessages.generated_text[chatMessages.generated_text.length - 1]
        const completionTokens = chat.tokenizer.tokenize(typeof generatedChoice.content === 'string' ? generatedChoice.content : '').length
        return generateTextResponseFromChoices([
          {
            finish_reason: 'stop',
            index: 0,
            message: { content: generatedChoice.content, role: generatedChoice.role as AssistantMessage['role'] },
          },
        ], {
          completion_tokens: completionTokens,
          prompt_tokens: promptTokens,
          total_tokens: promptTokens + completionTokens,
        })
      }
    }
  }

  let completionTokens = 0
  const responseChoices: GenerateTextResponse['choices'] = []
  let responseChoiceIndex = 0
  let choiceIndex = 0
  while (true) {
    const resultChoice = normalizedResults[choiceIndex]
    if (!resultChoice) {
      break
    }

    if (!isSingleOutput(resultChoice) || !isMultipleSingle(resultChoice)) {
      choiceIndex += 1
      continue
    }

    for (const content of resultChoice) {
      if (isString(content)) {
        completionTokens += chat.tokenizer.tokenize(content.generated_text).length
        responseChoices.push({ finish_reason: 'stop', index: responseChoiceIndex, message: { content: content.generated_text, role: 'assistant' } })
        responseChoiceIndex += 1
      }
      else if (isChat(content)) {
        for (const msg of content.generated_text) {
          completionTokens += chat.tokenizer.tokenize(typeof msg.content === 'string' ? msg.content : '').length
          responseChoices.push({ finish_reason: 'stop', index: responseChoiceIndex, message: { content: msg.content, role: msg.role as AssistantMessage['role'] } })
          responseChoiceIndex += 1
        }
      }
    }

    choiceIndex += 1
  }

  return generateTextResponseFromChoices(responseChoices, {
    completion_tokens: completionTokens,
    prompt_tokens: promptTokens,
    total_tokens: promptTokens + completionTokens,
  })
})

// eslint-disable-next-line @masknet/no-top-level
defineStreamInvokeHandler(context, load, toStreamHandler(async ({ emit, payload: { modelId, options } }) => {
  const device = (await isWebGPUSupported()) ? 'webgpu' : 'wasm'

  const opts = merge<PipelineOptionsFrom<typeof pipeline<'text-generation'>>>({
    device,
    progress_callback: (p) => {
      emit({ data: { progress: p }, type: 'progress' })
    },
  }, options)

  emit({ data: { message: `Using device: "${device}"` }, type: 'info' })
  emit({ data: { message: 'Loading models...' }, type: 'info' })

  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore - TS2590: Expression produces a union type that is too complex to represent.
  chat = await pipeline('text-generation', modelId, opts)
  chatModelId = modelId

  emit({ data: { message: 'Ready!', status: MessageStatus.Ready }, type: 'status' })
}))
