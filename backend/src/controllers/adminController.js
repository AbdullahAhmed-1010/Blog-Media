import User from "../models/User"
import Blog from "../models/Blog"

export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password")
        res.status(200).json({
            success: true,
            users
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "server error fetching all users",
            error: error.message
        })
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params

        const deletedUser = await User.findByIdAndDelete(userId)
        if(!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            })
        }
        res.status(200).json({
            success: true,
            message: "user deleted successfully"
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "server error deleting user",
            error: error.message
        })
    }
}

export const getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().populate("author", "username fullName avatar")
        res.status(200).json({
            success: true,
            blogs
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "server error fetching blogs",
            error: error.message
        })
    }
}

export const deleteBlog = async (req, res) => {
    try {
        const { blogId } = req.params

        const deletedBlog = await Blog.findByIdAndDelete(blogId)
        if(!deletedBlog) {
            return res.status(404).json({
                success: false,
                message: "blog not found"
            })
        }
        res.status(200).json({
            success: true,
            message: "blog deleted successfully"
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "server error deleting blog",
            error: error.message
        })
    }
}

export const toggleUserRole = async (req, res) => {
    try {
        const { userId } = req.params

        const user = await User.findById(userId)
        if(!user) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            })
        }
        user.role = user.role === "admin" ? ("user") : ("admin")

        await user.save()
        res.status(200).json({
            success: true,
            message: `role updated to ${user.role}`,
            role: user.role
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "server error during designating roles",
            error: error.message
        })
    }
}