import User from "../models/User"
import Blog from "../models/Blog"
import Comment from "../models/Comment"
import { validationResult } from "express-validator"

export const createBlog = async (req, res) => {
    try {
        const errors = validationResult(req)
        if(!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }

        const { title, content, excerpt, tags, category } = req.body
        const mediaFiles = req.files ? req.files.map(file => file.path) : []

        const blog = await Blog.create({
            title,
            content,
            excerpt,
            author: req.user.id,
            tags: tags ? (tags.split(",").map(tag => tag.trim())) : [],
            category,
            mediaFiles,
            featuredmage: mediaFiles[0] || ""
        })

        await blog.populate("author", "username fullName avatar")

        res.status(200).json({
            success: true,
            blog
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}

export const getAllBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const { search, category, tags, author } = req.query

        //query search
        let query = {status: "published"}
        if(search) {
            query.$or = [
                {title: {$regex: search, $options: "i"}},
                {content: {$regex: search, $options: "i"}},
                {tags: {$in: [new RegExp(search, "i")]}}
            ]
        }

        if(category) {
            query.category = category
        }
        if(tags) {
            query.tags = { $in: tags.split(",") }
        }
        if(author) {
            query.author = author
        }

        const blogs = await Blog.find(query)
        .populate("author", "username fullName avatar")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)

        const total = await Blog.countDocuments(query)

        res.status(200).json({
            success: true,
            blogs,
            currentPage: page,
            totalPage: Math.ceil(total/limit),
            totalBlogs: total
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}

export const getBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({slug: req.params.slug})
        .populate("author", "username fullName avatar followers following")
        .populate("likes", "username fullName avatar")

        if(!blog) {
            return res.status(404).json({
                message: "Blog not found"
            })
        }

        //increment view counts
        blog.views += 1
        await blog.save()

        res.status(200).json({
            success: true,
            blog
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}

export const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({slug: req.params.slug})
        if(!blog) {
            return res.status(404).json({
                message: "Blog not found"
            })
        }

        if(blog.author.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Not authorized to update this blog"
            })
        }

        const {title, content, excerpt, tags, category} = req.body
        const mediaFiles = req.files ? (req.files.map(file => file.path)) : (blog.mediaFiles)

        const updatedBlog = await Blog.findByIdAndUpdate(
            blog._id,
            {
                title: title || blog.title,
                content: content || blog.content,
                excerpt: excerpt || blog.excerpt,
                tags: tags ? (tags.split(",").map(tag => tag.trim())) : (blog.tags),
                category: category || blog.category,
                mediaFiles,
                featuredmage: mediaFiles[0] || blog.featuredmage
            },
            {new: true, runValidators: true}
        ).populate("author", "username fullName avatar")

        res.status(200).json({
            success: true,
            blog: updatedBlog
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}

export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({slug: req.params.slug})
        if(!blog) {
            return res.status(404).json({
                message: "Blog not found"
            })
        }

        if(blog.author.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Not authorized to delete the blog"
            })
        }

        await Blog.findByIdAndDelete(blog._id)
        await Comment.deleteMany({blog: blog._id})

        res.status(200).json({
            success: true,
            message: "Blog deleted successfully"
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}

export const likeBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({slug: req.params.slug})
        if(!blog) {
            return res.status(404).json({
                message: "Blog not found"
            })
        }

        const isLiked = blog.likes.includes(req.user.id)
        if(isLiked) {
            blog.likes.pull(req.user.id)
        }
        else{
            blog.likes.push(req.user.id)
        }

        await blog.save()

        res.status(200).json({
            success: true,
            isLiked: !isLiked,
            likesCount: blog.likes.length
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}

export const saveBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({slug: req.params.slug})
        if(!blog) {
            return res.status(404).json({
                message: "Blog not found"
            })
        }

        const user = await User.findById(req.user.id)
        const isSaved = user.savedBlogs.includes(blog._id)

        if(isSaved) {
            user.savedBlogs.push(blog._id)
        }
        else {
            user.savedBlogs.pull(blog._id)
        }

        await user.save()

        res.status(200).json({
            success: true,
            isSaved: !isSaved,
            message: isSaved ? ("Blog removed from saved") : ("Blog saved successfully")
        })
    } catch (error) {
        res.status(500).json({
            message: "server error",
            error: error.message
        })
    }
}