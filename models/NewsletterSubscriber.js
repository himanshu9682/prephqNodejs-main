const pool = require('../config/database');

class NewsletterSubscriber {
	static async exists(email) {
		const [rows] = await pool.execute(
			'SELECT 1 FROM newsletter_subscribers WHERE email = ? LIMIT 1',
			[email]
		);

		return rows.length > 0;
	}

	static async create(data) {
		const { email, status = 1 } = data;

		const [result] = await pool.execute(
			`INSERT INTO newsletter_subscribers
			 (email, status, subscribed_at)
			 VALUES (?, ?, NOW())`,
			[email, status]
		);

		return result.insertId;
	}
}

module.exports = NewsletterSubscriber;
