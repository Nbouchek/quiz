const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const port = 8082;

// Configure CORS with specific options
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.url}`);
  console.log("[API Gateway] Headers:", req.headers);
  if (req.body) {
    console.log("[API Gateway] Body:", req.body);
  }
  next();
});

// Proxy configuration for each service
const serviceProxies = {
  "/users": {
    target: "http://user-service:8080",
    pathRewrite: { "^/users": "" },
  },
  "/quizzes": {
    target: "http://content-service:8081",
    pathRewrite: { "^/quizzes": "/quizzes" },
  },
  "/ai": {
    target: "http://ai-service:8083",
    pathRewrite: { "^/ai": "" },
  },
  "/study": {
    target: "http://study-service:8084",
    pathRewrite: { "^/study": "" },
  },
};

// Set up proxy middleware for each service
Object.entries(serviceProxies).forEach(([path, { target, pathRewrite }]) => {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite,
      onProxyReq: (proxyReq, req, res) => {
        // Log the original and rewritten URLs for debugging
        console.log(
          `[API Gateway] ${path} service proxy details:
  Original URL: ${req.url}
  Proxy URL: ${proxyReq.path}
  Method: ${req.method}
  Target: ${target}${proxyReq.path}`
        );

        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        let responseBody = "";
        proxyRes.on("data", (chunk) => {
          responseBody += chunk;
        });

        proxyRes.on("end", () => {
          if (res.headersSent) {
            return;
          }

          // If the response is empty and status is 404, send a proper 404 response
          if (!responseBody && proxyRes.statusCode === 404) {
            res.status(404).json({
              status: 404,
              success: false,
              error: "Not Found",
              message: "The requested resource was not found",
            });
            return;
          }

          // If the response is empty but not 404, send status with empty data
          if (!responseBody) {
            res.status(proxyRes.statusCode).json({
              status: proxyRes.statusCode,
              success: proxyRes.statusCode < 400,
              data: null,
            });
            return;
          }

          try {
            const parsedBody = JSON.parse(responseBody);
            const response = {
              status: proxyRes.statusCode,
              success: proxyRes.statusCode < 400,
              data: parsedBody.data || parsedBody,
            };

            if (proxyRes.statusCode >= 400) {
              response.error = parsedBody.error || proxyRes.statusMessage;
              response.message = parsedBody.message || "Unknown error";
              delete response.data;
            }

            res.status(proxyRes.statusCode).json(response);
          } catch (error) {
            console.error("[API Gateway] JSON parse error:", error);
            if (!res.headersSent) {
              res.status(502).json({
                status: 502,
                success: false,
                error: "Bad Gateway",
                message: "Invalid JSON response from service",
              });
            }
          }
        });
      },
      onError: (err, req, res) => {
        console.error("[API Gateway] Proxy error:", err);
        if (!res.headersSent) {
          res.status(500).json({
            status: 500,
            error: "Internal Server Error",
            message: err.message,
            success: false,
          });
        }
      },
    })
  );
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});
