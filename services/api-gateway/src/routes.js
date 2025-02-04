const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const bodyParser = require("body-parser");

const router = express.Router();

// Parse JSON bodies
router.use(bodyParser.json());

// Study Service Proxy
const studyServiceProxy = createProxyMiddleware({
  target: "http://study-service:8084",
  pathRewrite: {
    "^/study/attempts/?$": "/attempts",
    "^/study/attempts/(.*)": "/attempts/$1",
    "^/study": "/",
  },
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Study Service Proxy] Original URL: ${req.url}`);
    console.log(`[Study Service Proxy] Method: ${req.method}`);
    console.log(`[Study Service Proxy] Headers:`, req.headers);
    console.log(`[Study Service Proxy] Rewritten URL: ${proxyReq.path}`);

    // Handle POST/PUT requests with a body
    if (req.body && (req.method === "POST" || req.method === "PUT")) {
      console.log(`[Study Service Proxy] Request Body:`, req.body);
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
      proxyReq.end();
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(
      `[Study Service Proxy] Response Status: ${proxyRes.statusCode}`
    );
    console.log(`[Study Service Proxy] Response Headers:`, proxyRes.headers);
  },
  onError: (err, req, res) => {
    console.error(`[Study Service Proxy] Error:`, err);
    res.status(500).json({
      success: false,
      error: "Study service proxy error",
      details: err.message,
    });
  },
});

// Content Service Proxy
const contentServiceProxy = createProxyMiddleware({
  target: "http://content-service:8081",
  pathRewrite: {
    "^/content/quizzes/?$": "/quizzes/",
    "^/content/quizzes/([^/]+)/attempt/?$": "/quizzes/$1/attempt",
    "^/content/quizzes/(.*)": "/quizzes/$1",
    "^/content": "/",
  },
  changeOrigin: true,
  followRedirects: true,
  autoRewrite: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Content Service Proxy] Original URL: ${req.url}`);
    console.log(`[Content Service Proxy] Method: ${req.method}`);
    console.log(`[Content Service Proxy] Headers:`, req.headers);
    console.log(`[Content Service Proxy] Rewritten URL: ${proxyReq.path}`);

    // Log request body for POST/PUT requests
    if (req.body && (req.method === "POST" || req.method === "PUT")) {
      console.log(`[Content Service Proxy] Request Body:`, req.body);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(
      `[Content Service Proxy] Response Status: ${proxyRes.statusCode}`
    );
    console.log(`[Content Service Proxy] Response Headers:`, proxyRes.headers);
  },
  onError: (err, req, res) => {
    console.error(`[Content Service Proxy] Error:`, err);
    res
      .status(500)
      .json({ error: "Content service proxy error", details: err.message });
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
