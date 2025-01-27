const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

// Render uses PORT environment variable
const PORT = process.env.PORT || 3000;

app.get("/api/maps-key", (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
