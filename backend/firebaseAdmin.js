const admin = require("firebase-admin");

function initFirebaseAdmin() {
  // Prevent re-initialization
  if (admin.apps && admin.apps.length > 0) {
    return admin;
  }

  // Prefer explicit service account JSON via env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✅ Firebase Admin initialized using service account JSON");
      return admin;
    } catch (err) {
      console.error(
        "❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON",
        err.message
      );
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  }

  // Fallback (local / GCP only)
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });

    console.log("⚠️ Firebase Admin initialized using application default creds");
    return admin;
  } catch (err) {
    console.error("❌ Firebase Admin initialization failed", err.message);
    throw err;
  }
}

module.exports = initFirebaseAdmin();
