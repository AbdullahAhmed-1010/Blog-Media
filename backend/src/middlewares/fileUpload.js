import multer from "multer"

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
const DOC_TYPES = ["doc/pdf", "doc/msword", "text/plain"]
const ALL_TYPES = [...IMAGE_TYPES, ...DOC_TYPES]

// generic file filter
const fileFilter = (allowedTypes) => (req, file, callback) => {
    allowedTypes.includes(file.mimetype)
    ? callback(null, true)
    : callback(new Error("invalid file type"), false)
}

// memory storage
const memoryStorage = multer.memoryStorage()

// create middlewares
const uploadAvatar = multer({
    storage: memoryStorage,
    limits: {fileSize: 8 * 1024 * 1024},
    fileFilter: fileFilter(IMAGE_TYPES)
}).single("avatar")

const uploadFeaturedImage = multer({
    storage: memoryStorage,
    limits: {fileSize: 12 * 1024 * 1024},
    fileFilter: fileFilter(IMAGE_TYPES)
}).single("featuredImage")

const uploadMediaFiles = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 10
    },
    fileFilter: fileFilter(ALL_TYPES)
}).array("mediaFiles", 10)

// common validation
const validateFiles = (req, res, next) => {
    if(!req.file && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
            success: false,
            error: "no file uploaded"
        })
    }
    next()
}

// error handling
const handleUploadError = (error, req, res, next) => {
    if(error instanceof multer.MulterError ||
    error.message.includes("invalid file type")) {
        return res.status(400).json({
            success: false,
            error: error.message
        })
    }
    next()
}

export {uploadAvatar, uploadFeaturedImage, uploadMediaFiles, validateFiles, handleUploadError}