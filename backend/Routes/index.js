const express = require("express");
const router = express.Router();
const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application=require("./application")
 const posts = require("./posts");
 const auth = require("./auth");

router.use("/admin", admin);
router.use("/internship", intern);
router.use("/job", job);
router.use("/application", application);
 router.use("/posts", posts);
 router.use("/auth", auth);


module.exports = router;
