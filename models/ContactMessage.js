const pool = require('../config/database');

class ContactMessage {
	static async create(data) {
		const {
			name,
			lastname,
			countryCode,
			phone,
			email,
			message
		} = data;

		const [result] = await pool.execute(
			`INSERT INTO contact_messages
			 (name, lastname, countryCode, phone, email, message, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
			[name, lastname, countryCode, phone, email, message]
		);

		return result.insertId;
	}
}

module.exports = ContactMessage;
