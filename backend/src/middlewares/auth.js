import jwt from "jsonwebtoken"
import User from "../models/User"

const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer", "")

        if(!token) {
            return res.status(401).json({message: "No token, authorization denied"})
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) // .env file --> JWT_SECRET
        const user = await User.findById(decoded.id)

        if(!user) {
            return res.status(401).json({message: "Token is not valid"})
        }

        req.user = user
        next()

    } catch (error) {
        res.status(401).json({message: "Token is not valid"})
    }
}

export default auth