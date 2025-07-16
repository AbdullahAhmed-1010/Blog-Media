import {validationResult} from "express-validator"
import Comment from "../models/Comment"
import Blog from "../models/Blog"

export const createComment = async (req, res) => {
    try {
        const errors = validationResult(req)
        if(!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "validation error",
                errors: errors.array()
            })
        }

        const {content, blog, parentComment} = req.body

        const existingBlog = await Blog.findById(blog)
        
        if(!existingBlog) {
            return res.status(404).json({
                success: false,
                message: "blog not found"
            })
        }

        if(parentComment) {
            const existingParent = await Comment.findById(parentComment)

            if(!existingParent) {
                return res.status(404).json({
                    success: false,
                    message: "parent comment not found"
                })
            }
        }

        const comment = new Comment({
            content,
            author: req.user._id,
            blog,
            parentComment: parentComment || null
        })

        await comment.save()

        const populatedComment = await Comment.findById(comment._id)
          .populate("author", "username fullName avatar")
          .populate("parentComment", "content author")

        res.status(200).json({
            success: true,
            message: "comment created successfully",
            comment: populatedComment
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "server error",
            error: error.message
        })
    }
}