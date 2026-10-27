const express = require('express');
const ContactController = require('../controllers/ContactController');

const router = express.Router();
/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Submit contact form
 *     tags: [Contact]
 *     responses:
 *       200:
 *         description: Message sent successfully
 */

router.post('/contactus', ContactController.contactUs);
router.post('/newsletterSubscribe', ContactController.newsletterSubscribe);

module.exports = router;
