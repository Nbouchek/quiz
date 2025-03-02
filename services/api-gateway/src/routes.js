const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");

const router = express.Router();

// Configure CORS
router.use(
  cors({
    origin: "http://localhost:3000", // Only allow the frontend origin
    credentials: true, // Enable credentials (cookies, auth headers)
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

// Parse JSON bodies
router.use(bodyParser.json());

// Add logging middleware for debug
router.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.url}`);
  console.log(`[API Gateway] Headers:`, req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[API Gateway] Body:`, req.body);
  }
  next();
});

// Special handler for quiz attempt endpoint
// Must be defined BEFORE proxy middleware
router.post("/quiz/:quizId/attempt", async (req, res) => {
  console.log(
    `[Quiz Attempt Handler] Handling POST /quiz/${req.params.quizId}/attempt`
  );

  // Create the modified request body
  const requestBody = {
    ...req.body,
    quizId: req.params.quizId,
  };

  console.log(`[Quiz Attempt Handler] Modified request body:`, requestBody);

  try {
    // Forward the request to the study service
    const response = await fetch("http://study-service:8084/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Quiz Attempt Handler] Status: ${response.status}`);

    const data = await response.json();
    console.log(`[Quiz Attempt Handler] Response:`, data);

    res.status(response.status).json(data);
  } catch (error) {
    console.error(`[Quiz Attempt Handler] Error:`, error);
    res.status(500).json({
      success: false,
      error: "Error forwarding request to study service",
      details: error.message,
    });
  }
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
    if (req.body && (req.method === "POST" || req.method === "PUT")) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error(`[Content Service Proxy] Error:`, err);
    res
      .status(500)
      .json({ error: "Content service proxy error", details: err.message });
  },
});

// Study Service Proxy (excluding /quiz/:quizId/attempt)
const studyServiceProxy = createProxyMiddleware(
  (pathname) => {
    // Skip our custom route
    return (
      pathname.startsWith("/study") &&
      !pathname.match(/^\/quiz\/[^\/]+\/attempt\/?$/)
    );
  },
  {
    target: "http://study-service:8084",
    pathRewrite: {
      "^/study/quiz-attempts/?$": "/attempts",
      "^/study/quiz-attempts/(.*)": "/attempts/$1",
      "^/study/attempts/?$": "/attempts",
      "^/study/attempts/(.*)": "/attempts/$1",
      "^/study": "/",
    },
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      // Log the original and rewritten paths for debugging
      console.log(`[Study Service Proxy] Original path: ${req.path}`);
      console.log(`[Study Service Proxy] Forwarding to: ${proxyReq.path}`);

      if (req.body && (req.method === "POST" || req.method === "PUT")) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error(`[Study Service Proxy] Error:`, err);
      res.status(500).json({
        success: false,
        error: "Study service proxy error",
        details: err.message,
      });
    },
  }
);

// User Service Proxy
const userServiceProxy = createProxyMiddleware({
  target: "http://user-service:8080",
  pathRewrite: {
    "^/users": "/",
  },
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error(`[User Service Proxy] Error:`, err);
    res.status(500).json({
      success: false,
      error: "User service proxy error",
      details: err.message,
    });
  },
});

// AI Service Proxy
const aiServiceProxy = createProxyMiddleware({
  target: "http://ai-service:8083",
  pathRewrite: {
    "^/ai": "/",
  },
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error(`[AI Service Proxy] Error:`, err);
    res.status(500).json({
      success: false,
      error: "AI service proxy error",
      details: err.message,
    });
  },
});

// Routes - order matters
router.use("/content", contentServiceProxy);
router.use("/study", studyServiceProxy);
router.use("/users", userServiceProxy);
router.use("/ai", aiServiceProxy);

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
