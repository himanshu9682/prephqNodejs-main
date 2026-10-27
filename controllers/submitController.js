const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { enqueueSubmission } = require("../queues/submissionQueue");

const PENDING_SUBMISSION_STATUSES = new Set(["QUEUED", "RUNNING"]);
const SUBMISSION_RESPONSE_WAIT_MS = Number(process.env.SUBMISSION_RESPONSE_WAIT_MS || 15000);
const SUBMISSION_RESPONSE_POLL_MS = Number(process.env.SUBMISSION_RESPONSE_POLL_MS || 500);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSubmissionCompletion = async (submissionId) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SUBMISSION_RESPONSE_WAIT_MS) {
    const submission = await Submission.getById(submissionId);

    if (!submission) {
      return null;
    }

    const status = String(submission.status || "").toUpperCase();

    if (!PENDING_SUBMISSION_STATUSES.has(status)) {
      return submission;
    }

    await sleep(SUBMISSION_RESPONSE_POLL_MS);
  }

  return Submission.getById(submissionId);
};

const buildSubmissionResponse = (submission) => {
  const status = String(submission.status || "").toUpperCase();
  const runtimeMs = Number(submission.avg_runtime_ms || 0);
  const passed = Number(submission.passed_count || 0);
  const total = Number(submission.total_count || 0);

  if (PENDING_SUBMISSION_STATUSES.has(status)) {
    return {
      status,
      submission_id: submission.id
    };
  }

  return {
    status,
    submission_id: submission.id,
    verdict: status,
    question: {
      id: submission.question_id,
      slug: submission.question_slug,
      title: submission.question_title
    },
    runtime_ms: runtimeMs,
    summary: {
      passed,
      total,
      status,
      verdict: status,
      avg_runtime_ms: runtimeMs
    },
    results: submission.results || [],
    error_message: submission.error_message || null
  };
};

exports.submit = async (req, res) => {
  let savedSubmission = null;

  try {
    const {
      code,
      language = "javascript",
      question_id,
      questionId,
      slug,
      question_slug,
      questionSlug
    } = req.body || {};

    const questionIdValue = Number(question_id || questionId || 0);
    const questionSlugValue = String(slug || question_slug || questionSlug || "").trim();
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({
        status: 0,
        error: "Authentication required"
      });
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        status: "EMPTY_CODE",
        error: "Code cannot be empty",
        results: []
      });
    }

    if (!questionIdValue && !questionSlugValue) {
      return res.status(400).json({
        status: "INVALID_SUBMIT_PAYLOAD",
        message: "question_id or slug is required"
      });
    }

    const question = questionIdValue
      ? await Question.getQuestionById(questionIdValue, false)
      : await Question.getQuestionBySlug(questionSlugValue, false);

    if (!question) {
      return res.status(404).json({
        status: "QUESTION_NOT_FOUND",
        message: "Question not found"
      });
    }

    if (!Array.isArray(question.param_order) || question.param_order.length === 0 || !question.entry_point) {
      return res.status(400).json({
        status: "INVALID_QUESTION",
        message: "Question is missing entry_point or param_order"
      });
    }

    savedSubmission = await Submission.createQueued({
      user_id: userId,
      question_id: question.id,
      language,
      code
    });

    await enqueueSubmission(savedSubmission.id);

    const completedSubmission = await waitForSubmissionCompletion(savedSubmission.id);

    if (completedSubmission) {
      return res.status(200).json(buildSubmissionResponse(completedSubmission));
    }

    return res.status(202).json({
      status: "QUEUED",
      submission_id: savedSubmission.id,
      question: {
        id: question.id,
        slug: question.slug,
        title: question.title
      }
    });
  } catch (error) {
    if (savedSubmission && savedSubmission.id) {
      await Submission.updateStatus(savedSubmission.id, {
        status: "QUEUE ERROR",
        error_message: error && error.message ? error.message : String(error)
      }).catch(() => {});
    }

    return res.status(500).json({
      status: "runtime_error",
      error_message: error && error.message ? error.message : String(error)
    });
  }
};

exports.getSubmission = async (req, res) => {
  try {
    const id = Number(req.params.id || 0);

    if (!id) {
      return res.status(400).json({
        status: "INVALID_SUBMISSION_ID",
        message: "Valid submission id is required"
      });
    }

    const submission = await Submission.getById(id);

    if (!submission) {
      return res.status(404).json({
        status: "SUBMISSION_NOT_FOUND",
        message: "Submission not found"
      });
    }

    return res.status(200).json(buildSubmissionResponse(submission));
  } catch (error) {
    return res.status(500).json({
      status: "runtime_error",
      error_message: error && error.message ? error.message : String(error)
    });
  }
};

exports.getSubmissionHistory = async (req, res) => {
  try {
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({
        status: 0,
        error: "Authentication required"
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const history = await Submission.getSubmissionHistory(userId, { page, limit });

    return res.status(200).json({
      status: 1,
      data: history.items,
      meta: {
        page: history.page,
        limit: history.limit,
        total: history.total,
        pages: history.pages
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

exports.getAdminSubmissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const submissions = await Submission.getAllSubmissions({ page, limit });

    return res.status(200).json({
      status: 1,
      data: submissions.items,
      meta: {
        page: submissions.page,
        limit: submissions.limit,
        total: submissions.total,
        pages: submissions.pages
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};
