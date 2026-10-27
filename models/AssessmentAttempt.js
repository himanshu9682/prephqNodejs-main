const pool = require("../config/database");

const normalizeAnswer = (value) => {
  const answer = String(value || "").trim().toUpperCase();
  const match = answer.match(/^(?:OPTION[\s_-]*)?([A-D])$/);
  return match ? match[1] : answer;
};

const normalizeResponses = (responses) => {
  if (Array.isArray(responses)) return responses;
  if (responses && typeof responses === "object") {
    return Object.entries(responses).map(([questionId, answer]) => ({ question_id: Number(questionId), answer }));
  }
  return [];
};

class AssessmentAttempt {
  static async submitAttempt({ assessmentId, userId, responses, startedAt, submittedAt, durationSeconds }) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [assessmentRows] = await connection.query("SELECT id, total_marks FROM assessments WHERE id = ? LIMIT 1", [assessmentId]);
      if (assessmentRows.length === 0) {
        throw new Error("ASSESSMENT_NOT_FOUND");
      }

      const [questionRows] = await connection.query(
        "SELECT id, correct_answer, marks FROM assessment_questions WHERE assignment_id = ? ORDER BY id ASC",
        [assessmentId]
      );

      if (questionRows.length === 0) {
        throw new Error("ASSESSMENT_HAS_NO_QUESTIONS");
      }

      const normalizedResponses = normalizeResponses(responses);
      const responseMap = new Map();

      for (const response of normalizedResponses) {
        const questionId = Number(response.question_id || response.id || response.questionId || 0);
        if (!questionId) continue;
        responseMap.set(questionId, normalizeAnswer(response.answer || response.selected_option || response.selectedOption || ""));
      }

      let attemptedCount = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let obtainedMarks = 0;
      const responseAudit = [];

      for (const question of questionRows) {
        const selectedAnswer = normalizeAnswer(responseMap.get(question.id) || "");
        const correctAnswer = normalizeAnswer(question.correct_answer);
        const marks = Number(question.marks || 0);

        if (selectedAnswer) {
          attemptedCount += 1;
          if (selectedAnswer === correctAnswer) {
            correctCount += 1;
            obtainedMarks += marks;
          } else {
            wrongCount += 1;
          }
        }

        responseAudit.push({
          question_id: question.id,
          selected_answer: selectedAnswer || null,
          correct_answer: correctAnswer,
          is_correct: selectedAnswer ? selectedAnswer === correctAnswer : false,
          marks_awarded: selectedAnswer === correctAnswer ? marks : 0
        });
      }

      const totalQuestions = questionRows.length;
      const unansweredCount = totalQuestions - attemptedCount;
      const totalMarks = Number(assessmentRows[0].total_marks || questionRows.reduce((sum, question) => sum + Number(question.marks || 0), 0));
      const safeTotalMarks = totalMarks > 0 ? totalMarks : 1;
      const scorePercent = Number(((obtainedMarks / safeTotalMarks) * 100).toFixed(2));

      const startDate = startedAt ? new Date(startedAt) : null;
      const endDate = submittedAt ? new Date(submittedAt) : new Date();
      const computedDuration = startDate && !Number.isNaN(startDate.getTime())
        ? Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000))
        : null;
      const finalDurationSeconds = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) >= 0
        ? Number(durationSeconds)
        : (computedDuration !== null ? computedDuration : 0);

      const [attemptRows] = await connection.query(
        "SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt FROM assessment_attempts WHERE assessment_id = ? AND user_id = ? FOR UPDATE",
        [assessmentId, userId]
      );
      const attemptNumber = Number(attemptRows[0].max_attempt || 0) + 1;

      const [insertResult] = await connection.query(
        `INSERT INTO assessment_attempts (
          assessment_id,
          user_id,
          attempt_number,
          total_questions,
          attempted_count,
          correct_count,
          wrong_count,
          unanswered_count,
          total_marks,
          obtained_marks,
          score_percent,
          duration_seconds,
          started_at,
          submitted_at,
          responses,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          assessmentId,
          userId,
          attemptNumber,
          totalQuestions,
          attemptedCount,
          correctCount,
          wrongCount,
          unansweredCount,
          totalMarks,
          obtainedMarks,
          scorePercent,
          finalDurationSeconds,
          startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
          endDate,
          JSON.stringify(responseAudit)
        ]
      );

      await connection.commit();

      return {
        id: insertResult.insertId,
        assessment_id: assessmentId,
        user_id: userId,
        attempt_number: attemptNumber,
        total_questions: totalQuestions,
        attempted_count: attemptedCount,
        correct_count: correctCount,
        wrong_count: wrongCount,
        unanswered_count: unansweredCount,
        total_marks: totalMarks,
        obtained_marks: obtainedMarks,
        score_percent: scorePercent,
        duration_seconds: finalDurationSeconds,
        started_at: startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString() : null,
        submitted_at: endDate.toISOString(),
        responses: responseAudit
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAttemptsByUser(userId, options = {}) {
    const connection = await pool.getConnection();
    try {
      const { limit = 20, offset = 0, assessmentId } = options;
      const where = ["user_id = ?"];
      const params = [userId];
      if (assessmentId) {
        where.push("assessment_id = ?");
        params.push(assessmentId);
      }
      const whereSql = `WHERE ${where.join(" AND ")}`;
      const [rows] = await connection.query(
        `SELECT id, assessment_id, attempt_number, total_questions, attempted_count, correct_count,
                wrong_count, unanswered_count, total_marks, obtained_marks, score_percent,
                duration_seconds, started_at, submitted_at, created_at
         FROM assessment_attempts ${whereSql}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const [[{ total }]] = await connection.query(
        `SELECT COUNT(*) AS total FROM assessment_attempts ${whereSql}`,
        params
      );
      return { total, attempts: rows };
    } finally {
      connection.release();
    }
  }
}

module.exports = AssessmentAttempt;