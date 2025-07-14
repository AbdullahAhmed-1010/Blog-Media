import jwt from "jsonwebtoken"
import User from "../models/User"
import Blog from "../models/Blog"
import Comment from "../models/Comment"
import { validationResult } from "express-validator"

//generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  }) // .env file --> JWT_SECRET
}

export const register = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      })
    }

    const { username, email, password, fullName } = req.body

    //check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or username"
      })
    }

    //create user
    const user = await User.create({
      username,
      email,
      password,
      fullName
    })

    const token = generateToken(user._id)

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        password: user.password,
        fullName: user.fullName,
        avatar: user.avatar
      }
    })
  } 
  catch (error) {
    res.status(500).json({
      message: "server error",
      error: error.message
    })
  }
}

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      })
    }

    const { username, email, password } = req.body;

    //find user through email and username
    const user = await User.findOne({
      $or: [
        { username: username?.toLowerCase() }, 
        { email: email?.toLowerCase() }
      ]
    }).select("+password");

    if(!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
            message: "Invalid credentials"
        })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken(user._id)

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar
      }
    })
  } 
  catch (error) {
    res.status(500).json({
      message: "server error",
      error: error.message,
    });
  }
}

export const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
        .populate("followers", "username fullName avatar")
        .populate("following", "username fullName avatar")

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        res.status(500).json({
            message: "server error", error: error.message
        })
    }
}

export const updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { username, fullName, bio, avatar } = req.body
    const user = await User.findById(req.user.id)

    if(!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    if(username !== undefined) user.username = username

    if(fullName !== undefined) user.fullName = fullName
      
    if(bio !== undefined) user.bio = bio
      
    if(avatar !== undefined) user.avatar = avatar
     
    await user.save()

    res.status(200).json({
      success: true,
      user,
      message: "Profile updated successfully"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message
    })
  }
}

export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id).select("+password")

    if(!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      })
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message
    })
  }
}

export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logout successful"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message
    })
  }
}

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findByIdAndDelete(userId)
    if(!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    await Blog.deleteMany({author: userId})

    await Comment.deleteMany({user: userId})

    res.status(200).json({
      success: true,
      message: "Your account has been permanently deleted"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message
    })
  }
}