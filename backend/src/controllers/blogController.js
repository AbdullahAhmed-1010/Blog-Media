import User from "../models/User.js";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import { validationResult } from "express-validator";
import { 
  processImages, 
  processVideos, 
  deleteOldMedia, 
  deleteFromCloudinary 
} from "../utils/upload.js";

export const createBlog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { title, content, excerpt, tags, category } = req.body;
    
    let featuredImage = null;
    let mediaFiles = [];

    // Process uploaded files
    if (req.files) {
      try {
        // Process featured image
        if (req.files.featuredImage && req.files.featuredImage.length > 0) {
          const processedImages = await processImages(req.files.featuredImage);
          featuredImage = processedImages[0];
        }

        // Process media files (images and videos)
        if (req.files.mediaFiles && req.files.mediaFiles.length > 0) {
          const imageFiles = req.files.mediaFiles.filter(file => 
            file.mimetype.startsWith('image/')
          );
          const videoFiles = req.files.mediaFiles.filter(file => 
            file.mimetype.startsWith('video/')
          );

          const [processedImages, processedVideos] = await Promise.all([
            processImages(imageFiles),
            processVideos(videoFiles)
          ]);

          mediaFiles = [...processedImages, ...processedVideos];
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Error uploading media files",
          error: uploadError.message
        });
      }
    }

    const blog = await Blog.create({
      title,
      content,
      excerpt,
      author: req.user.id,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      category,
      featuredImage,
      mediaFiles,
    });

    await blog.populate("author", "username fullName avatar");

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    // Clean up uploaded files if blog creation fails
    if (req.files) {
      const allMedia = [];
      if (featuredImage) allMedia.push(featuredImage);
      if (mediaFiles.length > 0) allMedia.push(...mediaFiles);
      
      if (allMedia.length > 0) {
        await deleteOldMedia(allMedia);
      }
    }

    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "recent";

    let sortOptions = {};
    switch (sort) {
      case "popular":
        sortOptions = { views: -1, createdAt: -1 };
        break;
      case "trending":
        sortOptions = { likesCount: -1, createdAt: -1 };
        break;
      case "recent":
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const { search, category, tags, author } = req.query;

    //query search
    let query = { status: "published" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (category) {
      query.category = category;
    }
    if (tags) {
      query.tags = { $in: tags.split(",") };
    }
    if (author) {
      query.author = author;
    }

    // if user is authenticated show personalised feed
    if (req.user && sort === "recent") {
      const currentUser = await User.findById(req.user._id).select("following");
      if (currentUser.following.length > 0) {
        query.author = { $in: currentUser.following };
      }
    }

    const blogs = await Blog.find(query)
      .populate("author", "username fullName avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // add like/save status for authenticated user
    if (req.user) {
      blogs.forEach((blog) => {
        blog.isLiked = blog.likes.includes(req.user._id);
        blog.isSaved = blog.savedBy.includes(req.user._id);
      });
    }

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        currentPage: page,
        totalPage: Math.ceil(total / limit),
        totalBlogs: total,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const getBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate("author", "username fullName avatar followers following")
      .populate("likes", "username fullName avatar");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    //increment view counts
    blog.views += 1;
    await blog.save();

    // add like/save status for authenticated user
    if (req.user) {
      blog.isLiked = blog.likes.includes(req.user._id);
      blog.isSaved = blog.savedBy.includes(req.user._id);
      blog.isFollowing = blog.author.followers && blog.author.followers.includes(req.user._id);
    }

    res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
      });
    }

    const { title, content, excerpt, tags, category } = req.body;
    
    let featuredImage = blog.featuredImage;
    let mediaFiles = blog.mediaFiles;

    // Process uploaded files
    if (req.files) {
      try {
        // Process new featured image
        if (req.files.featuredImage && req.files.featuredImage.length > 0) {
          // Delete old featured image directly
          if (blog.featuredImage && blog.featuredImage.public_id) {
            await deleteFromCloudinary(blog.featuredImage.public_id, "image");
          }
          
          const processedImages = await processImages(req.files.featuredImage);
          featuredImage = processedImages[0];
        }

        // Process new media files
        if (req.files.mediaFiles && req.files.mediaFiles.length > 0) {
          // Delete old media files
          if (blog.mediaFiles && blog.mediaFiles.length > 0) {
            for (const media of blog.mediaFiles) {
              if (media.public_id) {
                const resourceType = media.url.includes("/video/") ? "video" : "image";
                await deleteFromCloudinary(media.public_id, resourceType);
              }
            }
          }

          const imageFiles = req.files.mediaFiles.filter(file => 
            file.mimetype.startsWith('image/')
          );
          const videoFiles = req.files.mediaFiles.filter(file => 
            file.mimetype.startsWith('video/')
          );

          const [processedImages, processedVideos] = await Promise.all([
            processImages(imageFiles),
            processVideos(videoFiles)
          ]);

          mediaFiles = [...processedImages, ...processedVideos];
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Error uploading media files",
          error: uploadError.message
        });
      }
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      blog._id,
      {
        title: title || blog.title,
        content: content || blog.content,
        excerpt: excerpt || blog.excerpt,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : blog.tags,
        category: category || blog.category,
        featuredImage,
        mediaFiles,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate("author", "username fullName avatar");

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete the blog",
      });
    }

    // Delete featured image
    if (blog.featuredImage && blog.featuredImage.public_id) {
      try {
        await deleteFromCloudinary(blog.featuredImage.public_id, "image");
      } catch (deleteError) {
        console.error("Error deleting featured image:", deleteError);
      }
    }

    // Delete media files
    if (blog.mediaFiles && blog.mediaFiles.length > 0) {
      for (const media of blog.mediaFiles) {
        if (media.public_id) {
          try {
            const resourceType = media.url.includes("/video/") ? "video" : "image";
            await deleteFromCloudinary(media.public_id, resourceType);
          } catch (deleteError) {
            console.error("Error deleting media file:", deleteError);
          }
        }
      }
    }

    // Delete blog and comments
    await Blog.findByIdAndDelete(blog._id);
    await Comment.deleteMany({ blog: blog._id });

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const isLiked = blog.likes.includes(req.user._id);
    if (isLiked) {
      blog.likes = blog.likes.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      blog.likes.push(req.user._id);
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: isLiked
        ? "blog unliked successfully"
        : "blog liked successfully",
      isLiked: !isLiked,
      likesCount: blog.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const saveBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const user = await User.findById(req.user.id);
    const isSaved = user.savedBlogs.includes(blog._id);

    if (isSaved) {
      user.savedBlogs.pull(blog._id);
      blog.savedBy.pull(req.user._id);
    } else {
      user.savedBlogs.push(blog._id);
      blog.savedBy.push(req.user._id);
    }

    await Promise.all([user.save(), blog.save()]);

    res.status(200).json({
      success: true,
      isSaved: !isSaved,
      message: isSaved ? "Blog removed from saved" : "Blog saved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const getUserSavedBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({
      savedBy: req.user._id,
      status: "published",
    })
      .populate("author", "username fullName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add like/save status for authenticated user
    blogs.forEach((blog) => {
      blog.isLiked = blog.likes.includes(req.user._id);
      blog.isSaved = true;
    });

    const total = await Blog.countDocuments({
      savedBy: req.user._id,
      status: "published",
    });

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};

export const getUserBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "all" } = req.query;
    
    const skip = (page - 1) * limit;

    let query = { author: req.user.id };
    
    if (status !== "all") {
      query.status = status;
    }

    const blogs = await Blog.find(query)
      .populate("author", "username fullName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error",
      error: error.message,
    });
  }
};