const writeString = (dataView: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    dataView.setUint8(offset + i, string.charCodeAt(i))
  }
}

export const toWav = (buffer: Float32Array, sampleRate: number) => {
  const numChannels = 1
  const numSamples = buffer.length

  // Create the WAV file container
  const arrayBuffer = new ArrayBuffer(44 + numSamples * 2)
  const dataView = new DataView(arrayBuffer)

  // RIFF chunk descriptor
  writeString(dataView, 0, 'RIFF')
  dataView.setUint32(4, 36 + numSamples * 2, true)
  writeString(dataView, 8, 'WAVE')

  // fmt sub-chunk
  writeString(dataView, 12, 'fmt ')
  dataView.setUint32(16, 16, true)
  dataView.setUint16(20, 1, true) // PCM format
  dataView.setUint16(22, numChannels, true)
  dataView.setUint32(24, sampleRate, true)
  dataView.setUint32(28, sampleRate * numChannels * 2, true) // byte rate
  dataView.setUint16(32, numChannels * 2, true) // block align
  dataView.setUint16(34, 16, true) // bits per sample

  // data sub-chunk
  writeString(dataView, 36, 'data')
  dataView.setUint32(40, numSamples * 2, true)

  // Write the PCM samples
  const offset = 44
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i]))
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    dataView.setInt16(offset + i * 2, value, true)
  }

  return arrayBuffer
}
