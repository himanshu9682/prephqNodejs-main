const pool = require('../config/database');

class AccountConfirm {

    static async create({ user_id, email, code, expires_at }) {
        await pool.execute(
            `INSERT INTO accountconfirm 
             (user_id, email, code, expires_at, status, attempts)
             VALUES (?, ?, ?, ?, 'PENDING', 0)`,
            [user_id, email, String(code), expires_at]
        );
    }

    static async findActive(email) {
        const [rows] = await pool.execute(
            `SELECT * FROM accountconfirm 
             WHERE email = ? 
             ORDER BY id DESC 
             LIMIT 1`,
            [email]
        );
        return rows[0] || null;
    }

    static async markVerified(id) {
        await pool.execute(
            `UPDATE accountconfirm 
             SET status = 'USED' 
             WHERE id = ?`,
            [id]
        );
    }

    static async delete(email) {
        await pool.execute(
            `DELETE FROM accountconfirm WHERE email = ?`,
            [email]
        );
    }

    static async upsert({ user_id, email, code, expires_at }) {
        const existing = await this.findActive(email);

        if (existing) {
            // UPDATE existing OTP
            await pool.execute(
                `UPDATE accountconfirm 
                 SET user_id = ?,
                     code = ?, 
                     expires_at = ?, 
                     status = 'PENDING', 
                     attempts = 0,
                     created_at = NOW()
                 WHERE email = ?`,
                [user_id, String(code), expires_at, email]
            );
        } else {
            // INSERT new OTP
            await pool.execute(
                `INSERT INTO accountconfirm 
                 (user_id, email, code, expires_at, status, attempts, created_at)
                 VALUES (?, ?, ?, ?, 'PENDING', 0, NOW())`,
                [user_id, email, String(code), expires_at]
            );
        }
    }

    static async createConfirmCode(email, ttlMinutes, userId = 0) {
        try {
            const code = String(Math.floor(11111 + Math.random() * 88889));
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

            await this.upsert({
                user_id: userId,
                email,
                code,
                expires_at: expiresAt
            });

            return code;
        } catch (err) {
            console.error('OTP creation failed:', {
                email,
                error: err.message
            });
            return false;
        }
    }

    static async validateConfirmCode(email, code) {
        try {
            const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Expire old codes first
            await pool.execute(
                `UPDATE accountconfirm 
                 SET status = 'EXPIRED' 
                 WHERE expires_at < ? AND status = 'PENDING'`,
                [currentDateTime]
            );

            // Check if code is valid
            const [rows] = await pool.execute(
                `SELECT id, status, expires_at 
                 FROM accountconfirm 
                 WHERE email = ? AND code = ? 
                 LIMIT 1`,
                [email, String(code)]
            );

            console.log('validateConfirmCode debug:', {
                email,
                code,
                current_datetime: currentDateTime,
                query_result: rows,
                result_count: rows.length
            });

            if (rows.length === 0) {
                console.log('No matching record found');
                return false;
            }

            const row = rows[0];

            console.log('Found record:', {
                id: row.id,
                status: row.status,
                expires_at: row.expires_at,
                current_datetime: currentDateTime,
                is_expired_by_datetime: row.expires_at < currentDateTime
            });

            // Check status and expiry
            if (row.status !== 'PENDING' || row.expires_at < currentDateTime) {
                console.log('Code validation failed:', {
                    status_check: row.status !== 'PENDING',
                    expiry_check: row.expires_at < currentDateTime
                });
                return false;
            }

            console.log('Code validation successful');
            return true;
        } catch (err) {
            console.error('Code validation error:', err.message);
            return false;
        }
    }

    static async deleteConfirmCode(email) {
        try {
            await pool.execute(
                `DELETE FROM accountconfirm WHERE email = ?`,
                [email]
            );
            return true;
        } catch (err) {
            console.error('Delete confirm code error:', err.message);
            return false;
        }
    }

}

module.exports = AccountConfirm;
