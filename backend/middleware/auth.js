const firebaseAdmin = require("../firebaseAdmin");
const User = require("../Model/User");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(token);

    const firebaseUid = decoded.uid;
    const email = decoded.email || "";
    const name = decoded.name || decoded.email || "";
    const phoneNumber = decoded.phone_number || "";

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $setOnInsert: { firebaseUid, friendsCount: 0 },
        $set: { email, name, phoneNumber },
      },
      { new: true, upsert: true }
    );

    req.auth = { firebaseUid, decoded };
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { requireAuth };
