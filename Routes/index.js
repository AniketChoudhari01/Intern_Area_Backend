const express = require("express");
const router = express.Router();
const ApplicationRoute = require("./ApplicationRoute");
const intern = require("./internshipRoute");
const job = require("./jobRoute");
const adminRoute = require("./adminRoute");
const admin = require("../firebase/firebase");
const passwordReset = require("./passwordReset");
const { verifyTokenMiddleware } = require("../Model/authMiddleware");
const { register, login } = require("./auth-controllers");
const bcrypt = require("bcryptjs");
const validate = require("../middlewares/validate-middleware");
const signupSchema = require("../validators/auth-validator");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const subscriptionController = require("./subscriptionController");
const verifyUserMiddleware = require("../middlewares/verifyUserMiddleware");
const firebaseAdmin = require("firebase-admin");
const generatePassword = require("../utils/passwordGenerator");

// Google Sign-In Route
router.route("/google-signin").post(async (req, res) => {
  const { firebaseToken } = req.body; // Correct
  // console.log(firebaseToken);
  if (!firebaseToken) {
    return res.status(400).json({ message: "No Firebase token provided" });
  }

  try {
    // Verify the Firebase token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    // console.log("Decoded Firebase Token:", decodedToken);
    const { email, name, picture } = decodedToken;
    let fname = name.split(" ")[0];
    let lname = name.split(" ")[1];
    fname = name.split("_")[0];
    lname = name.split("_")[1];
    const photoURL = picture;

    let user = await User.findOne({ email });

    if (!user) {
      // If user does not exist, create a new user with random password
      const randomPassword = generatePassword();

      user = new User({
        fname,
        lname,
        email,
        password: randomPassword, // Store the random password
        photoURL,
        subscription: {
          status: "trial",
          plan: "free",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await user.save();
      // console.log("New user created:", user);
    } else {
      // If user exists, update their information if needed
      // Generate token
      user.updatedAt = new Date();
      user.photoURL = photoURL; // Optionally update photoURL or any other field
      await user.save();
      // console.log("User already exists, updated info:", user);
    }
    const token = await user.generateToken();
    // console.log("Generated token:", token);

    res.status(200).json({
      message: "Login Successful",
      token,
      userId: user._id.toString(),
    });
  } catch (error) {
    // console.error("Error during Google sign-in:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Authentication failed" });
  }
});

// Main route
router.get("/", (req, res) => {
  res.send("this is backend");
});

// Register and login routes
router.route("/register").post(validate(signupSchema), register);
router.route("/login").post(login);

// Forgot and Reset Password Routes
require("../Model/Token");
const User = mongoose.model("User");

router.route("/forgot-password").post(async (req, res) => {
  const { email } = req.body;

  try {
    const oldUser = await User.findOne({ email });

    if (!oldUser) {
      return res.status(404).json({ status: "error" });
    }

    let lastResetDate = oldUser.get(`lastPasswordReset`);

    // if (lastResetDate != null) {
    //   if (Date.now() - lastResetDate < 24 * 60 * 60 * 1000) {
    //     return res.status(429).json({
    //       success: false,
    //       message: "Password reset can only be requested once per day.",
    //     });
    //   }
    // }

    oldUser.lastPasswordReset = Date.now();
    await oldUser.save();

    const secret = process.env.JWT_SECRET_KEY + oldUser.password;
    const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
      expiresIn: "5m",
    });

    const link = `http://localhost:10000/api/reset-password/${oldUser._id}/${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Intern Area" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      text: `Hi ${
        oldUser?.fname ? oldUser.fname + " " + (oldUser.lname || "") : "User"
      },\n\nReset your password using this link: ${link}\n\nIf not requested, ignore this.`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        // console.error("Error sending email:", error);
        return res.status(500).json({ status: "error" });
      } else {
        // console.log("Email sent: " + info.response);
        return res.status(200).json({ status: "success" });
      }
    });
  } catch (error) {
    // console.error("Forgot password error:", error);
    return res.status(500).json({ status: "error" });
  }
});

router.route("/reset-password/:id/:token").get(async (req, res) => {
  const { id, token } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const secret = process.env.JWT_SECRET_KEY + user.password;
    try {
      const verify = jwt.verify(token, secret);
      res.render("index", { email: verify.email, status: "Not verified" });
    } catch (verifyError) {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid or expired token" });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.route("/reset-password/:id/:token").post(async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const secret = process.env.JWT_SECRET_KEY + user.password;
    try {
      const verify = jwt.verify(token, secret);
      const encryptedPassword = await bcrypt.hash(password, 10);
      await User.updateOne(
        { _id: id },
        { $set: { password: encryptedPassword } }
      );

      user.passwordResetAttempts++;
      user.lastPasswordReset = Date.now();
      await user.save();

      res.render("index", { email: verify.email, status: "verified" });
    } catch (verifyError) {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid or expired token" });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Subscription Plan Routes
router.route("/updatePlan").get(async (req, res) => {
  try {
    const { userId } = req.query; // Extract userId from query parameters

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      subscription: {
        plan: user.subscription?.plan || "free",
        status: user.subscription?.status || "inactive",
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
      },
    });
  } catch (error) {
    // console.error("Error fetching user plan:", error);
    res.status(500).json({ message: "Error fetching subscription details" });
  }
});

router.route("/updatePlan").post(async (req, res) => {
  try {
    const { plan, status, currentPeriodEnd, userId } = req.body;

    // Validate that userId is provided in the body
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log("User found with a plan:", plan);
    // Determine maxMonthlyFeatures based on the plan
    let maxMonthlyFeatures;
    switch (plan) {
      case "gold":
        maxMonthlyFeatures = "unlimited";
        break;
      case "silver":
        maxMonthlyFeatures = 5;
        break;
      case "bronze":
        maxMonthlyFeatures = 3;
        break;
      default:
        maxMonthlyFeatures = 1; // Default for free plan
    }

    // Update the user's subscription and features
    user.subscription = {
      plan: plan || user.subscription?.plan || "free",
      status: status || user.subscription?.status || "inactive",
      currentPeriodEnd: currentPeriodEnd || user.subscription?.currentPeriodEnd,
    };

    user.features = {
      ...user.features, // Retain other feature-related fields
      maxMonthlyFeatures,
    };

    await user.save();

    res.json({
      message: "Subscription updated successfully",
      subscription: user.subscription,
      features: user.features,
    });
  } catch (error) {
    // console.error("Error updating user plan:", error);
    res.status(500).json({ message: "Error updating subscription" });
  }
});

// Checkout Session Route
router.post(
  "/create-checkout-session",
  verifyUserMiddleware,
  subscriptionController.createCheckoutSession
);

// Use other routes
router.use("/application", ApplicationRoute);
router.use("/internship", intern);
router.use("/job", job);
router.use("/admin", adminRoute);

module.exports = router;
