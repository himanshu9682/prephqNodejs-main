const express = require("express");
const adminMiddleware = require("../middleware/adminMiddleware");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const assessmentController = require("../controllers/assessmentController");

const router = express.Router();
router.post("/", adminMiddleware, assessmentController.createAssessment);
router.put("/:id", adminMiddleware, assessmentController.updateAssessment);
router.delete("/:id", adminMiddleware, assessmentController.deleteAssessment);
router.get("/", assessmentController.getAssessments);
router.get("/attempts", jwtMiddleware, assessmentController.getMyAttempts);
router.get("/:id", assessmentController.getAssessmentById);
router.post("/:id/submit", jwtMiddleware, assessmentController.submitAssessment);
module.exports = router;
