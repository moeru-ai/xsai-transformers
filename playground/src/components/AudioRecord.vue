<script setup lang="ts">
import { ref } from 'vue'
import { toWav } from '@xsai-transformers/vad'
import processWorkletURL from '@xsai-transformers/vad/worker?worker&url'
import InputFile from './InputFile.vue'

const model = defineModel<File | null>({ required: true })

const isRecording = ref<boolean>(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingTime = ref<number>(0)
const recordingTimer = ref<number | null>(null)
const audioURL = ref<string | null>(null)
const uploadedFiles = ref<File[]>([])

function handleFilesChange(files: File[]) {
  if (files.length > 0) {
    model.value = files[0]
    
    // Create audio URL if it's an audio file
    if (files[0].type.startsWith('audio/')) {
      if (audioURL.value) URL.revokeObjectURL(audioURL.value)
      audioURL.value = URL.createObjectURL(files[0])
    }
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000
      }
    })

    // Create AudioContext with desired sample rate
    const audioContext = new AudioContext({ sampleRate: 16000 })
    const source = audioContext.createMediaStreamSource(stream)

    // Load and register the VAD worklet processor
    await audioContext.audioWorklet.addModule(processWorkletURL)
    const workletNode = new AudioWorkletNode(audioContext, 'vad-processor')

    const pcmChunks: Float32Array[] = []
    const segments = ref<Array<{
      buffer: Float32Array,
      duration: number,
      timestamp: number,
      audioSrc: string
    }>>([])

    // Handle audio data from the worklet
    workletNode.port.onmessage = (event) => {
      const { buffer } = event.data
      if (!buffer) return

      // Create a copy of the buffer
      const chunk = new Float32Array(buffer.length)
      chunk.set(buffer)
      pcmChunks.push(chunk)

      // Calculate duration in seconds
      const duration = (buffer.length / audioContext.sampleRate)

      // Convert to WAV for playback
      const wavBuffer = toWav(buffer, 16000)
      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' })

      // Store the segment
      segments.value.push({
        buffer: chunk,
        duration,
        timestamp: Date.now(),
        audioSrc: URL.createObjectURL(audioBlob),
      })
    }

    // Connect the audio processing pipeline
    source.connect(workletNode)
    workletNode.connect(audioContext.destination)

    // Store references for cleanup
    mediaRecorder.value = {
      stream,
      audioContext,
      source,
      workletNode,
      pcmChunks,
      stop: () => {
        workletNode.disconnect()
        source.disconnect()

        // Combine all chunks
        const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const combinedBuffer = new Float32Array(totalLength)

        let offset = 0
        for (const chunk of pcmChunks) {
          combinedBuffer.set(chunk, offset)
          offset += chunk.length
        }

        // Convert to WAV
        const wavArrayBuffer = toWav(combinedBuffer, 16000)
        const audioBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' })

        if (audioURL.value)
          URL.revokeObjectURL(audioURL.value)
        audioURL.value = URL.createObjectURL(audioBlob)

        // Convert to File object
        const fileName = `recording_${new Date().toISOString()}.wav`
        const file = new File([audioBlob], fileName, { type: 'audio/wav' })
        model.value = file

        // Clean up
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value)
          recordingTimer.value = null
        }
      }
    } as any

    // Start recording timer
    recordingTime.value = 0
    recordingTimer.value = window.setInterval(() => {
      recordingTime.value += 1
    }, 1000)

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
  <div class="flex flex-col gap-4 rounded-lg p-6 bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700">
    <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
      {{ isRecording ? 'Recording...' : 'Audio Recorder' }}
    </h3>
    
    <!-- Recording controls -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-row items-center gap-4">
        <button 
          :disabled="model && !audioURL && !isRecording"
          rounded-lg bg="blue-100 dark:blue-900" px-4 py-2
          @click="isRecording ? stopRecording() : startRecording()"
        >
          {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
        </button>

        <div v-if="isRecording" class="flex flex-row items-center gap-3 text-gray-600 dark:text-gray-300">
          <div class="relative">
            <div class="h-3 w-3 rounded-full bg-red-500"></div>
            <div class="absolute top-0 left-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-75"></div>
          </div>
          <span class="font-mono text-lg">{{ formatTime(recordingTime) }}</span>
        </div>
      </div>

      <!-- Audio Player -->
      <div v-if="audioURL && !isRecording" class="mt-2 flex flex-col gap-2">
        <div class="text-sm text-gray-600 dark:text-gray-400">Recording Preview:</div>
        <audio 
          controls 
          :src="audioURL" 
          class="w-full max-w-md rounded-lg bg-gray-100 dark:bg-slate-700"
        />
      </div>
    </div>

    <!-- File Upload Section using InputFile component -->
    <div class="mt-2">
      <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Or upload audio file:</div>
      <InputFile
        v-model="uploadedFiles"
        accept="audio/*"
        @update:modelValue="handleFilesChange"
      >
        <template #default="{ isDragging, files }">
          <div
            class="flex flex-col items-center"
            :class="[
              isDragging ? 'text-primary-500 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-500',
            ]"
          >
            <div i-carbon-cloud-upload text-4xl mb-2 />
            <p class="font-medium text-center">
              {{ isDragging ? 'Release to upload' : 'Upload Audio File' }}
            </p>
            <p class="text-center text-sm">
              {{ files.length > 0 ? `Selected: ${files[0].name}` : 'Click or drag and drop a file here' }}
            </p>
            <p class="text-center text-xs mt-1 text-gray-500 dark:text-gray-400">
              Supports WAV, MP3, OGG, etc.
            </p>
          </div>
        </template>
      </InputFile>
    </div>
  </div>
</template>

<style scoped>
audio::-webkit-media-controls-panel {
  background-color: #f3f4f6;
}

.dark audio::-webkit-media-controls-panel {
  background-color: #334155;
}
</style>
