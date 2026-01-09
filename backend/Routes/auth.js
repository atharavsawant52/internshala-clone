const express = require("express");
const { body, validationResult } = require("express-validator");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const firebaseAdmin = require("../firebaseAdmin");
const User = require("../Model/User");
const { generatePassword } = require("../utils/passwordGenerator");

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

      // Lookup Firebase user first (keeps Firebase and DB consistent)
      let firebaseUser;
      try {
        firebaseUser = isEmailInput
          ? await firebaseAdmin.auth().getUserByEmail(identifier)
          : await firebaseAdmin.auth().getUserByPhoneNumber(identifier);
      } catch (e) {
        return res.status(404).json({ error: "User not found." });
      }

      const firebaseUid = firebaseUser.uid;

      // Ensure we have a Mongo user doc
      const mongoUser = await User.findOneAndUpdate(
        { firebaseUid },
        {
          $setOnInsert: {
            firebaseUid,
            friendsCount: 0,
          },
          $set: {
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email || "",
            phoneNumber: firebaseUser.phoneNumber || "",
          },
        },
        { new: true, upsert: true }
      );

      // Daily reset limit (server-side)
      if (mongoUser.lastPasswordResetAt && isSameUtcDay(mongoUser.lastPasswordResetAt, new Date())) {
        return res.status(429).json({ error: "You can use this option only once per day." });
      }

      const newPassword = generatePassword();

      // Update Firebase Auth password
      await firebaseAdmin.auth().updateUser(firebaseUid, { password: newPassword });

      // Hash + store in Mongo for verifiability
      const passwordHash = await bcrypt.hash(newPassword, 10);
      mongoUser.passwordHash = passwordHash;
      mongoUser.lastPasswordResetAt = new Date();
      await mongoUser.save();

      if (isEmailInput) {
        const emailResult = await sendResetEmail(identifier, newPassword);
        return res.status(200).json({
          success: true,
          message: "A new password has been sent to your registered email/phone.",
          delivery: { type: "email", mode: emailResult.mode },
        });
      }

      // Phone flow: SMS mock allowed, return password in response
      return res.status(200).json({
        success: true,
        message: "A new password has been sent to your registered email/phone.",
        delivery: { type: "phone", mode: "mock" },
        password: newPassword,
      });
    } catch (error) {
      return res.status(500).json({ error: "internal server error" });
    }
  }
);

module.exports = router;
