import { askQuestion } from "../services/rag.service.js";
import { logger } from "../utils/logger.util.js";

export async function ask(req, res, next) {
  try {
    const { question, sessionId } = req.body;

    logger.info("Ask endpoint called");

    const answer = await askQuestion(question, sessionId);

    res.json({ answer });
  } catch (error) {
    logger.error("Ask controller failed", error);

    next(error);
  }
}
