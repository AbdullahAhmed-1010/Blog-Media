import express from "express"
import { body } from "express-validator"
import { createComment } from "../controllers/commentController"
import { auth } from "../middlewares/auth"

const router = express.Router()

router.post("/", auth, [
    body("content")
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Comment must be between 1 and 1000 characters"),
    body("blog")
      .isMongoId()
      .withMessage("Valid blog ID is required"),
    body("parentComment")
      .optional().isMongoId()
      .withMessage("Valid parent comment ID is required")
], createComment)

export default router