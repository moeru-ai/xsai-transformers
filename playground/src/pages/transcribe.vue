<script setup lang="ts">
import { serialize } from 'superjson'
import { ref } from 'vue'

import Progress from '../components/Progress.vue'
import type { InitiateProgressInfo, ProgressStatusInfo } from '@xsai-transformers/utils/types'
import createTransformers from '@xsai-transformers/provider-transcribe'
import transcribeWorkerURL from '@xsai-transformers/provider-transcribe/worker/transcribe?worker&url'
import { generateTranscription } from '@xsai/generate-transcription'

const modelId = ref('onnx-community/whisper-large-v3-turbo')

const input = ref<File | null>(null)
const results = ref<any>()

const loadingItems = ref<(InitiateProgressInfo | ProgressStatusInfo)[]>([])
const loadingItemsSet = new Set<string>()

const isRecording = ref<boolean>(false)
const audioChunks = ref<Blob[]>([])
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingTime = ref<number>(0)
const recordingTimer = ref<number | null>(null)
const audioURL = ref<string | null>(null)

const transformersProvider = createTransformers({ transcribeWorkerURL })

async function load() {
  await transformersProvider.loadTranscribe(modelId.value, {
    dtype: {
      encoder_model: 'fp16',
      decoder_model_merged: 'q4',
    },
    device: 'webgpu',
    onProgress: (progress) => {
      switch (progress.status) {
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

        case 'done':
          // loadingItems.value = loadingItems.value.filter(item => item.file !== progress.file)
          break
      }
    },
  })
}

async function execute() {
  if (!input.value)
    return

  try {
    const result = await generateTranscription({
      ...transformersProvider.transcription(modelId.value),
      file: input.value,
    })

    results.value = result
  }
  catch (err) {
    console.error(err)
  }
}

async function handleLoad() {
  await transformersProvider.terminateTranscribe()
  await load()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    input.value = target.files[0]
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []
    recordingTime.value = 0

    // Recording time timer
    recordingTimer.value = window.setInterval(() => {
      recordingTime.value += 1
    }, 1000)

    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data)
    }

    mediaRecorder.value.onstop = () => {
      if (recordingTimer.value) {
        clearInterval(recordingTimer.value)
        recordingTimer.value = null
      }

      const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' })
      if (audioURL.value)
        URL.revokeObjectURL(audioURL.value)
      audioURL.value = URL.createObjectURL(audioBlob)

      // Convert recorded audio to File object
      const fileName = `recording_${new Date().toISOString()}.wav`
      const file = new File([audioBlob], fileName, { type: 'audio/wav' })
      input.value = file
    }

    mediaRecorder.value.start(100) // Collect data every 100ms
    isRecording.value = true
  }
  catch (error) {
    console.error('Failed to get microphone permission:', error)
  }
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()

    // Stop all tracks
    mediaRecorder.value.stream.getTracks().forEach(track => track.stop())

    isRecording.value = false
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
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

      <!-- Recording functionality -->
      <div flex flex-col gap-2 rounded-lg p-4 shadow-md>
        <h3 text-lg>
          Recording
        </h3>
        <div flex flex-row items-center gap-4>
          <button
            rounded-lg
            :bg="isRecording ? 'red-500 dark:red-700' : 'blue-100 dark:blue-900'"
            px-4 py-2
            @click="isRecording ? stopRecording() : startRecording()"
          >
            {{ isRecording ? 'Stop' : 'Start' }}
          </button>

          <div v-if="isRecording" flex flex-row items-center gap-2>
            <div class="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span>Recording: {{ formatTime(recordingTime) }}</span>
          </div>

          <div v-if="audioURL && !isRecording" flex flex-row items-center gap-2>
            <audio controls :src="audioURL" />
          </div>
        </div>

        <div>
          <input type="file" accept="audio/*" @change="handleFileChange">
        </div>
      </div>
      <div flex flex-row gap-2>
        <button rounded-lg bg="blue-100 dark:blue-900" px-4 py-2 @click="execute">
          Transcribe
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
