import express from 'express'

import { upload } from '../middleware/upload.middleware.js'

import { uploadPDF } from '../controllers/upload.controller.js'

const router = express.Router()

router.post(
  '/upload',

  upload.single('file'),

  uploadPDF
)

export default router
