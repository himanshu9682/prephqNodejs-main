const express = require('express');
const AuthController = require('../controllers/authController');
const UserController = require('../controllers/userController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const pickUploadedFile = (...fieldNames) => (req, res, next) => {
	if (!req.file && Array.isArray(req.files)) {
		req.file = req.files.find((file) => fieldNames.includes(file.fieldname)) || req.files[0];
	}
	next();
};
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login success
 */

/* PUBLIC */
router.post('/register', AuthController.register);
router.post('/loginUser', AuthController.login);
router.post('/request_reset', AuthController.request_Reset);
router.post('/google', AuthController.googleLogin);

/* PROTECTED */
router.post('/confirm', jwtMiddleware, AuthController.confirm);
router.post('/resend-code', jwtMiddleware, AuthController.resendCode);
router.post('/verify_code', jwtMiddleware, AuthController.verifyCode);
router.post('/reset_password', jwtMiddleware, AuthController.resetPassword);
router.get('/user', jwtMiddleware, AuthController.me);
router.post('/logout', jwtMiddleware, AuthController.logout);

/* USER PROFILE */
router.post('/profileupdate', jwtMiddleware, UserController.profileUpdate);
router.post(
	'/upload-profile-image',
	jwtMiddleware,
	upload.any(),
	pickUploadedFile('profile_image', 'profileImage', 'image'),
	UserController.uploadProfileImage
);
router.post(
	'/upload-resume',
	jwtMiddleware,
	upload.any(),
	pickUploadedFile('resume', 'file'),
	UserController.uploadResume
);
router.delete('/delete-resume', jwtMiddleware, UserController.deleteResume);
router.get('/get-user', jwtMiddleware, UserController.getUser);

module.exports = router;
