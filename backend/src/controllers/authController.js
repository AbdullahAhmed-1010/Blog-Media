import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import { validationResult } from "express-validator";
import {
  processAvatar,
  deleteFromCloudinary,
  deleteOldMedia,
} from "../utils/upload.js";

//generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { username, email, password, fullName } = req.body;

    //check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or username",
      });
    }

    // Handle avatar upload during registration
    let avatarData = null;
    if (req.file) {
      try {
        avatarData = await processAvatar(req.file);
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Error uploading avatar",
          error: uploadError.message,
        });
      }
    }

    //create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      fullName,
      avatar: avatarData,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
      },
    });
  } catch (error) {
    if (req.file && avatarData) {
      try {
        await deleteFromCloudinary(avatarData.public_id, "image");
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded avatar:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { username, email, password } = req.body;

    //find user through email and username
    const user = await User.findOne({
      $or: [
        { username: username?.toLowerCase() },
        { email: email?.toLowerCase() },
      ],
    }).select("+password");

    // let user;
    // if (email) {
    //   user = await User.findOne({ email: email.toLowerCase() }).select(
    //     "+password"
    //   );
    // } else if (username) {
    //   user = await User.findOne({ username: username.toLowerCase() }).select(
    //     "+password"
    //   );
    // }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("followers", "username fullName avatar")
      .populate("following", "username fullName avatar");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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
      message: "Your account has been permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};