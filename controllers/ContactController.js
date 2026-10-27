const ContactMessage = require('../models/ContactMessage');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { sendContactEmail, sendNewsletterEmail } = require('../utils/mailer');

class ContactController {
	static async contactUs(req, res) {
		try {
			const name = (req.body.name || '').trim();
			const lastname = (req.body.lastname || '').trim();
			const countryCode = (req.body.countryCode || '').trim();
			const phone = (req.body.phone || '').trim();
			const email = (req.body.email || '').trim();
			const message = (req.body.message || '').trim();

			if (!name || !lastname || !countryCode || !phone || !email || !message) {
				return res.json({
					status: 0,
					error: 'All fields are required'
				});
			}

			const contact = {
				name,
				lastname,
				countryCode,
				phone,
				email,
				message,
				status: 0
			};

			const contactMessage = await ContactMessage.create(contact);

			if (!contactMessage) {
				return res.json({
					status: 0,
					error: 'Failed to save contact message'
				});
			}

			await sendContactEmail({
				fromEmail: email,
				toEmail: email,
				subject: 'PrepHq Contact Form Submission',
				data: {
					name,
					lastname,
					countryCode,
					phone,
					email,
					message
				}
			});

			return res.json({
				status: 1,
				message: 'Message sent and saved successfully'
			});
		} catch (error) {
			return res.status(500).json({
				status: 0,
				error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
			});
		}
	}

	static async newsletterSubscribe(req, res) {
		try {
			const email = (req.body.email || '').trim();

			if (!email) {
				return res.json({
					status: 0,
					error: 'Email is required'
				});
			}

			if (!ContactController.isValidEmail(email)) {
				return res.json({
					status: 0,
					error: 'Invalid email address'
				});
			}

			const alreadySubscribed = await NewsletterSubscriber.exists(email);
			if (alreadySubscribed) {
				return res.json({
					status: 0,
					error: 'You have already subscribed.'
				});
			}

			const subscriber = await NewsletterSubscriber.create({
				email,
				status: 1
			});

			if (!subscriber) {
				return res.json({
					status: 0,
					error: 'Something went wrong. Please try again.'
				});
			}

			await sendNewsletterEmail(email);

			return res.json({
				status: 1,
				message: 'Subscribed successfully. Confirmation email sent.'
			});
		} catch (error) {
			return res.status(500).json({
				status: 0,
				error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
			});
		}
	}

	static isValidEmail(value) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}
}

module.exports = ContactController;
