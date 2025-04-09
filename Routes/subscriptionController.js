const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { User } = require("../Model/Token");
const stripeService = require("../Services/StripeService");

const subscriptionController = {
  createCheckoutSession: async (req, res) => {
    try {
      // console.log("subscribe");
      const { priceId, planName } = req.body;
      if (!priceId || !planName) {
        return res
          .status(400)
          .json({ message: "priceId and planName are required." });
      }

      const user = req.user;
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }

      const customerId = await stripeService.getOrCreateCustomer(user);
      if (!customerId) {
        return res
          .status(500)
          .json({ message: "Failed to create or retrieve customer." });
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        planName,
        process.env.CLIENT_URL,
        user
      );

      res.status(200).json({ sessionId: session.id });
    } catch (error) {
      // console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  },

  handleWebhook: async (event) => {
    try {
      // console.log("Processing webhook event:", event.type);
      await stripeService.handleWebhookEvent(event);
      return true;
    } catch (err) {
      // console.error("Error processing webhook:", err.message);
      throw err;
    }
  },
};

module.exports = subscriptionController;
