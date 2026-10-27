const pool = require('../config/database');

class User {

    /* ===== FIND OR CREATE GOOGLE USER ===== */
    static async findOrCreateGoogleUser({ google_id, email, name, lastname, profile_image }) {
        // Check by google_id first
        let [rows] = await pool.execute(
            'SELECT * FROM user WHERE google_id = ? LIMIT 1',
            [google_id]
        );
        if (rows[0]) return { user: rows[0], isNew: false };

        // Check by email (link existing account)
        [rows] = await pool.execute(
            'SELECT * FROM user WHERE email = ? LIMIT 1',
            [email]
        );
        if (rows[0]) {
            await pool.execute('UPDATE user SET google_id = ? WHERE id = ?', [google_id, rows[0].id]);
            rows[0].google_id = google_id;
            return { user: rows[0], isNew: false };
        }

        // Create new user (no password, auto-verified)
        const username = email.split('@')[0] + '_' + Math.floor(1000 + Math.random() * 9000);
        const [result] = await pool.execute(
            `INSERT INTO user (name, lastname, username, email, password, google_id, profile_image, status, created_date)
             VALUES (?, ?, ?, ?, NULL, ?, ?, 1, NOW())`,
            [name, lastname || '', username, email, google_id, profile_image || null]
        );
        const [newRows] = await pool.execute('SELECT * FROM user WHERE id = ? LIMIT 1', [result.insertId]);
        return { user: newRows[0], isNew: true };
    }

    /* ===== CREATE USER (INACTIVE) ===== */
    static async create(data) {
        const { 
            name, 
            lastname, 
            username, 
            email, 
            password,
            usertype = null,
            countrycode = null,
            phone = null,
            city = null,
            portfolio = null,
            linkdin = null,
            github = null,
            codePen = null,
            degreeOne = null,
            instituteOne = null,
            degreeTwo = null,
            instituteTwo = null,
            organizationOne = null,
            designationOne = null,
            experienceonOne = null,
            organizationTwo = null,
            designationTwo = null,
            experienceonTwo = null,
            profile_image = null,
            resume = null,
            resume_date = null
        } = data;

        const [result] = await pool.execute(
            `INSERT INTO user 
             (name, lastname, username, email, password, status, created_date,
              usertype, countrycode, phone, city, portfolio, linkdin, github, codePen,
              degreeOne, instituteOne, degreeTwo, instituteTwo,
              organizationOne, designationOne, experienceonOne,
              organizationTwo, designationTwo, experienceonTwo,
              profile_image, resume, resume_date)
             VALUES (?, ?, ?, ?, ?, 0, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, lastname, username, email, password,
                usertype, countrycode, phone, city, portfolio, linkdin, github, codePen,
                degreeOne, instituteOne, degreeTwo, instituteTwo,
                organizationOne, designationOne, experienceonOne,
                organizationTwo, designationTwo, experienceonTwo,
                profile_image, resume, resume_date
            ]
        );

        return result.insertId;
    }

    /* ===== ACTIVATE USER AFTER OTP ===== */
    static async activate(userId) {
        await pool.execute(
            `UPDATE user SET status = 1 WHERE id = ?`,
            [userId]
        );
    }

    /* ===== FIND BY EMAIL ===== */
    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM user WHERE email = ? LIMIT 1',
            [email]
        );
        return rows[0] || null;
    }

    /* ===== FIND BY USERNAME ===== */
    static async findByUsername(username) {
        const [rows] = await pool.execute(
            'SELECT * FROM user WHERE username = ? LIMIT 1',
            [username]
        );
        return rows[0] || null;
    }

    /* ===== LOGIN IDENTIFIER ===== */
    static async findByIdentifier(identifier) {
        const [rows] = await pool.execute(
            'SELECT * FROM user WHERE (email = ? OR username = ?) LIMIT 1',
            [identifier, identifier]
        );
        return rows[0] || null;
    }

    /* ===== UPDATE PASSWORD ===== */
    static async updatePassword(userId, hashedPassword) {
        await pool.execute(
            'UPDATE user SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );
    }

    /* ===== UPDATE PROFILE ===== */
    static async updateProfile(userId, data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            'name', 'lastname', 'usertype', 'countrycode', 'phone', 'city',
            'portfolio', 'linkdin', 'github', 'codePen',
            'degreeOne', 'instituteOne', 'degreeTwo', 'instituteTwo',
            'organizationOne', 'designationOne', 'experienceonOne',
            'organizationTwo', 'designationTwo', 'experienceonTwo',
            'profile_image', 'resume', 'resume_date'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) {
            return false;
        }

        values.push(userId);

        await pool.execute(
            `UPDATE user SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return true;
    }

    /* ===== GET USER BY ID  ===== */
    static async findById(userId) {
        const [rows] = await pool.execute(
            `SELECT id, name, lastname, username, email, usertype, countrycode, phone, city,
                    portfolio, linkdin, github, codePen,
                    degreeOne, instituteOne, degreeTwo, instituteTwo,
                    organizationOne, designationOne, experienceonOne,
                    organizationTwo, designationTwo, experienceonTwo,
                    profile_image, resume, resume_date, status, created_date
             FROM user WHERE id = ? LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    }
}

module.exports = User;
