import OpenAI from 'openai'
import { OPENROUTER_API_KEY } from './env.js'

export const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,

  baseURL: 'https://openrouter.ai/api/v1'
})
