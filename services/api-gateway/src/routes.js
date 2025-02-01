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

// Content Service Proxy
const contentServiceProxy = createProxyMiddleware({
  target: "http://content-service:8081",
  pathRewrite: {
    "^/content": "/",
  },
  changeOrigin: true,
});

// User Service Proxy
const userServiceProxy = createProxyMiddleware({
  target: "http://user-service:8080",
  pathRewrite: {
    "^/users": "/",
  },
  changeOrigin: true,
});

// AI Service Proxy
const aiServiceProxy = createProxyMiddleware({
  target: "http://ai-service:8083",
  pathRewrite: {
    "^/ai": "/",
  },
  changeOrigin: true,
});

// Routes
router.use("/study", studyServiceProxy);
router.use("/content", contentServiceProxy);
router.use("/users", userServiceProxy);
router.use("/ai", aiServiceProxy);

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
