const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { runHarness } = require("./codeRunner/harnessRunner");

const FINAL_STATUS = {
  ACCEPTED: "ACCEPTED",
  WRONG_ANSWER: "WRONG ANSWER",
  RUNTIME_ERROR: "RUNTIME ERROR",
  COMPILATION_ERROR: "COMPILATION ERROR",
  TIME_LIMIT_EXCEEDED: "TIME LIMIT EXCEEDED",
  DOCKER_UNAVAILABLE: "DOCKER UNAVAILABLE",
  UNSUPPORTED_LANGUAGE: "UNSUPPORTED LANGUAGE",
  INTERNAL_ERROR: "INTERNAL ERROR"
};

const toSubmitStatus = (result) => {
  if (result.status === "timeout") return FINAL_STATUS.TIME_LIMIT_EXCEEDED;
  if (result.status === "DOCKER_UNAVAILABLE") return FINAL_STATUS.DOCKER_UNAVAILABLE;
  if (result.status === "UNSUPPORTED_LANGUAGE") return FINAL_STATUS.UNSUPPORTED_LANGUAGE;

  if (result.status !== "success") {
    const message = String(result.error_message || result.message || "").toLowerCase();
    if (
      message.includes("javac") ||
      message.includes("g++") ||
      message.includes("compilation") ||
      message.includes("compile") ||
      message.includes("error:")
    ) {
      return FINAL_STATUS.COMPILATION_ERROR;
    }
    return FINAL_STATUS.RUNTIME_ERROR;
  }

  const summaryStatus = String(result.summary && result.summary.status ? result.summary.status : "").toUpperCase();
  if (summaryStatus === "ACCEPTED") return FINAL_STATUS.ACCEPTED;
  if (summaryStatus === "WRONG ANSWER") return FINAL_STATUS.WRONG_ANSWER;
  if (summaryStatus === "RUNTIME ERROR") return FINAL_STATUS.RUNTIME_ERROR;

  return FINAL_STATUS.WRONG_ANSWER;
};

const buildSubmissionRows = (harnessResults, testcases) => harnessResults.map((result, index) => {
  const testcase = testcases[index] || {};

  return {
    testcase_id: testcase.id || null,
    case_number: result.case || index + 1,
    is_hidden: Boolean(testcase.is_hidden),
    input: testcase.inputs,
    your_output: result.your_output,
    expected_output: testcase.expected_output,
    passed: Boolean(result.passed),
    runtime_ms: result.runtime_ms || 0,
    error: result.error || null
  };
});

const processSubmission = async (submissionId) => {
  const submission = await Submission.getRawById(submissionId);

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  if (submission.status !== "QUEUED" && submission.status !== "RUNNING") {
    return {
      skipped: true,
      status: submission.status
    };
  }

  await Submission.updateStatus(submissionId, {
    status: "RUNNING"
  });

  try {
    const question = await Question.getQuestionById(submission.question_id, true);

    if (!question) {
      await Submission.updateStatus(submissionId, {
        status: FINAL_STATUS.INTERNAL_ERROR,
        error_message: "Question not found"
      });
      return { status: FINAL_STATUS.INTERNAL_ERROR };
    }

    if (!Array.isArray(question.param_order) || question.param_order.length === 0 || !question.entry_point) {
      await Submission.updateStatus(submissionId, {
        status: FINAL_STATUS.INTERNAL_ERROR,
        error_message: "Question is missing entry_point or param_order"
      });
      return { status: FINAL_STATUS.INTERNAL_ERROR };
    }

    if (!Array.isArray(question.testcases) || question.testcases.length === 0) {
      await Submission.updateStatus(submissionId, {
        status: FINAL_STATUS.INTERNAL_ERROR,
        error_message: "Question has no testcases"
      });
      return { status: FINAL_STATUS.INTERNAL_ERROR };
    }

    const result = await runHarness({
      language: submission.language,
      code: submission.code,
      entryPoint: question.entry_point,
      paramOrder: question.param_order,
      testcases: question.testcases,
      timeoutMs: Number(submission.timeout_ms) > 0 ? Number(submission.timeout_ms) : 5000
    });

    const submitStatus = toSubmitStatus(result);
    const summary = result.summary || {
      passed: 0,
      total: question.testcases.length,
      status: submitStatus,
      avg_runtime_ms: 0
    };

    await Submission.updateWithResults({
      id: submissionId,
      submission: {
        status: submitStatus,
        passed_count: summary.passed || 0,
        total_count: summary.total || question.testcases.length,
        avg_runtime_ms: summary.avg_runtime_ms || 0,
        error_message: result.error_message || result.message || null
      },
      results: result.status === "success"
        ? buildSubmissionRows(result.results, question.testcases)
        : []
    });

    return {
      status: submitStatus,
      summary
    };
  } catch (error) {
    await Submission.updateStatus(submissionId, {
      status: FINAL_STATUS.INTERNAL_ERROR,
      error_message: error && error.message ? error.message : String(error)
    });
    throw error;
  }
};

module.exports = {
  FINAL_STATUS,
  buildSubmissionRows,
  processSubmission,
  toSubmitStatus
};
