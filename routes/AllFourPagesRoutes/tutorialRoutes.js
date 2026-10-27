const express = require("express");
const router = express.Router();
const tutorialController = require("../../controllers/AllFourPagesController/tutorialController");
const { tutorialUpload } = require("../../middleware/AllFourPagesMiddleware.js/tutorialUploadMiddleware");
const jwtMiddleware = require("../../middleware/jwtMiddleware");

// GET routes
router.get("/", tutorialController.getAllTutorials);
router.get("/category/:slug", tutorialController.getTutorialsByCategory);
router.get("/:id", tutorialController.getTutorialById);

// POST 
router.post("/", jwtMiddleware, tutorialUpload, tutorialController.createTutorial);
router.post("/:id/like", jwtMiddleware, tutorialController.likeTutorial);
// PUT route 
router.put("/:id", jwtMiddleware, tutorialUpload, tutorialController.updateTutorial);

// DELETE 
router.delete("/:id", jwtMiddleware, tutorialController.deleteTutorial);



module.exports = router;
