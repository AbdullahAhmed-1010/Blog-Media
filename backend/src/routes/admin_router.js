import express from "express"
import {
    getUsers,
    deleteUser,
    getBlogs,
    deleteBlog,
    toggleUserRole
} from "../controllers/adminController.js"

import { auth, isAdmin } from "../middlewares/auth.js"

const router = express.Router()

router.get("/users", auth, isAdmin, getUsers)
router.delete("/user/:userId/delete", auth, isAdmin, deleteUser)
router.get("/blogs", auth, isAdmin, getBlogs)
router.delete("blog/:blogId/delete", auth, isAdmin, deleteBlog)
router.patch("/user/:userId/toggle-role", auth, isAdmin, toggleUserRole)

export default router