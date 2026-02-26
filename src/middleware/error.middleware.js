import { logger } from '../utils/logger.util.js'

export function errorMiddleware (err, req, res, next) {
  logger.error(err.message, err)

  res.status(500).json({
    error: 'Internal Server Error',

    message: err.message
  })
}
