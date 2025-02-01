const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const port = 8082;

// Configure CORS with specific options
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[API Gateway] [${requestId}] ${req.method} ${req.url}`);
  console.log(`[API Gateway] [${requestId}] Headers:`, req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(
      `[API Gateway] [${requestId}] Request Body:`,
      JSON.stringify(req.body, null, 2)
    );
  }

  // Capture response
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];

  res.write = function (chunk) {
    chunks.push(chunk);
    return oldWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      chunks.push(chunk);
    }
    const responseBody = Buffer.concat(chunks).toString("utf8");
    console.log(
      `[API Gateway] [${requestId}] Response Status:`,
      res.statusCode
    );
    try {
      const parsedBody = JSON.parse(responseBody);
      console.log(
        `[API Gateway] [${requestId}] Response Body:`,
        JSON.stringify(parsedBody, null, 2)
      );
    } catch (e) {
      console.log(`[API Gateway] [${requestId}] Response Body:`, responseBody);
    }
    oldEnd.apply(res, arguments);
  };

  next();
});

// Proxy configuration for each service
const serviceProxies = {
  "/users": {
    target: "http://user-service:8080",
    pathRewrite: { "^/users": "" },
  },
  "/content": {
    target: "http://content-service:8081",
    pathRewrite: { "^/content": "" },
    router: function (req) {
      const path = req.path.replace(/^\/content/, "");
      return {
        protocol: "http:",
        host: "content-service",
        port: 8081,
        path: path,
      };
    },
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
        const requestId = Math.random().toString(36).substring(7);
        // Log the original and rewritten URLs for debugging
        console.log(
          `[API Gateway] [${requestId}] ${path} service proxy details:
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
          console.log(
            `[API Gateway] [${requestId}] Forwarding request body:`,
            bodyData
          );
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        const requestId = Math.random().toString(36).substring(7);
        console.log(
          `[API Gateway] [${requestId}] Received response from service:`,
          {
            statusCode: proxyRes.statusCode,
            headers: proxyRes.headers,
          }
        );

        let responseBody = "";
        proxyRes.on("data", (chunk) => {
          responseBody += chunk;
        });

        proxyRes.on("end", () => {
          if (res.headersSent) {
            console.log(`[API Gateway] [${requestId}] Headers already sent`);
            return;
          }

          console.log(
            `[API Gateway] [${requestId}] Raw response body:`,
            responseBody
          );

          // If the response is empty and status is 404, send a proper 404 response
          if (!responseBody && proxyRes.statusCode === 404) {
            const response = {
              status: 404,
              success: false,
              error: "Not Found",
              message: "The requested resource was not found",
            };
            console.log(
              `[API Gateway] [${requestId}] Sending 404 response:`,
              response
            );
            res.status(404).json(response);
            return;
          }

          // If the response is empty but not 404, send status with empty data
          if (!responseBody) {
            const response = {
              status: proxyRes.statusCode,
              success: proxyRes.statusCode < 400,
              data: null,
            };
            console.log(
              `[API Gateway] [${requestId}] Sending empty response:`,
              response
            );
            res.status(proxyRes.statusCode).json(response);
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

            console.log(
              `[API Gateway] [${requestId}] Sending response:`,
              response
            );
            res.status(proxyRes.statusCode).json(response);
          } catch (error) {
            console.error(
              `[API Gateway] [${requestId}] JSON parse error:`,
              error
            );
            if (!res.headersSent) {
              const response = {
                status: 502,
                success: false,
                error: "Bad Gateway",
                message: "Invalid JSON response from service",
              };
              console.log(
                `[API Gateway] [${requestId}] Sending error response:`,
                response
              );
              res.status(502).json(response);
            }
          }
        });
      },
      onError: (err, req, res) => {
        const requestId = Math.random().toString(36).substring(7);
        console.error(`[API Gateway] [${requestId}] Proxy error:`, err);
        if (!res.headersSent) {
          const response = {
            status: 500,
            error: "Internal Server Error",
            message: err.message,
            success: false,
          };
          console.log(
            `[API Gateway] [${requestId}] Sending error response:`,
            response
          );
          res.status(500).json(response);
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
