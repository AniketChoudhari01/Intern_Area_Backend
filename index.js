const dotenv = require("dotenv");
dotenv.config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require("express"); 
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./db"); 
const router = require("./Routes/index"); 
const errorMiddleware = require("./middlewares/error-middleware");
const User = require("./Model/Token"); 
const { jwt } = require("jsonwebtoken");
const subscriptionController = require("./Routes/subscriptionController");
const app = express();
app.set("view engine", "ejs");

// Webhook endpoint
app.post('/webhook', express.json(), async (req, res) => {
  let event;

  try {
    event = req.body;

    console.log('Webhook event type:', event.type);

    // Handle the webhook event
    await subscriptionController.handleWebhook(event);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 10000; // Default port if not provided in .env
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" })); // Body parser for large JSON requests
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" })); // Body parser for url-encoded requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Routes
app.get("/", (req, res) => {
  res.send("Hello, This is My backend");
});
app.use("/api", router);

// Use error handling middleware last
app.use(errorMiddleware);
// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`)
});
