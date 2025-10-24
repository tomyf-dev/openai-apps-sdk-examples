import type { Context } from "hono";
import type { Env } from "../types";
import { ensureManifest, resolveAssetPath } from "../lib/widgets";

export const handleAssetRequest = async (c: Context<{ Bindings: Env }>) => {
  try {
    const requestedPath = c.req.path.replace(/^\/assets\//, "");
    const manifest = ensureManifest(c.env.__STATIC_CONTENT_MANIFEST);

    let assetKey = resolveAssetPath(manifest, requestedPath);
    console.log(
      `[handleAssetRequest] requested: ${requestedPath}, resolved: ${assetKey}`
    );
    let request = new Request(`https://static/${assetKey}`, c.req.raw);
    let response = await c.env.ASSETS.fetch(request);
    console.log(`[handleAssetRequest] first fetch status: ${response.status}`);

    // If 404 and no hash pattern in filename, try with -2d2b hash
    const hasHashPattern = requestedPath.match(/-[a-z0-9]{4,}\./);
    console.log(`[handleAssetRequest] hasHashPattern: ${!!hasHashPattern}`);
    if (response.status === 404 && !hasHashPattern) {
      const lastDot = requestedPath.lastIndexOf(".");
      if (lastDot !== -1) {
        const basename = requestedPath.slice(0, lastDot);
        const extension = requestedPath.slice(lastDot);
        assetKey = `${basename}-2d2b${extension}`;
        console.log(`[handleAssetRequest] trying fallback: ${assetKey}`);
        request = new Request(`https://static/${assetKey}`, c.req.raw);
        response = await c.env.ASSETS.fetch(request);
        console.log(
          `[handleAssetRequest] fallback fetch status: ${response.status}`
        );
      }
    }

    if (!response || response.status === 404) {
      return c.json(
        { error: "Asset not found", path: `/assets/${assetKey}` },
        404
      );
    }

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error("Failed to serve asset", error);
    throw error;
  }
};
