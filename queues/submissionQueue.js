const { Queue } = require("bullmq");
const { createRedisConnection } = require("../config/redis");

const SUBMISSION_QUEUE_NAME = process.env.SUBMISSION_QUEUE_NAME || "submissions";

const submissionQueue = new Queue(SUBMISSION_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: Number(process.env.SUBMISSION_JOB_ATTEMPTS || 2),
    backoff: {
      type: "exponential",
      delay: Number(process.env.SUBMISSION_JOB_BACKOFF_MS || 3000)
    },
    removeOnComplete: {
      age: Number(process.env.SUBMISSION_JOB_COMPLETE_AGE_SECONDS || 86400),
      count: Number(process.env.SUBMISSION_JOB_COMPLETE_COUNT || 10000)
    },
    removeOnFail: {
      age: Number(process.env.SUBMISSION_JOB_FAIL_AGE_SECONDS || 604800),
      count: Number(process.env.SUBMISSION_JOB_FAIL_COUNT || 50000)
    }
  }
});

const enqueueSubmission = (submissionId) => submissionQueue.add(
  "judge-submission",
  { submissionId },
  {
   jobId: `submission-${submissionId}`
  }
);

module.exports = {
  SUBMISSION_QUEUE_NAME,
  submissionQueue,
  enqueueSubmission
};
