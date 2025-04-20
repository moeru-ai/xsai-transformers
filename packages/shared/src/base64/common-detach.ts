// Copyright 2018-2025 the Deno authors. MIT license.

export const detach = (
  buffer: Uint8Array,
  maxSize: number,
): [Uint8Array, number] => {
  const originalSize = buffer.length
  if (buffer.byteOffset) {
    // @ts-expect-error - ArrayBufferLike is absolutely Iterable<number>
    const b = Uint8Array.from(buffer.buffer)
    b.set(buffer)
    buffer = b.subarray(0, originalSize)
  }

  // deno-lint-ignore no-explicit-any
  buffer = Uint8Array.from((buffer.buffer as any).transfer(maxSize))
  buffer.set(buffer.subarray(0, originalSize), maxSize - originalSize)
  return [buffer, maxSize - originalSize]
}
