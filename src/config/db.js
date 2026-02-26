import { MongoClient } from 'mongodb'
import { MONGODB_URI } from './env.js'

const client = new MongoClient(MONGODB_URI)

await client.connect()

console.log('MongoDB connected')

export const db = client.db('rag_db')

export const collection = db.collection('documents')
