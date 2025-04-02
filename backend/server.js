const express = require("express");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const app = express();

// Configure CORS to allow requests from any origin, including Chrome extensions
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Google OAuth client for verifying ID tokens
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Render uses PORT environment variable
const PORT = process.env.PORT || 3000;

// Add CORS headers explicitly for all routes as a backup
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Endpoint to serve Google Maps API key
app.get("/api/maps-key", (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

// Endpoint to verify Google ID token
app.get("/auth/callback", async (req, res) => {
  try {
    const idToken = req.query.id_token;

    if (!idToken) {
      return res.status(400).json({
        error: "Missing ID token",
        authorized: false,
      });
    }

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // Check if the email domain is authorized
    const isAuthorized = email && email.endsWith("@prostructengineering.com");

    res.json({
      authorized: isAuthorized,
      email: email,
    });
  } catch (error) {
    console.error("Error verifying ID token:", error);
    res.status(401).json({
      error: "Invalid token: " + error.message,
      authorized: false,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
