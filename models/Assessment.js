const pool = require("../config/database");

const MARKS_PER_QUESTION = 10;
const ASSESSMENT_TOTAL_MARKS = 100;

class Assessment {
  static async createAssessment(assessmentData) {
    const connection = await pool.getConnection();
    try {
      const { title, description, category, difficulty, instructions, status = "active", questions = [] } = assessmentData;
      const total_marks = ASSESSMENT_TOTAL_MARKS;
      await connection.beginTransaction();
      const [assessmentResult] = await connection.query(
        `INSERT INTO assessments (title, description, category, difficulty, total_marks, instructions, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [title, description, category, difficulty, total_marks, instructions, status]
      );
      const assessmentId = assessmentResult.insertId;
      for (const question of questions) await this.insertQuestion(connection, assessmentId, question);
      await connection.commit();
      return { id: assessmentId, title, description, category, difficulty, total_marks, instructions, status, questions: questions.map((question) => ({ ...question, marks: MARKS_PER_QUESTION })), message: "Assessment created successfully" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateAssessmentById(id, assessmentData) {
    const connection = await pool.getConnection();
    try {
      const { title, description, category, difficulty, instructions, status = "active", questions = [] } = assessmentData;
      const total_marks = ASSESSMENT_TOTAL_MARKS;
      await connection.beginTransaction();
      const [existingRows] = await connection.query("SELECT id FROM assessments WHERE id = ? LIMIT 1", [id]);
      if (existingRows.length === 0) throw new Error("Assessment not found");
      await connection.query(
        `UPDATE assessments SET title = ?, description = ?, category = ?, difficulty = ?, total_marks = ?, instructions = ?, status = ?, updated_at = NOW() WHERE id = ?`,
        [title, description, category, difficulty, total_marks, instructions, status, id]
      );
      await connection.query("DELETE FROM assessment_questions WHERE assignment_id = ?", [id]);
      for (const question of questions) await this.insertQuestion(connection, id, question);
      await connection.commit();
      return await this.getAssessmentById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async insertQuestion(connection, assessmentId, question) {
    await connection.query(
      `INSERT INTO assessment_questions (assignment_id, question, option_a, option_b, option_c, option_d, correct_answer, marks, explanation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [assessmentId, question.question, question.option_a, question.option_b, question.option_c, question.option_d, question.correct_answer, MARKS_PER_QUESTION, question.explanation]
    );
  }

  static async deleteAssessmentById(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [existingRows] = await connection.query("SELECT id FROM assessments WHERE id = ? LIMIT 1", [id]);
      if (existingRows.length === 0) return null;
      await connection.query("DELETE FROM assessment_questions WHERE assignment_id = ?", [id]);
      await connection.query("DELETE FROM assessments WHERE id = ?", [id]);
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAssessments(options = {}) {
    const connection = await pool.getConnection();
    try {
      const { limit = 20, offset = 0, category, difficulty, status, search } = options;
      const where = [];
      const params = [];
      if (category) { where.push("category = ?"); params.push(category); }
      if (difficulty) { where.push("difficulty = ?"); params.push(difficulty); }
      if (status) { where.push("status = ?"); params.push(status); }
      if (search) { where.push("(title LIKE ? OR description LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const [rows] = await connection.query(`SELECT * FROM assessments ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return rows.map((assessment) => ({ ...assessment, total_marks: ASSESSMENT_TOTAL_MARKS }));
    } finally {
      connection.release();
    }
  }

  static async getAssessmentById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query("SELECT * FROM assessments WHERE id = ? LIMIT 1", [id]);
      if (rows.length === 0) return null;
      const [questionRows] = await connection.query("SELECT * FROM assessment_questions WHERE assignment_id = ? ORDER BY id ASC", [id]);
      return {
        ...rows[0],
        total_marks: ASSESSMENT_TOTAL_MARKS,
        questions: questionRows.map((question) => ({ ...question, marks: MARKS_PER_QUESTION }))
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = Assessment;
