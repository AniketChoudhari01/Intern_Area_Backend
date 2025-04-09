// firebaseAdmin.js (server side - Node.js)
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK with service account credentials
const serviceAccount = require("../Model/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASEURL,
});

module.exports = admin;
