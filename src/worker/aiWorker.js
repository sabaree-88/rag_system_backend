import { Worker } from "bullmq";
import { askQuestion } from "../services/ask.service.js";
import IORedis from "ioredis";

const connection = new IORedis();

new Worker(
  "ai-jobs",
  async (job) => {
    const { question, sessionId } = job.data;

    const answer = await askQuestion(question, sessionId);

    return answer;
  },
  { connection },
);
