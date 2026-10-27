const express = require("express");
const router = express.Router();
const interviewController = require("../../controllers/AllFourPagesController/interviewController");
const { interviewUpload } = require("../../middleware/AllFourPagesMiddleware.js/interviewMiddleware");
const jwtMiddleware = require("../../middleware/jwtMiddleware");

router.get("/", interviewController.getAllInterviews);
router.get("/category/:slug", interviewController.getInterviewsByCategory);
router.get("/:id", interviewController.getInterviewById);

router.post("/", jwtMiddleware, interviewUpload, interviewController.createInterview);
router.post("/:id/like", jwtMiddleware, interviewController.likeInterview);
router.put("/:id", jwtMiddleware, interviewUpload, interviewController.updateInterview);
router.delete("/:id", jwtMiddleware, interviewController.deleteInterview);





module.exports = router;
