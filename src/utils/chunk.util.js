import { encodeText, decodeTokens } from './tokenizer.util.js'

export function chunkText (text, size = 500, overlap = 100) {
  const tokens = encodeText(text)

  const chunks = []

  for (let i = 0; i < tokens.length; i += size - overlap) {
    chunks.push(decodeTokens(tokens.slice(i, i + size)))
  }

  return chunks
}
