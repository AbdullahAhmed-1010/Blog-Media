import express from "express"
import { body } from "express-validator"
import {
    register,
    login,
    getUser,
    updateUserProfile,
    changePassword,
    logout,
    deleteAccount,
} from "../controllers/authController"
import { auth, isAdmin } from "../middlewares/auth"
import User from "../models/User"

const router = express.Router()

// register
router.post("/register", [
    body("username")
      .notEmpty().withMessage("Username is required")
      .isLength({min: 3, max: 20})
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers and underscores"),
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("password")
      .isLength({min: 6})
      .withMessage("Password must be of atleast 6 characters"),
    body("fullName")
      .notEmpty()
      .withMessage("Full name is required")
      .trim()
], register)

// login
router.post("/login", [
    body("username")
      .optional().isString(),
    body("email")
      .optional().isEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
], login)

// get user profile
router.get("/profile", auth, getUser)

// update user profile
router.put("/update-profile", auth, [
    body("username")
      .optional()
      .isLength({min: 3, max: 20})
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers and underscores"),
    body("fullName")
      .optional()
      .trim(),
    body("bio")
      .optional()
      .isLength({ max: 200 })
      .withMessage('Bio cannot exceed 200 characters')
      .trim(),
    body("avatar")
      .optional()
], updateUserProfile)

// change password
router.put("/change-password", auth, [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({min: 6})
      .withMessage("New password must be of atleast 6 characters")
], changePassword)

// logout
router.post("/logout", auth, logout)

// delete account
router.delete("/delete-account", auth, deleteAccount)

// admin-only route
router.get("/admin/users", auth, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select("-password")
        res.status(200).json({
            success: true, 
            users
        });
    } catch (error) {
    res.status(500).json({
        success: false,
        message: "Server error", 
        error: error.message 
    })
  }
})

export default router