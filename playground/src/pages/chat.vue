<script setup lang="ts">
import type { InitiateProgressInfo, ProgressStatusInfo } from '@xsai-transformers/shared/types'

import { generateText } from '@xsai/generate-text'
import { serialize } from 'superjson'
import { ref } from 'vue'
import { createChatProvider } from 'xsai-transformers'
import chatWorkerURL from 'xsai-transformers/chat/worker?worker&url'

import Progress from '../components/Progress.vue'

const modelId = ref('onnx-community/gemma-3-270m-it-ONNX')
const input = ref('Hi! How are you?')
const results = ref<any>()
const loadingItems = ref<(InitiateProgressInfo | ProgressStatusInfo)[]>([])
const loadingItemsSet = new Set<string>()

const isLoading = ref(false)
const isExecuting = ref(false)

const chatProvider = createChatProvider({ baseURL: `xsai-transformers:///?worker-url=${chatWorkerURL}` })

async function execute() {
  isExecuting.value = true

  try {
    const result = await generateText({
      ...chatProvider.chat(modelId.value),
      messages: [{ content: input.value, role: 'user' }],
    })

    results.value = result
  }
  finally {
    isExecuting.value = false
  }
}

async function handleLoad() {
  await chatProvider.terminateChat()
  await load()
}

async function load() {
  isLoading.value = true

  try {
    await chatProvider.loadChat(modelId.value, {
      dtype: 'q4',
      onProgress: (progress) => {
        switch (progress.status) {
          case 'done':
            // loadingItems.value = loadingItems.value.filter(item => item.file !== progress.file)
            break

          case 'initiate':
            if (loadingItemsSet.has(progress.file)) {
              return
            }

            loadingItemsSet.add(progress.file)
            loadingItems.value.push(progress)
            break

          case 'progress':
            loadingItems.value = loadingItems.value.map((item) => {
              if (item.file === progress.file) {
                return { ...item, ...progress }
              }

              return item
            })

            break
        }
      },
    })
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div flex flex-col gap-2>
    <h2 text-xl>
      Options
    </h2>
    <div w-full flex flex-row gap-2>
      <div w-full flex flex-row gap-2>
        <label flex flex-1 flex-row items-center gap-2>
          <div text-nowrap><span>Model ID</span></div>
          <input v-model="modelId" bg="neutral-100 dark:neutral-800" block w-full rounded-lg p-2>
        </label>
        <button rounded-lg bg="blue-100 dark:blue-900" px-4 py-2 @click="() => handleLoad()">
          Load
        </button>
      </div>
    </div>
    <div v-if="loadingItems.length > 0" class="w-full flex flex-col gap-2">
      <Progress
        v-for="(item, index) of loadingItems" :key="index" :text="item.file"
        :percentage="'progress' in item ? item.progress || 0 : 0" :total="'total' in item ? item.total || 0 : 0"
      />
    </div>
  </div>
  <div flex flex-col gap-2>
    <div flex flex-col gap-2>
      <h2 text-xl>
        Inference
      </h2>
      <div>
        <textarea v-model="input" h-full w-full rounded-lg bg="neutral-100 dark:neutral-800" p-4 font-mono />
      </div>
      <div flex flex-row gap-2>
        <button rounded-lg bg="blue-100 dark:blue-900" px-4 py-2 flex items-center gap-2 @click="execute">
          <template v-if="isLoading">
            <div i-svg-spinners:180-ring />
            <span>Loading...</span>
          </template>
          <template v-else-if="isExecuting">
            <div i-svg-spinners:180-ring />
            <span>Generating...</span>
          </template>
          <template v-else>
            Chat
          </template>
        </button>
      </div>
      <div flex flex-col gap-2>
        <h2 text-xl>
          Results
        </h2>
        <div max-h-100 of-y-scroll whitespace-pre-wrap p-4 font-mono>
          {{ JSON.stringify(serialize(results).json, null, 2) }}
        </div>
      </div>
    </div>
  </div>
</template>
