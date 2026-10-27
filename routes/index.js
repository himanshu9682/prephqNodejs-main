const express = require('express');
const interviewRoutes = require("./AllFourPagesRoutes/interviewRoutes");
const jobRoutes = require('./jobRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const contactRoutes = require('./contactRoutes');
const projectRoutes = require('./AllFourPagesRoutes/projectRoutes');
const tutorialRoutes = require('./AllFourPagesRoutes/tutorialRoutes');
const blogRoutes = require('./AllFourPagesRoutes/blogRoutes');
const questionRoutes = require('./questionRoutes');
const assessmentRoutes = require('./assessmentRoutes');
const runRoutes = require('./runRoutes');
const submitRoutes = require('./submitRoutes');
const submitController = require("../controllers/submitController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();


/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: API health check
 *   - name: Jobs
 *     description: Job related APIs
 *   - name: Projects
 *     description: Project related APIs
 *   - name: Tutorials
 *     description: Tutorial related APIs
 *   - name: Blogs
 *     description: Blog related APIs
 *   - name: Questions
 *     description: Question and testcase APIs
 *   - name: Run
 *     description: Code execution APIs
 *   - name: Submit
 *     description: Code submission APIs
 *   - name: Auth
 *     description: Authentication APIs
 *   - name: Contact
 *     description: Contact & message APIs
 */

// Routes
router.use("/interview", interviewRoutes);
router.use('/jobs', jobRoutes);
router.use('/', adminRoutes);
router.use('/project', projectRoutes);
router.use('/tutorial', tutorialRoutes);
router.use('/blog', blogRoutes);
router.use('/questions', questionRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/run', runRoutes);
router.use('/submit', submitRoutes);
router.use('/', authRoutes);
router.use('/', contactRoutes);

router.get('/submissions', jwtMiddleware, submitController.getSubmissionHistory);


/**
 * @swagger
 * /health:
 *   get:
 *     summary: API health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "api is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
