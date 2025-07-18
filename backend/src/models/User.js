import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    minLength: [3, "Username must be atleast of 3 characters"],
    maxLength: [20, "Username cannot exceed 20 characters"],
  },
  email: {
    type: String,
    required: [true, "Email address is required"],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email address",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minLength: [6, "Password must be of atleast 6 characters"],
    match: [
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/,
      "Password must contain at least one letter and one number",
    ],
    select: false,
  },
  fullName: {
    type: String,
    required: [true, "Full name is required"],
    trim: true
  },
  avatar: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    maxLength: [500, "Bio cannot exceed 500 characters"],
    default: "",
    trim: true
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  savedBlogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Blogs"
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now()
  },
  role: {
  type: String,
  enum: ["user", "admin"],
  default: "user"
}
},
{timestamps: true,
  toObject: {virtuals: true}
});

// virtual for followers count
userSchema.virtual("followerCount").get(function() {
  return this.followers.length
})

// virtual for following count
userSchema.virtual("followingCount").get(function() {
  return this.following.length
})

// virtual for blog count
userSchema.virtual("blogCount", {
  ref: "Blog",
  localField: "_id",
  foreignField: "author",
  count: true
})

// pre-save middleware to hash password
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")){
        return next()
    }
    try {
      this.password = await bcrypt.hash(this.password, 12)
      next()
    } catch (error) {
      next(error)
    }
})

// compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
}

// get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject()
  
  delete userObject.password
  delete userObject.email
  return userObject
}

export default mongoose.model("User", userSchema)