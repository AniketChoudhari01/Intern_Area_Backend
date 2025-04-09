// const express = require("express");
// const router = express.Router();
// const User = require("../Model/authMiddleware");
// const Token = require("../Model/Token");
// const { generatePassword } = require("../utils/passwordGenerator");

// // Route will be accessible at /auth/forgot-password
// router.post("/forgot-password", async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Check rate limiting
//     const lastReset = await Token.findOne({
//       email,
//       type: "PASSWORD_RESET",
//       createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
//     });

//     if (lastReset) {
//       return res.status(429).json({
//         success: false,
//         message: "Password reset can only be requested once per day",
//       });
//     }

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.json({
//         success: true,
//         message: "If an account exists, you will receive reset instructions",
//       });
//     }

//     // Generate reset token
//     const resetToken = require("crypto").randomBytes(32).toString("hex");

//     // Save token
//     await Token.create({
//       email,
//       token: resetToken,
//       type: "PASSWORD_RESET",
//       expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
//     });

//     // Update user's reset attempts
//     user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
//     user.lastPasswordReset = new Date();
//     await user.save();

//     // TODO: Send email with reset instructions
//     // You'll need to implement email sending logic here

//     res.json({
//       success: true,
//       message: "If an account exists, you will receive reset instructions",
//     });
//   } catch (error) {
//     console.error("Password reset error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// // You can add more password-related routes here, like:
// // POST /auth/reset-password
// // GET /auth/validate-reset-token

// module.exports = router;
