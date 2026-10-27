const express = require("express");
const JobController = require("../controllers/jobController");

const router = express.Router();

/**
 * @swagger
 * /jobs/get-all-jobs:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Jobs fetched successfully
 */
router.get("/get-all-jobs", JobController.getAllJobs);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job details by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job details retrieved successfully
 *       404:
 *         description: Job not found
 */
router.get("/:id", JobController.getJobDetailsById);

/**
 * @swagger
 * /jobs/add:
 *   post:
 *     summary: Add a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - company
 *               - location
 *               - jobType
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               salary:
 *                 type: string
 *               jobType:
 *                 type: string
 *               requirements:
 *                 type: string
 *               postedBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job added successfully
 *       400:
 *         description: Required fields missing
 */
router.post("/add", JobController.addJob);

/**
 * @swagger
 * /jobs/{id}:
 *   put:
 *     summary: Edit job details
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               salary:
 *                 type: string
 *               jobType:
 *                 type: string
 *               requirements:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       404:
 *         description: Job not found
 */
router.put("/:id", JobController.editJob);

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     summary: Delete a job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 */
router.delete("/:id", JobController.deleteJob);

module.exports = router;
