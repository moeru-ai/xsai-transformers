// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * Utilities for
 * {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-4 | base64}
 * encoding and decoding.
 *
 * ```ts
 * import {
 *   encodeBase64,
 *   decodeBase64,
 * } from "@std/encoding/base64";
 * import { assertEquals } from "@std/assert";
 *
 * const foobar = new TextEncoder().encode("foobar");
 *
 * assertEquals(encodeBase64(foobar), "Zm9vYmFy");
 * assertEquals(decodeBase64("Zm9vYmFy"), foobar);
 * ```
 *
 * @module
 */

import { calcSizeBase64, decode, encode } from './common-64'
import { detach } from './common-detach'

const padding = '='.charCodeAt(0)
const alphabet = new TextEncoder()
  .encode('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')
const rAlphabet = Uint8Array.from(Array.from({ length: 128 }).fill(64)) // alphabet.length
// eslint-disable-next-line @masknet/no-top-level
alphabet.forEach((byte, i) => rAlphabet[byte] = i)

/**
 * Converts data into a base64-encoded string.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-4}
 *
 * @param data The data to encode.
 * @returns The base64-encoded string.
 *
 * @example Usage
 * ```ts
 * import { encodeBase64 } from "@std/encoding/base64";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(encodeBase64("foobar"), "Zm9vYmFy");
 * ```
 */
export const encodeBase64 = (data: ArrayBuffer | string | Uint8Array): string => {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data) as Uint8Array
  }
  else if (data instanceof ArrayBuffer) {
    // @ts-expect-error - data (ArrayBufferLike) is absolutely Iterable<number>
    data = Uint8Array.from(data).slice()
  }
  else {
    data = data.slice()
  }
  const [output, i] = detach(
    data as Uint8Array,
    calcSizeBase64((data as Uint8Array).length),
  )
  encode(output, i, 0, alphabet, padding)
  return new TextDecoder().decode(output)
}

/**
 * Decodes a base64-encoded string.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-4}
 *
 * @param b64 The base64-encoded string to decode.
 * @returns The decoded data.
 *
 * @example Usage
 * ```ts
 * import { decodeBase64 } from "@std/encoding/base64";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   decodeBase64("Zm9vYmFy"),
 *   new TextEncoder().encode("foobar")
 * );
 * ```
 */
export const decodeBase64 = (b64: string): Uint8Array => {
  const output = new TextEncoder().encode(b64) as Uint8Array
  // deno-lint-ignore no-explicit-any
  return Uint8Array.from((output.buffer as any)
    .transfer(decode(output, 0, 0, rAlphabet, padding)))
}
