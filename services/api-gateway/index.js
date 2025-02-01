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
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `[API Gateway] Proxying to content service: ${req.method} ${req.url} -> ${proxyReq.path}`
      );
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      let body = [];
      proxyRes.on("data", (chunk) => {
        body.push(chunk);
      });

      proxyRes.on("end", () => {
        try {
          body = Buffer.concat(body).toString();
          let parsedBody;

          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            parsedBody = body;
          }

          // Set status code from the proxy response
          res.status(proxyRes.statusCode);

          // Format error responses
          if (proxyRes.statusCode >= 400) {
            const errorResponse = {
              status: proxyRes.statusCode,
              error: proxyRes.statusMessage,
              message:
                typeof parsedBody === "string"
                  ? parsedBody
                  : parsedBody?.error || "Unknown error",
            };
            res.json(errorResponse);
            return;
          }

          // Handle successful responses
          res.json({
            status: proxyRes.statusCode,
            data: parsedBody.data,
            success: true,
          });
        } catch (error) {
          console.error("[API Gateway] Error processing response:", error);
          if (!res.headersSent) {
            res.status(500).json({
              status: 500,
              error: "Internal Server Error",
              message: "Error processing service response",
            });
          }
        }
      });

      proxyRes.on("error", (error) => {
        console.error("[API Gateway] Proxy response error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            status: 500,
            error: "Internal Server Error",
            message: error.message,
          });
        }
      });
    },
    onError: (err, req, res) => {
      console.error("[API Gateway] Content service proxy error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          status: 500,
          error: "Internal Server Error",
          message: err.message,
        });
      }
    },
  },
  "/ai": {
    target: "http://ai-service:8083",
    pathRewrite: { "^/ai": "" },
  },
  "/study": {
    target: "http://study-service:8084",
    pathRewrite: { "^/study": "" },
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      const originalUrl = req.url;
      console.log("\n[API Gateway] Study service proxy details:");
      console.log("  Original URL:", originalUrl);
      console.log("  Proxy URL:", proxyReq.path);
      console.log("  Method:", req.method);
      console.log("  Target:", "http://study-service:8084" + proxyReq.path);

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
        let parsedBody;
        try {
          // Try to parse the response as JSON
          parsedBody = responseBody ? JSON.parse(responseBody) : {};
        } catch (e) {
          console.error("[API Gateway] Error parsing response:", e);
          console.error("[API Gateway] Raw response:", responseBody);
          // If we can't parse the response, send it as is with the original status code
          if (!res.headersSent) {
            res.status(proxyRes.statusCode).send(responseBody);
          }
          return;
        }

        // Handle error responses
        if (proxyRes.statusCode >= 400) {
          if (!res.headersSent) {
            res.status(proxyRes.statusCode).json({
              status: proxyRes.statusCode,
              error: proxyRes.statusMessage,
              message: parsedBody.error || "Unknown error",
            });
          }
          return;
        }

        // Handle successful responses
        if (!res.headersSent) {
          res.status(proxyRes.statusCode).json({
            status: proxyRes.statusCode,
            data: parsedBody.data || parsedBody,
            success: true,
          });
        }
      });

      proxyRes.on("error", (error) => {
        console.error("[API Gateway] Proxy response error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            status: 500,
            error: "Internal Server Error",
            message: error.message,
          });
        }
      });
    },
    onError: (err, req, res) => {
      console.error("[API Gateway] Study service proxy error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          status: 500,
          error: "Internal Server Error",
          message: err.message,
        });
      }
    },
  },
};

// Set up proxy middleware for each service
Object.entries(serviceProxies).forEach(([path, config]) => {
  app.use(
    path,
    createProxyMiddleware({
      ...config,
      changeOrigin: true,
      onError: (err, req, res) => {
        console.error(`Proxy error: ${err.message}`);
        res.status(500).json({ error: "Proxy error", details: err.message });
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
