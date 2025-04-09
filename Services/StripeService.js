const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { User } = require("../Model/Token"); //very very important to destruct the User model from the Token model
const nodemailer = require("nodemailer");

// Email templates
const emailTemplates = {
  paymentSuccess: (userEmail, planName, amount) => ({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Payment Successful - Subscription Activated",
    html: `
      <h2>Payment Successful!</h2>
      <p>Dear valued customer,</p>
      <p>Your payment of ${(amount / 100).toFixed(
        2
      )} has been successfully processed.</p>
      <p>Your ${planName} plan is now active.</p>
      <p>Thank you for choosing our service!</p>
      <p>Best regards,<br>Intern Area Team</p>
    `,
  }),

  paymentFailed: (userEmail, amount) => ({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Payment Failed - Action Required",
    html: `
      <h2>Payment Failed</h2>
      <p>Dear valued customer,</p>
      <p>We were unable to process your payment of ${(amount / 100).toFixed(
        2
      )}.</p>
      <p>Please update your payment method to avoid service interruption:</p>
      <p>1. Log in to your account<br>2. Go to Billing Settings<br>3. Update your payment information</p>
      <p>If you need assistance, please contact our support team.</p>
      <p>Best regards,<br>Intern Area Team</p>
    `,
  }),

  planUpgraded: (userEmail, planName) => ({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Subscription Plan Updated",
    html: `
      <h2>Plan Upgrade Successful!</h2>
      <p>Dear valued customer,</p>
      <p>Your subscription has been successfully upgraded to the ${planName} plan.</p>
      <p>You now have access to all ${planName} plan features!</p>
      <p>Thank you for your continued support.</p>
      <p>Best regards,<br>Intern Area Team</p>
    `,
  }),
};

// Create or Get Stripe Customer
class StripeService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail(template) {
    try {
      await this.transporter.sendMail(template);
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }
  async getOrCreateCustomer(user) {
    if (user.subscription?.customerId) {
      return user.subscription.customerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user._id.toString() },
    });

    await User.findByIdAndUpdate(user._id, {
      "subscription.customerId": customer.id,
    });

    return customer.id;
  }

  async createCheckoutSession(customerId, priceId, planName, clientUrl, user) {
    try {
      // console.log("Creating Stripe Checkout session...", priceId, planName);
      if (!priceId || !planName) {
        throw new Error("priceId and planName are required.");
      }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: { planName },
        },
        metadata: {
          userId: user._id.toString(),
          planName: planName,
          priceId: priceId,
        },
        success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/cancel`,
      });

      return session;
    } catch (error) {
      console.error("Error creating Stripe Checkout session:", error);
      throw error;
    }
  }
  // Handle Webhook Events
  async handleWebhookEvent(event) {
    console.log("🎯 Processing webhook event:", event.type);

    try {
      switch (event.type) {
        case "checkout.session.completed":
          console.log(
            "📦 Checkout session completed. Session ID:",
            event.data.object.id
          );
          await this.handleCheckoutSessionCompleted(event.data.object); // Changed to this.
          console.log("✅ Successfully processed checkout session");
          break;

        case "customer.subscription.created":
          console.log(
            "🆕 New subscription created. Customer ID:",
            event.data.object.customer
          );
          await this.handleSubscriptionChange(event.data.object); // Changed to this.
          console.log("✅ Successfully processed subscription creation");
          break;

        case "customer.subscription.updated":
          console.log(
            "📝 Subscription updated. Customer ID:",
            event.data.object.customer
          );
          console.log("New status:", event.data.object.status);
          await this.handleSubscriptionChange(event.data.object); // Changed to this.
          console.log("✅ Successfully processed subscription update");
          break;

        case "invoice.paid":
          console.log(
            "💰 Payment successful. Invoice ID:",
            event.data.object.id
          );
          console.log("Amount paid:", event.data.object.amount_paid);
          await this.handleSuccessfulPayment(event.data.object); // Changed to this.
          console.log("✅ Successfully processed payment");
          break;

        case "invoice.payment_failed":
          console.log("❌ Payment failed. Invoice ID:", event.data.object.id);
          console.log("Amount due:", event.data.object.amount_due);
          await this.handleFailedPayment(event.data.object); // Changed to this.
          console.log("✅ Successfully processed failed payment notification");
          break;

        default:
          console.log("⚠️ Unhandled event type:", event.type);
      }
    } catch (error) {
      console.error("❌ Error processing webhook event:", event.type);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
      throw error;
    }
  }

  async handleCheckoutSessionCompleted(session) {
    try {
      const { userId, planName } = session.metadata;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      console.log(
        "Subscription retrieved in completed C/O:",
        subscription,
        userId,
        planName
      );
      // Determine maxMonthlyFeatures based on the plan
      let maxMonthlyFeatures;
      switch (planName.toLowerCase()) {
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

      // Update user's plan and features
      await User.findByIdAndUpdate(userId, {
        $set: {
          "subscription.status": "active",
          "subscription.plan": planName,
          "subscription.planId": session.metadata.priceId,
          "subscription.subscriptionId": subscription.id,
          "subscription.currentPeriodEnd": new Date(
            subscription.current_period_end * 1000
          ),
          "features.maxMonthlyFeatures": maxMonthlyFeatures,
        },
      });

      // Send plan upgrade email
      const user = await User.findById(userId);
      console.log("Plan name of user:", planName);
      if (user) {
        await this.sendEmail(emailTemplates.planUpgraded(user.email, planName)); // Changed to this.
      }
    } catch (error) {
      console.error("Error handling checkout session completed:", error);
    }
  }

  // Handle Subscription Changes
  async handleSubscriptionChange(subscription) {
    const user = await User.findOne({
      "subscription.customerId": subscription.customer,
    });

    if (!user) return;

    let maxMonthlyFeatures;
    switch (subscription.metadata.planName.toLowerCase()) {
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

    const updateData = {
      "subscription.status": subscription.status,
      "subscription.subscriptionId": subscription.id,
      "subscription.currentPeriodEnd": new Date(
        subscription.current_period_end * 1000
      ),
      "features.maxMonthlyFeatures": maxMonthlyFeatures,
    };

    if (subscription.trial_end) {
      updateData["subscription.trialEnds"] = new Date(
        subscription.trial_end * 1000
      );
    }

    await User.findByIdAndUpdate(user._id, { $set: updateData });
  }

  // Handle Successful Payment
  async handleSuccessfulPayment(invoice) {
    try {
      const user = await User.findOne({
        "subscription.customerId": invoice.customer,
      });

      if (!user) return;

      let maxMonthlyFeatures;
      switch (user.subscription.plan.toLowerCase()) {
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
      console.log("MAX MONTHLY FEATURES:", maxMonthlyFeatures);
      await User.findByIdAndUpdate(user._id, {
        $push: {
          "subscription.billingHistory": {
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
            status: "paid",
            date: new Date(invoice.created * 1000),
          },
        },
        $set: {
          "features.maxMonthlyFeatures": maxMonthlyFeatures,
        },
      });

      await this.sendEmail(
        // Changed to this.
        emailTemplates.paymentSuccess(
          user.email,
          user.subscription.plan,
          invoice.amount_paid
        )
      );
      console.log("Updated subscription details:", user.subscription);
    } catch (error) {
      console.error("Error handling successful payment:", error);
    }
  }
  // Handle Failed Payment
  async handleFailedPayment(invoice) {
    try {
      const user = await User.findOne({
        "subscription.customerId": invoice.customer,
      });

      if (!user) return;

      await User.findByIdAndUpdate(user._id, {
        $push: {
          "subscription.billingHistory": {
            invoiceId: invoice.id,
            amount: invoice.amount_due,
            status: "failed",
            date: new Date(invoice.created * 1000),
          },
        },
      });

      await this.sendEmail(
        // Changed to this.
        emailTemplates.paymentFailed(user.email, invoice.amount_due)
      );
    } catch (error) {
      console.error("Error handling failed payment:", error);
    }
  }
}
// Export a single instance of the service
module.exports = new StripeService();
