import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { handleMcpRequest } from "./routes/mcp";
import { handleAssetRequest } from "./routes/assets";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/", (c) => c.text("Pizzaz MCP Hono worker"));

// MCP endpoint
app.all("/mcp", handleMcpRequest);

// Static assets with CORS headers
app.get("/assets/*", handleAssetRequest);

export default app;
