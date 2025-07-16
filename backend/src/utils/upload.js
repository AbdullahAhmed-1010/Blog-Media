const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.fieldname === 'images') {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for images field'), false);
    }
  } else if (file.fieldname === 'videos') {
    // Accept only video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for videos field'), false);
    }
  } else if (file.fieldname === 'profilePicture') {
    // Accept only image files for profile picture
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile picture'), false);
    }
  } else {
    cb(new Error('Invalid field name'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter
});

// Upload multiple files (images and videos)
const uploadBlogMedia = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'videos', maxCount: 3 }
]);

// Upload single profile picture
const uploadProfilePicture = upload.single('profilePicture');

// Function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto',
      folder: 'social-blog',
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Function to delete file from Cloudinary
const deleteFromCloudinary = (publicId, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

// Function to process uploaded images
const processImages = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) {
    return [];
  }

  const imagePromises = imageFiles.map(async (file) => {
    try {
      const result = await uploadToCloudinary(file.buffer, {
        folder: 'social-blog/images',
        resource_type: 'image',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        alt: file.originalname
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${file.originalname}`);
    }
  });

  return Promise.all(imagePromises);
};

// Function to process uploaded videos
const processVideos = async (videoFiles) => {
  if (!videoFiles || videoFiles.length === 0) {
    return [];
  }

  const videoPromises = videoFiles.map(async (file) => {
    try {
      const result = await uploadToCloudinary(file.buffer, {
        folder: 'social-blog/videos',
        resource_type: 'video',
        transformation: [
          { width: 720, height: 480, crop: 'limit' },
          { quality: 'auto' },
          { format: 'mp4' }
        ]
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        thumbnail: result.secure_url.replace('/upload/', '/upload/so_0/')
      };
    } catch (error) {
      console.error('Video upload error:', error);
      throw new Error(`Failed to upload video: ${file.originalname}`);
    }
  });

  return Promise.all(videoPromises);
};

// Function to process profile picture
const processProfilePicture = async (imageFile) => {
  if (!imageFile) {
    return null;
  }

  try {
    const result = await uploadToCloudinary(imageFile.buffer, {
      folder: 'social-blog/profiles',
      resource_type: 'image',
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw new Error('Failed to upload profile picture');
  }
};

// Function to delete old media files
const deleteOldMedia = async (mediaArray) => {
  if (!mediaArray || mediaArray.length === 0) {
    return;
  }

  const deletePromises = mediaArray.map(async (media) => {
    try {
      // Determine resource type based on URL or public_id
      const resourceType = media.url.includes('/video/') ? 'video' : 'image';
      await deleteFromCloudinary(media.public_id, resourceType);
    } catch (error) {
      console.error('Delete media error:', error);
      // Don't throw error, just log it
    }
  });

  await Promise.allSettled(deletePromises);
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }
  
  if (err.message.includes('Only')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

module.exports = {
  uploadBlogMedia,
  uploadProfilePicture,
  processImages,
  processVideos,
  processProfilePicture,
  deleteOldMedia,
  handleMulterError,
  cloudinary
};