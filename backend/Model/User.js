const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    friendsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Task-2 (Forgot Password): enforced server-side
    lastPasswordResetAt: {
      type: Date,
      default: null,
    },
    // Stored to make reset flow verifiable (Firebase remains source of truth for auth)
    passwordHash: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
