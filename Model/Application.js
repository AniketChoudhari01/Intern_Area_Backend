const mongoose = require("mongoose");
const applicationSchema = new mongoose.Schema({
  company: String,
  category: String,
  coverLetter: String,
  createAt: {
    type: Date,
    default: Date.now,
  },
  Application: Object,
  user: Object,
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  // Add these fields to your existing user schema
  lastPasswordReset: { type: Date, default: null },
  passwordResetAttempts: { type: Number, default: 0 },
});
module.exports = mongoose.model("Application", applicationSchema);
