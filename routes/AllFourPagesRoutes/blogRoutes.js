const express = require("express");
const router = express.Router();
const blogController = require("../../controllers/AllFourPagesController/blogController");
const { blogUpload } = require("../../middleware/AllFourPagesMiddleware.js/blogMiddleware");
const jwtMiddleware = require("../../middleware/jwtMiddleware");

router.get("/", blogController.getAllBlogs);
router.get("/category/:slug", blogController.getBlogsByCategory);
router.get("/:id", blogController.getBlogById);

router.post("/", jwtMiddleware, blogUpload, blogController.createBlog);
router.post("/:id/like", jwtMiddleware, blogController.likeBlog);
router.put("/:id", jwtMiddleware, blogUpload, blogController.updateBlog);
router.delete("/:id", jwtMiddleware, blogController.deleteBlog);



module.exports = router;
