// Model/Token.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const tokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["PASSWORD_RESET"], // Can add more types if needed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Automatically delete documents after 1 hour
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Create indexes for better query performance
tokenSchema.index({ email: 1, type: 1 });
tokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Model/authMiddleware.js
// Add these fields to your existing schema in authMiddleware.js

const userSchema = new mongoose.Schema(
  {
    // Existing user fields
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    lastPasswordReset: {
      type: Date,
      default: null,
    },
    passwordResetAttempts: {
      type: Number,
      default: 0,
    },
    // Google Auth Fields
    googleId: {
      type: String, // Google UID for unique identification
      unique: true,
      sparse: true, // Makes the field optional for non-Google logins
    },
    googleToken: {
      type: String, // Store the Google OAuth token if needed
    },
    googlePhotoURL: {
      type: String, // Store the user's Google profile picture URL
    },

    // Subscription related fields
    subscription: {
      status: {
        type: String,
        enum: ["trial", "active", "canceled", "expired"],
        default: "trial",
      },
      plan: {
        type: String,
        enum: ["free", "bronze", "silver", "gold"],
        default: "free",
      },
      planId: {
        type: String,
        default: null, // Stripe Price ID
      },
      customerId: {
        type: String,
        default: null, // Stripe Customer ID
      },
      subscriptionId: {
        type: String,
        default: null, // Stripe Subscription ID
      },
      trialEnds: {
        type: Date,
        default: null,
      },
      currentPeriodEnd: {
        type: Date,
        default: null,
      },
      featureUsage: {
        currentMonth: {
          type: String, // YYYY-MM format
          default: () => new Date().toISOString().slice(0, 7),
        },
        count: {
          type: Number,
          default: 0,
        },
        lastReset: {
          type: Date,
          default: Date.now,
        },
      },
      features: {
        maxMonthlyFeatures: {
          type: mongoose.Schema.Types.Mixed,
          default: 1,
          validate: {
            validator: function (value) {
              return typeof value === "number" || value === "unlimited";
            },
            message: "maxMonthlyFeatures must be a number or 'unlimited'",
          },
        },
      },
      billingHistory: [
        {
          invoiceId: String,
          amount: Number,
          status: {
            type: String,
            enum: ["paid", "pending", "failed"],
          },
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      paymentMethod: {
        last4: String,
        brand: String,
        expiryMonth: Number,
        expiryYear: Number,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
userSchema.index({ "subscription.status": 1 });
userSchema.index({ "subscription.plan": 1 });
userSchema.index({ "subscription.customerId": 1 });
userSchema.index({ email: 1 });

// Add method to check feature availability
userSchema.methods.canUseFeature = async function () {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Reset counter if it's a new month
  if (this.subscription.featureUsage.currentMonth !== currentMonth) {
    this.subscription.featureUsage.currentMonth = currentMonth;
    this.subscription.featureUsage.count = 0;
    this.subscription.featureUsage.lastReset = new Date();
    await this.save();
  }

  // Gold plan has unlimited access
  if (this.subscription.plan === "gold") return true;

  // Check if user has reached their monthly limit
  return (
    this.subscription.featureUsage.count <
    this.subscription.features.maxMonthlyFeatures
  );
};

// Add method to increment feature usage
userSchema.methods.incrementFeatureUsage = async function () {
  if (this.subscription.plan !== "gold") {
    this.subscription.featureUsage.count += 1;
    await this.save();
  }
};

userSchema.pre("save", async function (next) {
  // console.log("pre method inside Token.js", this);

  if (!this.isModified("password")) return next();

  try {
    const saltRound = 10;
    const hash_password = await bcrypt.hash(this.password, saltRound);
    this.password = hash_password;
    next();
  } catch (error) {
    next(error);
  }
});

//? Generate JSON Web Token

userSchema.methods.generateToken = async function (id, email) {
  try {
    console.log("jwt token in generate token method:", process.env.JWT_SECRET_KEY);
    return jwt.sign(
      {
        id: this._id, // Include user ID in token payload
        email: this.email, // Optionally include email
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d", // Token expires
      }
    );
  } catch (error) {
    console.error("Token Generation Error:", error);
    throw new Error("Error generating token");
  }
};

module.exports = {
  Token: mongoose.model("Token", tokenSchema),
  User: mongoose.model("User", userSchema),
};
