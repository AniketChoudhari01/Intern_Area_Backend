const checkSubscription = async (req, res, next) => {
  const user = req.user;

  // Check if user has active subscription
  if (
    user.subscription.status !== "active" &&
    user.subscription.status !== "trial"
  ) {
    return res.status(403).json({
      error: "Active subscription required",
    });
  }

  // Check if trial or subscription has expired
  const now = new Date();
  if (
    user.subscription.currentPeriodEnd &&
    now > user.subscription.currentPeriodEnd
  ) {
    return res.status(403).json({
      error: "Subscription expired",
    });
  }

  next();
};
