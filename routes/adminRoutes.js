const express = require("express");
const adminController = require("../controllers/adminController");
const adminMiddleware = require("../middleware/adminMiddleware");
const submitController = require("../controllers/submitController");

const router = express.Router();

/**
 * @swagger
 * /Admin-login:
 *   post:
 *     summary: Admin login with email or adminname
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               adminname:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */

// Admin Login
router.post("/Admin-login", adminController.loginAdmin);
/**
 * @swagger
 * /Admin-logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin logout successful
 *       401:
 *         description: Token missing or invalid
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
// Admin Logout
router.post("/Admin-logout", adminMiddleware, adminController.logoutAdmin);

router.get("/admin/submissions", adminMiddleware, submitController.getAdminSubmissions);

module.exports = router;
