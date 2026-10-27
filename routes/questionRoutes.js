const express = require("express");
const adminMiddleware = require("../middleware/adminMiddleware");
const questionController = require("../controllers/questionController");

const router = express.Router();

/**
 * @swagger
 * /questions:
 *   post:
 *     summary: Create a new coding question with testcases
 *     tags: [Questions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - difficulty
 *               - domain
 *               - topics
 *               - description
 *               - examples
 *               - constraints_list
 *               - starter_code
 *               - testcases
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [Easy, Medium, Hard]
 *               domain:
 *                 type: string
 *               topics:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               examples:
 *                 type: array
 *               constraints_list:
 *                 type: array
 *                 items:
 *                   type: string
 *               starter_code:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               testcases:
 *                 type: array
 *     responses:
 *       201:
 *         description: Question created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate slug
 */
router.post("/", adminMiddleware, questionController.createQuestion);

/**
 * @swagger
 * /questions/{id}:
 *   put:
 *     summary: Update a question and replace all testcases
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Question not found
 *       409:
 *         description: Duplicate slug
 */
router.put("/:id", adminMiddleware, questionController.updateQuestion);

/**
 * @swagger
 * /questions/{id}:
 *   delete:
 *     summary: Delete a question and its testcases
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found
 */
router.delete("/:id", adminMiddleware, questionController.deleteQuestion);

// Public: list questions and get by slug
router.get("/", questionController.getQuestions);
router.get("/:slug", questionController.getQuestionBySlug);

module.exports = router;