const pool = require("../config/database");

const toJsonValue = (value) => {
  if (value === undefined || value === null) return null;
  return typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value);
};

const fromJsonValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

class Submission {
  static buildSubmissionListItem(row) {
    if (!row) return null;

    const submission = {
      id: row.id,
      user_id: row.user_id,
      question_id: row.question_id,
      language: row.language,
      code: row.code,
      status: row.status,
      passed_count: Number(row.passed_count || 0),
      total_count: Number(row.total_count || 0),
      runtime_ms: Number(row.avg_runtime_ms || 0),
      error_message: row.error_message || null,
      timeout_ms: row.timeout_ms === undefined ? null : row.timeout_ms,
      created_at: row.created_at,
      updated_at: row.updated_at || null
    };

    const question = row.question_id == null ? null : {
      id: row.question_id,
      slug: row.question_slug || null,
      title: row.question_title || null
    };

    const user = row.user_id == null ? null : {
      id: row.user_id,
      name: row.user_name || null,
      lastname: row.user_lastname || null,
      username: row.user_username || null,
      email: row.user_email || null,
      profile_image: row.user_profile_image || null
    };

    return {
      submission_id: submission.id,
      language: submission.language,
      status: submission.status,
      passed_count: submission.passed_count,
      total_count: submission.total_count,
      runtime_ms: submission.runtime_ms,
      created_at: submission.created_at,
      submission,
      question,
      ...(user ? { user } : {})
    };
  }

  static parsePagination({ page = 1, limit = 20 } = {}) {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    return {
      page: safePage,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit
    };
  }

  static async createQueued(submission) {
    return Submission.create({
      submission: {
        ...submission,
        status: "QUEUED",
        passed_count: 0,
        total_count: 0,
        avg_runtime_ms: 0,
        error_message: null
      },
      results: []
    });
  }
  static async create({ submission, results = [] }) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [submissionResult] = await connection.query(
        `INSERT INTO submissions (
          user_id,
          question_id,
          language,
          code,
          status,
          passed_count,
          total_count,
          avg_runtime_ms,
          error_message,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          submission.user_id || null,
          submission.question_id,
          submission.language,
          submission.code,
          submission.status,
          submission.passed_count || 0,
          submission.total_count || 0,
          submission.avg_runtime_ms || 0,
          submission.error_message || null
        ]
      );

      const submissionId = submissionResult.insertId;

      for (const result of results) {
        await connection.query(
          `INSERT INTO submission_testcase_results (
            submission_id,
            testcase_id,
            case_number,
            is_hidden,
            input,
            your_output,
            expected_output,
            passed,
            runtime_ms,
            error,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            submissionId,
            result.testcase_id || null,
            result.case_number,
            result.is_hidden ? 1 : 0,
            toJsonValue(result.input),
            toJsonValue(result.your_output),
            toJsonValue(result.expected_output),
            result.passed ? 1 : 0,
            result.runtime_ms || 0,
            result.error || null
          ]
        );
      }

      await connection.commit();

      return {
        id: submissionId,
        ...submission
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getRawById(id) {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.query(
        "SELECT * FROM submissions WHERE id = ? LIMIT 1",
        [id]
      );

      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  static async updateStatus(id, { status, error_message = null }) {
    const connection = await pool.getConnection();

    try {
      await connection.query(
        `UPDATE submissions
         SET status = ?,
             error_message = ?
         WHERE id = ?`,
        [status, error_message, id]
      );

      return {
        id,
        status,
        error_message
      };
    } finally {
      connection.release();
    }
  }

  static async updateWithResults({ id, submission, results = [] }) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE submissions
         SET status = ?,
             passed_count = ?,
             total_count = ?,
             avg_runtime_ms = ?,
             error_message = ?
         WHERE id = ?`,
        [
          submission.status,
          submission.passed_count || 0,
          submission.total_count || 0,
          submission.avg_runtime_ms || 0,
          submission.error_message || null,
          id
        ]
      );

      await connection.query(
        "DELETE FROM submission_testcase_results WHERE submission_id = ?",
        [id]
      );

      for (const result of results) {
        await connection.query(
          `INSERT INTO submission_testcase_results (
            submission_id,
            testcase_id,
            case_number,
            is_hidden,
            input,
            your_output,
            expected_output,
            passed,
            runtime_ms,
            error,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            result.testcase_id || null,
            result.case_number,
            result.is_hidden ? 1 : 0,
            toJsonValue(result.input),
            toJsonValue(result.your_output),
            toJsonValue(result.expected_output),
            result.passed ? 1 : 0,
            result.runtime_ms || 0,
            result.error || null
          ]
        );
      }

      await connection.commit();

      return {
        id,
        ...submission
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  static async getById(id) {
    const connection = await pool.getConnection();

    try {
      const [submissionRows] = await connection.query(
        `SELECT s.*, q.slug AS question_slug, q.title AS question_title
         FROM submissions s
         JOIN questions q ON q.id = s.question_id
         WHERE s.id = ?
         LIMIT 1`,
        [id]
      );

      if (!submissionRows || submissionRows.length === 0) return null;

      const [resultRows] = await connection.query(
        `SELECT *
         FROM submission_testcase_results
         WHERE submission_id = ?
         ORDER BY case_number ASC`,
        [id]
      );

      return {
        ...submissionRows[0],
        results: (resultRows || []).map((row) => ({
          id: row.id,
          testcase_id: row.testcase_id,
          case: row.case_number,
          hidden: Boolean(row.is_hidden),
          input: fromJsonValue(row.input),
          your_output: fromJsonValue(row.your_output),
          expected_output: fromJsonValue(row.expected_output),
          passed: Boolean(row.passed),
          runtime_ms: Number(row.runtime_ms || 0),
          error: row.error,
          created_at: row.created_at
        }))
      };
    } finally {
      connection.release();
    }
  }

  static async getSubmissionHistory(userId, { page = 1, limit = 20 } = {}) {
    const connection = await pool.getConnection();

    try {
      const pagination = Submission.parsePagination({ page, limit });

      const [countRows] = await connection.query(
        "SELECT COUNT(*) AS total FROM submissions WHERE user_id = ?",
        [userId]
      );

      const total = Number((countRows && countRows[0] && countRows[0].total) || 0);

      const [rows] = await connection.query(
        `SELECT
          s.id,
          s.user_id,
          s.question_id,
          s.language,
          s.code,
          s.status,
          s.passed_count,
          s.total_count,
          s.avg_runtime_ms,
          s.error_message,
         
          s.created_at,
         
          q.slug AS question_slug,
          q.title AS question_title
         FROM submissions s
         JOIN questions q ON q.id = s.question_id
         WHERE s.user_id = ?
         ORDER BY s.created_at DESC, s.id DESC
         LIMIT ? OFFSET ?`,
        [userId, pagination.limit, pagination.offset]
      );

      return {
        items: (rows || []).map((row) => Submission.buildSubmissionListItem(row)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: pagination.limit > 0 ? Math.ceil(total / pagination.limit) : 0
      };
    } finally {
      connection.release();
    }
  }

  static async getAllSubmissions({ page = 1, limit = 20 } = {}) {
    const connection = await pool.getConnection();

    try {
      const pagination = Submission.parsePagination({ page, limit });

      const [countRows] = await connection.query(
        "SELECT COUNT(*) AS total FROM submissions"
      );

      const total = Number((countRows && countRows[0] && countRows[0].total) || 0);

      const [rows] = await connection.query(
        `SELECT
          s.id,
          s.user_id,
          s.question_id,
          s.language,
          s.code,
          s.status,
          s.passed_count,
          s.total_count,
          s.avg_runtime_ms,
          s.error_message,
          
          s.created_at,
          
          q.slug AS question_slug,
          q.title AS question_title,
          u.name AS user_name,
          u.lastname AS user_lastname,
          u.username AS user_username,
          u.email AS user_email,
          u.profile_image AS user_profile_image
         FROM submissions s
         JOIN questions q ON q.id = s.question_id
         LEFT JOIN user u ON u.id = s.user_id
         ORDER BY s.created_at DESC, s.id DESC
         LIMIT ? OFFSET ?`,
        [pagination.limit, pagination.offset]
      );

      return {
        items: (rows || []).map((row) => Submission.buildSubmissionListItem(row)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: pagination.limit > 0 ? Math.ceil(total / pagination.limit) : 0
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = Submission;

