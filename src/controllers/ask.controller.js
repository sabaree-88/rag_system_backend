import { aiQueue } from "../queue/aiQueue.js";
import { askQuestion, askQuestionStream } from "../services/rag.service.js";
import { logger } from "../utils/logger.util.js";

export async function ask(req, res, next) {
  try {
    const { question, sessionId } = req.body;

    logger.info("Ask endpoint called");

    const job = await aiQueue.add("ask", {
      question,
      sessionId,
    });

    res.json({
      jobId: job.id,
      status: "processing",
    });
  } catch (error) {
    logger.error("Ask controller failed", error);

    next(error);
  }
}

export async function askStream(req, res, next) {
  try {
    const { question, sessionId } = req.body;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    await askQuestionStream(question, sessionId, res);
  } catch (error) {
    next(error);
  }
}
