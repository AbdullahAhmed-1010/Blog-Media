import mongoose, { mongo } from "mongoose";

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, "Comment content is required"],
        trim: true,
        maxLength: [1000, "Content cannot exceed 1000 characters"]
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isEdited: {
        type: Boolean,
        default: false
    }
}, {timestamps: true,
    toObject: {virtuals: true}
})

// virtual for like count
commentSchema.virtual("likeCount").get(function() {
    return this.likes.length
})

// virtual for replies count
commentSchema.virtual("replyCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
  count: true
})

// to check if user has liked the comment
commentSchema.methods.isLikedBy = function(userId) {
    return this.likes.includes(userId)
}

// to get comments for a blog with pagination
commentSchema.statics.getCommentsForBlog = function(blogId, page = 1, limit = 10) {
  return this.find({ blog: blogId, parentComment: null })
    .populate("author", "username fullName avatar")
    .populate({
      path: "parentComment",
      populate: {
        path: "author",
        select: "username fullName avatar"
      }
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
}

// to get replies for a comment
commentSchema.statics.getRepliesForComment = function(commentId) {
  return this.find({ parentComment: commentId })
    .populate("author", "username fullName avatar")
    .sort({ createdAt: 1 })
}

// indexing for better query performance
commentSchema.index({ blog: 1, createdAt: -1 })
commentSchema.index({ author: 1, createdAt: -1 })
commentSchema.index({ parentComment: 1, createdAt: 1 })

export default mongoose.model("Comment", commentSchema)