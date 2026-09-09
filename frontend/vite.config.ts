import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import http from "node:http";

/**
 * Mini X Development API Gateway Plugin
 *
 * Replicates the method-based routing of Nginx (docker/nginx/nginx.conf)
 * directly within the Vite dev server when running without Docker:
 *
 * - GET  /api/posts       -> Python Read Service (:4001 or process.env.READ_PORT)
 * - GET  /api/posts/:id   -> Python Read Service (:4001 or process.env.READ_PORT)
 * - POST /api/posts       -> TypeScript Write Service (:3001 or process.env.WRITE_PORT)
 * - *    /api/auth/*      -> TypeScript Write Service (:3001 or process.env.WRITE_PORT)
 * - GET  /health          -> TypeScript Write Service (:3001 or process.env.WRITE_PORT)
 *
 * If USE_NGINX=true is set, routes all traffic to http://127.0.0.1:8080.
 */
function localGatewayPlugin(): Plugin {
  return {
    name: "local-api-gateway",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";

        // Only handle /api and /health routes
        if (!url.startsWith("/api") && !url.startsWith("/health")) {
          return next();
        }

        const useNginx = process.env.USE_NGINX === "true";

        // Check if this is a post read request (GET /api/posts or GET /api/posts/...)
        const isPostRead =
          req.method === "GET" &&
          (url === "/api/posts" || url.startsWith("/api/posts/"));

        // Determine destination port
        const targetPort = useNginx
          ? 8080
          : isPostRead
          ? Number(process.env.READ_PORT || 4001)
          : Number(process.env.WRITE_PORT || 3001);

        const proxyReq = http.request(
          {
            hostname: "127.0.0.1",
            port: targetPort,
            path: url,
            method: req.method,
            headers: {
              ...req.headers,
              host: `127.0.0.1:${targetPort}`,
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on("error", (err) => {
          console.error(
            `[gateway] Proxy error for ${req.method} ${url} -> :${targetPort}:`,
            err.message
          );
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: `Service at port ${targetPort} is unreachable. Ensure your backend services are running.`,
                detail: err.message,
              })
            );
          }
        });

        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localGatewayPlugin()],
  server: {
    port: 5173,
  },
});