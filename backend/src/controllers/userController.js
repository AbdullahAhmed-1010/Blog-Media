import User from "../models/User";
import Blog from "../models/Blog";
import { processAvatar, deleteFromCloudinary } from "../utils/upload";

// get profile/:username
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() })
      .populate("followers", "username fullName avatar")
      .populate("following", "username fullName avatar");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isOwnProfile =
      req.user && req.user._id.toString() === user._id.toString();

    const isFollowing =
      req.user &&
      user.followers.some((f) => f._id.toString() === req.user._id.toString());

    if (!isOwnProfile && !isFollowing) {
      return res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar,
          followerCount: user.followerCount,
          followingCount: user.followingCount,
        },
      });
    }

    const blogs = await Blog.find({ author: user._id, status: "published" })
      .select(
        "title content excerpt featuredImage mediaFiles likes savedBy readTime slug"
      )
      .populate("author", "username fullName avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        isFollowing: req.user ? isFollowing : false,
        blogs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error fetching user profile",
      error: error.message,
    });
  }
};

// PUT /update-profile - Update user profile with avatar upload
export const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, username } = req.body;
    const userId = req.user._id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if username is being changed and if it's already taken
    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
    }

    // Handle avatar upload
    let avatarData = null;
    if (req.file) {
      try {
        // Delete old avatar if it exists
        if (user.avatar && user.avatar.public_id) {
          await deleteFromCloudinary(user.avatar.public_id, "image");
        }

        // Upload new avatar
        avatarData = await processAvatar(req.file);
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Error uploading avatar",
          error: uploadError.message,
        });
      }
    }

    // Update user fields
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (bio) updateData.bio = bio;
    if (username) updateData.username = username.toLowerCase();
    if (avatarData) updateData.avatar = avatarData;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
      error: error.message,
    });
  }
};

// DELETE /delete-avatar - Delete user avatar
export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete avatar from Cloudinary if it exists
    if (user.avatar && user.avatar.public_id) {
      try {
        await deleteFromCloudinary(user.avatar.public_id, "image");
      } catch (deleteError) {
        console.error("Error deleting avatar from Cloudinary:", deleteError);
      }
    }

    // Remove avatar from user document
    user.avatar = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully",
      user: {
        ...user.toObject(),
        avatar: null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting avatar",
      error: error.message,
    });
  }
};

// get follow/:userId
export const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "you cannot follow yourself",
      });
    }
    const [userToFollow, currentUser] = await Promise.all([
      User.findById(userId),
      User.findById(currentUserId),
    ]);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    if (currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "already following",
      });
    }

    currentUser.following.push(userId);
    userToFollow.followers.push(currentUserId);

    // Update counts
    currentUser.followingCount = currentUser.following.length;
    userToFollow.followerCount = userToFollow.followers.length;

    await Promise.all([currentUser.save(), userToFollow.save()]);

    res.status(200).json({
      success: true,
      message: "following",
      user: {
        _id: userToFollow._id,
        username: userToFollow.username,
        fullName: userToFollow.fullName,
        avatar: userToFollow.avatar,
        followerCount: userToFollow.followerCount,
        isFollowing: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error following user",
      error: error.message,
    });
  }
};

// get unfollow/:userId
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "you cannot unfollow yourself",
      });
    }
    const [userToUnfollow, currentUser] = await Promise.all([
      User.findById(userId),
      User.findById(currentUserId),
    ]);
    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "not following",
      });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== userId
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== currentUserId.toString()
    );

    // Update counts
    currentUser.followingCount = currentUser.following.length;
    userToUnfollow.followerCount = userToUnfollow.followers.length;

    await Promise.all([currentUser.save(), userToUnfollow.save()]);

    res.json({
      success: true,
      message: "unfollowed",
      user: {
        _id: userToUnfollow._id,
        username: userToUnfollow.username,
        fullName: userToUnfollow.fullName,
        avatar: userToUnfollow.avatar,
        followerCount: userToUnfollow.followerCount,
        isFollowing: false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error unfollowing user",
      error: error.message,
    });
  }
};

// get /:userId/followers
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(userId).populate({
      path: "followers",
      select: "username fullName avatar",
      options: {
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    res.json({
      success: true,
      followers: user.followers,
      total: user.followerCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error fetching followers",
      error: error.message,
    });
  }
};

// get /:userId/following
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(userId).populate({
      path: "following",
      select: "username fullName avatar",
      options: {
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    res.json({
      success: true,
      following: user.following,
      total: user.followingCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error fetching followings",
      error: error.message,
    });
  }
};

// get search
export const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query is too short",
      });
    }

    const regex = new RegExp(q.trim(), "i");

    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }],
    })
      .select("username fullName avatar bio followerCount followingCount")
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ followerCount: -1 })
      .lean();

    let usersWithFollowStatus = users;

    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("following");

      const followingIds = currentUser?.following.map((id) => id.toString());

      usersWithFollowStatus = users.map((user) => ({
        ...user,
        isFollowing: followingIds?.includes(user._id.toString()) || false,
      }));
    }

    res.status(200).json({
      success: true,
      users: usersWithFollowStatus,
      query: q,
      page: +page,
      limit: +limit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error searching users",
      error: error.message,
    });
  }
};

// get suggestions
export const getSuggestions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const currentUser = await User.findById(req.user._id).select("following");

    const suggestions = await User.find({
      _id: { $nin: [...currentUser.following, req.user._id] },
    })
      .select("username fullName avatar bio followerCount")
      .sort({ followerCount: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "server error during suggestions",
      error: error.message,
    });
  }
};