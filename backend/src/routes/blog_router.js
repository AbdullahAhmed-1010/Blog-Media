import express from "express"
import { body } from "express-validator"
import {
    createBlog,
    getAllBlogs,
    getBlog,
    updateBlog,
    deleteBlog,
    likeBlog,
    saveBlog,
    getUserSavedBlogs,
    getUserBlogs
} from "../controllers/blogController.js"
import { auth, isResourceOwner } from "../middlewares/auth.js"
import { uploadMediaFiles } from "../middlewares/fileUpload.js"
import Blog from "../models/Blog.js"
import { handleMulterError, uploadBlogMedia } from "../utils/upload.js"

const router = express.Router()

router.post("/", auth, uploadBlogMedia, handleMulterError, uploadMediaFiles.array("mediaFiles"), [
    body("title")
      .trim()
      .isLength({min: 1, max: 255})
      .withMessage("title must be between 1 and 255 characters"),
    body("content")
      .trim(),
    body("excerpt")
      .trim()
      .isLength({min: 1, max: 500})
      .withMessage("excerpt cannot exceed more than 500 characters"),
    body("tags")
      .optional().isArray()
      .withMessage("tags must be an array"),
    body("tags.*")
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage("each tag must be between 1 and 30 characters"),
    body("status")
      .optional().default("published")
], createBlog)

router.get("/", getAllBlogs)
router.get("/:slug", getBlog)
router.put("/update/:id", auth, uploadBlogMedia, handleMulterError, uploadMediaFiles.array("mediaFiles"), isResourceOwner(Blog), updateBlog)
router.delete("/delete/:id", auth, isResourceOwner(Blog), deleteBlog)
router.post("/:id/like", auth, likeBlog)
router.post("/:id/save", auth, saveBlog)
router.get("/saved/me", auth, getUserSavedBlogs)
router.get("/:id/blogs", auth, getUserBlogs)

export default router