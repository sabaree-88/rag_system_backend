import express from "express";

import { ask, askStream } from "../controllers/ask.controller.js";
import { aiRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/ask", aiRateLimiter, ask);

router.post("/ask-stream", aiRateLimiter, askStream);

export default router;
