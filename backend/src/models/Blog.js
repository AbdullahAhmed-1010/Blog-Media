import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Blog title is required"],
        trim: true,
        maxLength: [255, "Title cannot exceed 255 characters"]
    },
    content: {
        type: String,
        required: [true, "Blog content is required"],
        trim: true
    },
    excerpt: {
        type: String,
        maxLength: [500, "Excerpt cannot exceed 500 characters"]
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    featuredImage: {
        type: String,
        default: ""
    },
    mediaFiles: {
        type: String
    },
    tags: {
        type: String,
        trim: true,
        lowercase: true,
        maxLength: [30, "Tag cannot exceed 30 characters"]
    },
    category: {
        type: String,
        enum: ["technology", "lifestyle", "travel", "food", "fashion", "health", "bussiness", "other"],
        default: "other"
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    views: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["draft", "published", "archived"],
        default: "published"
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    readTime: {
        type: Number,
        default: 1
    }
}, {timestamps: true,
    toObject: {virtuals: true}
})

// create slug from title
blogSchema.pre("save", function(next){
    if(this.isModified("title")) {
        this.slug = this.title.toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now()
    }

    // calculate read time
    if(this.isModified("content")) {
        const wordCount = this.content.split(" ").length
        this.readTime = Math.ceil(wordCount/200) // assuming 200 words per minute
    }
    next()
})

// virtual for like count
blogSchema.virtual("likeCount").get(function() {
    return this.likes.length
})

// virtual for save count
blogSchema.virtual("saveCount").get(function() {
    return this.savedBy.length
})

// virtual for comment count
blogSchema.virtual("commentCount", {
    ref: "comment",
    localField: "_id",
    foreignField: "blog",
    count: true
})

// to check if user has liked the blog
blogSchema.methods.isLikedBy = function(userId) {
  return this.likes.includes(userId);
}

// to check if user has saved the blog
blogSchema.methods.isSavedBy = function(userId) {
  return this.savedBy.includes(userId);
}

// to get trending blogs
blogSchema.statics.getTrending = function(limit = 10) {
  return this.find({ isPublished: true })
    .populate("author", "username fullName profilePicture")
    .sort({ views: -1, createdAt: -1 })
    .limit(limit)
}

// indexing for better query performance
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ slug: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ views: -1 });
blogSchema.index({ "likes": 1 });

export default mongoose.model("Blog", blogSchema)