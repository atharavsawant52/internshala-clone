const express = require("express");
const mongoose = require("mongoose");

const Post = require("../Model/Post");
const Comment = require("../Model/Comment");
const User = require("../Model/User");

const { requireAuth } = require("../middleware/auth");
const { checkPostingLimitAndConsume } = require("../middleware/postingLimit");

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    // Fetch one extra record to compute hasMore without an expensive count().
    const docs = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .populate({ path: "userId", select: "name email" })
      .lean();

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return res.status(200).json({
      items,
      hasMore,
    });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
});

router.post("/", requireAuth, checkPostingLimitAndConsume, async (req, res) => {
  try {
    const { mediaUrl = "", mediaType = "", caption = "" } = req.body || {};

    const trimmedCaption = String(caption || "").trim();
    const trimmedMediaUrl = String(mediaUrl || "").trim();
    const trimmedMediaType = String(mediaType || "").trim();

    if (trimmedCaption.length > 500) {
      return res.status(400).json({ error: "Caption too long" });
    }

    const hasCaption = trimmedCaption.length > 0;
    const hasMedia = trimmedMediaUrl.length > 0;

    if (!hasCaption && !hasMedia) {
      return res.status(400).json({ error: "Post cannot be empty" });
    }

    if (hasMedia) {
      if (trimmedMediaType !== "image" && trimmedMediaType !== "video") {
        return res.status(400).json({ error: "Invalid mediaType" });
      }
    }

    const post = await Post.create({
      userId: req.user._id,
      mediaUrl: trimmedMediaUrl,
      mediaType: hasMedia ? trimmedMediaType : "",
      caption: trimmedCaption,
      likes: [],
      createdAt: new Date(),
    });

    return res.status(201).json({ post });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
});

router.post("/:id/like", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = req.user._id;
    const alreadyLiked = post.likes.some((x) => String(x) === String(userId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((x) => String(x) !== String(userId));
    } else {
      post.likes.push(userId);
    }

    await post.save();

    return res.status(200).json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
});

router.post("/:id/comment", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Comment text is required" });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "Comment too long" });
    }

    const postExists = await Post.exists({ _id: id });
    if (!postExists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = await Comment.create({
      postId: id,
      userId: req.user._id,
      text,
      createdAt: new Date(),
    });

    return res.status(201).json({ comment });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
});

module.exports = router;
