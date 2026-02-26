import { encode, decode } from 'gpt-tokenizer'

export function encodeText (text) {
  return encode(text)
}

export function decodeTokens (tokens) {
  return decode(tokens)
}

export function countTokens (text) {
  return encode(text).length
}
