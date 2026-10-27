const Job = require("../models/Job");

class JobController {
  // GET /jobs/get-all-jobs
  static async getAllJobs(req, res) {
    try {
      const jobs = await Job.getAllJobs();

      res.status(200).json({
        success: true,
        message: "Jobs retrieved successfully",
        data: jobs,
        count: jobs.length,
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    }
  }

  // GET /jobs/:id
  static async getJobDetailsById(req, res) {
    try {
      const jobId = req.params.id;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "Job ID is required",
        });
      }

      const job = await Job.getJobDetailsById(jobId);

      res.status(200).json({
        success: true,
        message: "Job details retrieved successfully",
        data: job,
      });
    } catch (error) {
      console.error("Error fetching job details:", error);

      if (error.message === "Job not found") {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    }
  }

  // POST /api/jobs/add
  static async addJob(req, res) {
    try {
      const { title, description, company, location, salary, jobType, requirements, postedBy } = req.body;

      // Validate required fields
      if (!title || !description || !company || !location || !jobType) {
        return res.status(400).json({
          success: false,
          message: "Title, description, company, location, and jobType are required",
        });
      }

      const jobData = {
        title,
        description,
        company,
        location,
        salary: salary || null,
        jobType,
        requirements: requirements || null,
        postedBy: postedBy || null,
      };

      const result = await Job.addJob(jobData);

      res.status(201).json({
        success: true,
        message: "Job added successfully",
        data: {
          id: result.insertId,
          ...jobData,
        },
      });
    } catch (error) {
      console.error("Error adding job:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    }
  }

  // PUT /api/jobs/:id
  static async editJob(req, res) {
    try {
      const jobId = req.params.id;
      const { title, description, company, location, salary, jobType, requirements } = req.body;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "Job ID is required",
        });
      }

      // Validate at least one field is provided
      if (!title && !description && !company && !location && !salary && !jobType && !requirements) {
        return res.status(400).json({
          success: false,
          message: "At least one field is required to update",
        });
      }

      const jobData = {
        title,
        description,
        company,
        location,
        salary,
        jobType,
        requirements,
      };

      // Remove undefined fields
      Object.keys(jobData).forEach(key => jobData[key] === undefined && delete jobData[key]);

      const result = await Job.editJob(jobId, jobData);

      res.status(200).json({
        success: true,
        message: "Job updated successfully",
        data: {
          id: jobId,
          ...jobData,
        },
      });
    } catch (error) {
      console.error("Error updating job:", error);

      if (error.message === "Job not found") {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    }
  }

  // DELETE /api/jobs/:id
  static async deleteJob(req, res) {
    try {
      const jobId = req.params.id;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "Job ID is required",
        });
      }

      const result = await Job.deleteJob(jobId);

      res.status(200).json({
        success: true,
        message: "Job deleted successfully",
        data: {
          id: jobId,
        },
      });
    } catch (error) {
      console.error("Error deleting job:", error);

      if (error.message === "Job not found") {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    }
  }
}

module.exports = JobController;
