import jwt from "jsonwebtoken"
import User from "../models/User.js"

const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer", "")

        if(!token) {
            return res.status(401).json({
                message: "No token, authorization denied"
            })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) // .env file --> JWT_SECRET
        const user = await User.findById(decoded.id)

        if(!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            })
        }

        req.user = user
        next()

    } catch (error) {
        console.error("auth middleware error", error)
        
        if(error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            })
        }
        if(error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            })
        }
        return res.status(500).json({
            success: false,
            message: "server error during authentication"
        })
    }
}

// middleware to check if user is the owner of a resource
const isResourceOwner = (Model, resourceIdParam = "id") => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[resourceIdParam]
            const resource = await Model.findById(resourceId)

            if(!resource) {
                return res.status(404).json({
                    success: false,
                    message: "Resource not found"
                })
            }
            if(resource.author.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "access denied, you can only modify your own resources"
                })
            }

            req.resource = resource
            next()
        } catch (error) {
            console.error("Resource owner check error", error)
            return res.status(500).json({
                success: false,
                message: "server error during authorization"
            })
        }
    }
}

// middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        if(req.user.role !== "admin"){
            return res.status(403).json({
                success: false,
                message: "access denied, admin priviledges required"
            })
        }
        next()
    } catch (error) {
        console.error("admin check error", error)
        
        return res.status(500).json({
            success: false,
            message: "server error during admin check"
        })
    }
}

export { auth, isResourceOwner, isAdmin }