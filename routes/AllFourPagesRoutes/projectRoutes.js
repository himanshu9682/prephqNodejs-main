const express = require("express");
const router = express.Router();
const projectController = require("../../controllers/AllFourPagesController/ProjectController");
const { projectUpload } = require("../../middleware/AllFourPagesMiddleware.js/projectMiddleware");
const jwtMiddleware = require("../../middleware/jwtMiddleware");

router.get("/", projectController.getAllProjects);
router.get("/category/:slug", projectController.getProjectsByCategory);
router.get("/:id", projectController.getProjectById);

router.post("/", jwtMiddleware, projectUpload, projectController.createProject);
router.post("/:id/like", jwtMiddleware, projectController.likeProject);
router.put("/:id", jwtMiddleware, projectUpload, projectController.updateProject);
router.delete("/:id", jwtMiddleware, projectController.deleteProject);



module.exports = router;
