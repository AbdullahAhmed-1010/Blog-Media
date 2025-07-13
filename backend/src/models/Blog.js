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
    featuredmage: {
        type: String,
        default: ""
    },
    mediaFile: {
        type: String
    },
    tags: {
        type: String,
        trim: true
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
        unique: true
    },
    readTime: {
        type: Number,
        default: 1
    }
}, {timestamps: true})

//create slug from title
blogSchema.pre("save", function(next){
    if(this.isModified("title")) {
        this.slug = this.title.toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now()
    }

    //calculate read time
    if(this.isModified("content")) {
        const wordCount = this.content.split(" ").length
        this.readTime = Math.ceil(wordCount/200) //assuming 200 words per minute
    }
    next()
})

//comment count
blogSchema.virtual("commentCount", {
    ref: "comment",
    localField: "_id",
    foreignField: "blog",
    count: true
})

export default mongoose.model("Blog", blogSchema)