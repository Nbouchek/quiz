const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();
const port = process.env.PORT || 8082;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Requested-With",
      "Content-Length",
      "Accept-Encoding",
      "X-CSRF-Token",
      "Cache-Control",
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
    maxAge: 43200, // 12 hours
  })
);
app.use(express.json());

// Routes
app.use("/", routes);

// Start server
app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
});
