import jwt from "jsonwebtoken"
import User from "../models/User"
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
      res.status(400).json({
        errors: errors.array(),
      })
    }

    const { username, email, password } = req.body;

    //find user through email and username
    const user = await User.findOne({
      $or: [{ username: username }, { email: email }]
    }).select("+password");

    if(!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
            message: "Invalid credentials"
        })
    }

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