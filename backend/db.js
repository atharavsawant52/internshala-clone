const mongoose = require("mongoose");
require("dotenv").config();

const url = process.env.MONGO_URI;

module.exports.connect = () => {
  mongoose
    .connect(url)
    .then(() => console.log("Database is connected"))
    .catch((err) => {
      console.error("DB error:", err.message);
      process.exit(1);
    });
};
