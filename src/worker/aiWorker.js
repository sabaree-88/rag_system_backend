import { Worker } from "bullmq";
import { askQuestion } from "../services/rag.service.js";
import IORedis from "ioredis";
import { logger } from "../utils/logger.util.js";

try {
  const connection = new IORedis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  });

  connection.on("error", () => {});

  await connection.ping();

  new Worker(
    "ai-jobs",
    async (job) => {
      const { question, sessionId } = job.data;
      const answer = await askQuestion(question, sessionId);
      return answer;
    },
    { connection },
  );

  logger.info("BullMQ worker started");
} catch {
  logger.info("Redis unavailable — worker not started");
}
