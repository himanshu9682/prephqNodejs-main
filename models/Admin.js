const pool = require("../config/database");

class Admin {

  // Find by ID
  static async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM admin WHERE id = ?",
      [id]
    );
    return rows[0];
  }

  // Find by Email
  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM admin WHERE email = ?",
      [email]
    );
    return rows[0];
  }

  // Find by Admin Name
  static async findByUsername(username) {
    const [rows] = await pool.query(
      "SELECT * FROM admin WHERE adminname = ?",
      [username]
    );
    return rows[0];
  }

  // Update Token
  static async updateToken(id, token) {
    await pool.query(
      "UPDATE admin SET token = ? WHERE id = ?",
      [token, id]
    );
  }

}

module.exports = Admin;