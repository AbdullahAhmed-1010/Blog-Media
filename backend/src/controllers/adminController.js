import User from "../models/User.js";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import { deleteFromCloudinary, deleteOldMedia } from "../utils/upload.js";

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error fetching all users",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    // Delete user's avatar from Cloudinary
    if (user.avatar && user.avatar.public_id) {
      try {
        await deleteFromCloudinary(user.avatar.public_id, "image");
      } catch (deleteError) {
        console.error("Error deleting user avatar:", deleteError);
      }
    }

    // Get all user's blogs to delete their media
    const userBlogs = await Blog.find({ author: userId });

    // Delete all media files from user's blogs
    for (const blog of userBlogs) {
      const mediaToDelete = [];

      // Collect featured image
      if (blog.featuredImage && blog.featuredImage.public_id) {
        mediaToDelete.push(blog.featuredImage);
      }

      // Collect media files
      if (blog.mediaFiles && blog.mediaFiles.length > 0) {
        mediaToDelete.push(...blog.mediaFiles);
      }

      // Delete collected media
      if (mediaToDelete.length > 0) {
        await deleteOldMedia(mediaToDelete);
      }
    }

    // Delete user and related data
    await User.findByIdAndDelete(userId);
    await Blog.deleteMany({ author: userId });
    await Comment.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: "user deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error deleting user",
      error: error.message,
    });
  }
};

export const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, category } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const blogs = await Blog.find(query)
      .populate("author", "username fullName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error fetching blogs",
      error: error.message,
    });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "blog not found",
      });
    }

    // Delete featured image
    if (blog.featuredImage && blog.featuredImage.public_id) {
      try {
        await deleteFromCloudinary(blog.featuredImage.public_id, "image");
      } catch (deleteError) {
        console.error("Error deleting featured image:", deleteError);
      }
    }

    // Delete media files
    if (blog.mediaFiles && blog.mediaFiles.length > 0) {
      for (const media of blog.mediaFiles) {
        if (media.public_id) {
          try {
            const resourceType = media.url.includes("/video/")
              ? "video"
              : "image";
            await deleteFromCloudinary(media.public_id, resourceType);
          } catch (deleteError) {
            console.error("Error deleting media file:", deleteError);
          }
        }
      }
    }

    // Delete blog and related comments
    await Blog.findByIdAndDelete(blogId);
    await Comment.deleteMany({ blog: blogId });

    res.status(200).json({
      success: true,
      message: "blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error deleting blog",
      error: error.message,
    });
  }
};

export const toggleUserRole = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    user.role = user.role === "admin" ? "user" : "admin";

    await user.save();
    res.status(200).json({
      success: true,
      message: `role updated to ${user.role}`,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error during designating roles",
      error: error.message,
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalComments = await Comment.countDocuments();
    const adminUsers = await User.countDocuments({ role: "admin" });
    const publishedBlogs = await Blog.countDocuments({ status: "published" });
    const draftBlogs = await Blog.countDocuments({ status: "draft" });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalBlogs,
        totalComments,
        adminUsers,
        publishedBlogs,
        draftBlogs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error fetching stats",
      error: error.message,
    });
  }
};