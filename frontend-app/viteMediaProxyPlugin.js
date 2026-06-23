const mediaProxyModulePath = "../backend/src/shared/mediaProxy.js";
let mediaProxyModulePromise;

function loadMediaProxyModule() {
  if (!mediaProxyModulePromise) {
    mediaProxyModulePromise = import(mediaProxyModulePath);
  }
  return mediaProxyModulePromise;
}

export function mediaProxyPlugin() {
  return {
    name: "media-proxy",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use("/api/media/proxy", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        try {
          const requestUrl = new URL(req.url, "http://127.0.0.1");
          const { fetchProxiedMedia } = await loadMediaProxyModule();
          const { buffer, contentType } = await fetchProxiedMedia(requestUrl.searchParams.get("url"));
          res.statusCode = 200;
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "private, max-age=300");
          res.end(buffer);
        } catch (error) {
          res.statusCode = error.status || 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: error.message || "proxy failed" }));
        }
      });
    },
  };
}
