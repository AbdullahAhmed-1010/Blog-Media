import {rateLimit} from "express-rate-limit"

// general purpose
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 100,
    message: {
        success: false,
        error: "too many requests, try again later"
    }
})

// auth specific limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: "too many login/register attempts, try again later"
    }
})

// blog creation limit
const blogCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: "too many blogs created, try again later"
    }
})

// comment limiter
const commentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: "too many comments to handle, try again later"
    }
})

// file uplaod limit
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: "too many files uploaded, try again later"
    }
})

// search limiter
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: "too many search requests, try again later"
    }
})

// custom IP limiter
const userSpecificLimiter = (windowMs, maxRequest, message) => {
    return rateLimit({
        windowMs,
        max: maxRequest,
        message: {
            success: false,
            error: message
        },
        keyGenerator: (req) => req.user?.id || req.ip
    })
}

export {
    generalLimiter,
    authLimiter,
    blogCreationLimiter,
    commentLimiter,
    uploadLimiter,
    searchLimiter,
    userSpecificLimiter
}