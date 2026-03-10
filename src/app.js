import express from 'express'

import askRoutes from './routes/ask.routes.js'

import uploadRoutes from './routes/upload.routes.js'

import { errorMiddleware } from './middleware/error.middleware.js'

const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api', askRoutes)

app.use('/api', uploadRoutes)

app.use(errorMiddleware)

export default app
