const pool = require("../config/database");

class Job {
  static async getAllJobs() {
    try {
      const [rows] = await pool.query("SELECT * FROM jobs");
      return rows;
    } catch (error) {
      console.error(" Error fetching jobs:", error.message);
      throw new Error("Failed to fetch jobs");
    }
  }

  static async getJobDetailsById(jobId) {
    try {
      const [rows] = await pool.query("SELECT * FROM jobs WHERE id = ?", [jobId]);
      if (rows.length === 0) {
        throw new Error("Job not found");
      }
      return rows[0];
    } catch (error) {
      console.error(" Error fetching job details:", error.message);
      throw new Error("Failed to fetch job details");
    }
  }

  static async addJob(jobData) {
    try {
      const { title, description, company, location, salary, jobType, requirements, postedBy } = jobData;
      const [result] = await pool.query(
        "INSERT INTO jobs (title, description, company, location, salary, jobType, requirements, postedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [title, description, company, location, salary, jobType, requirements, postedBy]
      );
      return result;
    } catch (error) {
      console.error(" Error adding job:", error.message);
      throw new Error("Failed to add job");
    }
  }

  static async editJob(jobId, jobData) {
    try {
      const { title, description, company, location, salary, jobType, requirements } = jobData;
      const [result] = await pool.query(
        "UPDATE jobs SET title = ?, description = ?, company = ?, location = ?, salary = ?, jobType = ?, requirements = ?, updatedAt = NOW() WHERE id = ?",
        [title, description, company, location, salary, jobType, requirements, jobId]
      );
      if (result.affectedRows === 0) {
        throw new Error("Job not found");
      }
      return result;
    } catch (error) {
      console.error(" Error editing job:", error.message);
      throw new Error("Failed to edit job");
    }
  }

  static async deleteJob(jobId) {
    try {
      const [result] = await pool.query("DELETE FROM jobs WHERE id = ?", [jobId]);
      if (result.affectedRows === 0) {
        throw new Error("Job not found");
      }
      return result;
    } catch (error) {
      console.error(" Error deleting job:", error.message);
      throw new Error("Failed to delete job");
    }
  }
}

module.exports = Job;
