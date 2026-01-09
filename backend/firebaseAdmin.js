const admin = require("firebase-admin");

function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length > 0) {
    return admin;
  }

  // Prefer explicit service account JSON via env (stringified)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

  // Fallback: Application Default Credentials (set GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  return admin;
}

module.exports = initFirebaseAdmin();
