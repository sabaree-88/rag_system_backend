import { extractPDF } from '../services/pdf.service.js'
import { runEmbeddingJob } from '../jobs/embedding.job.js'
import { logger } from '../utils/logger.util.js'

export async function uploadPDF (req, res, next) {
  try {
    logger.info('PDF upload started')

    const text = await extractPDF(req.file.path)

    await runEmbeddingJob(text, req.file.originalname)

    logger.info('PDF processed successfully')

    res.json({
      message: 'PDF processed successfully'
    })
  } catch (error) {
    logger.error('Upload failed', error)

    next(error)
  }
}
