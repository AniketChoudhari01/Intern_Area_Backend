const jwt = require("jsonwebtoken");
const {User} = require("../Model/Token");

const verifyUserMiddleware = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        message: "Access denied. No authorization header provided." 
      });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: "Invalid token format. Must be a Bearer token." 
      });
    }

    // Extract and verify token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ 
        message: "Access denied. No token provided." 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      console.log("decoded:", decoded);

      // Check if decoded token has required fields
      if (!decoded.id) {
        return res.status(401).json({ 
          message: "Invalid token structure." 
        });
      }

      // Find user in database
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found." 
        });
      }
      console.log("User in middleware:", user);
      // Attach user to request
      req.user = user;  // Note: This should be req.user, not req.User
      next();
    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: "Token has expired." 
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: "Invalid token signature." 
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({ 
      message: "Internal server error during authentication." 
    });
  }
};

module.exports = verifyUserMiddleware;