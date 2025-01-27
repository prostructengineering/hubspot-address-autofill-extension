const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

app.get("/api/maps-key", (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

// For local development
if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

module.exports = app;
