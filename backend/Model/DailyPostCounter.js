const mongoose = require("mongoose");

const DailyPostCounterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dayKey: {
      // server-day key in UTC, e.g. 2026-01-08
      type: String,
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

DailyPostCounterSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

module.exports = mongoose.model("DailyPostCounter", DailyPostCounterSchema);
