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
        console.log(
          `[API Gateway] Proxying ${req.method} ${req.url} -> ${target}${proxyReq.path}`
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
            console.warn(
              "[API Gateway] Headers already sent, skipping response processing"
            );
            return;
          }

          try {
            // Set status code from the proxy response
            res.status(proxyRes.statusCode);

            // If the response is empty, send empty response
            if (!responseBody) {
              res.send();
              return;
            }

            let parsedBody;
            try {
              parsedBody = JSON.parse(responseBody);
            } catch (e) {
              // If not JSON, send raw response
              res.send(responseBody);
              return;
            }

            // Format the response
            const response = {
              status: proxyRes.statusCode,
              success: proxyRes.statusCode < 400,
            };

            if (proxyRes.statusCode >= 400) {
              response.error = proxyRes.statusMessage;
              response.message = parsedBody.error || "Unknown error";
            } else {
              response.data = parsedBody.data || parsedBody;
            }

            res.json(response);
          } catch (error) {
            console.error("[API Gateway] Error processing response:", error);
            if (!res.headersSent) {
              res.status(500).json({
                status: 500,
                error: "Internal Server Error",
                message: "Error processing service response",
                success: false,
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
