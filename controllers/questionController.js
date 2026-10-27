const Question = require("../models/Question");

const parseMaybeJson = (value) => {
  if (value === undefined || value === null || value === "") return value;

  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const requireArray = (value) => (Array.isArray(value) ? value : null);
const requireObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

exports.createQuestion = async (req, res) => {
  try {
    const title = (req.body.title || "").trim();
    const slug = (req.body.slug || "").trim();
    const difficulty = (req.body.difficulty || "").trim();
    const domain = (req.body.domain || "").trim();
    const description = (req.body.description || "").trim();
    const entry_point = (req.body.entry_point || req.body.entryPoint || "").trim();

    const topics = requireArray(parseMaybeJson(req.body.topics));
    const examples = requireArray(parseMaybeJson(req.body.examples));
    const constraints_list = requireArray(
      parseMaybeJson(req.body.constraints_list ?? req.body.constraints)
    );
    const starter_code = requireObject(
      parseMaybeJson(req.body.starter_code ?? req.body.starterCode)
    );
    const param_order = requireArray(parseMaybeJson(req.body.param_order ?? req.body.paramOrder));
    const testcases = requireArray(parseMaybeJson(req.body.testcases));
    const status = (req.body.status || "active").trim().toLowerCase();

    if (!title || !slug || !difficulty || !domain || !description) {
      return res.status(400).json({
        status: 0,
        error: "title, slug, difficulty, domain, and description are required"
      });
    }

    if (!topics || !examples || !constraints_list || !starter_code) {
      return res.status(400).json({
        status: 0,
        error:
          "topics, examples, constraints_list, and starter_code must be valid JSON arrays or objects"
      });
    }

    if (!entry_point) {
      return res.status(400).json({
        status: 0,
        error: "entry_point is required"
      });
    }

    if (!param_order || param_order.length === 0) {
      return res.status(400).json({
        status: 0,
        error: "param_order must be a valid non-empty JSON array"
      });
    }

    if (!testcases || testcases.length === 0) {
      return res.status(400).json({
        status: 0,
        error: "At least one testcase is required"
      });
    }

    const normalizedTestcases = [];

    for (const [index, testcase] of testcases.entries()) {
      const inputs = parseMaybeJson(testcase.inputs ?? testcase.input);
      const expected_output = parseMaybeJson(
        testcase.expected_output ?? testcase.expectedOutput ?? testcase.output
      );

      if (expected_output === undefined || expected_output === null || expected_output === "") {
        return res.status(400).json({
          status: 0,
          error: `testcases[${index}].expected_output is required`
        });
      }

      normalizedTestcases.push({
        inputs,
        expected_output,
        is_hidden: Boolean(testcase.is_hidden ?? testcase.isHidden)
      });
    }

    if (!["easy", "medium", "hard"].includes(difficulty.toLowerCase())) {
      return res.status(400).json({
        status: 0,
        error: "difficulty must be Easy, Medium, or Hard"
      });
    }

   

    const question = await Question.createQuestion({
      title,
      slug,
      difficulty,
      domain,
      topics,
      description,
      examples,
      constraints_list,
      starter_code,
      entry_point,
      param_order,
      status,
      testcases: normalizedTestcases
    });

    return res.status(201).json({
      status: 1,
      message: question.message,
      data: question
    });
  } catch (error) {
    const message = error.message || "Server error";

    if (message === "Question with this slug already exists") {
      return res.status(409).json({
        status: 0,
        error: message
      });
    }

    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? message : "Server error"
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: 0,
        error: "Valid question id is required"
      });
    }

    const title = (req.body.title || "").trim();
    const slug = (req.body.slug || "").trim();
    const difficulty = (req.body.difficulty || "").trim();
    const domain = (req.body.domain || "").trim();
    const description = (req.body.description || "").trim();
    const entry_point = (req.body.entry_point || req.body.entryPoint || "").trim();

    const topics = requireArray(parseMaybeJson(req.body.topics));
    const examples = requireArray(parseMaybeJson(req.body.examples));
    const constraints_list = requireArray(
      parseMaybeJson(req.body.constraints_list ?? req.body.constraints)
    );
    const starter_code = requireObject(
      parseMaybeJson(req.body.starter_code ?? req.body.starterCode)
    );
    const param_order = requireArray(parseMaybeJson(req.body.param_order ?? req.body.paramOrder));
    const testcases = requireArray(parseMaybeJson(req.body.testcases));
    const status = (req.body.status || "active").trim().toLowerCase();

    if (!title || !slug || !difficulty || !domain || !description) {
      return res.status(400).json({
        status: 0,
        error: "title, slug, difficulty, domain, and description are required"
      });
    }

    if (!topics || !examples || !constraints_list || !starter_code) {
      return res.status(400).json({
        status: 0,
        error:
          "topics, examples, constraints_list, and starter_code must be valid JSON arrays or objects"
      });
    }

    if (!entry_point) {
      return res.status(400).json({
        status: 0,
        error: "entry_point is required"
      });
    }

    if (!param_order || param_order.length === 0) {
      return res.status(400).json({
        status: 0,
        error: "param_order must be a valid non-empty JSON array"
      });
    }

    if (!testcases || testcases.length === 0) {
      return res.status(400).json({
        status: 0,
        error: "At least one testcase is required"
      });
    }

    const normalizedTestcases = [];

    for (const [index, testcase] of testcases.entries()) {
      const inputs = parseMaybeJson(testcase.inputs ?? testcase.input);
      const expected_output = parseMaybeJson(
        testcase.expected_output ?? testcase.expectedOutput ?? testcase.output
      );

      if (expected_output === undefined || expected_output === null || expected_output === "") {
        return res.status(400).json({
          status: 0,
          error: `testcases[${index}].expected_output is required`
        });
      }

      normalizedTestcases.push({
        inputs,
        expected_output,
        is_hidden: Boolean(testcase.is_hidden ?? testcase.isHidden)
      });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty.toLowerCase())) {
      return res.status(400).json({
        status: 0,
        error: "difficulty must be Easy, Medium, or Hard"
      });
    }

    
    

    const question = await Question.updateQuestionById(id, {
      title,
      slug,
      difficulty,
      domain,
      topics,
      description,
      examples,
      constraints_list,
      starter_code,
      entry_point,
      param_order,
      status,
      testcases: normalizedTestcases
    });

    return res.status(200).json({
      status: 1,
      message: "Question updated successfully",
      data: question
    });
  } catch (error) {
    const message = error.message || "Server error";

    if (message === "Question not found") {
      return res.status(404).json({
        status: 0,
        error: message
      });
    }

    if (message === "Question with this slug already exists") {
      return res.status(409).json({
        status: 0,
        error: message
      });
    }

    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? message : "Server error"
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: 0,
        error: "Valid question id is required"
      });
    }

    const deleted = await Question.deleteQuestionById(id);

    if (!deleted) {
      return res.status(404).json({
        status: 0,
        error: "Question not found"
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Question deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
    const offset = (page - 1) * limit;

    const domain = req.query.domain;
    const difficulty = req.query.difficulty;
    const status = req.query.status;
    const search = req.query.search;

    const questions = await Question.getQuestions({
      limit,
      offset,
      domain,
      difficulty,
      status,
      search
    });

    return res.status(200).json({ status: 1, data: questions });
  } catch (error) {
    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

exports.getQuestionBySlug = async (req, res) => {
  try {
    const slug = (req.params.slug || "").trim();
    if (!slug) {
      return res.status(400).json({ status: 0, error: "slug is required" });
    }

    const includeHidden = req.query.includeHidden === "1";

    const question = await Question.getQuestionBySlug(slug, includeHidden);

    if (!question) {
      return res.status(404).json({ status: 0, error: "Question not found" });
    }

    return res.status(200).json({ status: 1, data: question });
  } catch (error) {
    return res.status(500).json({
      status: 0,
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};