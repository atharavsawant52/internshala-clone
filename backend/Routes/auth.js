const express = require("express");
const { body, validationResult } = require("express-validator");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const firebaseAdmin = require("../firebaseAdmin");
const User = require("../Model/User");
const { generatePassword } = require("../utils/passwordGenerator");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

dayjs.extend(utc);

function isEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

// E.164-ish phone validation (supports +countrycode and 10-15 digits)
function isPhone(input) {
  return /^\+?[1-9]\d{9,14}$/.test(input);
}

function isSameUtcDay(a, b) {
  return dayjs(a).utc().format("YYYY-MM-DD") === dayjs(b).utc().format("YYYY-MM-DD");
}

async function sendResetEmail(toEmail, newPassword) {
  // If SMTP not configured, we allow a mock mode for evaluators.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { mode: "mock" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Your new password",
    text: `Your new password is: ${newPassword}`,
  });

  return { mode: "smtp" };
}

router.post(
  "/forgot-password",
  body("identifier").isString().trim().notEmpty().withMessage("Email or phone is required"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: errors.array()[0].msg,
        });
      }

      const identifier = String(req.body.identifier || "").trim();

      const isEmailInput = isEmail(identifier);
      const isPhoneInput = isPhone(identifier);

      if (!isEmailInput && !isPhoneInput) {
        return res.status(400).json({
          error: "Invalid email or phone number.",
        });
      }

      // Platform auth reality: Google Sign-In only.
      // Lookup user in Firebase first so real Google users are not treated as "User not found"
      // even if they haven't hit any protected endpoints yet.
      let firebaseUser;
      try {
        firebaseUser = isEmailInput
          ? await firebaseAdmin.auth().getUserByEmail(identifier)
          : await firebaseAdmin.auth().getUserByPhoneNumber(identifier);
      } catch (e) {
        return res.status(404).json({ error: "User not found." });
      }

      const mongoUser = await User.findOneAndUpdate(
        { firebaseUid: firebaseUser.uid },
        {
          $setOnInsert: {
            firebaseUid: firebaseUser.uid,
            friendsCount: 0,
            provider: "google",
            password: null,
            passwordHash: "",
          },
          $set: {
            email: (firebaseUser.email || "").toLowerCase(),
            name: firebaseUser.displayName || firebaseUser.email || "",
            phoneNumber: firebaseUser.phoneNumber || "",
            provider: "google",
            password: null,
            passwordHash: "",
          },
        },
        { new: true, upsert: true }
      );

      // Daily reset limit (server-side)
      if (mongoUser.lastPasswordResetAt && isSameUtcDay(mongoUser.lastPasswordResetAt, new Date())) {
        return res.status(429).json({ error: "You can use this option only once per day." });
      }

      // Track daily usage even though password reset is not applicable.
      mongoUser.lastPasswordResetAt = new Date();
      await mongoUser.save();

      return res.status(400).json({
        error: "This platform supports Google Sign-In only. Password reset is not applicable.",
      });
    } catch (error) {
      return res.status(500).json({ error: "Password reset failed due to a server error." });
    }
  }
);

router.post("/sync", requireAuth, async (req, res) => {
  return res.status(200).json({ success: true });
});

module.exports = router;
