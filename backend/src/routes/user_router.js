import express from "express"
import { auth } from "../middlewares/auth"
import {
    getUserProfile,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    searchUsers,
    getSuggestions
} from "../controllers/userController"

const router = express.Router()

router.get("/profile/:username", getUserProfile)
router.post("follow/:userId", auth, followUser)
router.post("/unfollow/:userId", auth, unfollowUser)
router.get("/:userId/followers", auth, getFollowers)
router.get("/:userId/following", auth, getFollowing)
router.get("/search", searchUsers)
router.get("/suggestions", auth, getSuggestions)

export default router