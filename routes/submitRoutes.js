const express = require("express");
const submitController = require("../controllers/submitController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

router.post("/", jwtMiddleware, submitController.submit);
router.get("/:id", submitController.getSubmission);

module.exports = router;
