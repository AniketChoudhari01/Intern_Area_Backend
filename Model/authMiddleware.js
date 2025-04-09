const { verifyToken } = require("./serviceAccountKey.json"); // Adjust the path as needed

const verifyTokenMiddleware = async (req, res, next) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(400).json({ success: false, error: "No token provided" });
  }

  try {
    const decodedToken = await verifyToken(idToken);
    req.user = decodedToken; // Attach user info to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

module.exports = { verifyTokenMiddleware };
