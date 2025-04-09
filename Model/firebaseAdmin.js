const admin = require("firebase-admin");

// Initialize Firebase Admin SDK with service account credentials
const serviceAccount = require("./serviceAccountKey.json"); // Replace with the correct path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Function to verify ID token
const verifyToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken; // Return decoded token if successful
  } catch (error) {
    console.error("Error verifying token:", error);
    throw new Error("Token verification failed");
  }
};

module.exports = { verifyToken };
