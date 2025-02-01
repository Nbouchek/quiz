const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const router = express.Router();

// Study Service Proxy
const studyServiceProxy = createProxyMiddleware({
  target: "http://study-service:8084",
  pathRewrite: {
    "^/study": "/",
  },
  changeOrigin: true,
});

// Routes
router.use("/study", studyServiceProxy);

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
