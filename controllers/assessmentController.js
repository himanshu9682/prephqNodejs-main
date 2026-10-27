const Assessment = require("../models/Assessment");
const AssessmentAttempt = require("../models/AssessmentAttempt");

const parseMaybeJson = (value) => {
  if (value === undefined || value === null || value === "") return value;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch (error) { return value; }
};

const requireArray = (value) => (Array.isArray(value) ? value : null);
const QUESTIONS_PER_ASSESSMENT = 10;
const MARKS_PER_QUESTION = 10;
const ASSESSMENT_TOTAL_MARKS = 100;
const normalizeCorrectAnswer = (value) => {
  const answer = String(value || "").trim().toUpperCase();
  const match = answer.match(/^(?:OPTION[\s_-]*)?([A-D])$/);
  return match ? match[1] : answer;
};

const validateAssessment = (body) => {
  const assessment = {
    title: (body.title || "").trim(),
    description: (body.description || "").trim(),
    category: (body.category || "").trim(),
    difficulty: (body.difficulty || "").trim(),
    total_marks: ASSESSMENT_TOTAL_MARKS,
    instructions: (body.instructions || "").trim(),
    status: (body.status || "active").trim().toLowerCase(),
    questions: requireArray(parseMaybeJson(body.questions))
  };
  if (!assessment.title || !assessment.description || !assessment.category || !assessment.difficulty || !assessment.instructions) return { error: "title, description, category, difficulty, and instructions are required" };
  if (!assessment.questions || assessment.questions.length !== QUESTIONS_PER_ASSESSMENT) return { error: "Exactly 10 assessment questions are required" };
  if (!["easy", "medium", "hard"].includes(assessment.difficulty.toLowerCase())) return { error: "difficulty must be Easy, Medium, or Hard" };
  const questions = [];
  for (const [index, item] of assessment.questions.entries()) {
    const correct_answer = normalizeCorrectAnswer(item.correct_answer);
    if (!["A", "B", "C", "D"].includes(correct_answer)) return { error: `questions[${index}].correct_answer must be A, B, C, or D` };
    const question = { question: (item.question || "").trim(), option_a: (item.option_a || "").trim(), option_b: (item.option_b || "").trim(), option_c: (item.option_c || "").trim(), option_d: (item.option_d || "").trim(), correct_answer, marks: MARKS_PER_QUESTION, explanation: (item.explanation || "").trim() };
    questions.push(question);
  }
  return { data: { ...assessment, questions } };
};

exports.createAssessment = async (req, res) => {
  try {
    const { data, error } = validateAssessment(req.body);
    if (error) return res.status(400).json({ status: 0, error });
    const assessment = await Assessment.createAssessment(data);
    return res.status(201).json({ status: 1, message: assessment.message, data: assessment });
  } catch (error) {
    return res.status(500).json({ status: 0, error: process.env.NODE_ENV === "development" ? error.message : "Server error" });
  }
};

exports.updateAssessment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ status: 0, error: "Valid assessment id is required" });
    const { data, error } = validateAssessment(req.body);
    if (error) return res.status(400).json({ status: 0, error });
    const assessment = await Assessment.updateAssessmentById(id, data);
    return res.status(200).json({ status: 1, message: "Assessment updated successfully", data: assessment });
  } catch (error) {
    if (error.message === "Assessment not found") return res.status(404).json({ status: 0, error: error.message });
    return res.status(500).json({ status: 0, error: process.env.NODE_ENV === "development" ? error.message : "Server error" });
  }
};

exports.deleteAssessment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ status: 0, error: "Valid assessment id is required" });
    const deleted = await Assessment.deleteAssessmentById(id);
    if (!deleted) return res.status(404).json({ status: 0, error: "Assessment not found" });
    return res.status(200).json({ status: 1, message: "Assessment deleted successfully" });
  } catch (error) {
    return res.status(500).json({ status: 0, error: process.env.NODE_ENV === "development" ? error.message : "Server error" });
  }
};

exports.getAssessments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const assessments = await Assessment.getAssessments({ limit, offset: (page - 1) * limit, category: req.query.category, difficulty: req.query.difficulty, status: req.query.status, search: req.query.search });
    return res.status(200).json({ status: 1, data: assessments });
  } catch (error) {
    return res.status(500).json({ status: 0, error: process.env.NODE_ENV === "development" ? error.message : "Server error" });
  }
};

exports.getAssessmentById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ status: 0, error: "Valid assessment id is required" });
    const assessment = await Assessment.getAssessmentById(id);
    if (!assessment) return res.status(404).json({ status: 0, error: "Assessment not found" });
    return res.status(200).json({ status: 1, data: assessment });
  } catch (error) {
    return res.status(500).json({ status: 0, error: process.env.NODE_ENV === "development" ? error.message : "Server error" });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const userId = Number(req.user && req.user.id);
    if (!userId) return res.status(401).json({ status: 0, error: "Authentication required" });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const assessmentId = req.query.assessment_id ? parseInt(req.query.assessment_id, 10) : null;

    const result = await AssessmentAttempt.getAttemptsByUser(userId, {
      limit,
      offset: (page - 1) * limit,
      assessmentId
    });

    return res.status(200).json({ status: 1, data: result });
  } catch (error) {
    return res.status(500).json({ status: 0, error: process.env.NODE_ENV === "development" ? error.message : "Server error" });
  }
};

exports.submitAssessment = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id, 10);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      return res.status(400).json({ status: 0, error: "Valid assessment id is required" });
    }

    const userId = Number(req.user && req.user.id);
    if (!userId) {
      return res.status(401).json({ status: 0, error: "Authentication required" });
    }

    const { responses, started_at, submitted_at, duration_seconds } = req.body || {};

    if (!(Array.isArray(responses) || (responses && typeof responses === "object"))) {
      return res.status(400).json({ status: 0, error: "responses must be an array or object" });
    }

    const attempt = await AssessmentAttempt.submitAttempt({
      assessmentId,
      userId,
      responses,
      startedAt: started_at,
      submittedAt: submitted_at,
      durationSeconds: duration_seconds
    });

    return res.status(201).json({
      status: 1,
      message: "Assessment submitted successfully",
      data: attempt
    });
  } catch (error) {
    if (error.message === "ASSESSMENT_NOT_FOUND") {
      return res.status(404).json({ status: 0, error: "Assessment not found" });
    }

    if (error.message === "ASSESSMENT_HAS_NO_QUESTIONS") {
      return res.status(400).json({ status: 0, error: "Assessment has no questions" });
    }

    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};
