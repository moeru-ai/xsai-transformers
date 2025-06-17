// Default configuration parameters
export interface VADConfig {
  // Threshold to exit speech state
  exitThreshold: number
  // Maximum buffer duration in seconds
  maxBufferDuration: number
  // Minimum silence duration to consider speech ended (ms)
  minSilenceDurationMs: number
  // Minimum duration of speech to consider valid (ms)
  minSpeechDurationMs: number
  // Size of input buffers from audio source
  newBufferSize: number
  // Sample rate of the audio
  sampleRate: number
  // Padding to add before and after speech (ms)
  speechPadMs: number
  // Probabilities above this value are considered speech
  speechThreshold: number
}

export type VADEventCallback<K extends keyof VADEvents>
  = (event: VADEvents[K]) => void

export interface VADEvents {
  // Debug info
  'debug': { data?: any, message: string }
  // Emitted when speech has ended
  'speech-end': void
  // Emitted when a complete speech segment is ready for transcription
  'speech-ready': { buffer: Float32Array, duration: number }
  // Emitted when speech is detected
  'speech-start': void
  // Emitted for status updates and errors
  'status': { message: string, type: string }
}
