import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// multer memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const { fieldname, mimetype } = file;

  if (["featuredImage", "mediaFiles"].includes(fieldname)) {
    if (mimetype.startsWith("image/") || mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("only image or video files allowed for blog media"), false);
    }
  } else if (fieldname === "avatar") {
    if (mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("only image files are allowed for avatar"), false);
    }
  } else {
    cb(new Error("invalid field name"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, 
    files: 10,
  },
  fileFilter,
});

export const uploadBlogMedia = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "mediaFiles", maxCount: 10 },
]);

export const uploadAvatar = upload.single("avatar");

// Upload to Cloudinary
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: "auto",
      folder: "social-blog",
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

// Delete from Cloudinary
export const deleteFromCloudinary = (publicId, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
};

// Process blog images
export const processImages = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) return [];

  const imagePromises = imageFiles.map(async (file) => {
    const result = await uploadToCloudinary(file.buffer, {
      folder: "social-blog/images",
      resource_type: "image",
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto" },
        { format: "auto" },
      ],
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      alt: file.originalname,
    };
  });

  return Promise.all(imagePromises);
};

// Process blog videos
export const processVideos = async (videoFiles) => {
  if (!videoFiles || videoFiles.length === 0) return [];

  const videoPromises = videoFiles.map(async (file) => {
    const result = await uploadToCloudinary(file.buffer, {
      folder: "social-blog/videos",
      resource_type: "video",
      transformation: [
        { width: 720, height: 480, crop: "limit" },
        { quality: "auto" },
        { format: "mp4" },
      ],
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      thumbnail: result.secure_url.replace("/upload/", "/upload/so_0/"),
    };
  });

  return Promise.all(videoPromises);
};

// Process avatar image
export const processAvatar = async (imageFile) => {
  if (!imageFile) return null;

  const result = await uploadToCloudinary(imageFile.buffer, {
    folder: "social-blog/avatars",
    resource_type: "image",
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face" },
      { quality: "auto" },
      { format: "auto" },
    ],
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
};

// Delete old media
export const deleteOldMedia = async (mediaArray) => {
  if (!mediaArray || mediaArray.length === 0) return;

  const deletePromises = mediaArray.map(async (media) => {
    try {
      const resourceType = media.url.includes("/video/") ? "video" : "image";
      await deleteFromCloudinary(media.public_id, resourceType);
    } catch (err) {
      console.error("failed to delete:", err.message);
    }
  });

  await Promise.allSettled(deletePromises);
};

// Handle multer errors
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Max size is 15MB.",
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Max is 10.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Upload error: " + err.message,
    });
  }

  if (err.message?.includes("Only")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next(err);
};