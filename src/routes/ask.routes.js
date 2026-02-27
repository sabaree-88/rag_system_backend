import express from "express";

import { ask, askStream } from "../controllers/ask.controller.js";

const router = express.Router();

router.post("/ask", ask);

router.post("/ask-stream", askStream);

export default router;
