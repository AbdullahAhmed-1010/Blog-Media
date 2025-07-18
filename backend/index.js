import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import connectDB from "./src/config/database.js"

import { corsMiddleware, handlePreFlight } from "./src/middlewares/cors.js"
import { generalLimiter } from "./src/middlewares/rateLimit.js"
import { handleSecurity } from "./src/middlewares/security.js"
import { errorHandling } from "./src/middlewares/errorHandling.js"

import { admin_router } from "./src/routes/admin_router.js"
import { auth_router } from "./src/routes/auth_router.js"
import { blog_router } from "./src/routes/blog_router.js"
import { comment_router } from "./src/routes/comment_router.js"
import { user_router } from "./src/routes/user_router.js"

dotenv.config()
const app = express()
const PORT = process.env.PORT

connectDB()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

app.use(handlePreFlight)
app.use(corsMiddleware)

app.use(handleSecurity)

app.use(generalLimiter)

app.use("/api/admin", admin_router)
app.use("/api/auth", auth_router)
app.use("/api/blogs", blog_router)
app.use("/api/comments", comment_router)
app.use("/api/users", user_router)

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is running"
    })
})

app.use(errorHandling)

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
})