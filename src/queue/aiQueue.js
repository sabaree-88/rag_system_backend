import { Queue } from "bullmq";
import IORedis from "ioredis";
import { logger } from "../utils/logger.util.js";

let aiQueue = null;

try {
  const connection = new IORedis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 200, 1000);
    },
  });

  connection.on("error", () => {
    // silently ignore connection errors after init
  });

  // Test the connection
  await connection.ping();

  aiQueue = new Queue("ai-jobs", { connection });
  logger.info("Redis connected — BullMQ queue enabled");
} catch {
  logger.info("Redis unavailable — running without job queue (direct processing)");
}

export { aiQueue };
