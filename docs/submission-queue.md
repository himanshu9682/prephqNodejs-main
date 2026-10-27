# Asynchronous Submit Queue

The Run API stays synchronous and continues calling `runHarness()` directly.

The Submit API now creates a `QUEUED` submission, enqueues a BullMQ job with the
`submissionId`, and returns immediately. A separate worker process fetches the
submission, question, and hidden testcases, then calls the existing harness.

## Folder Structure

```text
config/
  database.js
  redis.js
controllers/
  runController.js
  submitController.js
models/
  Question.js
  Submission.js
queues/
  submissionQueue.js
services/
  codeRunner/
    dockerExecutor.js
    harnessRunner.js
    languages/
  submissionProcessor.js
workers/
  submissionWorker.js
```

## Install

```bash
npm install bullmq ioredis
```

## Environment

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

SUBMISSION_QUEUE_NAME=submissions
SUBMISSION_WORKER_CONCURRENCY=4
SUBMISSION_JOB_ATTEMPTS=2
SUBMISSION_JOB_BACKOFF_MS=3000
SUBMISSION_WORKER_LOCK_DURATION_MS=300000
```

For high volume, run multiple worker processes across one or more machines, but
keep `SUBMISSION_WORKER_CONCURRENCY` aligned with available CPU, memory, and
Docker capacity. Each job starts Docker work through the existing harness, so
more concurrency is not always better.

## Run

Start Redis:

```bash
docker run --name prephq-redis -p 6379:6379 -d redis:7
```

Start the API:

```bash
npm run dev
```

Start one or more submission workers:

```bash
npm run worker:submissions
```

For local development with automatic restart:

```bash
npm run dev:worker:submissions
```

## Integration Points

- `controllers/submitController.js` validates the request, resolves the question,
  creates a `QUEUED` submission, and calls `enqueueSubmission(submissionId)`.
- `queues/submissionQueue.js` owns the BullMQ queue configuration and default
  retry/removal policy.
- `workers/submissionWorker.js` is a standalone process that consumes jobs from
  Redis.
- `services/submissionProcessor.js` fetches the submission and full hidden
  testcase set, marks the submission `RUNNING`, calls `runHarness()`, and writes
  final submission/testcase rows.
- `models/Submission.js` contains transaction-safe helpers for status updates
  and testcase result replacement.

## Status Flow

```text
QUEUED -> RUNNING -> ACCEPTED
QUEUED -> RUNNING -> WRONG ANSWER
QUEUED -> RUNNING -> RUNTIME ERROR
QUEUED -> RUNNING -> COMPILATION ERROR
QUEUED -> RUNNING -> TIME LIMIT EXCEEDED
QUEUED -> QUEUE ERROR
```
