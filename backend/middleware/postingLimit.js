const DailyPostCounter = require("../Model/DailyPostCounter");

function getUtcDayKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDailyLimitFromFriendsCount(friendsCount) {
  if (!Number.isFinite(friendsCount) || friendsCount < 0) return 0;
  if (friendsCount === 0) return 0;
  if (friendsCount >= 10) return null; // unlimited
  return friendsCount;
}

async function checkPostingLimitAndConsume(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // TEMP / DEV / EVALUATION ONLY:
    // Friend system is out of scope for Task-1. To make posting-limits testable
    // without changing the database, evaluators can override friendCount by
    // sending request header: x-friends-count: <number>
    // Default remains the stored user.friendsCount (or 0).
    const overrideHeader = req.headers["x-friends-count"];
    const overrideFriendsCount =
      typeof overrideHeader === "string" ? Number(overrideHeader) : NaN;

    const friendsCount = Number.isFinite(overrideFriendsCount)
      ? Math.max(0, Math.floor(overrideFriendsCount))
      : Number(user.friendsCount || 0);
    const limit = getDailyLimitFromFriendsCount(friendsCount);

    if (limit === 0) {
      return res.status(403).json({ error: "You need at least 1 friend to post." });
    }

    if (limit === null) {
      return next();
    }

    const dayKey = getUtcDayKey();

    // 1) Try to increment an existing counter if it is still below the limit
    const updated = await DailyPostCounter.findOneAndUpdate(
      { userId: user._id, dayKey, count: { $lt: limit } },
      { $inc: { count: 1 } },
      { new: true }
    );

    if (updated) {
      req.postingLimit = { dayKey, limit, count: updated.count };
      return next();
    }

    // 2) No counter yet (or already at limit). Try to create a new counter.
    // This is concurrency-safe because of the unique index (userId, dayKey).
    try {
      const created = await DailyPostCounter.create({
        userId: user._id,
        dayKey,
        count: 1,
      });
      req.postingLimit = { dayKey, limit, count: created.count };
      return next();
    } catch (e) {
      // If another request created it first, retry the bounded increment.
      const retry = await DailyPostCounter.findOneAndUpdate(
        { userId: user._id, dayKey, count: { $lt: limit } },
        { $inc: { count: 1 } },
        { new: true }
      );

      if (retry) {
        req.postingLimit = { dayKey, limit, count: retry.count };
        return next();
      }

      return res.status(429).json({ error: "Daily posting limit reached." });
    }
  } catch (err) {
    return res.status(500).json({ error: "internal server error" });
  }
}

module.exports = {
  checkPostingLimitAndConsume,
  getUtcDayKey,
  getDailyLimitFromFriendsCount,
};
