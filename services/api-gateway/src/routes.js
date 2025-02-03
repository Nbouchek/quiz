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
    "^/content/quizzes/?$": "/quizzes/",
    "^/content/quizzes/(.*)": "/quizzes/$1",
    "^/content": "/",
  },
  changeOrigin: true,
  followRedirects: true,
  autoRewrite: true,
  onProxyReq: (proxyReq, req, res) => {
    // Log the original and rewritten URLs for debugging
    console.log(`[Content Service Proxy] Original URL: ${req.url}`);
    console.log(`[Content Service Proxy] Rewritten URL: ${proxyReq.path}`);
  },
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
