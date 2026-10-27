require("dotenv").config();

const { Worker, QueueEvents } = require("bullmq");
const { createRedisConnection } = require("../config/redis");
const { SUBMISSION_QUEUE_NAME } = require("../queues/submissionQueue");
const { processSubmission } = require("../services/submissionProcessor");

const concurrency = Number(process.env.SUBMISSION_WORKER_CONCURRENCY || 4);
const limiterMax = Number(process.env.SUBMISSION_WORKER_LIMITER_MAX || 0);
const limiterDuration = Number(process.env.SUBMISSION_WORKER_LIMITER_DURATION_MS || 1000);

const workerOptions = {
  connection: createRedisConnection(),
  concurrency,
  lockDuration: Number(process.env.SUBMISSION_WORKER_LOCK_DURATION_MS || 300000),
  stalledInterval: Number(process.env.SUBMISSION_WORKER_STALLED_INTERVAL_MS || 30000),
  maxStalledCount: Number(process.env.SUBMISSION_WORKER_MAX_STALLED_COUNT || 1)
};

if (limiterMax > 0) {
  workerOptions.limiter = {
    max: limiterMax,
    duration: limiterDuration
  };
}

const worker = new Worker(
  SUBMISSION_QUEUE_NAME,
  async (job) => {
    const submissionId = Number(job.data && job.data.submissionId);

    if (!submissionId) {
      throw new Error("BullMQ job is missing submissionId");
    }

    return processSubmission(submissionId);
  },
  workerOptions
);

const queueEvents = new QueueEvents(SUBMISSION_QUEUE_NAME, {
  connection: createRedisConnection()
});

worker.on("completed", (job, result) => {
  console.log(`Submission job ${job.id} completed`, result);
});

worker.on("failed", (job, error) => {
  console.error(`Submission job ${job ? job.id : "unknown"} failed`, error);
});

const shutdown = async () => {
  console.log("Shutting down submission worker...");
  await Promise.allSettled([
    worker.close(),
    queueEvents.close()
  ]);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Submission worker listening on "${SUBMISSION_QUEUE_NAME}" with concurrency ${concurrency}`);
