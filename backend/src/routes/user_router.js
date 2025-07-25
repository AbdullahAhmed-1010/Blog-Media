import express from "express"
import { auth } from "../middlewares/auth.js"
import {
    getUserProfile,
    updateProfile,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    searchUsers,
    getSuggestions,
    deleteAvatar
} from "../controllers/userController.js"
import {uploadAvatar, handleMulterError} from "../utils/upload.js"

const router = express.Router()

router.get("/profile/:username", getUserProfile)
router.put("/update-profile", auth,uploadAvatar, handleMulterError, updateProfile)
router.delete("/delete-avatar", auth, deleteAvatar)
router.post("follow/:userId", auth, followUser)
router.post("/unfollow/:userId", auth, unfollowUser)
router.get("/:userId/followers", auth, getFollowers)
router.get("/:userId/following", auth, getFollowing)
router.get("/search", searchUsers)
router.get("/suggestions", auth, getSuggestions)

export default router