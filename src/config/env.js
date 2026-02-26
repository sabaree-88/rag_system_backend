import dotenv from 'dotenv'

dotenv.config()

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
export const PORT = process.env.PORT || 3000
export const MONGODB_URI = process.env.MONGODB_URI
