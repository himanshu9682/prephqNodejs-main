const pool = require("../config/database");

const toJsonValue = (value) => {
  if (value === undefined || value === null) return null;

  return typeof value === "string" ? value : JSON.stringify(value);
};

const fromJsonValue = (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

class Question {
  static async createQuestion(questionData) {
    const connection = await pool.getConnection();

    try {
      const {
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
        status = "active",
        testcases = []
      } = questionData;

      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        "SELECT id FROM questions WHERE slug = ? LIMIT 1",
        [slug]
      );

      if (existingRows.length > 0) {
        throw new Error("Question with this slug already exists");
      }

      const [questionResult] = await connection.query(
        `INSERT INTO questions (
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
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          title,
          slug,
          difficulty,
          domain,
          toJsonValue(topics),
          description,
          toJsonValue(examples),
          toJsonValue(constraints_list),
          toJsonValue(starter_code),
          entry_point,
          toJsonValue(param_order),
          status
        ]
      );

      const questionId = questionResult.insertId;

      for (const testcase of testcases) {
        const inputs = testcase.inputs ?? null;
        const expectedOutput = testcase.expected_output ?? null;
        const isHidden = testcase.is_hidden ? 1 : 0;

        await connection.query(
          `INSERT INTO testcases (
            question_id,
            inputs,
            expected_output,
            is_hidden,
            created_at
          ) VALUES (?, ?, ?, ?, NOW())`,
          [
            questionId,
            toJsonValue(inputs),
            toJsonValue(expectedOutput),
            isHidden
          ]
        );
      }

      await connection.commit();

      return {
        id: questionId,
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
        testcases,
        message: "Question created successfully"
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateQuestionById(id, questionData) {
    const connection = await pool.getConnection();

    try {
      const {
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
        status = "active",
        testcases = []
      } = questionData;

      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        "SELECT id FROM questions WHERE id = ? LIMIT 1",
        [id]
      );

      if (existingRows.length === 0) {
        throw new Error("Question not found");
      }

      const [duplicateRows] = await connection.query(
        "SELECT id FROM questions WHERE slug = ? AND id <> ? LIMIT 1",
        [slug, id]
      );

      if (duplicateRows.length > 0) {
        throw new Error("Question with this slug already exists");
      }

      await connection.query(
        `UPDATE questions SET
          title = ?,
          slug = ?,
          difficulty = ?,
          domain = ?,
          topics = ?,
          description = ?,
          examples = ?,
          constraints_list = ?,
          starter_code = ?,
          entry_point = ?,
          param_order = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          title,
          slug,
          difficulty,
          domain,
          toJsonValue(topics),
          description,
          toJsonValue(examples),
          toJsonValue(constraints_list),
          toJsonValue(starter_code),
          entry_point,
          toJsonValue(param_order),
          status,
          id
        ]
      );

      await connection.query("DELETE FROM testcases WHERE question_id = ?", [id]);

      for (const testcase of testcases) {
        const inputs = testcase.inputs ?? null;
        const expectedOutput = testcase.expected_output ?? null;
        const isHidden = testcase.is_hidden ? 1 : 0;

        await connection.query(
          `INSERT INTO testcases (
            question_id,
            inputs,
            expected_output,
            is_hidden,
            created_at
          ) VALUES (?, ?, ?, ?, NOW())`,
          [
            id,
            toJsonValue(inputs),
            toJsonValue(expectedOutput),
            isHidden
          ]
        );
      }

      await connection.commit();

      return await this.getQuestionById(id, true);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async deleteQuestionById(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        "SELECT id FROM questions WHERE id = ? LIMIT 1",
        [id]
      );

      if (existingRows.length === 0) {
        return null;
      }

      await connection.query("DELETE FROM testcases WHERE question_id = ?", [id]);
      await connection.query("DELETE FROM questions WHERE id = ?", [id]);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getQuestions(options = {}) {
    const connection = await pool.getConnection();

    try {
      const {
        limit = 20,
        offset = 0,
        domain,
        difficulty,
        status,
        search
      } = options;

      const where = [];
      const params = [];

      if (domain) {
        where.push("domain = ?");
        params.push(domain);
      }

      if (difficulty) {
        where.push("difficulty = ?");
        params.push(difficulty);
      }

      if (status) {
        where.push("status = ?");
        params.push(status);
      }

      if (search) {
        where.push("(title LIKE ? OR description LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [rows] = await connection.query(
        `SELECT * FROM questions ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        entry_point: r.entry_point,
        param_order: fromJsonValue(r.param_order),
        difficulty: r.difficulty,
        domain: r.domain,
        topics: fromJsonValue(r.topics),
        description: r.description,
        examples: fromJsonValue(r.examples),
        constraints_list: fromJsonValue(r.constraints_list),
        starter_code: fromJsonValue(r.starter_code),
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
    } finally {
      connection.release();
    }
  }

  static async getQuestionBySlug(slug, includeHidden = false) {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.query(
        "SELECT * FROM questions WHERE slug = ? LIMIT 1",
        [slug]
      );

      if (!rows || rows.length === 0) return null;

      const q = rows[0];

      const testcaseSql = `SELECT * FROM testcases WHERE question_id = ? ${
        includeHidden ? "" : "AND is_hidden = 0"
      } ORDER BY id ASC`;

      const [testcaseRows] = await connection.query(testcaseSql, [q.id]);

      const testcases = (testcaseRows || []).map((t) => ({
        id: t.id,
        inputs: fromJsonValue(t.inputs),
        expected_output: fromJsonValue(t.expected_output),
        is_hidden: Boolean(t.is_hidden),
        created_at: t.created_at
      }));

      return {
        id: q.id,
        title: q.title,
        slug: q.slug,
        entry_point: q.entry_point,
        param_order: fromJsonValue(q.param_order),
        difficulty: q.difficulty,
        domain: q.domain,
        topics: fromJsonValue(q.topics),
        description: q.description,
        examples: fromJsonValue(q.examples),
        constraints_list: fromJsonValue(q.constraints_list),
        starter_code: fromJsonValue(q.starter_code),
        status: q.status,
        created_at: q.created_at,
        updated_at: q.updated_at,
        testcases
      };
    } finally {
      connection.release();
    }
  }

  static async getQuestionById(id, includeHidden = false) {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.query(
        "SELECT * FROM questions WHERE id = ? LIMIT 1",
        [id]
      );

      if (!rows || rows.length === 0) return null;

      const q = rows[0];

      const testcaseSql = `SELECT * FROM testcases WHERE question_id = ? ${
        includeHidden ? "" : "AND is_hidden = 0"
      } ORDER BY id ASC`;

      const [testcaseRows] = await connection.query(testcaseSql, [q.id]);

      const testcases = (testcaseRows || []).map((t) => ({
        id: t.id,
        inputs: fromJsonValue(t.inputs),
        expected_output: fromJsonValue(t.expected_output),
        is_hidden: Boolean(t.is_hidden),
        created_at: t.created_at
      }));

      return {
        id: q.id,
        title: q.title,
        slug: q.slug,
        entry_point: q.entry_point,
        param_order: fromJsonValue(q.param_order),
        difficulty: q.difficulty,
        domain: q.domain,
        topics: fromJsonValue(q.topics),
        description: q.description,
        examples: fromJsonValue(q.examples),
        constraints_list: fromJsonValue(q.constraints_list),
        starter_code: fromJsonValue(q.starter_code),
        status: q.status,
        created_at: q.created_at,
        updated_at: q.updated_at,
        testcases
      };
    } finally {
      connection.release();
    }
  }

}

module.exports = Question;

// Additional read helpers
