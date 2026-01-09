const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      default: "",
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video", ""],
      default: "",
    },
    caption: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

PostSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Post", PostSchema);
